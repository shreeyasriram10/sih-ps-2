'use client';

import { useState } from 'react';
import { DEMO_PROFILES, DEMO_DATES, DATE_LABELS } from '@/lib/ocean-simulation';
import { Thermometer, Layers, Activity, Info, TrendingUp, ChevronDown, ChevronUp, ShieldCheck } from 'lucide-react';

interface Insight {
  id: string;
  category: string;
  icon: any;
  iconColor: string;
  title: string;
  observation: string;
  evidence: string;
  confidence: 'HIGH' | 'MODERATE' | 'LOW';
  validationStatus: string;
  scientificContext: string;
  tag: string;
}

function generateInsights(profiles: typeof DEMO_PROFILES): Insight[] {
  if (profiles.length === 0) return [];
  const avgSST = profiles.reduce((s, p) => s + p.surface.sst, 0) / profiles.length;
  const avgThermocline = profiles.reduce((s, p) => s + p.thermocline_depth, 0) / profiles.length;
  const arabianProfiles = profiles.filter(p => p.region === 'Arabian Sea');
  const bobProfiles = profiles.filter(p => p.region === 'Bay of Bengal');

  return [
    {
      id: 'thermal_structure',
      category: 'THERMAL STRUCTURE',
      icon: Thermometer,
      iconColor: 'text-orange-600',
      title: 'Surface–Deep Temperature Gradient Detected',
      observation: `Mean surface temperature across selected profiles: ${avgSST.toFixed(1)}°C. Reconstructed temperature at 500m averages below 10°C.`,
      evidence: 'Depth profile reconstruction — illustrative demo data',
      confidence: 'MODERATE',
      validationStatus: 'DIAGNOSTIC — Validated against representative ARGO profiles',
      scientificContext: 'Large vertical temperature gradients are characteristic of the tropical North Indian Ocean. The warm surface mixed layer overlies a thermocline beneath which temperature decreases rapidly.',
      tag: 'DERIVED DIAGNOSTIC',
    },
    {
      id: 'thermocline',
      category: 'THERMOCLINE',
      icon: Layers,
      iconColor: 'text-sky-600',
      title: `Mean Thermocline Depth: ~${avgThermocline.toFixed(0)} m`,
      observation: `The model identifies a seasonal thermocline centered around ${avgThermocline.toFixed(0)}m depth in the selected profiles. Arabian Sea thermocline is deeper than Bay of Bengal in this representative dataset.`,
      evidence: 'Depth-wise temperature gradient analysis from reconstructed profiles',
      confidence: 'MODERATE',
      validationStatus: 'DIAGNOSTIC — Not an operational measurement',
      scientificContext: 'The thermocline depth in the North Indian Ocean varies seasonally and spatially, driven by monsoonal forcing, upwelling (Arabian Sea), and river runoff (Bay of Bengal). Thermocline depth is a key parameter for fisheries, cyclone intensity, and monsoon prediction.',
      tag: 'DERIVED DIAGNOSTIC',
    },
    {
      id: 'regional_contrast',
      category: 'STRATIFICATION',
      icon: Activity,
      iconColor: 'text-blue-600',
      title: 'Arabian Sea vs Bay of Bengal Stratification Contrast',
      observation: arabianProfiles.length > 0 && bobProfiles.length > 0
        ? `Arabian Sea profiles show salinity of ~${arabianProfiles[0]?.surface.sss.toFixed(1)} PSU vs Bay of Bengal ~${bobProfiles[0]?.surface.sss.toFixed(1)} PSU. BoB is more stratified due to freshwater influx.`
        : 'Select profiles from both regions to compare stratification.',
      evidence: 'Surface salinity and reconstructed density structure — illustrative',
      confidence: 'MODERATE',
      validationStatus: 'DIAGNOSTIC — Consistent with known oceanographic patterns',
      scientificContext: 'The Bay of Bengal receives substantial freshwater discharge from rivers (Ganga, Brahmaputra), creating a low-salinity surface layer that inhibits vertical mixing and intensifies stratification — a known factor in tropical cyclone intensification.',
      tag: 'PHYSICAL CONTEXT',
    },
    {
      id: 'data_quality',
      category: 'DATA CONFIDENCE',
      icon: Info,
      iconColor: 'text-emerald-600',
      title: 'Input Data Coverage: Complete (Demo)',
      observation: 'All 7 input channels (SST, SSS, SSH, Currents, Winds) are available for the selected domain and date.',
      evidence: 'Demo data coverage — all variables present',
      confidence: 'HIGH',
      validationStatus: 'DATA QUALITY — Demo mode, not operational',
      scientificContext: 'Real-time operational systems would report data gaps due to cloud cover (SST), satellite revisit time (SSS), or processing latency. Missing variable handling would fall back to climatological infilling.',
      tag: 'OPERATIONAL NOTE',
    },
    {
      id: 'argo_validation',
      category: 'VALIDATION STATUS',
      icon: TrendingUp,
      iconColor: 'text-violet-600',
      title: 'ARGO Validation Available (Demo Profiles)',
      observation: `${DEMO_PROFILES.filter(p => p.date === DEMO_DATES[0]).length} representative ARGO-style profiles available for the selected date. Full validation analysis available in ARGO Validation Center.`,
      evidence: 'Demo ARGO profile set — not real float data',
      confidence: 'LOW',
      validationStatus: 'DEMO VALIDATION — Synthetic ARGO profiles',
      scientificContext: 'Real validation would require co-location of model reconstruction with actual Argo float profiles within ±12 hours and ±0.5° horizontally. India maintains an active Argo program through INCOIS.',
      tag: 'VALIDATION NOTE',
    },
  ];
}

