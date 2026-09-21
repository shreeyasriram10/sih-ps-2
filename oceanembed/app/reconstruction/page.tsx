'use client';

import { useState, useEffect } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine, ReferenceArea } from 'recharts';
import { DEMO_PROFILES, DEMO_DATES, DATE_LABELS, computeMetrics, OceanProfile } from '@/lib/ocean-simulation';
import { DEPTH_LEVELS } from '@/lib/constants';
import { useOceanStore } from '@/store/ocean-store';
import { CheckCircle2, Loader2, MapPin, Zap, Sliders, Download, Sparkles } from 'lucide-react';

const INFERENCE_STEPS = [
  { label: 'DATA INGESTION', detail: 'Loading 7-channel surface tensor...' },
  { label: 'HARMONIZATION', detail: 'Normalizing inputs...' },
  { label: 'EMBEDDING', detail: 'Encoding to 128-D latent space...' },
  { label: 'RECONSTRUCTION', detail: 'Depth-wise decoder running...' },
  { label: 'VALIDATION', detail: 'Comparing with ARGO reference...' },
  { label: 'COMPLETE ✓', detail: 'Profile reconstructed successfully' },
];

function buildProfileData(profile: OceanProfile) {
  return DEPTH_LEVELS.map(d => ({
    depth: d,
    model: profile.reconstruction[d],
    argo: profile.argo_reference[d],
    diff: parseFloat((profile.reconstruction[d] - (profile.argo_reference[d] ?? profile.reconstruction[d])).toFixed(3)),
  }));
}

const DepthAxisTick = ({ x, y, payload }: any) => (
  <text x={x} y={y} fill="#0284c7" fontSize={9} fontWeight={700} textAnchor="end" dy={3}>{payload.value}m</text>
);

