'use client';

import { useState, useRef } from 'react';
import { Terminal, Cpu, Server, Database, Code2, Zap, CheckCircle2, Loader2, ArrowRight, Play } from 'lucide-react';

const API_ENDPOINTS = [
  { method: 'GET', path: '/api/reconstruct', desc: 'Check API engine status & supported endpoints' },
  { method: 'POST', path: '/api/reconstruct', desc: 'Run live 15-depth subsurface temperature reconstruction' },
];

const MODEL_LAYERS = [
  { name: 'Input Layer', shape: '[B, 7, 100, 240]', params: 0, type: 'input', color: '#ea580c' },
  { name: 'Conv Block 1', shape: '[B, 64, 50, 120]', params: 18816, type: 'conv', color: '#d97706' },
  { name: 'Conv Block 2', shape: '[B, 128, 25, 60]', params: 73856, type: 'conv', color: '#16a34a' },
  { name: 'Conv Block 3', shape: '[B, 256, 13, 30]', params: 295168, type: 'conv', color: '#0284c7' },
  { name: 'Cross-Channel Attention', shape: '[B, 256, 13, 30]', params: 131328, type: 'attn', color: '#7c3aed' },
  { name: 'Global Avg Pool', shape: '[B, 256]', params: 0, type: 'pool', color: '#475569' },
  { name: 'Projection Head', shape: '[B, 128]', params: 32896, type: 'fc', color: '#c026d3' },
  { name: 'Latent Embedding', shape: '[B, 128]', params: 0, type: 'embed', color: '#06b6d4' },
  { name: 'Depth Conditioning', shape: '[B, 129]', params: 0, type: 'concat', color: '#475569' },
  { name: 'Decoder MLP 1', shape: '[B, 256]', params: 33280, type: 'fc', color: '#ea580c' },
  { name: 'Decoder MLP 2', shape: '[B, 128]', params: 32896, type: 'fc', color: '#ea580c' },
  { name: 'Output: T(z)', shape: '[B, 1]', params: 129, type: 'output', color: '#16a34a' },
];

const PYTHON_CODE = `import torch
import numpy as np
from aqualens.model import OceanEmbedModel
from aqualens.data import SurfaceDataLoader

# Load PyTorch Deep Learning Model
model = OceanEmbedModel(
    in_channels=7,
    latent_dim=128,
    n_depths=15
)
model.load_state_dict(torch.load("oceanembed_v1.pt"))
model.eval()

# Load 7-channel satellite surface tensor
loader = SurfaceDataLoader(
    date="2024-01-15",
    bbox=(5, 30, 45, 105),  # North Indian Ocean domain
    variables=["sst","sss","ssh","curr_u",
               "curr_v","wind_u","wind_v"]
)
surface_tensor = loader.get_tensor() # shape: [7, 100, 240]

# Run latent encoding and depth decoding
with torch.no_grad():
    embedding = model.encode(surface_tensor) # 128-D latent vector
    depths = torch.tensor([0,5,10,20,30,50,75,100,125,150,200,300,500,700,1000])
    temp_profile = model.decode(embedding, depths) # [15] depth profile

print("Reconstruction Complete — RMSE:", compute_rmse(temp_profile, argo_reference))`;

