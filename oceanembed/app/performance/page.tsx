'use client';
import { useState } from 'react';
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, RadarChart, Radar, PolarGrid, PolarAngleAxis, ReferenceLine } from 'recharts';
import { DEMO_PROFILES, computeMetrics } from '@/lib/ocean-simulation';
import { DEPTH_LEVELS } from '@/lib/constants';
import { AlertTriangle } from 'lucide-react';

// Aggregate depth-wise metrics across all profiles
function aggregateDepthwiseMetrics() {
  return DEPTH_LEVELS.map(d => {
    const errors = DEMO_PROFILES.map(p => p.reconstruction[d] - (p.argo_reference[d] ?? p.reconstruction[d]));
    const rmse = Math.sqrt(errors.reduce((s, e) => s + e * e, 0) / errors.length);
    const bias = errors.reduce((s, e) => s + e, 0) / errors.length;
    const corr = 0.92 + (1 - d / 1500) * 0.06; // Representative: shallower levels better correlated
    return { depth: d, rmse: +rmse.toFixed(3), bias: +bias.toFixed(3), correlation: +corr.toFixed(3) };
  });
}

const SEASONAL_DATA = [
  { season: 'Winter', rmse: 0.58, bias: 0.03, correlation: 0.96, region: 'Arabian Sea' },
  { season: 'Pre-Monsoon', rmse: 0.72, bias: 0.08, correlation: 0.94, region: 'Arabian Sea' },
  { season: 'Monsoon', rmse: 0.81, bias: 0.12, correlation: 0.92, region: 'Arabian Sea' },
  { season: 'Post-Monsoon', rmse: 0.63, bias: 0.05, correlation: 0.95, region: 'Arabian Sea' },
];
const SEASONAL_BOB = [
  { season: 'Winter', rmse: 0.64, bias: 0.05, correlation: 0.95, region: 'Bay of Bengal' },
  { season: 'Pre-Monsoon', rmse: 0.76, bias: 0.10, correlation: 0.93, region: 'Bay of Bengal' },
  { season: 'Monsoon', rmse: 0.92, bias: 0.18, correlation: 0.90, region: 'Bay of Bengal' },
  { season: 'Post-Monsoon', rmse: 0.70, bias: 0.08, correlation: 0.93, region: 'Bay of Bengal' },
];

const DepthAxisTick = ({ x, y, payload }: any) => (
  <text x={x} y={y} fill="#64748b" fontSize={9} textAnchor="end" dy={3}>{payload.value}m</text>
);

const TABS = ['OVERVIEW', 'DEPTH-WISE', 'REGIONAL', 'SEASONAL', 'ERROR DISTRIBUTION'];

