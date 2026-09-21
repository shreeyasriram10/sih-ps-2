import Link from 'next/link';
import { NAV_ITEMS } from '@/lib/constants';
import { ArrowRight, Database, Cpu, BarChart2, CheckCircle2, Layers, Globe, GitBranch, Zap } from 'lucide-react';

const ARCH_LAYERS = [
  { label: 'DATA SOURCES', items: ['OSTIA SST', 'SMAP/SMOS SSS', 'DUACS SSH', 'OSCAR Currents', 'ASCAT Winds'], color: 'border-orange-500/30 bg-orange-500/5', textColor: 'text-orange-300' },
  { label: 'DATA INGESTION & QC', items: ['Automated ingestion pipeline', 'Cloud masking', 'Outlier detection', 'Temporal co-registration'], color: 'border-amber-500/30 bg-amber-500/5', textColor: 'text-amber-300' },
  { label: 'SPATIAL + TEMPORAL HARMONIZATION', items: ['Bilinear regridding → 0.25°', 'Daily temporal alignment', 'Z-score normalization', 'Missing value filling'], color: 'border-yellow-500/30 bg-yellow-500/5', textColor: 'text-yellow-300' },
  { label: 'MULTI-VARIABLE SURFACE TENSOR', items: ['[7, 100, 240] tensor', '7 surface channels', '100 lat × 240 lon', 'PyTorch DataLoader'], color: 'border-green-500/30 bg-green-500/5', textColor: 'text-green-300' },
  { label: 'SATELLITE EMBEDDING ENCODER', items: ['CNN ResNet backbone', 'Multi-scale features', 'Cross-channel attention', '128-D projection'], color: 'border-blue-500/30 bg-blue-500/5', textColor: 'text-blue-300' },
  { label: 'LATENT OCEAN REPRESENTATION', items: ['128-D embedding vector', 'Physical signature capture', 'Regional clustering', 'Spatially resolved'], color: 'border-indigo-500/30 bg-indigo-500/5', textColor: 'text-indigo-300' },
  { label: 'DEPTH-WISE RECONSTRUCTION DECODER', items: ['Depth-conditioned MLP', '15 standard levels', 'Spatial upsampling', 'GLORYS-supervised'], color: 'border-violet-500/30 bg-violet-500/5', textColor: 'text-violet-300' },
  { label: '15-LEVEL TEMPERATURE FIELD', items: ['0–1000m reconstruction', '0.25° spatial resolution', 'Daily output', 'NetCDF/Zarr output'], color: 'border-cyan-500/30 bg-cyan-500/5', textColor: 'text-cyan-300' },
  { label: 'ARGO VALIDATION', items: ['Independent float co-location', 'RMSE / MAE / Bias', 'Depth-wise skill scores', 'Seasonal analysis'], color: 'border-teal-500/30 bg-teal-500/5', textColor: 'text-teal-300' },
  { label: 'SCIENTIFIC VISUALIZATION', items: ['Command center dashboard', '3D depth explorer', 'Profile comparison', 'Performance report'], color: 'border-emerald-500/30 bg-emerald-500/5', textColor: 'text-emerald-300' },
];

const TECH_STACK = [
  { category: 'Frontend', color: '#06b6d4', items: ['Next.js 14 (App Router)', 'TypeScript', 'Tailwind CSS', 'Recharts', 'Canvas API', 'Zustand'] },
  { category: 'Visualization', color: '#3b82f6', items: ['Recharts (profiles)', 'Canvas 2D (maps)', 'Custom isometric 3D', 'Framer Motion'] },
  { category: 'ML Framework', color: '#a855f7', items: ['PyTorch (model)', 'NumPy / SciPy', 'xarray / netCDF4', 'scikit-learn'] },
  { category: 'Backend (Planned)', color: '#22c55e', items: ['FastAPI (Python)', '/api/reconstruct', '/api/profile', '/api/validation'] },
  { category: 'Data Formats', color: '#f97316', items: ['NetCDF4 / Zarr', 'HDF5', 'GeoTIFF', 'JSON (API)'] },
  { category: 'Deployment', color: '#eab308', items: ['Vercel (frontend)', 'Python backend (standalone)', 'Docker-ready'] },
];