export default function BackendMLPage() {
  const [logs, setLogs] = useState<Array<{ method: string; path: string; status: number; ms: number; body: string }>>([]);
  const [loading, setLoading] = useState(false);
  const [activeLayer, setActiveLayer] = useState(-1);
  const [forwardPassDone, setForwardPassDone] = useState(false);

  const runForwardPass = async () => {
    setForwardPassDone(false);
    setActiveLayer(-1);
    for (let i = 0; i < MODEL_LAYERS.length; i++) {
      setActiveLayer(i);
      await new Promise(r => setTimeout(r, 180));
    }
    setForwardPassDone(true);
    setActiveLayer(-1);
  };

  const testApiGet = async () => {
    setLoading(true);
    const start = performance.now();
    try {
      const res = await fetch('/api/reconstruct');
      const data = await res.json();
      const ms = Math.round(performance.now() - start);
      setLogs(prev => [...prev, { method: 'GET', path: '/api/reconstruct', status: res.status, ms, body: JSON.stringify(data, null, 2) }]);
    } catch (e: any) {
      setLogs(prev => [...prev, { method: 'GET', path: '/api/reconstruct', status: 500, ms: 0, body: e.message }]);
    }
    setLoading(false);
  };

  const testApiPost = async () => {
    setLoading(true);
    const start = performance.now();
    try {
      const res = await fetch('/api/reconstruct', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          lat: 15.5,
          lon: 68.2,
          date: '2024-01-15',
          surface: { sst: 28.5, sss: 35.8, ssh: -0.05, wind_u: 5.2, wind_v: 6.1 },
        }),
      });
      const data = await res.json();
      const ms = Math.round(performance.now() - start);
      setLogs(prev => [...prev, { method: 'POST', path: '/api/reconstruct', status: res.status, ms, body: JSON.stringify(data, null, 2) }]);
    } catch (e: any) {
      setLogs(prev => [...prev, { method: 'POST', path: '/api/reconstruct', status: 500, ms: 0, body: e.message }]);
    }
    setLoading(false);
  };

  const totalParams = MODEL_LAYERS.reduce((s, l) => s + l.params, 0);

  return (
    <div className="min-h-screen py-8 ocean-gradient grid-bg">
      <div className="max-w-screen-xl mx-auto px-6 py-8">
        <div className="mb-8">
          <div className="section-label mb-1">Backend & ML Engine</div>
          <h1 className="text-3xl font-black text-sky-950 tracking-tight mb-2">Live Neural Engine & Next.js API Services</h1>
          <p className="text-sm font-semibold text-sky-800/80 max-w-2xl">
            Real-time interface into the AQUALENS machine learning backend, REST API endpoints, and PyTorch deep learning architecture.
          </p>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
          {/* Neural Network Architecture */}
          <div className="xl:col-span-1 space-y-5">
            <div className="glass-strong p-5">
              <div className="flex justify-between items-center mb-4">
                <div>
                  <div className="section-label">Neural Network Architecture</div>
                  <div className="text-xs font-bold text-sky-950">OceanEmbed ResNet-Encoder + MLP Decoder</div>
                </div>
                <button
                  onClick={runForwardPass}
                  disabled={activeLayer !== -1}
                  className="px-3 py-1.5 rounded-lg bg-sky-600 text-white text-[10px] font-black tracking-wider uppercase hover:bg-sky-700 shadow-sm transition-all flex items-center gap-1.5"
                >
                  <Play className="w-3 h-3" /> FORWARD PASS
                </button>
              </div>

              <div className="space-y-1.5">
                {MODEL_LAYERS.map((layer, i) => {
                  const isActive = activeLayer === i;
                  return (
                    <div
                      key={layer.name}
                      className={`px-3.5 py-2.5 rounded-xl border transition-all ${
                        isActive
                          ? 'bg-sky-200 border-sky-500 shadow-md scale-[1.02]'
                          : 'bg-white/80 border-sky-200/80 hover:bg-sky-50'
                      }`}
                    >
                      <div className="flex justify-between items-center">
                        <div className="flex items-center gap-2">
                          <span className="w-2.5 h-2.5 rounded-full" style={{ background: layer.color }} />
                          <span className="text-xs font-black text-sky-950">{layer.name}</span>
                        </div>
                        <span className="text-[10px] font-mono font-bold text-sky-700">{layer.shape}</span>
                      </div>
                      <div className="flex justify-between items-center mt-1 text-[10px] font-bold text-sky-800/70">
                        <span>Type: {layer.type.toUpperCase()}</span>
                        <span>{layer.params > 0 ? `${layer.params.toLocaleString()} params` : 'No params'}</span>
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="mt-4 pt-3 border-t border-sky-200 flex justify-between items-center text-xs font-extrabold text-sky-950">
                <span>Total Trainable Parameters:</span>
                <span className="font-mono text-sky-700">{totalParams.toLocaleString()}</span>
              </div>
            </div>
          </div>

          {/* Interactive API Testing & Terminal */}
          <div className="xl:col-span-2 space-y-6">
            {/* Live API Tester */}
            <div className="glass-strong p-5">
              <div className="section-label mb-3">Live API Endpoints</div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-4">
                <button
                  onClick={testApiGet}
                  disabled={loading}
                  className="p-4 rounded-xl border border-sky-200 bg-white/90 text-left hover:border-sky-400 hover:bg-sky-50 transition-all shadow-xs"
                >
                  <div className="flex justify-between items-center mb-1">
                    <span className="px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 font-extrabold text-[10px] font-mono">GET</span>
                    <span className="text-[10px] text-sky-600 font-bold">Status Endpoint</span>
                  </div>
                  <div className="font-mono text-xs font-black text-sky-950">/api/reconstruct</div>
                  <div className="text-[10px] font-semibold text-sky-700/80 mt-1">Fetch engine status & API specs</div>
                </button>

                <button
                  onClick={testApiPost}
                  disabled={loading}
                  className="p-4 rounded-xl border border-sky-200 bg-white/90 text-left hover:border-sky-400 hover:bg-sky-50 transition-all shadow-xs"
                >
                  <div className="flex justify-between items-center mb-1">
                    <span className="px-2 py-0.5 rounded bg-sky-100 text-sky-800 font-extrabold text-[10px] font-mono">POST</span>
                    <span className="text-[10px] text-sky-600 font-bold">Inference Endpoint</span>
                  </div>
                  <div className="font-mono text-xs font-black text-sky-950">/api/reconstruct</div>
                  <div className="text-[10px] font-semibold text-sky-700/80 mt-1">Send telemetry & receive 15-depth predictions</div>
                </button>
              </div>

              {/* Console Output */}
              <div className="rounded-xl bg-slate-950 p-4 font-mono text-xs text-sky-300 border border-slate-800 shadow-inner">
                <div className="flex items-center gap-2 mb-3 border-b border-slate-800 pb-2 text-[10px] text-slate-400 font-bold uppercase tracking-widest">
                  <Terminal className="w-3.5 h-3.5 text-sky-400" /> API Terminal Response Log
                </div>

                {logs.length === 0 ? (
                  <div className="text-slate-500 py-6 text-center italic">
                    Click GET or POST buttons above to trigger live Next.js API requests...
                  </div>
                ) : (
                  <div className="space-y-4 max-h-80 overflow-y-auto pr-2">
                    {logs.map((log, idx) => (
                      <div key={idx} className="border-b border-slate-800/80 pb-3">
                        <div className="flex justify-between items-center mb-1">
                          <span className={log.method === 'GET' ? 'text-emerald-400 font-bold' : 'text-sky-400 font-bold'}>
                            [{log.method}] {log.path}
                          </span>
                          <div className="flex items-center gap-2">
                            <span className="text-emerald-400 font-bold">{log.status} OK</span>
                            <span className="text-slate-500">{log.ms}ms</span>
                          </div>
                        </div>
                        <pre className="text-[11px] text-sky-200 bg-slate-900/90 p-2.5 rounded-lg overflow-x-auto border border-slate-800">
                          {log.body}
                        </pre>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Python Model Source Code */}
            <div className="glass-strong p-5">
              <div className="section-label mb-3">Model Source Code (PyTorch)</div>
              <div className="rounded-xl bg-slate-950 p-4 font-mono text-xs text-sky-300 border border-slate-800 overflow-x-auto shadow-inner">
                <pre className="leading-relaxed text-[11px] text-slate-200">{PYTHON_CODE}</pre>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
