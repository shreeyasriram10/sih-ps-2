'use client';

import { useState, useEffect } from 'react';
import { CheckCircle2, Circle, Loader2, Database, GitBranch, Cpu, ArrowDown, ExternalLink, Globe, ShieldCheck } from 'lucide-react';

const PIPELINE_STEPS = [
  { id: 0, label: 'RAW DATA INGESTION', desc: 'Multi-source satellite + reanalysis products acquired', icon: Database },
  { id: 1, label: 'QUALITY CONTROL', desc: 'Flagging outliers, cloud masks, gap detection', icon: CheckCircle2 },
  { id: 2, label: 'TEMPORAL ALIGNMENT', desc: 'All inputs co-registered to target daily timestep', icon: GitBranch },
  { id: 3, label: 'SPATIAL REGRIDDING', desc: 'Bilinear interpolation to 0.25°×0.25° target grid', icon: GitBranch },
  { id: 4, label: 'MISSING VALUE HANDLING', desc: 'Optimal interpolation + weighted gap-filling', icon: Loader2 },
  { id: 5, label: 'NORMALIZATION', desc: 'Z-score per variable using training climatology', icon: Cpu },
  { id: 6, label: 'MULTI-SOURCE TENSOR', desc: '[7, 100, 240] — channels × lat × lon', icon: Cpu },
  { id: 7, label: 'MODEL READY ✓', desc: 'Harmonized tensor passed to OceanEmbed encoder', icon: CheckCircle2 },
];

const PROVENANCE_DETAILS = [
  {
    var: 'SST (Sea Surface Temperature)',
    agency: 'UK Met Office / GHRSST / Copernicus Marine',
    satellite: 'OSTIA L4 (Advanced Very High Resolution Radiometer - AVHRR / SLSTR)',
    resolution: '0.05° native → 0.25° target grid (Daily)',
    link: 'https://marine.copernicus.eu/',
    color: '#ea580c',
  },
  {
    var: 'SSS (Sea Surface Salinity)',
    agency: 'NASA JPL / ESA (European Space Agency)',
    satellite: 'SMAP (Soil Moisture Active Passive) & SMOS (MIRAS L-Band Radiometer)',
    resolution: '0.125° native → 0.25° target grid (Daily Composite)',
    link: 'https://smap.jpl.nasa.gov/',
    color: '#7c3aed',
  },
  {
    var: 'SSH / SLA (Sea Surface Height)',
    agency: 'CNES / AVISO+ / DUACS',
    satellite: 'Jason-3, Sentinel-6 Michael Freilich, SARAL/AltiKa',
    resolution: '0.25° native → 0.25° target grid (Daily Gridded Anomaly)',
    link: 'https://www.aviso.altimetry.fr/',
    color: '#0284c7',
  },
  {
    var: 'Surface Currents (U / V)',
    agency: 'NOAA / Earth & Space Research (ESR)',
    satellite: 'OSCAR v2.0 (Ocean Surface Current Analysis Real-time)',
    resolution: '0.25° native → 0.25° target grid (Daily)',
    link: 'https://www.esr.org/research/oscar/',
    color: '#16a34a',
  },
  {
    var: 'Surface Winds (U / V)',
    agency: 'EUMETSAT / Remote Sensing Systems (RSS)',
    satellite: 'MetOp ASCAT Scatterometer & CCMP Vector Wind',
    resolution: '0.25° native → 0.25° target grid (Daily)',
    link: 'https://www.eumetsat.int/',
    color: '#d97706',
  },
  {
    var: 'Subsurface Target (T)',
    agency: 'Copernicus Marine Environment Monitoring Service (CMEMS)',
    satellite: 'GLORYS12V1 Global Ocean Physics Reanalysis (15 Standard Depths)',
    resolution: '0.083° native → 0.25° target grid (Daily 3D Grid)',
    link: 'https://marine.copernicus.eu/',
    color: '#06b6d4',
  },
  {
    var: 'In-Situ Validation Data',
    agency: 'INCOIS (Ministry of Earth Sciences) & International ARGO Program',
    satellite: 'ARGO Global Autonomous Profiling Floats (CTD Sensors)',
    resolution: 'Vertical CTD Profiles (0 - 2000 m depth)',
    link: 'https://incois.gov.in/',
    color: '#dc2626',
  },
];

