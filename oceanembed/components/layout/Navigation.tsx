'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState } from 'react';
import { NAV_ITEMS } from '@/lib/constants';
import { Waves, Satellite, Home, Map, Database, Cpu, Layers, Box, CheckCircle, BarChart3, Lightbulb, Info, Menu, X, ChevronRight } from 'lucide-react';
import { useOceanStore } from '@/store/ocean-store';

const NAV_ICONS = [Home, Map, Database, Cpu, Layers, Box, CheckCircle, BarChart3, Lightbulb, Info, Info];

const NAV_COLORS = [
  'text-cyan-400',
  'text-sky-400',
  'text-violet-400',
  'text-blue-400',
  'text-teal-400',
  'text-indigo-400',
  'text-green-400',
  'text-fuchsia-400',
  'text-amber-400',
  'text-orange-400',
  'text-slate-400',
];

const NAV_ACTIVE_COLORS = [
  'bg-cyan-500/15 border-cyan-500/35 text-cyan-300',
  'bg-sky-500/15 border-sky-500/35 text-sky-300',
  'bg-violet-500/15 border-violet-500/35 text-violet-300',
  'bg-blue-500/15 border-blue-500/35 text-blue-300',
  'bg-teal-500/15 border-teal-500/35 text-teal-300',
  'bg-indigo-500/15 border-indigo-500/35 text-indigo-300',
  'bg-green-500/15 border-green-500/35 text-green-300',
  'bg-fuchsia-500/15 border-fuchsia-500/35 text-fuchsia-300',
  'bg-amber-500/15 border-amber-500/35 text-amber-300',
  'bg-orange-500/15 border-orange-500/35 text-orange-300',
  'bg-slate-500/15 border-slate-500/35 text-slate-300',
];

export default function Navigation() {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  const { juryDemoMode, setJuryDemoMode } = useOceanStore();

  // Highlight /home as active for root paths
  const isActive = (href: string) => {
    if (href === '/home') return pathname === '/home' || pathname === '/';
    return pathname === href;
  };

  const sidebarContent = (
    <>
      {/* Logo */}
      <div className="px-4 py-5 border-b" style={{ borderColor: 'rgba(14,116,163,0.1)' }}>
        <Link href="/home" className="flex items-center gap-2.5 group" onClick={() => setMobileOpen(false)}>
          <div className="relative w-8 h-8 rounded-lg flex items-center justify-center"
            style={{ background: 'linear-gradient(135deg, rgba(14,116,163,0.15), rgba(56,189,248,0.1))', border: '1px solid rgba(14,116,163,0.25)' }}>
            <Waves className="w-4 h-4 text-sky-600" strokeWidth={1.8} />
          </div>
          <div>
            <div className="font-black text-[13px] tracking-[0.1em] text-sky-900">AQUALENS</div>
            <div className="text-[8px] text-sky-500/80 tracking-[0.15em] uppercase">Ocean Intelligence</div>
          </div>
        </Link>
      </div>

      {/* System status */}
      <div className="px-4 py-3 border-b" style={{ borderColor: 'rgba(14,116,163,0.12)' }}>
        <div className="text-[9px] text-sky-900 font-extrabold uppercase tracking-widest mb-2">System Status</div>
        <div className="space-y-1.5">
          {[
            { label: 'Model', val: 'READY', dot: 'green' },
            { label: 'Data', val: 'DEMO', dot: 'amber' },
            { label: 'ARGO', val: 'AVAILABLE', dot: 'green' },
          ].map(s => (
            <div key={s.label} className="flex items-center justify-between">
              <span className="text-[10px] font-bold text-sky-900">{s.label}</span>
              <div className="flex items-center gap-1.5">
                <span className={`status-dot ${s.dot}`} />
                <span className="text-[10px] font-black text-sky-950">{s.val}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-3 space-y-0.5">
        <div className="text-[9px] text-sky-900 font-extrabold uppercase tracking-widest px-2 mb-2">Navigation</div>
        {NAV_ITEMS.map((item, i) => {
          const Icon = NAV_ICONS[i];
          const active = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setMobileOpen(false)}
              className={`flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-[11px] font-extrabold transition-all duration-150 border group relative ${
                isActive(item.href)
                  ? `${NAV_ACTIVE_COLORS[i]} border-opacity-100 font-black shadow-xs`
                  : 'text-sky-900 border-transparent hover:text-sky-950 hover:bg-sky-100/70'
              }`}
            >
              <Icon className={`w-3.5 h-3.5 flex-shrink-0 transition-colors`} strokeWidth={2} style={{ color: isActive(item.href) ? NAV_COLORS[i].replace('text-','') : '#0284c7' }} />
              <span className="truncate">{item.label}</span>
              {isActive(item.href) && <ChevronRight className="w-3 h-3 ml-auto flex-shrink-0" />}
            </Link>
          );
        })}
      </nav>

      {/* Jury Demo */}
      <div className="px-3 py-3" style={{ borderTop: '1px solid rgba(14,116,163,0.1)' }}>
        <button
          onClick={() => setJuryDemoMode(!juryDemoMode)}
          className={`w-full flex items-center gap-2 px-3 py-2.5 rounded-lg text-[10px] font-bold tracking-widest uppercase transition-all border ${
            juryDemoMode
              ? 'bg-amber-500/15 text-amber-700 border-amber-500/30'
              : 'text-sky-600/60 border-sky-200 hover:text-amber-600 hover:bg-amber-50'
          }`}
        >
          <Satellite className="w-3.5 h-3.5" />
          Jury Demo Mode
          {juryDemoMode && <span className="ml-auto w-2 h-2 rounded-full bg-amber-400 animate-pulse" />}
        </button>

        <div className="mt-3 text-[9px] text-sky-400/50 text-center leading-relaxed px-1">
          Research Prototype<br />Not an operational system
        </div>
      </div>
    </>
  );

  return (
    <>
      {/* Desktop sidebar */}
      <aside className="sidebar hidden lg:flex flex-col">
        {sidebarContent}
      </aside>

      {/* Mobile top bar */}
      <div className="lg:hidden fixed top-0 left-0 right-0 z-50 h-14 flex items-center justify-between px-4 bg-white/95 border-b border-sky-200 shadow-sm backdrop-blur-xl">
        <Link href="/" className="flex items-center gap-2">
          <Waves className="w-5 h-5 text-sky-600" strokeWidth={1.8} />
          <span className="font-black text-sm tracking-wider text-sky-950">AQUALENS</span>
        </Link>
        <button onClick={() => setMobileOpen(!mobileOpen)} className="text-sky-700 hover:text-sky-950 p-1">
          {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
      </div>

      {/* Mobile drawer */}
      {mobileOpen && (
        <div className="lg:hidden fixed inset-0 z-40">
          <div className="absolute inset-0 bg-sky-950/30 backdrop-blur-sm" onClick={() => setMobileOpen(false)} />
          <aside className="absolute left-0 top-0 bottom-0 w-64 flex flex-col bg-white/98 border-r border-sky-200 shadow-xl">
            {sidebarContent}
          </aside>
        </div>
      )}
    </>
  );
}
