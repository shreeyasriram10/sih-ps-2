'use client';
import { useState, useEffect } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ScatterChart, Scatter, ReferenceLine } from 'recharts';
import { DEMO_PROFILES, DEMO_DATES, DATE_LABELS, computeMetrics, OceanProfile } from '@/lib/ocean-simulation';
import { DEPTH_LEVELS } from '@/lib/constants';
import { CheckCircle2, ArrowDown, AlertTriangle } from 'lucide-react';

const VALIDATION_STEPS = [
  { label: 'ARGO PROFILE', desc: 'Independent in-situ float profile loaded' },
  { label: 'QUALITY CONTROL', desc: 'Density inversion checks, spike tests, gross range' },
  { label: 'TEMPORAL MATCHING', desc: 'Model timestep co-located within ±12 hours' },
  { label: 'SPATIAL MATCHING', desc: 'Nearest 0.25° grid cell identified' },
  { label: 'MODEL EXTRACTION', desc: 'Reconstructed T(z) extracted at matching grid cell' },
  { label: 'ERROR CALCULATION', desc: 'Point-wise difference: Model − ARGO at each depth' },
  { label: 'SKILL METRICS', desc: 'RMSE, MAE, Bias, Correlation computed depth-wise' },
];

const DepthAxisTick = ({ x, y, payload }: any) => (
  <text x={x} y={y} fill="#64748b" fontSize={9} textAnchor="end" dy={3}>{payload.value}m</text>
);

