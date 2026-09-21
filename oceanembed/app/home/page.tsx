'use client';
import Link from 'next/link';
import { useEffect, useRef } from 'react';
import { ArrowRight, Zap, Satellite, Layers, BarChart3, CheckCircle2, Waves, Globe, ChevronRight } from 'lucide-react';

const DEPTH_LEVELS = [0,5,10,20,30,50,75,100,125,150,200,300,500,700,1000];
const PIPELINE = [
  { id: 1, label: 'SURFACE DATA', sub: 'SST · SSS · SSH · Currents · Winds', color: '#f97316', bg: 'rgba(249,115,22,0.08)', border: 'rgba(249,115,22,0.22)', href: '/harmonization' },
  { id: 2, label: 'HARMONIZE', sub: 'Multi-source alignment & QC', color: '#fbbf24', bg: 'rgba(251,191,36,0.08)', border: 'rgba(251,191,36,0.22)', href: '/harmonization' },
  { id: 3, label: 'EMBED', sub: '128-D Ocean Latent Vector', color: '#a78bfa', bg: 'rgba(167,139,250,0.08)', border: 'rgba(167,139,250,0.22)', href: '/embedding' },
  { id: 4, label: 'RECONSTRUCT', sub: 'T(z) at 15 depth levels', color: '#22d3ee', bg: 'rgba(34,211,238,0.08)', border: 'rgba(34,211,238,0.22)', href: '/reconstruction' },
  { id: 5, label: 'VALIDATE', sub: 'ARGO float comparison', color: '#4ade80', bg: 'rgba(74,222,128,0.08)', border: 'rgba(74,222,128,0.22)', href: '/validation' },
];