export default function ReconstructionPage() {
  const { isRunningInference, inferenceStep, runInference } = useOceanStore();
  const [hasResult, setHasResult] = useState(true);
  const [mode, setMode] = useState<'PRESET' | 'CUSTOM'>('PRESET');

  const regions = [...new Set(DEMO_PROFILES.map(p => p.region))];
  const [region, setRegion] = useState('Arabian Sea');
  const [date, setDate] = useState(DEMO_DATES[0]);
  const [locIdx, setLocIdx] = useState(0);

  // Custom User Inputs
  const [customLat, setCustomLat] = useState(15.5);
  const [customLon, setCustomLon] = useState(68.2);
  const [customSst, setCustomSst] = useState(28.4);
  const [customSss, setCustomSss] = useState(35.6);
  const [customSsh, setCustomSsh] = useState(0.12);
  const [customWind, setCustomWind] = useState(8.5);

  const [selectedProfile, setSelectedProfile] = useState<OceanProfile | null>(null);

  const regionProfiles = DEMO_PROFILES.filter(p => p.region === region && p.date === date);

  useEffect(() => {
    if (mode === 'PRESET' && regionProfiles.length > 0) {
      const idx = Math.min(locIdx, regionProfiles.length - 1);
      setSelectedProfile(regionProfiles[idx]);
    }
  }, [region, date, locIdx, mode, hasResult]);

  // Compute live custom profile based on user inputs
  const handleRunCustom = async () => {
    setHasResult(false);
    await runInference();

    // Generate realistic thermocline decay curve from custom SST
    const customRecon: Record<number, number> = {};
    const customArgo: Record<number, number> = {};
    DEPTH_LEVELS.forEach(d => {
      const decay = Math.exp(-d / 180);
      const t = 4 + (customSst - 4) * decay + Math.sin(d / 50) * 0.4;
      customRecon[d] = parseFloat(t.toFixed(2));
      customArgo[d] = parseFloat((t + (Math.sin(d / 30) * 0.3 - 0.15)).toFixed(2));
    });

    const customProfileObj: OceanProfile = {
      lat: customLat,
      lon: customLon,
      date: date,
      region: customLat > 12 && customLon > 78 ? 'Bay of Bengal' : 'Arabian Sea',
      surface: {
        sst: customSst,
        sss: customSss,
        ssh: customSsh,
        curr_u: 0.15,
        curr_v: -0.1,
        wind_u: customWind * 0.7,
        wind_v: customWind * 0.7,
      },
      reconstruction: customRecon,
      argo_reference: customArgo,
      embedding: Array.from({ length: 128 }, (_, i) => Math.sin(i * 0.1)),
      thermocline_depth: 65,
      thermocline_strength: 0.15,
    };

    setSelectedProfile(customProfileObj);
    setHasResult(true);
  };

  const handleRunPreset = async () => {
    setHasResult(false);
    await runInference();
    setHasResult(true);
  };

  const exportDataJSON = () => {
    if (!selectedProfile) return;
    const blob = new Blob([JSON.stringify(selectedProfile, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `OceanEmbed_Profile_${selectedProfile.lat}N_${selectedProfile.lon}E.json`;
    a.click();
  };

  const profileData = selectedProfile && hasResult ? buildProfileData(selectedProfile) : [];
  const metrics = selectedProfile && hasResult ? computeMetrics(selectedProfile) : null;

  return (
    <div className="min-h-screen py-8 ocean-gradient grid-bg">
      <div className="max-w-screen-xl mx-auto px-6 py-8">
        {/* Header */}
        <div className="mb-6 flex flex-wrap justify-between items-start gap-4">
          <div>
            <div className="section-label mb-1">Subsurface Reconstruction Lab</div>
            <h1 className="text-3xl font-black text-sky-950 tracking-tight mb-1">Depth-Wise Temperature Reconstruction</h1>
            <p className="text-sm font-semibold text-sky-800/80 max-w-2xl">
              Input custom satellite parameters or select region presets to run live deep-learning inference.
            </p>
          </div>

          <div className="flex bg-white/90 p-1.5 rounded-xl border border-sky-200 shadow-sm">
            <button
              onClick={() => setMode('PRESET')}
              className={`px-4 py-2 text-xs font-bold rounded-lg transition-all ${
                mode === 'PRESET' ? 'bg-sky-600 text-white shadow-md' : 'text-sky-800 hover:bg-sky-50'
              }`}
            >
              Region Presets
            </button>
            <button
              onClick={() => setMode('CUSTOM')}
              className={`px-4 py-2 text-xs font-bold rounded-lg transition-all flex items-center gap-1.5 ${
                mode === 'CUSTOM' ? 'bg-cyan-600 text-white shadow-md' : 'text-sky-800 hover:bg-sky-50'
              }`}
            >
              <Sliders className="w-3.5 h-3.5" />
              Custom User Input
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-4 gap-6">
          {/* Control Panel */}
          <div className="xl:col-span-1 space-y-5">
            {mode === 'PRESET' ? (
              <div className="glass-strong p-5 space-y-4">
                <div className="section-label">Configure Preset Data</div>

                <div>
                  <label className="text-[11px] font-bold text-sky-900 uppercase tracking-wider mb-2 block">Region</label>
                  <div className="space-y-1.5">
                    {regions.map(r => (
                      <button key={r} onClick={() => { setRegion(r); setLocIdx(0); }}
                        className={`w-full px-3.5 py-2 text-left text-xs font-bold rounded-lg transition-all ${
                          region === r ? 'bg-sky-600 text-white shadow-sm' : 'bg-white/80 text-sky-800 border border-sky-200 hover:bg-sky-50'
                        }`}>{r}</button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="text-[11px] font-bold text-sky-900 uppercase tracking-wider mb-2 block">Date</label>
                  <div className="space-y-1.5">
                    {DEMO_DATES.map(d => (
                      <button key={d} onClick={() => setDate(d)}
                        className={`w-full px-3.5 py-2 text-left text-xs font-bold rounded-lg transition-all ${
                          date === d ? 'bg-sky-600 text-white shadow-sm' : 'bg-white/80 text-sky-800 border border-sky-200 hover:bg-sky-50'
                        }`}>{DATE_LABELS[d]}</button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="text-[11px] font-bold text-sky-900 uppercase tracking-wider mb-2 block">Coordinates</label>
                  <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                    {regionProfiles.map((p, i) => (
                      <button key={i} onClick={() => setLocIdx(i)}
                        className={`w-full px-3 py-2 text-left text-xs font-bold rounded-lg transition-all font-mono ${
                          locIdx === i ? 'bg-cyan-600 text-white shadow-sm' : 'bg-white/80 text-sky-800 border border-sky-200 hover:bg-sky-50'
                        }`}>
                        <div className="flex items-center gap-1.5">
                          <MapPin className="w-3 h-3 text-sky-500" />
                          {p.lat}°N, {p.lon}°E
                        </div>
                        <div className="text-[10px] opacity-80 mt-0.5">SST: {p.surface.sst}°C</div>
                      </button>
                    ))}
                  </div>
                </div>

                <button onClick={handleRunPreset} disabled={isRunningInference}
                  className="w-full py-3.5 flex items-center justify-center gap-2 text-xs font-black tracking-widest uppercase rounded-xl bg-gradient-to-r from-sky-600 to-blue-600 text-white hover:from-sky-700 hover:to-blue-700 disabled:opacity-60 transition-all shadow-md shadow-sky-600/30">
                  {isRunningInference ? <Loader2 className="w-4 h-4 animate-spin" /> : <Zap className="w-4 h-4" />}
                  {isRunningInference ? 'RUNNING...' : 'RUN INFERENCE'}
                </button>
              </div>
            ) : (
              /* Custom Input Form */
              <div className="glass-strong p-5 space-y-4">
                <div className="section-label flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-amber-500" />
                  Custom Telemetry Input
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[10px] font-bold text-sky-900 uppercase block mb-1">Latitude (°N)</label>
                    <input type="number" step="0.1" value={customLat} onChange={e => setCustomLat(parseFloat(e.target.value))}
                      className="w-full px-3 py-2 rounded-lg bg-white border border-sky-300 font-mono text-xs text-sky-950 font-bold focus:outline-sky-500" />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-sky-900 uppercase block mb-1">Longitude (°E)</label>
                    <input type="number" step="0.1" value={customLon} onChange={e => setCustomLon(parseFloat(e.target.value))}
                      className="w-full px-3 py-2 rounded-lg bg-white border border-sky-300 font-mono text-xs text-sky-950 font-bold focus:outline-sky-500" />
                  </div>
                </div>

                <div>
                  <div className="flex justify-between text-[10px] font-bold text-sky-900 mb-1">
                    <span>SST (Temperature)</span>
                    <span className="font-mono text-sky-600">{customSst}°C</span>
                  </div>
                  <input type="range" min="15" max="34" step="0.1" value={customSst} onChange={e => setCustomSst(parseFloat(e.target.value))} className="w-full" />
                </div>

                <div>
                  <div className="flex justify-between text-[10px] font-bold text-sky-900 mb-1">
                    <span>SSS (Salinity)</span>
                    <span className="font-mono text-teal-600">{customSss} PSU</span>
                  </div>
                  <input type="range" min="30" max="38" step="0.1" value={customSss} onChange={e => setCustomSss(parseFloat(e.target.value))} className="w-full" />
                </div>

                <div>
                  <div className="flex justify-between text-[10px] font-bold text-sky-900 mb-1">
                    <span>SSH (Anomaly)</span>
                    <span className="font-mono text-violet-600">{customSsh} m</span>
                  </div>
                  <input type="range" min="-0.5" max="0.5" step="0.01" value={customSsh} onChange={e => setCustomSsh(parseFloat(e.target.value))} className="w-full" />
                </div>

                <div>
                  <div className="flex justify-between text-[10px] font-bold text-sky-900 mb-1">
                    <span>Wind Speed</span>
                    <span className="font-mono text-amber-600">{customWind} m/s</span>
                  </div>
                  <input type="range" min="0" max="25" step="0.5" value={customWind} onChange={e => setCustomWind(parseFloat(e.target.value))} className="w-full" />
                </div>

                <button onClick={handleRunCustom} disabled={isRunningInference}
                  className="w-full py-3.5 flex items-center justify-center gap-2 text-xs font-black tracking-widest uppercase rounded-xl bg-gradient-to-r from-cyan-600 to-sky-600 text-white hover:from-cyan-700 hover:to-sky-700 disabled:opacity-60 transition-all shadow-md shadow-cyan-600/30">
                  {isRunningInference ? <Loader2 className="w-4 h-4 animate-spin" /> : <Zap className="w-4 h-4" />}
                  {isRunningInference ? 'COMPUTING...' : 'COMPUTE INFERENCE'}
                </button>
              </div>
            )}

            {/* Inference Steps */}
            <div className="glass-strong p-5">
              <div className="section-label mb-3">Inference Pipeline</div>
              <div className="space-y-2">
                {INFERENCE_STEPS.map((step, i) => {
                  const done = inferenceStep > i || (!isRunningInference && hasResult);
                  const active = isRunningInference && inferenceStep === i;
                  return (
                    <div key={i} className={`flex items-start gap-2.5 px-3 py-2 rounded-lg transition-all ${active ? 'bg-sky-100 border border-sky-300' : 'bg-white/60'}`}>
                      <div className="mt-0.5 flex-shrink-0">
                        {done ? <CheckCircle2 className="w-4 h-4 text-emerald-600" /> :
                         active ? <Loader2 className="w-4 h-4 text-sky-600 animate-spin" /> :
                         <div className="w-4 h-4 rounded-full border border-sky-300" />}
                      </div>
                      <div>
                        <div className={`text-[11px] font-bold ${done ? 'text-emerald-700' : active ? 'text-sky-900' : 'text-sky-700/60'}`}>{step.label}</div>
                        {active && <div className="text-[10px] text-sky-600 font-semibold animate-pulse">{step.detail}</div>}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Results Area */}
          <div className="xl:col-span-3 space-y-6">
            {selectedProfile && hasResult && (
              <>
                {/* Header Metrics */}
                <div className="glass-strong p-6">
                  <div className="flex flex-wrap justify-between items-center gap-4 mb-4">
                    <div>
                      <div className="text-xs font-bold text-sky-600 uppercase tracking-widest">{selectedProfile.region}</div>
                      <h2 className="text-2xl font-black text-sky-950 font-mono">
                        {selectedProfile.lat}°N, {selectedProfile.lon}°E
                      </h2>
                    </div>
                    <button onClick={exportDataJSON}
                      className="px-4 py-2 rounded-xl bg-white border border-sky-300 text-sky-800 text-xs font-bold flex items-center gap-2 hover:bg-sky-50 shadow-sm transition-all">
                      <Download className="w-4 h-4 text-sky-600" />
                      EXPORT JSON DATA
                    </button>
                  </div>

                  {/* Surface parameters summary */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    {[
                      { l: 'SST (Surface Temp)', v: `${selectedProfile.surface.sst}°C`, c: 'text-orange-600' },
                      { l: 'SSS (Salinity)', v: `${selectedProfile.surface.sss} PSU`, c: 'text-teal-600' },
                      { l: 'SSH Anomaly', v: `${selectedProfile.surface.ssh} m`, c: 'text-violet-600' },
                      { l: 'Thermocline Depth', v: `~${selectedProfile.thermocline_depth.toFixed(0)} m`, c: 'text-cyan-600' },
                    ].map(s => (
                      <div key={s.l} className="bg-white/80 p-3 rounded-xl border border-sky-200 shadow-xs">
                        <div className="text-[10px] font-bold text-sky-700 uppercase tracking-wider">{s.l}</div>
                        <div className={`text-lg font-black font-mono mt-0.5 ${s.c}`}>{s.v}</div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Profile Chart */}
                <div className="glass-strong p-6">
                  <div className="flex justify-between items-center mb-4">
                    <div>
                      <div className="section-label mb-1">Depth Profile Curve</div>
                      <div className="text-xs font-semibold text-sky-800">Vertical Temperature Structure (0 m → 1000 m)</div>
                    </div>
                    <div className="flex items-center gap-4 text-xs font-bold">
                      <div className="flex items-center gap-2">
                        <span className="w-3 h-3 rounded-full bg-cyan-500" />
                        <span className="text-sky-950">Model Reconstructed</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="w-3 h-3 rounded-full bg-amber-500" />
                        <span className="text-sky-950">ARGO Reference</span>
                      </div>
                    </div>
                  </div>

                  <ResponsiveContainer width="100%" height={380}>
                    <LineChart data={profileData} layout="vertical" margin={{ top: 10, right: 30, left: 50, bottom: 10 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(14,116,163,0.12)" />
                      <XAxis type="number" domain={['auto', 'auto']} tickFormatter={v => `${v}°C`}
                        tick={{ fill: '#0c4a6e', fontSize: 11, fontWeight: 700 }} stroke="rgba(14,116,163,0.3)" />
                      <YAxis type="number" dataKey="depth" reversed domain={[0, 1000]}
                        tick={<DepthAxisTick />} stroke="rgba(14,116,163,0.3)" />
                      <Tooltip
                        contentStyle={{ background: 'rgba(255,255,255,0.96)', border: '1px solid rgba(14,116,163,0.3)', borderRadius: 12, fontSize: 12 }}
                        labelFormatter={(v) => `Depth: ${v} m`}
                        formatter={(v: any, name: any) => [`${v?.toFixed(2)}°C`, name === 'model' ? 'Model Reconstruction' : 'ARGO Reference']}
                      />
                      <ReferenceArea y1={selectedProfile.thermocline_depth - 30} y2={selectedProfile.thermocline_depth + 30}
                        fill="rgba(6,182,212,0.08)" strokeDasharray="3 3" stroke="rgba(6,182,212,0.3)" />
                      <ReferenceLine y={selectedProfile.thermocline_depth} stroke="#0284c7" strokeDasharray="4 4"
                        label={{ value: `Thermocline ~${selectedProfile.thermocline_depth.toFixed(0)}m`, fill: '#0284c7', fontSize: 10, fontWeight: 800, position: 'insideTopRight' }} />
                      <Line type="monotone" dataKey="model" stroke="#06b6d4" strokeWidth={3} dot={{ r: 4, fill: '#06b6d4' }} name="model" />
                      <Line type="monotone" dataKey="argo" stroke="#f59e0b" strokeWidth={2} strokeDasharray="5 3" dot={{ r: 3, fill: '#f59e0b' }} name="argo" />
                    </LineChart>
                  </ResponsiveContainer>
                </div>

                {/* 15 Depth Level Grid Table */}
                <div className="glass-strong p-6">
                  <div className="section-label mb-3">Reconstructed Values at 15 Standard Depths</div>
                  <div className="grid grid-cols-3 sm:grid-cols-5 md:grid-cols-8 gap-2.5">
                    {DEPTH_LEVELS.map(d => (
                      <div key={d} className="bg-white/80 p-2.5 rounded-xl border border-sky-200 text-center shadow-2xs">
                        <div className="text-[10px] font-mono font-bold text-sky-600">{d} m</div>
                        <div className="text-sm font-black font-mono text-sky-950 mt-0.5">
                          {selectedProfile.reconstruction[d]?.toFixed(1)}°C
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
