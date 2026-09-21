'use client';

import { useEffect, useState, useRef } from 'react';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import { DEMO_DATES, DATE_LABELS, getProfilesByDate, OceanProfile } from '@/lib/ocean-simulation';
import { REGIONS, INPUT_VARIABLES } from '@/lib/constants';
import { useOceanStore } from '@/store/ocean-store';
import { Activity, Database, Cpu, CheckCircle, ChevronLeft, ChevronRight, Play, Pause, MapPin, Layers } from 'lucide-react';

// Dynamic import for Leaflet (Client side only)
const OceanMap = dynamic(() => import('@/components/OceanMap'), {
  ssr: false,
  loading: () => (
    <div className="w-full h-[420px] rounded-xl flex items-center justify-center bg-sky-50/80 border border-sky-200">
      <div className="flex flex-col items-center gap-2 text-sky-600 font-semibold text-xs animate-pulse">
        <Layers className="w-6 h-6 text-sky-500 animate-spin" />
        Loading Interactive Ocean Map...
      </div>
    </div>
  ),
});

const LAYERS = ['SST', 'SSS', 'SSH/SLA', 'CURRENT U', 'CURRENT V', 'WIND U', 'WIND V', 'EMBEDDING', 'RECONSTRUCTED T', 'ARGO OBS'];

function tempToColor(temp: number): string {
  if (temp < 10) return '#0284c7';
  if (temp < 18) return '#06b6d4';
  if (temp < 24) return '#10b981';
  if (temp < 28) return '#f59e0b';
  return '#ef4444';
}