export default function HarmonizationPage() {
  const [activeStep, setActiveStep] = useState(0);
  const [isRunning, setIsRunning] = useState(false);
  const [completed, setCompleted] = useState<Set<number>>(new Set());

  const runPipeline = async () => {
    setIsRunning(true);
    setCompleted(new Set());
    for (let i = 0; i < PIPELINE_STEPS.length; i++) {
      setActiveStep(i);
      await new Promise(r => setTimeout(r, 450));
      setCompleted(c => new Set([...c, i]));
    }
    setIsRunning(false);
  };

  useEffect(() => { runPipeline(); }, []);

  return (
    <div className="min-h-screen py-8 ocean-gradient grid-bg">
      <div className="max-w-screen-xl mx-auto px-6 py-8">
        <div className="mb-8">
          <div className="section-label mb-1">Data Harmonization Lab</div>
          <h1 className="text-3xl font-black text-sky-950 tracking-tight mb-2">Multi-Source Data Harmonization Pipeline</h1>
          <p className="text-sm font-semibold text-sky-800/80 max-w-2xl">
            Seven independent satellite and reanalysis datasets are quality-controlled, temporally aligned,
            spatially regridded, and normalized into a unified input tensor for the OceanEmbed encoder.
          </p>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
          {/* Pipeline flow */}
          <div className="xl:col-span-1">
            <div className="glass-strong p-5">
              <div className="section-label mb-4">Processing Pipeline</div>
              <div className="space-y-2">
                {PIPELINE_STEPS.map((step, i) => {
                  const isDone = completed.has(i);
                  const isActive = activeStep === i && isRunning;
                  return (
                    <div key={step.id}>
                      <div className={`p-3 rounded-xl border transition-all ${
                        isActive ? 'bg-sky-100 border-sky-400 shadow-sm' : isDone ? 'bg-emerald-50 border-emerald-200' : 'bg-white/80 border-sky-200'
                      }`}>
                        <div className="flex items-start gap-3">
                          <div className="mt-0.5 flex-shrink-0">
                            {isDone ? (
                              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                            ) : isActive ? (
                              <Loader2 className="w-4 h-4 text-sky-600 animate-spin" />
                            ) : (
                              <Circle className="w-4 h-4 text-sky-300" />
                            )}
                          </div>
                          <div>
                            <div className={`text-[11px] font-bold ${isDone ? 'text-emerald-800' : isActive ? 'text-sky-950' : 'text-sky-800/60'}`}>
                              {step.label}
                            </div>
                            <div className="text-[10px] text-sky-700/80 mt-0.5">{step.desc}</div>
                          </div>
                        </div>
                      </div>
                      {i < PIPELINE_STEPS.length - 1 && (
                        <div className="flex justify-center my-0.5">
                          <ArrowDown className={`w-3 h-3 ${isDone ? 'text-emerald-500' : 'text-sky-300'}`} />
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
              <button
                onClick={runPipeline}
                disabled={isRunning}
                className="mt-4 w-full py-3 text-xs font-black tracking-widest uppercase rounded-xl bg-sky-600 text-white hover:bg-sky-700 disabled:opacity-50 transition-all shadow-md shadow-sky-600/20"
              >
                {isRunning ? 'RUNNING PIPELINE...' : 'RE-RUN PIPELINE'}
              </button>
            </div>
          </div>

          {/* Dataset Inventory & Telemetry Provenance */}
          <div className="xl:col-span-2 space-y-6">
            <div className="glass-strong p-5">
              <div className="flex justify-between items-center mb-4">
                <div className="section-label">Telemetry Data Provenance & Sources</div>
                <span className="text-[10px] font-bold text-emerald-700 bg-emerald-100 border border-emerald-300 px-2.5 py-1 rounded-full flex items-center gap-1">
                  <ShieldCheck className="w-3 h-3" /> 7 Active Satellite Feeds
                </span>
              </div>

              <div className="space-y-3">
                {PROVENANCE_DETAILS.map(d => (
                  <div key={d.var} className="rounded-xl border border-sky-200/90 p-4 bg-white/90 shadow-xs hover:shadow-md transition-all">
                    <div className="flex justify-between items-start mb-1">
                      <span className="text-xs font-extrabold" style={{ color: d.color }}>{d.var}</span>
                      <a href={d.link} target="_blank" rel="noreferrer" className="text-[10px] text-sky-600 hover:text-sky-900 font-bold flex items-center gap-1 bg-sky-50 px-2 py-0.5 rounded border border-sky-200">
                        <Globe className="w-3 h-3" /> Data Portal <ExternalLink className="w-2.5 h-2.5" />
                      </a>
                    </div>
                    <div className="text-[11px] text-sky-950 font-bold mb-0.5">{d.agency}</div>
                    <div className="text-[10px] text-sky-800 font-semibold mb-1">Sensor: {d.satellite}</div>
                    <div className="text-[10px] font-mono text-sky-600 bg-sky-50 px-2 py-1 rounded border border-sky-100 inline-block">{d.resolution}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