export default function HomePage() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const resize = () => { canvas.width = canvas.offsetWidth; canvas.height = canvas.offsetHeight; };
    resize();
    window.addEventListener('resize', resize);
    let t = 0;
    let raf: number;
    const draw = () => {
      t += 0.006;
      const W = canvas.width, H = canvas.height;
      ctx.clearRect(0, 0, W, H);
      // Subtle grid
      ctx.strokeStyle = 'rgba(14,116,163,0.06)';
      ctx.lineWidth = 0.5;
      for (let x = 0; x < W; x += 60) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke(); }
      for (let y = 0; y < H; y += 60) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke(); }
      // Flowing lines
      for (let i = 0; i < 5; i++) {
        ctx.beginPath();
        for (let x = 0; x <= W; x += 8) {
          const y = H * (0.2 + i * 0.14) + Math.sin(x / 200 + t + i) * 18 + Math.cos(x / 300 + t * 0.7) * 10;
          if (x === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
        }
        ctx.strokeStyle = `rgba(14,116,163,${0.07 - i * 0.01})`;
        ctx.lineWidth = 1;
        ctx.stroke();
      }
      raf = requestAnimationFrame(draw);
    };
    draw();
    return () => { cancelAnimationFrame(raf); window.removeEventListener('resize', resize); };
  }, []);

  return (
    <div className="relative min-h-screen" style={{ background: 'linear-gradient(180deg, #e8f4fb 0%, #d0eaf8 50%, #bde0f6 100%)' }}>
      <canvas ref={canvasRef} className="absolute inset-0 w-full h-full pointer-events-none opacity-70" />

      <div className="relative z-10 max-w-5xl mx-auto px-8 py-10">
        {/* Hero */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full mb-6"
            style={{ background: 'rgba(14,116,163,0.1)', border: '1px solid rgba(14,116,163,0.2)' }}>
            <Waves className="w-3.5 h-3.5 text-cyan-600" />
            <span className="text-[11px] font-bold tracking-[0.2em] uppercase text-cyan-700">North Indian Ocean · AI Intelligence</span>
          </div>

          <h1 className="text-6xl md:text-7xl font-black tracking-tight mb-2"
            style={{ background: 'linear-gradient(135deg, #0c4a6e 0%, #0369a1 40%, #0891b2 70%, #a78bfa 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>
            AQUALENS
          </h1>
          <div className="text-2xl font-light text-sky-700 mb-4">Seeing Beneath the Surface.</div>
          <p className="max-w-xl mx-auto text-sky-800/70 text-base leading-relaxed">
            Deep-learning reconstruction of subsurface ocean temperature from multi-source satellite observations — at 15 standard depth levels.
          </p>
        </div>

        {/* Pipeline flow */}
        <div className="rounded-2xl p-6 mb-8" style={{ background: 'rgba(255,255,255,0.55)', border: '1px solid rgba(14,116,163,0.15)', backdropFilter: 'blur(16px)', boxShadow: '0 8px 40px rgba(14,116,163,0.08)' }}>
          <div className="text-[10px] font-bold tracking-[0.2em] uppercase text-sky-500 text-center mb-5">The AQUALENS Pipeline</div>
          <div className="flex items-center justify-center gap-1.5 flex-wrap">
            {PIPELINE.map((p, i) => (
              <div key={p.id} className="flex items-center gap-1.5">
                <Link href={p.href}
                  className="px-4 py-3 rounded-xl text-center transition-all hover:scale-105 group"
                  style={{ background: p.bg, border: `1px solid ${p.border}` }}>
                  <div className="w-5 h-5 rounded-full flex items-center justify-center mx-auto mb-1.5"
                    style={{ background: `${p.color}25`, border: `1px solid ${p.color}50` }}>
                    <span className="text-[9px] font-black" style={{ color: p.color }}>{p.id}</span>
                  </div>
                  <div className="text-[11px] font-black tracking-wide mb-0.5" style={{ color: p.color }}>{p.label}</div>
                  <div className="text-[9px] text-slate-500">{p.sub}</div>
                </Link>
                {i < PIPELINE.length - 1 && <ChevronRight className="w-4 h-4 text-slate-400 flex-shrink-0" />}
              </div>
            ))}
          </div>
        </div>

        {/* Depth levels */}
        <div className="mb-8">
          <div className="text-[10px] font-bold tracking-[0.2em] uppercase text-sky-500 text-center mb-3">Reconstructed at 15 Standard Depth Levels</div>
          <div className="flex justify-center gap-1.5 flex-wrap">
            {DEPTH_LEVELS.map((d, i) => {
              const t = i / (DEPTH_LEVELS.length - 1);
              const h = 200 - t * 100;
              return (
                <div key={d} className="px-2.5 py-2 rounded-lg text-center hover:scale-110 transition-transform cursor-default"
                  style={{ background: `hsla(${h},70%,75%,0.3)`, border: `1px solid hsla(${h},70%,60%,0.4)` }}>
                  <div className="text-[10px] font-bold" style={{ color: `hsl(${h},60%,35%)` }}>{d}m</div>
                </div>
              );
            })}
          </div>
        </div>

        {/* CTAs */}
        <div className="flex flex-col sm:flex-row justify-center gap-3 mb-10">
          <Link href="/command-center"
            className="flex items-center justify-center gap-2.5 px-8 py-3.5 rounded-xl font-bold text-sm tracking-widest text-white transition-all"
            style={{ background: 'linear-gradient(135deg, #0369a1, #7c3aed)', boxShadow: '0 6px 30px rgba(3,105,161,0.3)' }}>
            <Zap className="w-4 h-4" />LAUNCH COMMAND CENTER<ArrowRight className="w-4 h-4" />
          </Link>
          <Link href="/about"
            className="flex items-center justify-center gap-2 px-8 py-3.5 rounded-xl font-semibold text-sm text-sky-700 hover:text-sky-900 transition-all"
            style={{ background: 'rgba(255,255,255,0.6)', border: '1px solid rgba(14,116,163,0.25)' }}>
            EXPLORE METHODOLOGY
          </Link>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          {[
            { v: '0.25°', l: 'Spatial Res.', c: '#0369a1' },
            { v: 'Daily', l: 'Temporal', c: '#7c3aed' },
            { v: '15', l: 'Depth Levels', c: '#0891b2' },
            { v: 'ARGO', l: 'Validation', c: '#059669' },
            { v: 'NIO', l: 'Domain', c: '#c026d3' },
          ].map(s => (
            <div key={s.l} className="rounded-xl p-3 text-center"
              style={{ background: 'rgba(255,255,255,0.55)', border: '1px solid rgba(14,116,163,0.15)', backdropFilter: 'blur(8px)' }}>
              <div className="text-lg font-black" style={{ color: s.c }}>{s.v}</div>
              <div className="text-[9px] text-sky-600/70 tracking-wider uppercase mt-0.5">{s.l}</div>
            </div>
          ))}
        </div>

        <div className="text-center mt-5">
          <span className="text-[10px] font-bold text-amber-600/70 tracking-wider uppercase px-3 py-1 rounded-full"
            style={{ background: 'rgba(251,191,36,0.12)', border: '1px solid rgba(251,191,36,0.25)' }}>
            Illustrative Demo · Representative Synthetic Data · Not Operational
          </span>
        </div>
      </div>
    </div>
  );
}