export default function CommandCenter() {
  const { selectedDate, selectedRegion, selectedLat, selectedLon, activeLayer,
    setDate, setRegion, setLocation, setLayer } = useOceanStore();
  const [profiles, setProfiles] = useState<OceanProfile[]>([]);
  const [selectedProfile, setSelectedProfile] = useState<OceanProfile | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [dateIdx, setDateIdx] = useState(0);
  const playRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    const ps = getProfilesByDate(selectedDate);
    setProfiles(ps);
    if (ps.length > 0 && !selectedProfile) setSelectedProfile(ps[0]);
  }, [selectedDate]);

  useEffect(() => {
    const p = profiles.find(p => p.lat === selectedLat && p.lon === selectedLon) ?? profiles[0] ?? null;
    setSelectedProfile(p);
  }, [selectedLat, selectedLon, profiles]);

  const handleSelectLocation = (lat: number, lon: number) => {
    setLocation(lat, lon);
  };

  const handlePlay = () => {
    if (isPlaying) {
      if (playRef.current) clearInterval(playRef.current);
      setIsPlaying(false);
    } else {
      setIsPlaying(true);
      playRef.current = setInterval(() => {
        setDateIdx(i => {
          const next = (i + 1) % DEMO_DATES.length;
          setDate(DEMO_DATES[next]);
          return next;
        });
      }, 1800);
    }
  };

  return (
    <div className="min-h-screen py-8 ocean-gradient grid-bg">
      <div className="max-w-screen-2xl mx-auto px-4 py-6">
        {/* Header */}
        <div className="flex flex-wrap justify-between items-start gap-4 mb-6">
          <div>
            <div className="section-label mb-1">Ocean Intelligence Command Center</div>
            <h1 className="text-3xl font-black text-sky-950 tracking-tight">North Indian Ocean · Mission Control</h1>
          </div>
          <div className="flex flex-wrap gap-2">
            {(['SYSTEM ONLINE', 'MODEL READY', 'DATA: DEMO', 'ARGO: AVAILABLE'] as const).map((s, i) => (
              <div key={s} className="glass-panel px-3.5 py-1.5 flex items-center gap-2 border-sky-200/60 shadow-sm">
                <span className={`status-dot ${i === 2 ? 'amber' : 'green'}`} />
                <span className="text-[10px] font-extrabold tracking-widest text-sky-900">{s}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-4 gap-5">
          {/* Map Section */}
          <div className="xl:col-span-3">
            <div className="glass-strong p-5">
              {/* Controls row */}
              <div className="flex flex-wrap justify-between items-center mb-4 gap-3">
                <div className="flex gap-2">
                  {(['ARABIAN_SEA', 'BAY_OF_BENGAL', 'FULL_DOMAIN'] as const).map(r => (
                    <button
                      key={r}
                      onClick={() => setRegion(r)}
                      className={`px-3.5 py-1.5 text-[11px] font-extrabold tracking-widest rounded-lg transition-all ${
                        selectedRegion === r
                          ? 'bg-sky-600 text-white shadow-md shadow-sky-600/30'
                          : 'bg-white/80 text-sky-800 border border-sky-200 hover:bg-sky-50'
                      }`}
                    >
                      {REGIONS[r].name.toUpperCase()}
                    </button>
                  ))}
                </div>

                {/* Date controls */}
                <div className="flex items-center gap-2 bg-white/90 border border-sky-200 px-3 py-1.5 rounded-xl shadow-sm">
                  <button onClick={() => { const n = Math.max(0, dateIdx - 1); setDateIdx(n); setDate(DEMO_DATES[n]); }}
                    className="p-1 text-sky-600 hover:text-sky-900 transition-colors"><ChevronLeft className="w-4 h-4" /></button>
                  <span className="text-xs text-sky-950 font-bold min-w-[180px] text-center">{DATE_LABELS[selectedDate]}</span>
                  <button onClick={() => { const n = Math.min(DEMO_DATES.length - 1, dateIdx + 1); setDateIdx(n); setDate(DEMO_DATES[n]); }}
                    className="p-1 text-sky-600 hover:text-sky-900 transition-colors"><ChevronRight className="w-4 h-4" /></button>
                  <button onClick={handlePlay}
                    className={`p-1.5 rounded-lg transition-all ${isPlaying ? 'bg-amber-500 text-white' : 'bg-sky-100 text-sky-700 hover:bg-sky-200'}`}>
                    {isPlaying ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>

              {/* Real Interactive Leaflet Ocean Map */}
              <div className="relative rounded-xl overflow-hidden shadow-md" style={{ height: 440 }}>
                <OceanMap
                  profiles={profiles}
                  selectedProfile={selectedProfile}
                  activeLayer={activeLayer}
                  onSelectLocation={handleSelectLocation}
                  selectedRegion={selectedRegion}
                />
              </div>

              {/* Layer selector */}
              <div className="mt-4 flex flex-wrap gap-1.5">
                {LAYERS.map(l => (
                  <button
                    key={l}
                    onClick={() => setLayer(l)}
                    className={`px-3 py-1.5 text-[10px] font-bold tracking-wider rounded-lg transition-all ${
                      activeLayer === l
                        ? 'bg-cyan-600 text-white shadow-sm'
                        : 'bg-white/70 text-sky-800 border border-sky-200/80 hover:bg-sky-50'
                    }`}
                  >
                    {l}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Side Panel */}
          <div className="xl:col-span-1 flex flex-col gap-5">
            {/* Selected Location Details */}
            {selectedProfile && (
              <div className="glass-strong p-5">
                <div className="flex items-center gap-2 mb-3">
                  <MapPin className="w-4 h-4 text-sky-600" />
                  <div className="section-label">Selected Location</div>
                </div>

                <div className="font-mono text-sky-900 text-base font-extrabold mb-0.5">
                  {selectedProfile.lat}°N, {selectedProfile.lon}°E
                </div>
                <div className="text-xs font-semibold text-sky-600 mb-4">{selectedProfile.region}</div>

                <div className="space-y-2.5">
                  {INPUT_VARIABLES.slice(0, 4).map(v => {
                    const val = selectedProfile.surface[v.id as keyof typeof selectedProfile.surface] as number;
                    return (
                      <div key={v.id} className="flex justify-between items-center bg-white/80 px-3 py-2 rounded-lg border border-sky-100">
                        <span className="text-[11px] font-bold text-sky-800 uppercase tracking-wider">{v.label}</span>
                        <span className="text-[12px] font-mono font-bold text-sky-950">
                          {typeof val === 'number' ? val.toFixed(2) : '--'} {v.unit}
                        </span>
                      </div>
                    );
                  })}
                </div>

                <div className="mt-5 pt-4 border-t border-sky-200/60">
                  <div className="text-[10px] font-extrabold text-sky-700 mb-3 uppercase tracking-wider">Quick Depth Snapshot</div>
                  {[0, 50, 100, 200, 500].map(d => (
                    <div key={d} className="flex justify-between items-center py-1">
                      <span className="text-[11px] font-mono font-bold text-sky-700">{d}m</span>
                      <div className="flex items-center gap-2">
                        <div className="w-20 h-2 rounded-full bg-sky-100 overflow-hidden border border-sky-200">
                          <div
                            className="h-full rounded-full transition-all duration-300"
                            style={{
                              width: `${((selectedProfile.reconstruction[d] - 2) / 29) * 100}%`,
                              background: tempToColor(selectedProfile.reconstruction[d])
                            }}
                          />
                        </div>
                        <span className="text-[11px] font-mono font-extrabold text-sky-900 w-12 text-right">
                          {selectedProfile.reconstruction[d]?.toFixed(1)}°C
                        </span>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="mt-5 flex gap-2">
                  <Link href="/reconstruction" className="flex-1 py-2.5 text-center text-[10px] font-extrabold tracking-widest uppercase rounded-lg bg-sky-600 text-white shadow-md hover:bg-sky-700 transition-all">
                    RECONSTRUCT
                  </Link>
                  <Link href="/validation" className="flex-1 py-2.5 text-center text-[10px] font-extrabold tracking-widest uppercase rounded-lg bg-white text-sky-800 border border-sky-300 hover:bg-sky-50 transition-all">
                    ARGO
                  </Link>
                </div>
              </div>
            )}

            {/* System Status */}
            <div className="glass-strong p-5">
              <div className="section-label mb-3">System Status</div>
              <div className="space-y-2.5">
                {[
                  { icon: Activity, label: 'Model Version', val: 'OceanEmbed-v1.0', color: 'text-sky-600' },
                  { icon: Database, label: 'Data Mode', val: 'DEMO / Representative', color: 'text-amber-600' },
                  { icon: Cpu, label: 'Inference Engine', val: 'Ready', color: 'text-emerald-600' },
                  { icon: CheckCircle, label: 'ARGO Profiles', val: '16 Available', color: 'text-emerald-600' },
                ].map(s => (
                  <div key={s.label} className="flex items-center gap-2.5 bg-white/60 px-3 py-1.5 rounded-lg border border-sky-100">
                    <s.icon className={`w-3.5 h-3.5 ${s.color}`} />
                    <span className="text-[11px] font-medium text-sky-800 flex-1">{s.label}</span>
                    <span className={`text-[11px] font-extrabold ${s.color}`}>{s.val}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Quick Navigation Links */}
            <div className="glass-strong p-5">
              <div className="section-label mb-3">Quick Navigation</div>
              <div className="space-y-1.5">
                {[
                  { href: '/harmonization', label: 'Data Harmonization Lab' },
                  { href: '/embedding', label: 'Satellite Embedding Engine' },
                  { href: '/reconstruction', label: 'Subsurface Reconstruction Lab' },
                  { href: '/ocean-3d', label: '3D Ocean Explorer' },
                  { href: '/validation', label: 'ARGO Validation Center' },
                  { href: '/performance', label: 'Model Performance Report' },
                ].map(l => (
                  <Link key={l.href} href={l.href}
                    className="block px-3 py-2 text-[11px] font-semibold text-sky-800 hover:text-sky-950 hover:bg-sky-100/70 rounded-lg transition-all border border-transparent hover:border-sky-200">
                    → {l.label}
                  </Link>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