export default function PerformancePage() {
  const [tab, setTab] = useState('OVERVIEW');
  const depthwise = aggregateDepthwiseMetrics();

  const overviewMetrics = [
    { label: 'Overall RMSE', val: '0.68', unit: '°C', desc: 'All depths, all regions', color: 'text-blue-300' },
    { label: 'Overall MAE', val: '0.51', unit: '°C', desc: 'Mean absolute error', color: 'text-violet-300' },
    { label: 'Overall Bias', val: '+0.07', unit: '°C', desc: 'Slight warm bias', color: 'text-amber-300' },
    { label: 'Correlation', val: '0.943', unit: '', desc: 'Pearson r, all levels', color: 'text-green-300' },
    { label: 'Surface RMSE', val: '0.42', unit: '°C', desc: '0–30 m', color: 'text-cyan-300' },
    { label: 'Thermocline RMSE', val: '0.89', unit: '°C', desc: '50–200 m', color: 'text-orange-300' },
    { label: 'Deep RMSE', val: '0.43', unit: '°C', desc: '300–1000 m', color: 'text-slate-300' },
    { label: 'Profiles Validated', val: '16', unit: '', desc: 'Demo dataset size', color: 'text-teal-300' },
  ];

  return (
    <div className="min-h-screen py-8 ocean-gradient grid-bg">
      <div className="max-w-screen-xl mx-auto px-6 py-8">
        <div className="mb-6">
          <div className="section-label mb-1">Model Performance Report</div>
          <h1 className="text-3xl font-black text-sky-950 tracking-tight mb-2">Scientific Skill Assessment</h1>
          <p className="text-sm text-slate-400 max-w-2xl">
            Comprehensive evaluation of OceanEmbed reconstruction skill across depth levels, regions, and seasons.
          </p>
          <div className="mt-2 flex gap-2 flex-wrap">
            <div className="demo-banner">DEMONSTRATION MODE</div>
            <div className="demo-banner" style={{ color: '#fbbf24', borderColor: 'rgba(251,191,36,0.3)', background: 'rgba(251,191,36,0.08)' }}>
              All metrics are ILLUSTRATIVE — computed from representative synthetic demo data
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex flex-wrap gap-1 mb-6">
          {TABS.map(t => (
            <button key={t} onClick={() => setTab(t)}
              className={`px-4 py-2 text-[11px] font-bold tracking-widest uppercase rounded transition-all ${
                tab === t ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30' : 'text-slate-500 border border-[rgba(14,165,233,0.1)] hover:text-slate-300'
              }`}>{t}</button>
          ))}
        </div>

        {/* Overview */}
        {tab === 'OVERVIEW' && (
          <div className="space-y-6">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {overviewMetrics.map(m => (
                <div key={m.label} className="glass-panel p-4 text-center">
                  <div className="text-[9px] text-slate-500 uppercase tracking-wider mb-1">{m.label}</div>
                  <div className={`text-2xl font-bold font-mono ${m.color}`}>
                    {m.val}<span className="text-xs text-slate-500">{m.unit}</span>
                  </div>
                  <div className="text-[9px] text-slate-600 mt-1">{m.desc}</div>
                </div>
              ))}
            </div>

            {/* Radar chart overview */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="glass-panel p-4">
                <div className="section-label mb-3">Skill Profile by Metric</div>
                <ResponsiveContainer width="100%" height={280}>
                  <RadarChart data={[
                    { metric: 'RMSE\nSkill', val: 0.72 },
                    { metric: 'MAE\nSkill', val: 0.80 },
                    { metric: 'Correlation', val: 0.943 },
                    { metric: 'Surface\nAccuracy', val: 0.88 },
                    { metric: 'Thermocline\nDetection', val: 0.70 },
                    { metric: 'Deep\nAccuracy', val: 0.84 },
                  ]}>
                    <PolarGrid stroke="rgba(14,165,233,0.15)" />
                    <PolarAngleAxis dataKey="metric" tick={{ fill: '#64748b', fontSize: 9 }} />
                    <Radar name="OceanEmbed" dataKey="val" stroke="#06b6d4" fill="#06b6d4" fillOpacity={0.2} />
                  </RadarChart>
                </ResponsiveContainer>
              </div>
              <div className="glass-panel p-4">
                <div className="section-label mb-3">RMSE by Depth Zone</div>
                <ResponsiveContainer width="100%" height={280}>
                  <BarChart data={[
                    { zone: '0–30m', rmse: 0.42, label: 'Surface' },
                    { zone: '50–200m', rmse: 0.89, label: 'Thermocline' },
                    { zone: '300–1000m', rmse: 0.43, label: 'Deep' },
                  ]} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(14,165,233,0.08)" />
                    <XAxis dataKey="zone" tick={{ fill: '#64748b', fontSize: 10 }} stroke="rgba(14,165,233,0.2)" />
                    <YAxis tick={{ fill: '#64748b', fontSize: 9 }} stroke="rgba(14,165,233,0.2)" tickFormatter={v => `${v}°C`} />
                    <Tooltip contentStyle={{ background: 'rgba(255,255,255,0.95)', border: '1px solid rgba(14,165,233,0.3)', borderRadius: 8, fontSize: 11 }}
                      formatter={(v: any) => [`${v}°C`, 'RMSE']} />
                    <Bar dataKey="rmse" fill="#06b6d4" fillOpacity={0.7} radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        )}

        {/* Depth-wise */}
        {tab === 'DEPTH-WISE' && (
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {['rmse', 'bias', 'correlation'].map(metric => (
                <div key={metric} className="glass-panel p-4">
                  <div className="section-label mb-3">Depth-wise {metric.toUpperCase()}</div>
                  <ResponsiveContainer width="100%" height={360}>
                    <LineChart data={depthwise} layout="vertical" margin={{ top: 5, right: 20, left: 45, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(14,165,233,0.08)" />
                      <XAxis type="number" tick={{ fill: '#64748b', fontSize: 9 }} stroke="rgba(14,165,233,0.2)"
                        tickFormatter={v => metric === 'correlation' ? v.toFixed(2) : `${v.toFixed(2)}${metric !== 'correlation' ? '°' : ''}`} />
                      <YAxis type="number" dataKey="depth" reversed domain={[0, 1000]}
                        tick={<DepthAxisTick />} stroke="rgba(14,165,233,0.2)" />
                      {metric === 'bias' && <ReferenceLine x={0} stroke="rgba(255,255,255,0.15)" strokeDasharray="4 4" />}
                      <Tooltip contentStyle={{ background: 'rgba(4,20,40,0.95)', border: '1px solid rgba(14,165,233,0.3)', borderRadius: 8, fontSize: 11 }}
                        labelFormatter={v => `Depth: ${v}m`} />
                      <Line type="monotone" dataKey={metric}
                        stroke={metric === 'rmse' ? '#3b82f6' : metric === 'bias' ? '#f59e0b' : '#22c55e'}
                        strokeWidth={2} dot={{ r: 3 }} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Regional */}
        {tab === 'REGIONAL' && (
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {[
                { title: 'Arabian Sea', data: SEASONAL_DATA, color: '#f97316' },
                { title: 'Bay of Bengal', data: SEASONAL_BOB, color: '#06b6d4' },
              ].map(r => (
                <div key={r.title} className="glass-panel p-4">
                  <div className="section-label mb-3">{r.title}</div>
                  <div className="grid grid-cols-3 gap-2 mb-4">
                    {[
                      { label: 'RMSE', val: (r.data.reduce((s, d) => s + d.rmse, 0) / r.data.length).toFixed(2), unit: '°C' },
                      { label: 'Bias', val: (r.data.reduce((s, d) => s + d.bias, 0) / r.data.length).toFixed(3), unit: '°C' },
                      { label: 'r', val: (r.data.reduce((s, d) => s + d.correlation, 0) / r.data.length).toFixed(3), unit: '' },
                    ].map(m => (
                      <div key={m.label} className="glass-panel-strong p-2 text-center">
                        <div className="text-[9px] text-slate-500">{m.label}</div>
                        <div className="text-base font-bold font-mono" style={{ color: r.color }}>{m.val}{m.unit}</div>
                      </div>
                    ))}
                  </div>
                  <ResponsiveContainer width="100%" height={200}>
                    <BarChart data={r.data} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(14,165,233,0.08)" />
                      <XAxis dataKey="season" tick={{ fill: '#64748b', fontSize: 9 }} stroke="rgba(14,165,233,0.2)" />
                      <YAxis tick={{ fill: '#64748b', fontSize: 9 }} stroke="rgba(14,165,233,0.2)" />
                      <Tooltip contentStyle={{ background: 'rgba(4,20,40,0.95)', border: '1px solid rgba(14,165,233,0.3)', borderRadius: 8, fontSize: 11 }} />
                      <Bar dataKey="rmse" name="RMSE (°C)" fill={r.color} fillOpacity={0.7} radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Seasonal */}
        {tab === 'SEASONAL' && (
          <div className="glass-panel p-4">
            <div className="section-label mb-4">Seasonal Performance — RMSE by Season and Region</div>
            <ResponsiveContainer width="100%" height={320}>
              <BarChart data={[...SEASONAL_DATA, ...SEASONAL_BOB].reduce((acc, d) => {
                const existing = acc.find((e: any) => e.season === d.season);
                if (existing) { existing[d.region] = d.rmse; }
                else acc.push({ season: d.season, [d.region]: d.rmse });
                return acc;
              }, [] as any[])} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(14,165,233,0.08)" />
                <XAxis dataKey="season" tick={{ fill: '#64748b', fontSize: 10 }} stroke="rgba(14,165,233,0.2)" />
                <YAxis tick={{ fill: '#64748b', fontSize: 9 }} tickFormatter={v => `${v}°C`} stroke="rgba(14,165,233,0.2)" />
                <Tooltip contentStyle={{ background: 'rgba(255,255,255,0.95)', border: '1px solid rgba(14,165,233,0.3)', borderRadius: 8, fontSize: 11 }}
                  formatter={(v: any) => [`${v}°C`, '']} />
                <Legend wrapperStyle={{ fontSize: 10, color: '#64748b' }} />
                <Bar dataKey="Arabian Sea" fill="#f97316" fillOpacity={0.7} radius={[3, 3, 0, 0]} />
                <Bar dataKey="Bay of Bengal" fill="#06b6d4" fillOpacity={0.7} radius={[3, 3, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
            <div className="mt-4 text-[10px] text-slate-500">
              Monsoon season shows higher RMSE likely due to increased dynamical variability and reduced satellite observation quality under heavy cloud cover.
            </div>
          </div>
        )}

        {/* Error distribution */}
        {tab === 'ERROR DISTRIBUTION' && (
          <div className="space-y-4">
            <div className="glass-panel p-4">
              <div className="section-label mb-3">Error Distribution by Depth Level</div>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={depthwise.filter((_, i) => i % 2 === 0)} margin={{ top: 5, right: 20, left: 20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(14,165,233,0.08)" />
                  <XAxis dataKey="depth" tickFormatter={v => `${v}m`} tick={{ fill: '#64748b', fontSize: 9 }} stroke="rgba(14,165,233,0.2)" />
                  <YAxis tick={{ fill: '#64748b', fontSize: 9 }} stroke="rgba(14,165,233,0.2)" tickFormatter={v => `${v.toFixed(2)}°`} />
                  <Tooltip contentStyle={{ background: 'rgba(255,255,255,0.95)', border: '1px solid rgba(14,165,233,0.3)', borderRadius: 8, fontSize: 11 }}
                    formatter={(v: any) => [`${v?.toFixed(3)}°C`, '']} />
                  <Bar dataKey="rmse" name="RMSE" fill="#3b82f6" fillOpacity={0.7} radius={[4, 4, 0, 0]} />
                  <Bar dataKey="bias" name="Bias" fill="#f59e0b" fillOpacity={0.7} radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
            <div className="glass-panel p-4 border border-amber-500/20 bg-amber-500/5">
              <div className="flex gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-400 flex-shrink-0" />
                <div className="text-xs text-amber-300/80 leading-relaxed">
                  All performance metrics in this report are computed from representative synthetic demo data.
                  Real performance metrics would require training on historical satellite + GLORYS data and
                  validation against held-out ARGO float profiles. This report demonstrates the intended
                  evaluation framework.
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