function ConfidenceBadge({ level }: { level: 'HIGH' | 'MODERATE' | 'LOW' }) {
  const colors: Record<string, string> = {
    HIGH: 'bg-emerald-100 text-emerald-800 border-emerald-300 font-extrabold',
    MODERATE: 'bg-amber-100 text-amber-900 border-amber-300 font-extrabold',
    LOW: 'bg-rose-100 text-rose-800 border-rose-300 font-extrabold',
  };
  return (
    <span className={`px-2.5 py-0.5 text-[10px] font-black tracking-wider rounded-md border ${colors[level]}`}>
      {level} CONFIDENCE
    </span>
  );
}

export default function InsightsPage() {
  const [region, setRegion] = useState('Arabian Sea');
  const [dateIdx, setDateIdx] = useState(0);
  const [expandedId, setExpandedId] = useState<string | null>('thermal_structure');

  const profiles = DEMO_PROFILES.filter(p => p.region === region && p.date === DEMO_DATES[dateIdx]);
  const insights = generateInsights(profiles);

  const coverage = {
    dataCoverage: 100,
    missingness: 0,
    inputCompleteness: 100,
    argoAvailability: profiles.length,
  };

  return (
    <div className="min-h-screen py-8 ocean-gradient grid-bg">
      <div className="max-w-screen-xl mx-auto px-6 py-8">
        <div className="mb-6">
          <div className="section-label mb-1">Ocean Insight Center</div>
          <h1 className="text-3xl font-black text-sky-950 tracking-tight mb-2">Scientific Interpretation Layer</h1>
          <p className="text-sm font-semibold text-sky-800/80 max-w-2xl">
            Scientifically grounded interpretation of model outputs. All diagnostics are clearly labelled by source, evidence base, and confidence level.
          </p>
          <div className="mt-3 flex gap-2 flex-wrap">
            <div className="demo-banner">DIAGNOSTIC — NOT AN OPERATIONAL FORECAST</div>
            <div className="demo-banner" style={{ color: '#b91c1c', borderColor: 'rgba(185,28,28,0.3)', background: 'rgba(254,226,226,0.8)' }}>
              No disaster warnings — no fake alerts
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-4 gap-6">
          {/* Controls */}
          <div className="xl:col-span-1 space-y-5">
            <div className="glass-strong p-5">
              <div className="section-label mb-3">Region</div>
              <div className="space-y-1.5 mb-5">
                {['Arabian Sea', 'Bay of Bengal', 'North Indian Ocean'].map(r => (
                  <button key={r} onClick={() => setRegion(r)}
                    className={`w-full px-3.5 py-2 text-xs font-bold text-left rounded-xl transition-all ${
                      region === r ? 'bg-sky-600 text-white shadow-sm font-black' : 'bg-white/80 text-sky-950 border border-sky-200 hover:bg-sky-50'
                    }`}>{r}</button>
                ))}
              </div>
              <div className="section-label mb-3">Date</div>
              <div className="space-y-1.5">
                {DEMO_DATES.map((d, i) => (
                  <button key={d} onClick={() => setDateIdx(i)}
                    className={`w-full px-3.5 py-2 text-xs font-bold text-left rounded-xl transition-all ${
                      dateIdx === i ? 'bg-sky-600 text-white shadow-sm font-black' : 'bg-white/80 text-sky-950 border border-sky-200 hover:bg-sky-50'
                    }`}>{DATE_LABELS[d]}</button>
                ))}
              </div>
            </div>

            {/* Quality panel */}
            <div className="glass-strong p-5">
              <div className="section-label mb-3">Data & Model Quality</div>
              <div className="space-y-3.5">
                {[
                  { label: 'Data Coverage', val: coverage.dataCoverage, unit: '%', color: '#16a34a' },
                  { label: 'Missingness', val: coverage.missingness, unit: '%', color: '#ea580c' },
                  { label: 'Input Completeness', val: coverage.inputCompleteness, unit: '%', color: '#16a34a' },
                  { label: 'ARGO Profiles', val: coverage.argoAvailability, unit: ' profiles', color: '#0284c7' },
                ].map(q => (
                  <div key={q.label}>
                    <div className="flex justify-between text-xs font-bold mb-1">
                      <span className="text-sky-900">{q.label}</span>
                      <span className="font-mono font-black" style={{ color: q.color }}>{q.val}{q.unit}</span>
                    </div>
                    {q.unit === '%' && (
                      <div className="h-1.5 bg-sky-100 rounded-full overflow-hidden border border-sky-200">
                        <div className="h-full rounded-full" style={{ width: `${q.val}%`, background: q.color }} />
                      </div>
                    )}
                  </div>
                ))}
              </div>
              <div className="mt-4 pt-3 border-t border-sky-200 text-[10px] font-semibold text-sky-800/80 leading-relaxed">
                Note: Data Quality and Model Confidence are distinct concepts. High data coverage does not guarantee high model skill.
              </div>
            </div>

            {/* Categories */}
            <div className="glass-strong p-5">
              <div className="section-label mb-3">Categories</div>
              <div className="space-y-1.5">
                {['THERMAL STRUCTURE', 'THERMOCLINE', 'STRATIFICATION', 'DATA CONFIDENCE', 'VALIDATION STATUS'].map(c => (
                  <div key={c} className="px-2.5 py-1.5 text-xs font-extrabold text-sky-900 flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-sky-500" />
                    {c}
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Insights Cards */}
          <div className="xl:col-span-3 space-y-4">
            {insights.map(insight => {
              const Icon = insight.icon;
              const expanded = expandedId === insight.id;
              return (
                <div key={insight.id} className={`glass-strong transition-all duration-200 ${expanded ? 'border-sky-400 shadow-md' : ''}`}>
                  <button
                    className="w-full p-5 text-left"
                    onClick={() => setExpandedId(expanded ? null : insight.id)}
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex items-start gap-3.5">
                        <div className="p-2 rounded-xl bg-sky-100 border border-sky-200">
                          <Icon className={`w-5 h-5 ${insight.iconColor} flex-shrink-0`} />
                        </div>
                        <div>
                          <div className="flex items-center gap-2 flex-wrap mb-1.5">
                            <span className="section-label">{insight.category}</span>
                            <span className="text-[10px] font-extrabold px-2.5 py-0.5 rounded-md bg-sky-100 text-sky-900 border border-sky-300">{insight.tag}</span>
                            <ConfidenceBadge level={insight.confidence} />
                          </div>
                          <div className="text-base font-black text-sky-950">{insight.title}</div>
                        </div>
                      </div>
                      {expanded ? <ChevronUp className="w-5 h-5 text-sky-700 flex-shrink-0 mt-1" /> : <ChevronDown className="w-5 h-5 text-sky-700 flex-shrink-0 mt-1" />}
                    </div>
                  </button>

                  {expanded && (
                    <div className="px-5 pb-5 border-t border-sky-200/80 pt-4 space-y-4 bg-white/60">
                      <div>
                        <div className="text-[10px] font-black text-sky-700 uppercase tracking-widest mb-1">Observation</div>
                        <div className="text-sm font-bold text-sky-950 leading-relaxed bg-white/80 p-3 rounded-xl border border-sky-100">{insight.observation}</div>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="bg-white/80 p-3 rounded-xl border border-sky-100">
                          <div className="text-[10px] font-black text-sky-700 uppercase tracking-widest mb-1">Model Signal / Evidence</div>
                          <div className="text-xs font-semibold text-sky-900 leading-relaxed">{insight.evidence}</div>
                        </div>
                        <div className="bg-white/80 p-3 rounded-xl border border-sky-100">
                          <div className="text-[10px] font-black text-sky-700 uppercase tracking-widest mb-1">Validation Status</div>
                          <div className="text-xs font-bold text-amber-800 leading-relaxed">{insight.validationStatus}</div>
                        </div>
                      </div>
                      <div className="bg-white/80 p-3 rounded-xl border border-sky-100">
                        <div className="text-[10px] font-black text-sky-700 uppercase tracking-widest mb-1">Scientific Context</div>
                        <div className="text-xs font-semibold text-sky-900 leading-relaxed">{insight.scientificContext}</div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
