import Link from 'next/link';
import { Waves } from 'lucide-react';
import { NAV_ITEMS } from '@/lib/constants';

export default function Footer() {
  return (
    <footer className="border-t border-[rgba(14,165,233,0.12)] bg-[rgba(2,11,24,0.95)] mt-16">
      <div className="max-w-screen-2xl mx-auto px-6 py-10">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* Brand */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <Waves className="w-5 h-5 text-cyan-400" strokeWidth={1.5} />
              <span className="font-bold text-sm tracking-[0.12em] text-white">OCEANEMBED</span>
            </div>
            <p className="text-xs text-slate-500 leading-relaxed">
              Satellite Embedding-Based Subsurface Ocean Intelligence<br />
              North Indian Ocean · 5°N–30°N · 45°E–105°E
            </p>
            <div className="mt-4 inline-block demo-banner">
              Research Prototype — Not an Operational Ocean Forecasting System
            </div>
          </div>

          {/* Nav links */}
          <div>
            <div className="section-label mb-3">Platform</div>
            <div className="grid grid-cols-2 gap-1">
              {NAV_ITEMS.map(item => (
                <Link
                  key={item.href}
                  href={item.href}
                  className="text-xs text-slate-500 hover:text-cyan-400 transition-colors py-0.5"
                >
                  {item.label}
                </Link>
              ))}
            </div>
          </div>

          {/* Tech info */}
          <div>
            <div className="section-label mb-3">Technical</div>
            <div className="space-y-1.5 text-xs text-slate-500">
              <div className="flex justify-between">
                <span>Domain</span>
                <span className="text-slate-400">North Indian Ocean</span>
              </div>
              <div className="flex justify-between">
                <span>Spatial Resolution</span>
                <span className="text-slate-400">0.25° × 0.25°</span>
              </div>
              <div className="flex justify-between">
                <span>Depth Levels</span>
                <span className="text-slate-400">15 (0–1000 m)</span>
              </div>
              <div className="flex justify-between">
                <span>Input Channels</span>
                <span className="text-slate-400">7 surface variables</span>
              </div>
              <div className="flex justify-between">
                <span>Latent Dimension</span>
                <span className="text-slate-400">128-D Ocean Embedding</span>
              </div>
              <div className="flex justify-between">
                <span>Validation</span>
                <span className="text-slate-400">Argo Float Profiles</span>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-8 pt-6 border-t border-[rgba(14,165,233,0.08)] flex flex-col md:flex-row justify-between items-center gap-3">
          <div className="text-[11px] text-slate-600">
            Developed as a prototype for Smart India Hackathon 2024 · Problem Statement SIH26066
          </div>
          <div className="text-[11px] text-slate-600">
            Organization: Ministry of Earth Sciences (MoES) · INCOIS
          </div>
        </div>
      </div>
    </footer>
  );
}