export default function ValidationPage() {
  const [region, setRegion] = useState('Arabian Sea');
  const [dateIdx, setDateIdx] = useState(0);
  const [profileIdx, setProfileIdx] = useState(0);

  const regionProfiles = DEMO_PROFILES.filter(p => p.region === region && p.date === DEMO_DATES[dateIdx]);
  const profile: OceanProfile | null = regionProfiles[profileIdx] ?? null;
  const metrics = profile ? computeMetrics(profile) : null;

  const profileData = profile ? DEPTH_LEVELS.map(d => ({
    depth: d,
    model: profile.reconstruction[d],
    argo: profile.argo_reference[d],
    error: parseFloat((profile.reconstruction[d] - (profile.argo_reference[d] ?? 0)).toFixed(3)),
  })) : [];

  const scatterData = profile ? DEPTH_LEVELS.map(d => ({
    x: profile.argo_reference[d],
    y: profile.reconstruction[d],
    depth: d,
  })) : [];

  const depthRmse = profile ? DEPTH_LEVELS.map(d => ({
    depth: d,
    rmse: Math.abs(profile.reconstruction[d] - (profile.argo_reference[d] ?? profile.reconstruction[d])),
  })) : [];

  return (
    <div className="min-h-screen py-8 ocean-gradient grid-bg">
      <div className="max-w-screen-xl mx-auto px-6 py-8">
        <div className="mb-6">
          <div className="section-label mb-1">ARGO Validation Center</div>
          <h1 className="text-3xl font-black text-sky-950 tracking-tight mb-2">Independent Validation Against ARGO Float Profiles</h1>
          <p className="text-sm text-slate-400 max-w-2xl">
            Model reconstructions are compared against independent ARGO float observations — profiles not used during training.
            This page demonstrates the intended validation workflow.
          </p>
          <div className="mt-2 flex gap-2 flex-wrap">
            <div className="demo-banner">ILLUSTRATIVE DEMO METRICS — NOT TRAINING/VALIDATION RESULTS</div>
            <div className="demo-banner" style={{ color: '#f87171', borderColor: 'rgba(248,113,113,0.3)', background: 'rgba(248,113,113,0.08)' }}>
              ARGO profiles here are synthetic representative data
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-4 gap-6">
          {/* Controls */}
          <div className="xl:col-span-1 space-y-4">
            {/* Validation workflow */}
            <div className="glass-panel p-4">
              <div className="section-label mb-3">Validation Workflow</div>
              <div className="space-y-1">
                {VALIDATION_STEPS.map((s, i) => (
                  <div key={i}>
                    <div className="flex items-start gap-2 py-1.5">
                      <CheckCircle2 className="w-3 h-3 text-green-400 mt-0.5 flex-shrink-0" />
                      <div>
                        <div className="text-[10px] font-bold text-green-300">{s.label}</div>
                        <div className="text-[9px] text-slate-500">{s.desc}</div>
                      </div>
                    </div>
                    {i < VALIDATION_STEPS.length - 1 && (
                      <div className="flex justify-center">
                        <ArrowDown className="w-2.5 h-2.5 text-green-600/40" />
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Selectors */}
            <div className="glass-panel p-4">
              <div className="section-label mb-2">Region</div>
              <div className="space-y-1 mb-3">
                {['Arabian Sea', 'Bay of Bengal'].map(r => (
                  <button key={r} onClick={() => { setRegion(r); setProfileIdx(0); }}
                    className={`w-full px-3 py-1.5 text-[11px] text-left rounded transition-all ${
                      region === r ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30' : 'text-slate-400 border border-[rgba(14,165,233,0.1)]'
                    }`}>{r}</button>
                ))}
              </div>

              <div className="section-label mb-2">Date</div>
              <div className="space-y-1 mb-3">
                {DEMO_DATES.map((d, i) => (
                  <button key={d} onClick={() => setDateIdx(i)}
                    className={`w-full px-3 py-1.5 text-[10px] text-left rounded transition-all ${
                      dateIdx === i ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30' : 'text-slate-400 border border-[rgba(14,165,233,0.1)]'
                    }`}>{DATE_LABELS[d]}</button>
                ))}
              </div>

              <div className="section-label mb-2">ARGO Profile</div>
              <div className="space-y-1 max-h-36 overflow-y-auto">
                {regionProfiles.map((p, i) => (
                  <button key={i} onClick={() => setProfileIdx(i)}
                    className={`w-full px-3 py-1.5 text-[10px] text-left rounded font-mono transition-all ${
                      profileIdx === i ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30' : 'text-slate-400 border border-[rgba(14,165,233,0.1)]'
                    }`}>{p.lat}°N, {p.lon}°E</button>
                ))}
              </div>
            </div>

            {/* ARGO availability note */}
            <div className="glass-panel p-3 border border-amber-500/20 bg-amber-500/5">
              <div className="flex gap-2">
                <AlertTriangle className="w-3.5 h-3.5 text-amber-400 flex-shrink-0 mt-0.5" />
                <div className="text-[10px] text-amber-300/80 leading-relaxed">
                  In a production system, ARGO validation is performed against real float observations.
                  Synthetic profiles are used here for demonstration.
                </div>
              </div>
            </div>
          </div>

          {/* Charts */}
          {profile && metrics && (
            <div className="xl:col-span-3 space-y-4">
              {/* Skill metrics */}
              <div className="glass-panel p-4">
                <div className="flex justify-between items-center mb-4">
                  <div className="section-label">Skill Metrics — {profile.lat}°N, {profile.lon}°E</div>
                  <div className="demo-banner">ILLUSTRATIVE DEMO METRICS</div>
                </div>
                <div className="grid grid-cols-4 gap-3">
                  {[
                    { label: 'RMSE', val: metrics.rmse, unit: '°C', desc: 'Root mean square error', color: 'text-blue-300' },
                    { label: 'MAE', val: metrics.mae, unit: '°C', desc: 'Mean absolute error', color: 'text-violet-300' },
                    { label: 'BIAS', val: metrics.bias, unit: '°C', desc: 'Mean signed difference', color: 'text-amber-300' },
                    { label: 'r', val: metrics.correlation, unit: '', desc: 'Pearson correlation', color: 'text-green-300' },
                  ].map(m => (
                    <div key={m.label} className="glass-panel-strong p-4 text-center">
                      <div className="text-[9px] text-slate-500 uppercase tracking-wider mb-1">{m.label}</div>
                      <div className={`text-2xl font-bold font-mono ${m.color}`}>
                        {m.val?.toFixed(3)}<span className="text-xs text-slate-500 ml-0.5">{m.unit}</span>
                      </div>
                      <div className="text-[9px] text-slate-600 mt-1">{m.desc}</div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Profiles comparison */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="glass-panel p-4">
                  <div className="section-label mb-3">Model vs ARGO Profile</div>
                  <ResponsiveContainer width="100%" height={320}>
                    <LineChart data={profileData} layout="vertical" margin={{ top: 5, right: 20, left: 45, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(14,165,233,0.08)" />
                      <XAxis type="number" domain={['auto', 'auto']} tickFormatter={v => `${v}°C`}
                        tick={{ fill: '#64748b', fontSize: 9 }} stroke="rgba(14,165,233,0.2)" />
                      <YAxis type="number" dataKey="depth" reversed domain={[0, 1000]}
                        tick={<DepthAxisTick />} stroke="rgba(14,165,233,0.2)" />
                      <Tooltip contentStyle={{ background: 'rgba(255,255,255,0.95)', border: '1px solid rgba(14,165,233,0.3)', borderRadius: 8, fontSize: 11 }}
                        labelFormatter={v => `Depth: ${v}m`}
                        formatter={(v: any, name: any) => [`${v?.toFixed(2)}°C`, name === 'model' ? 'Model' : 'ARGO']} />
                      <Line type="monotone" dataKey="model" stroke="#06b6d4" strokeWidth={2} dot={{ r: 2.5, fill: '#06b6d4' }} name="model" />
                      <Line type="monotone" dataKey="argo" stroke="#f59e0b" strokeWidth={1.5} strokeDasharray="5 3" dot={{ r: 2, fill: '#f59e0b' }} name="argo" />
                    </LineChart>
                  </ResponsiveContainer>
                  <div className="flex gap-4 mt-2">
                    <div className="flex items-center gap-1.5"><div className="w-6 h-0.5 bg-cyan-400" /><span className="text-[10px] text-slate-400">Model</span></div>
                    <div className="flex items-center gap-1.5"><div className="w-6 h-0.5 bg-amber-400" style={{ border: '1px dashed #f59e0b', height: 0 }} /><span className="text-[10px] text-slate-400">ARGO</span></div>
                  </div>
                </div>

                <div className="glass-panel p-4">
                  <div className="section-label mb-3">Residual (Error) Profile</div>
                  <ResponsiveContainer width="100%" height={320}>
                    <LineChart data={profileData} layout="vertical" margin={{ top: 5, right: 20, left: 45, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(14,165,233,0.08)" />
                      <XAxis type="number" tickFormatter={v => `${v}°C`}
                        tick={{ fill: '#64748b', fontSize: 9 }} stroke="rgba(14,165,233,0.2)" />
                      <YAxis type="number" dataKey="depth" reversed domain={[0, 1000]}
                        tick={<DepthAxisTick />} stroke="rgba(14,165,233,0.2)" />
                      <ReferenceLine x={0} stroke="rgba(255,255,255,0.2)" strokeDasharray="4 4" />
                      <Tooltip contentStyle={{ background: 'rgba(255,255,255,0.95)', border: '1px solid rgba(14,165,233,0.3)', borderRadius: 8, fontSize: 11 }}
                        labelFormatter={v => `Depth: ${v}m`}
                        formatter={(v: any) => [`${v?.toFixed(3)}°C`, 'Model − ARGO']} />
                      <Line type="monotone" dataKey="error" stroke="#f87171" strokeWidth={2} dot={{ r: 2, fill: '#f87171' }} name="error" />
                    </LineChart>
                  </ResponsiveContainer>
                  <div className="text-[10px] text-slate-500 mt-2 text-center">Model − ARGO residual at each depth</div>
                </div>
              </div>

              {/* Depth-wise RMSE */}
              <div className="glass-panel p-4">
                <div className="section-label mb-3">Depth-wise Error Magnitude</div>
                <ResponsiveContainer width="100%" height={180}>
                  <LineChart data={depthRmse} layout="vertical" margin={{ top: 5, right: 30, left: 45, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(14,165,233,0.08)" />
                    <XAxis type="number" tickFormatter={v => `${v.toFixed(2)}°C`}
                      tick={{ fill: '#64748b', fontSize: 9 }} stroke="rgba(14,165,233,0.2)" />
                    <YAxis type="number" dataKey="depth" reversed domain={[0, 1000]}
                      tick={<DepthAxisTick />} stroke="rgba(14,165,233,0.2)" />
                    <Tooltip contentStyle={{ background: 'rgba(255,255,255,0.95)', border: '1px solid rgba(14,165,233,0.3)', borderRadius: 8, fontSize: 11 }}
                      labelFormatter={v => `Depth: ${v}m`}
                      formatter={(v: any) => [`${v?.toFixed(3)}°C`, 'Error Magnitude']} />
                    <Line type="monotone" dataKey="rmse" stroke="#a855f7" strokeWidth={2} dot={{ r: 2.5, fill: '#a855f7' }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>

              {/* Observed vs predicted scatter */}
              <div className="glass-panel p-4">
                <div className="section-label mb-3">Observed vs Predicted Scatter</div>
                <ResponsiveContainer width="100%" height={220}>
                  <ScatterChart margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(14,165,233,0.08)" />
                    <XAxis type="number" dataKey="x" name="ARGO (°C)" tickFormatter={v => `${v.toFixed(0)}°C`}
                      label={{ value: 'ARGO Observed (°C)', fill: '#64748b', fontSize: 9, dy: 14 }}
                      tick={{ fill: '#64748b', fontSize: 9 }} stroke="rgba(14,165,233,0.2)" />
                    <YAxis type="number" dataKey="y" name="Model (°C)" tickFormatter={v => `${v.toFixed(0)}°C`}
                      label={{ value: 'Model Reconstructed (°C)', fill: '#64748b', fontSize: 9, angle: -90, dx: -14 }}
                      tick={{ fill: '#64748b', fontSize: 9 }} stroke="rgba(14,165,233,0.2)" />
                    <ReferenceLine segment={[{ x: 2, y: 2 }, { x: 30, y: 30 }]} stroke="rgba(255,255,255,0.15)" strokeDasharray="4 4" />
                    <Tooltip contentStyle={{ background: 'rgba(255,255,255,0.95)', border: '1px solid rgba(14,165,233,0.3)', borderRadius: 8, fontSize: 11 }}
                      formatter={(v: any, name: any) => [`${v?.toFixed(2)}°C`, name]} />
                    <Scatter data={scatterData} fill="#06b6d4" fillOpacity={0.8} r={4} />
                  </ScatterChart>
                </ResponsiveContainer>
                <div className="text-[10px] text-slate-500 text-center">Perfect agreement would lie on the 1:1 diagonal line</div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
