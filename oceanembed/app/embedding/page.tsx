'use client';
import { useState, useEffect, useRef } from 'react';
import { INPUT_VARIABLES, LATENT_DIM } from '@/lib/constants';
import { ArrowDown, Zap, Brain, Layers } from 'lucide-react';

const ARCH_STEPS = [
  { label: 'MULTI-SOURCE SURFACE DATA', sub: '[7, 100, 240] — 7 channels × lat × lon', color: 'border-orange-500/30 bg-orange-500/5', textColor: 'text-orange-300' },
  { label: 'SPATIAL ENCODER', sub: 'CNN backbone — ResNet-style feature extraction', color: 'border-blue-500/30 bg-blue-500/5', textColor: 'text-blue-300' },
  { label: 'FEATURE EXTRACTION', sub: 'Multi-scale spatial features per channel', color: 'border-violet-500/30 bg-violet-500/5', textColor: 'text-violet-300' },
  { label: 'ATTENTION / LATENT FUSION', sub: 'Cross-channel attention — physical co-variance modeling', color: 'border-cyan-500/30 bg-cyan-500/5', textColor: 'text-cyan-300' },
  { label: 'OCEAN EMBEDDING', sub: `${LATENT_DIM}-D Latent Representation — compressed ocean state`, color: 'border-green-500/30 bg-green-500/8', textColor: 'text-green-300' },
  { label: 'SUBSURFACE RECONSTRUCTION HEAD', sub: 'Depth-conditioned decoder → 15-level temperature field', color: 'border-teal-500/30 bg-teal-500/5', textColor: 'text-teal-300' },
];