export default function AboutPage() {
  return (
    <div className="min-h-screen py-8 ocean-gradient grid-bg">
      <div className="max-w-screen-xl mx-auto px-6 py-8">
        <div className="mb-8">
          <div className="section-label mb-1">Technical Architecture</div>
          <h1 className="text-3xl font-black text-sky-950 tracking-tight mb-2">OceanEmbed — System Architecture</h1>
          <p className="text-sm text-slate-400 max-w-2xl">
            End-to-end technical design of the OceanEmbed satellite embedding framework for
            subsurface ocean temperature reconstruction. Smart India Hackathon 2024 · Problem Statement SIH26066.
          </p>
        </div>

        {/* Full architecture diagram */}
        <div className="glass-panel p-6 mb-8">
          <div className="section-label mb-6 text-center">Complete System Architecture</div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-3">
            {ARCH_LAYERS.map((layer, i) => (
              <div key={i} className="relative">
                <div className={`rounded-lg p-3 border ${layer.color} h-full`}>
                  <div className={`text-[10px] font-bold tracking-wide mb-2 ${layer.textColor}`}>{layer.label}</div>
                  <ul className="space-y-0.5">
                    {layer.items.map((item, j) => (
                      <li key={j} className="text-[9px] text-slate-500">• {item}</li>
                    ))}
                  </ul>
                  <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 text-slate-600 text-lg font-bold hidden lg:block">↓</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Tech stack */}
        <div className="glass-panel p-6 mb-8">
          <div className="section-label mb-6">Technology Stack</div>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            {TECH_STACK.map(cat => (
              <div key={cat.category} className="rounded-lg p-3 border border-[rgba(14,165,233,0.1)] bg-[rgba(7,30,51,0.3)]">
                <div className="text-[11px] font-bold mb-2" style={{ color: cat.color }}>{cat.category}</div>
                <ul className="space-y-0.5">
                  {cat.items.map(item => (
                    <li key={item} className="text-[10px] text-slate-500">• {item}</li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>

        {/* Conceptual model details */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          <div className="glass-panel p-5">
            <div className="section-label mb-4">Model Architecture Details</div>
            <div className="space-y-3 text-xs text-slate-400">
              <div>
                <div className="text-slate-200 font-semibold mb-1">Input Tensor</div>
                <div className="font-mono text-cyan-400">Tensor[B, 7, H, W] where H=100, W=240</div>
                <div>Channels: SST, SSS, SSH, Current_U, Current_V, Wind_U, Wind_V</div>
              </div>
              <div>
                <div className="text-slate-200 font-semibold mb-1">Encoder</div>
                <div>CNN ResNet-50 backbone with multi-scale feature pyramid. Cross-channel attention module fuses information across 7 physical variables. Global average pooling + 128-D FC projection.</div>
              </div>
              <div>
                <div className="text-slate-200 font-semibold mb-1">Latent Representation</div>
                <div>128-D per-grid-cell ocean embedding capturing the compressed physical state associated with the subsurface thermal structure.</div>
              </div>
              <div>
                <div className="text-slate-200 font-semibold mb-1">Decoder</div>
                <div>Depth-conditioned MLP: embedding + depth index → temperature. 15 depth queries for each grid point. Spatial upsampling to full-resolution output field.</div>
              </div>
              <div>
                <div className="text-slate-200 font-semibold mb-1">Training Objective</div>
                <div>MSE vs. GLORYS12 T(z) + optional physics-informed regularization (monotonicity of T with depth in stable stratification). Validation split: independent ARGO profiles.</div>
              </div>
              <div>
                <div className="text-slate-200 font-semibold mb-1">Output</div>
                <div className="font-mono text-cyan-400">T[lat, lon, depth] for 15 standard levels</div>
              </div>
            </div>
          </div>

          <div className="glass-panel p-5">
            <div className="section-label mb-4">API Design (Planned)</div>
            <div className="space-y-2">
              {[
                { method: 'POST', endpoint: '/api/reconstruct', desc: 'Run inference for given date + bbox' },
                { method: 'GET', endpoint: '/api/profile?lat=&lon=&date=', desc: 'Get reconstructed T(z) at location' },
                { method: 'GET', endpoint: '/api/validation?lat=&lon=&date=', desc: 'Get ARGO comparison metrics' },
                { method: 'GET', endpoint: '/api/dataset-status', desc: 'Check data ingestion status' },
                { method: 'GET', endpoint: '/api/embedding?lat=&lon=&date=', desc: 'Retrieve 128-D ocean embedding' },
                { method: 'GET', endpoint: '/api/depth-field?depth=&date=', desc: 'Full 2D field at target depth' },
              ].map(api => (
                <div key={api.endpoint} className="flex gap-2 p-2 rounded bg-[rgba(7,30,51,0.5)] border border-[rgba(14,165,233,0.1)]">
                  <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${api.method === 'POST' ? 'bg-green-500/20 text-green-400' : 'bg-blue-500/20 text-blue-400'}`}>{api.method}</span>
                  <div>
                    <div className="text-[10px] font-mono text-cyan-300">{api.endpoint}</div>
                    <div className="text-[9px] text-slate-500">{api.desc}</div>
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-3 text-[10px] text-slate-600">All endpoints are planned architecture — not yet connected to live backend.</div>
          </div>
        </div>

        {/* Data sources */}
        <div className="glass-panel p-5 mb-8">
          <div className="section-label mb-4">Key Data Sources & References</div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
            {[
              { name: 'OSTIA SST', org: 'UK Met Office / GHRSST', role: 'Primary surface temperature input' },
              { name: 'SMAP/SMOS SSS', org: 'NASA / ESA', role: 'Sea surface salinity input' },
              { name: 'DUACS AVISO+', org: 'CNES / Copernicus', role: 'Sea level anomaly input' },
              { name: 'OSCAR v2', org: 'NASA PODAAC', role: 'Ocean surface currents' },
              { name: 'ASCAT / CCMP', org: 'EUMETSAT / NASA', role: 'Surface wind vectors' },
              { name: 'GLORYS12', org: 'Copernicus Marine', role: 'Supervisory training target T(z)' },
              { name: 'ARGO Program', org: 'INCOIS / Global', role: 'Independent validation profiles' },
              { name: 'WOA23', org: 'NOAA', role: 'Climatological baseline' },
            ].map(d => (
              <div key={d.name} className="p-3 rounded border border-[rgba(14,165,233,0.12)] bg-[rgba(7,30,51,0.3)]">
                <div className="text-slate-200 font-semibold text-[11px]">{d.name}</div>
                <div className="text-slate-500 text-[10px] mt-0.5">{d.org}</div>
                <div className="text-cyan-400/70 text-[9px] mt-1">{d.role}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Platform navigation */}
        <div className="glass-panel p-5">
          <div className="section-label mb-4">Platform Navigation</div>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-2">
            {NAV_ITEMS.slice(1).map(item => (
              <Link key={item.href} href={item.href}
                className="flex items-center justify-between px-3 py-2.5 rounded border border-[rgba(14,165,233,0.12)] text-[11px] text-slate-400 hover:text-cyan-300 hover:border-cyan-500/25 hover:bg-cyan-500/5 transition-all group">
                <span>{item.label}</span>
                <ArrowRight className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" />
              </Link>
            ))}
          </div>
        </div>

        {/* Footer note */}
        <div className="mt-8 text-center">
          <div className="demo-banner inline-block">
            OceanEmbed · SIH26066 · Ministry of Earth Sciences / INCOIS · Smart India Hackathon 2024 Prototype
          </div>
          <div className="mt-2 text-[11px] text-slate-600">
            Research prototype — Not an operational ocean forecasting system
          </div>
        </div>
      </div>
    </div>
  );
}