export default function EmbeddingPage() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [latentDim, setLatentDim] = useState(128);
  const [hoveredChannel, setHoveredChannel] = useState<number | null>(null);
  const [animStep, setAnimStep] = useState(0);

  // Animate arch steps
  useEffect(() => {
    const t = setInterval(() => setAnimStep(s => (s + 1) % ARCH_STEPS.length), 900);
    return () => clearInterval(t);
  }, []);

  // Embedding scatter plot (UMAP-style representative visualization)
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    canvas.width = canvas.offsetWidth;
    canvas.height = canvas.offsetHeight;
    const w = canvas.width, h = canvas.height;

    // Generate representative 2D embedding clusters
    const clusters = [
      { cx: w * 0.28, cy: h * 0.35, label: 'Arabian Sea\n(Summer)', color: '#f97316', n: 30 },
      { cx: w * 0.42, cy: h * 0.55, label: 'Arabian Sea\n(Winter)', color: '#fb923c', n: 25 },
      { cx: w * 0.65, cy: h * 0.30, label: 'Bay of Bengal\n(Monsoon)', color: '#06b6d4', n: 28 },
      { cx: w * 0.72, cy: h * 0.60, label: 'Bay of Bengal\n(Winter)', color: '#22d3ee', n: 22 },
      { cx: w * 0.50, cy: h * 0.75, label: 'Central IO', color: '#a855f7', n: 18 },
    ];

    ctx.fillStyle = '#e0f2fe';
    ctx.fillRect(0, 0, w, h);

    // Fine grid
    ctx.strokeStyle = 'rgba(14,116,163,0.1)';
    ctx.lineWidth = 0.5;
    for (let x = 0; x < w; x += 30) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, h); ctx.stroke(); }
    for (let y = 0; y < h; y += 30) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y); ctx.stroke(); }

    const rng = (seed: number) => {
      let x = Math.sin(seed) * 10000;
      return x - Math.floor(x);
    };

    for (const cl of clusters) {
      // Cluster convex hull background
      ctx.beginPath();
      ctx.arc(cl.cx, cl.cy, 55, 0, Math.PI * 2);
      ctx.fillStyle = cl.color.replace(')', ', 0.05)').replace('rgb', 'rgba');
      ctx.fill();

      for (let i = 0; i < cl.n; i++) {
        const px = cl.cx + (rng(i * 7 + cl.n) - 0.5) * 80;
        const py = cl.cy + (rng(i * 13 + cl.n) - 0.5) * 60;
        const r = rng(i * 3) * 3 + 2;
        ctx.beginPath();
        ctx.arc(px, py, r, 0, Math.PI * 2);
        ctx.fillStyle = cl.color + 'cc';
        ctx.fill();
      }

      // Label
      ctx.font = 'bold 10px sans-serif';
      ctx.fillStyle = cl.color;
      ctx.textAlign = 'center';
      const lines = cl.label.split('\n');
      lines.forEach((line, li) => ctx.fillText(line, cl.cx, cl.cy - 38 + li * 12));
    }

    ctx.textAlign = 'left';
    // Axes labels
    ctx.font = '9px monospace';
    ctx.fillStyle = 'rgba(3,105,161,0.7)';
    ctx.fillText('PC₁ (Thermal structure)', 10, h - 8);
    ctx.save(); ctx.rotate(-Math.PI / 2);
    ctx.fillText('PC₂ (Salinity / SSH signature)', -h + 10, 14);
    ctx.restore();

    // Title
    ctx.font = 'bold 10px sans-serif';
    ctx.fillStyle = 'rgba(2,132,199,0.9)';
    ctx.fillText('2D PROJECTION — REPRESENTATIVE ILLUSTRATIVE VISUALIZATION', 10, 18);
  }, []);

  return (
    <div className="min-h-screen py-8 ocean-gradient grid-bg">
      <div className="max-w-screen-xl mx-auto px-6 py-8">
        <div className="mb-6">
          <div className="section-label mb-1">Satellite Embedding Engine</div>
          <h1 className="text-3xl font-black text-sky-950 tracking-tight mb-2">Ocean Embedding — Latent Space Representation</h1>
          <p className="text-sm font-semibold text-sky-800/80 max-w-2xl">
            Multi-dimensional surface observations are transformed into a compact {latentDim}-dimensional latent
            representation that captures spatial and physical signatures associated with subsurface ocean structure.
          </p>
          <div className="mt-2 demo-banner inline-block">Representative Architectural Visualization — Not trained model weights</div>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
          {/* Input channels */}
          <div className="xl:col-span-1">
            <div className="glass-panel p-4 mb-4">
              <div className="section-label mb-4">Input Channels (7)</div>
              <div className="space-y-2">
                {INPUT_VARIABLES.map((v, i) => (
                  <div
                    key={v.id}
                    className={`rounded-lg p-3 border transition-all cursor-pointer ${hoveredChannel === i ? 'border-opacity-60 scale-[1.02]' : 'border-opacity-20'}`}
                    style={{ borderColor: v.color, background: hoveredChannel === i ? `${v.color}18` : `${v.color}08` }}
                    onMouseEnter={() => setHoveredChannel(i)}
                    onMouseLeave={() => setHoveredChannel(null)}
                  >
                    <div className="flex justify-between items-center">
                      <div>
                        <span className="text-[11px] font-bold" style={{ color: v.color }}>Ch{i + 1}: {v.label}</span>
                        <div className="text-[10px] text-slate-500 mt-0.5">{v.fullName}</div>
                      </div>
                      <span className="text-[10px] font-mono text-slate-500">{v.unit}</span>
                    </div>
                    {hoveredChannel === i && (
                      <div className="mt-2 pt-2 border-t border-[rgba(255,255,255,0.05)] text-[10px] text-slate-400">
                        Spatial tensor: [100 × 240] → Encoder block {i + 1}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Latent dim selector */}
            <div className="glass-panel p-4">
              <div className="section-label mb-3">Latent Dimension</div>
              <div className="flex gap-2">
                {[64, 128, 256].map(d => (
                  <button
                    key={d}
                    onClick={() => setLatentDim(d)}
                    className={`flex-1 py-2 text-xs font-bold rounded transition-all ${
                      latentDim === d
                        ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30'
                        : 'text-slate-500 border border-[rgba(14,165,233,0.12)] hover:text-slate-300'
                    }`}
                  >
                    {d}-D
                  </button>
                ))}
              </div>
              <div className="mt-3 text-[10px] text-slate-500 leading-relaxed">
                The latent vector encodes the compressed ocean state. Larger dimensions increase
                representational capacity at the cost of training data requirements.
              </div>
              <div className="mt-3 glass-panel-strong p-3 font-mono text-center">
                <div className="text-[10px] text-slate-500 mb-1">LATENT VECTOR</div>
                <div className="text-lg font-bold text-cyan-300">{latentDim}-D</div>
                <div className="mt-2 flex gap-0.5 flex-wrap justify-center">
                  {Array.from({ length: Math.min(latentDim, 32) }).map((_, i) => (
                    <div
                      key={i}
                      className="w-2 h-2 rounded-sm"
                      style={{
                        background: `hsl(${180 + Math.sin(i * 0.8) * 60}, 70%, ${30 + Math.cos(i * 0.5) * 20}%)`
                      }}
                    />
                  ))}
                  {latentDim > 32 && <span className="text-[9px] text-slate-600 self-center ml-1">+{latentDim - 32}</span>}
                </div>
              </div>
            </div>
          </div>

          {/* Architecture + embedding viz */}
          <div className="xl:col-span-2 flex flex-col gap-4">
            {/* Architecture flow */}
            <div className="glass-panel p-4">
              <div className="section-label mb-4">Model Architecture</div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Architecture diagram */}
                <div className="space-y-1.5">
                  {ARCH_STEPS.map((step, i) => (
                    <div key={i}>
                      <div className={`rounded-lg px-4 py-3 border transition-all duration-300 ${step.color} ${animStep === i ? 'shadow-lg scale-[1.02]' : ''}`}>
                        <div className={`text-[11px] font-bold tracking-wide ${step.textColor}`}>{step.label}</div>
                        <div className="text-[10px] text-slate-500 mt-0.5">{step.sub}</div>
                      </div>
                      {i < ARCH_STEPS.length - 1 && (
                        <div className="flex justify-center my-0.5">
                          <ArrowDown className={`w-3 h-3 ${animStep > i ? 'text-cyan-500' : 'text-slate-700'}`} />
                        </div>
                      )}
                    </div>
                  ))}
                </div>

                {/* Architecture details */}
                <div className="space-y-3">
                  <div className="glass-panel-strong p-3">
                    <div className="section-label mb-2">Encoder</div>
                    <div className="text-[10px] text-slate-400 space-y-1">
                      <div>• CNN ResNet backbone (encoder)</div>
                      <div>• 7 independent channel pathways</div>
                      <div>• Multi-scale feature pyramid</div>
                      <div>• Spatial downsampling: 100×240 → 25×60</div>
                    </div>
                  </div>
                  <div className="glass-panel-strong p-3">
                    <div className="section-label mb-2">Fusion</div>
                    <div className="text-[10px] text-slate-400 space-y-1">
                      <div>• Cross-channel self-attention</div>
                      <div>• Physical constraint weighting</div>
                      <div>• Global average pooling</div>
                      <div>• {latentDim}-D projection head</div>
                    </div>
                  </div>
                  <div className="glass-panel-strong p-3">
                    <div className="section-label mb-2">Decoder</div>
                    <div className="text-[10px] text-slate-400 space-y-1">
                      <div>• Depth-conditioned MLP</div>
                      <div>• 15 target depths as input condition</div>
                      <div>• Spatial upsampling</div>
                      <div>• Output: T(lat, lon, depth)</div>
                    </div>
                  </div>
                  <div className="glass-panel-strong p-3">
                    <div className="section-label mb-2">Training Signal</div>
                    <div className="text-[10px] text-slate-400 space-y-1">
                      <div>• Supervisory target: GLORYS12 T(z)</div>
                      <div>• Loss: MSE + physics-informed term</div>
                      <div>• Validation: held-out ARGO profiles</div>
                      <div className="text-amber-400 mt-1">↳ Architecture — not trained weights</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Embedding projection */}
            <div className="glass-panel p-4">
              <div className="flex justify-between items-start mb-3">
                <div>
                  <div className="section-label mb-0.5">Embedding Space Projection</div>
                  <div className="text-[10px] text-slate-500">2D principal component projection of {latentDim}-D ocean embeddings</div>
                </div>
                <div className="demo-banner">REPRESENTATIVE ILLUSTRATIVE VISUALIZATION</div>
              </div>
              <div className="rounded-lg overflow-hidden" style={{ height: 280 }}>
                <canvas ref={canvasRef} className="w-full h-full" style={{ height: 280 }} />
              </div>
              <div className="mt-3 flex flex-wrap gap-3">
                {[
                  { label: 'Arabian Sea (Summer)', color: '#f97316' },
                  { label: 'Arabian Sea (Winter)', color: '#fb923c' },
                  { label: 'Bay of Bengal (Monsoon)', color: '#06b6d4' },
                  { label: 'Bay of Bengal (Winter)', color: '#22d3ee' },
                  { label: 'Central Indian Ocean', color: '#a855f7' },
                ].map(c => (
                  <div key={c.label} className="flex items-center gap-1.5">
                    <div className="w-2.5 h-2.5 rounded-full" style={{ background: c.color }} />
                    <span className="text-[10px] text-slate-400">{c.label}</span>
                  </div>
                ))}
              </div>
              <div className="mt-2 text-[10px] text-slate-600">
                Note: Distinct regional clusters in embedding space indicate that the encoder captures region-specific
                physical signatures relevant to subsurface structure. Visualization is illustrative.
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
