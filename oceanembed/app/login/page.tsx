'use client';
import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Waves, Eye, EyeOff, ArrowRight, Satellite, Anchor, Fish } from 'lucide-react';

export default function LoginPage() {
  const router = useRouter();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [user, setUser] = useState('demo_researcher');
  const [pass, setPass] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [step, setStep] = useState<'form' | 'connecting' | 'ready'>('form');

  const CONNECT_STEPS = [
    'Connecting to INCOIS data nodes...',
    'Authenticating satellite telemetry link...',
    'Loading ARGO float registry...',
    'Initializing OceanEmbed inference engine...',
    'Synchronizing North Indian Ocean grid...',
    'AQUALENS ready.',
  ];
  const [connectStep, setConnectStep] = useState(0);

  // 3D Ocean Canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const resize = () => {
      canvas.width = canvas.offsetWidth;
      canvas.height = canvas.offsetHeight;
    };
    resize();
    window.addEventListener('resize', resize);

    let t = 0;
    let raf: number;

    // Bubble system
    const bubbles: { x: number; y: number; r: number; vy: number; alpha: number; phase: number }[] = [];
    for (let i = 0; i < 60; i++) {
      bubbles.push({
        x: Math.random(),
        y: Math.random(),
        r: Math.random() * 3 + 0.5,
        vy: -(Math.random() * 0.002 + 0.001),
        alpha: Math.random() * 0.35 + 0.08,
        phase: Math.random() * Math.PI * 2,
      });
    }

    const draw = () => {
      t += 0.008;
      const W = canvas.width, H = canvas.height;
      ctx.clearRect(0, 0, W, H);

      // ── Deep ocean gradient background ──
      const bg = ctx.createLinearGradient(0, 0, 0, H);
      bg.addColorStop(0,   '#020c1b');
      bg.addColorStop(0.3, '#041a35');
      bg.addColorStop(0.7, '#012447');
      bg.addColorStop(1,   '#011530');
      ctx.fillStyle = bg;
      ctx.fillRect(0, 0, W, H);

      // ── Bioluminescent radial glow ──
      const glow1 = ctx.createRadialGradient(W*0.5, H*0.4, 0, W*0.5, H*0.4, H*0.6);
      glow1.addColorStop(0,   'rgba(34,211,238,0.06)');
      glow1.addColorStop(0.5, 'rgba(6,182,212,0.025)');
      glow1.addColorStop(1,   'transparent');
      ctx.fillStyle = glow1;
      ctx.fillRect(0, 0, W, H);

      const glow2 = ctx.createRadialGradient(W*0.2, H*0.7, 0, W*0.2, H*0.7, H*0.4);
      glow2.addColorStop(0,   'rgba(14,165,233,0.08)');
      glow2.addColorStop(1,   'transparent');
      ctx.fillStyle = glow2;
      ctx.fillRect(0, 0, W, H);

      const glow3 = ctx.createRadialGradient(W*0.85, H*0.6, 0, W*0.85, H*0.6, H*0.35);
      glow3.addColorStop(0,   'rgba(56,189,248,0.06)');
      glow3.addColorStop(1,   'transparent');
      ctx.fillStyle = glow3;
      ctx.fillRect(0, 0, W, H);

      // ── 3D perspective depth layers (ocean strata) ──
      const LAYERS = 14;
      for (let i = 0; i < LAYERS; i++) {
        const progress = i / LAYERS;
        const y = H * (0.15 + progress * 0.78);
        const alpha = 0.06 - progress * 0.003;
        const hue = 195 - progress * 40;
        const sat = 70 + progress * 20;
        const lt = 55 - progress * 25;
        const speed = 0.4 + progress * 1.2;
        const amp = (6 + progress * 14) * (1 - progress * 0.3);

        // Fill depth layer
        ctx.beginPath();
        ctx.moveTo(0, y);
        for (let x = 0; x <= W; x += 4) {
          const wave = Math.sin(x / (200 - progress * 60) + t * speed + i) * amp
                     + Math.cos(x / (350 - progress * 80) + t * speed * 0.6 + i * 1.4) * amp * 0.5;
          ctx.lineTo(x, y + wave);
        }
        ctx.lineTo(W, H);
        ctx.lineTo(0, H);
        ctx.closePath();
        ctx.fillStyle = `hsla(${hue},${sat}%,${lt}%,${alpha})`;
        ctx.fill();

        // Bright wave crest line
        ctx.beginPath();
        ctx.moveTo(0, y);
        for (let x = 0; x <= W; x += 4) {
          const wave = Math.sin(x / (200 - progress * 60) + t * speed + i) * amp
                     + Math.cos(x / (350 - progress * 80) + t * speed * 0.6 + i * 1.4) * amp * 0.5;
          ctx.lineTo(x, y + wave);
        }
        ctx.strokeStyle = `hsla(${hue},80%,70%,${0.08 - progress * 0.005})`;
        ctx.lineWidth = 0.8 + (1 - progress) * 0.8;
        ctx.stroke();
      }

      // ── Surface foam / shimmer ──
      ctx.beginPath();
      for (let x = 0; x <= W; x += 3) {
        const surf = H * 0.15 + Math.sin(x / 120 + t * 0.8) * 8 + Math.cos(x / 200 + t * 0.5) * 5;
        if (x === 0) ctx.moveTo(x, surf); else ctx.lineTo(x, surf);
      }
      ctx.strokeStyle = 'rgba(186,230,253,0.18)';
      ctx.lineWidth = 1.5;
      ctx.stroke();

      // Light caustics on surface
      ctx.save();
      ctx.globalAlpha = 0.06;
      for (let i = 0; i < 8; i++) {
        const cx = W * (0.1 + i * 0.12 + Math.sin(t * 0.4 + i) * 0.05);
        const cy = H * 0.13 + Math.cos(t * 0.5 + i * 1.3) * 6;
        const gr = ctx.createRadialGradient(cx, cy, 0, cx, cy, 40 + Math.sin(t + i) * 10);
        gr.addColorStop(0, 'rgba(186,230,253,0.9)');
        gr.addColorStop(1, 'transparent');
        ctx.fillStyle = gr;
        ctx.fillRect(cx - 50, cy - 50, 100, 100);
      }
      ctx.restore();

      // ── Bubbles ──
      for (const b of bubbles) {
        b.y += b.vy;
        b.x += Math.sin(t * 1.5 + b.phase) * 0.0008;
        if (b.y < -0.02) b.y = 1.02;

        const bx = b.x * W, by = b.y * H;
        // Bubble circle
        ctx.beginPath();
        ctx.arc(bx, by, b.r, 0, Math.PI * 2);
        ctx.strokeStyle = `rgba(186,230,253,${b.alpha})`;
        ctx.lineWidth = 0.8;
        ctx.stroke();
        // Inner highlight
        ctx.beginPath();
        ctx.arc(bx - b.r * 0.3, by - b.r * 0.3, b.r * 0.3, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(255,255,255,${b.alpha * 0.5})`;
        ctx.fill();
      }

      // ── Grid overlay (lat/lon feel) ──
      ctx.strokeStyle = 'rgba(56,189,248,0.04)';
      ctx.lineWidth = 0.5;
      ctx.setLineDash([3, 9]);
      for (let x = 0; x < W; x += W / 8) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke(); }
      for (let y = 0; y < H; y += H / 6) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke(); }
      ctx.setLineDash([]);

      // ── Floating ARGO dot points ──
      for (let i = 0; i < 12; i++) {
        const fx = W * (0.08 + i * 0.08 + Math.sin(t * 0.3 + i * 1.7) * 0.03);
        const fy = H * (0.3 + Math.sin(t * 0.2 + i * 2.1) * 0.08 + i * 0.04);
        ctx.beginPath();
        ctx.arc(fx, fy, 2.5, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(251,191,36,${0.3 + Math.sin(t * 2 + i) * 0.15})`;
        ctx.fill();
        // Ping effect
        const pingR = (((t * 1.5 + i * 0.8) % 3) / 3) * 20;
        ctx.beginPath();
        ctx.arc(fx, fy, pingR, 0, Math.PI * 2);
        ctx.strokeStyle = `rgba(251,191,36,${0.15 * (1 - pingR / 20)})`;
        ctx.lineWidth = 0.8;
        ctx.stroke();
      }

      // ── Depth labels on left edge ──
      ctx.font = '8px monospace';
      ctx.fillStyle = 'rgba(56,189,248,0.25)';
      ctx.textAlign = 'left';
      const depths = [0, 50, 100, 200, 500, 1000];
      depths.forEach((d, i) => {
        const y = H * (0.15 + (i / (depths.length - 1)) * 0.78);
        ctx.fillText(`${d}m`, 12, y + 4);
        ctx.strokeStyle = 'rgba(56,189,248,0.06)';
        ctx.lineWidth = 0.4;
        ctx.beginPath(); ctx.moveTo(50, y); ctx.lineTo(W - 50, y); ctx.stroke();
      });

      raf = requestAnimationFrame(draw);
    };

    draw();
    return () => { cancelAnimationFrame(raf); window.removeEventListener('resize', resize); };
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pass) { setError('Enter any password to continue (demo mode).'); return; }
    setError('');
    setStep('connecting');
    for (let i = 0; i < CONNECT_STEPS.length; i++) {
      setConnectStep(i);
      await new Promise(r => setTimeout(r, 520));
    }
    setStep('ready');
    await new Promise(r => setTimeout(r, 700));
    sessionStorage.setItem('aqualens_auth', '1');
    router.push('/home');
  };

  return (
    <div className="relative min-h-screen overflow-hidden flex items-center justify-center">
      {/* 3D Ocean Canvas */}
      <canvas ref={canvasRef} className="absolute inset-0 w-full h-full" />

      {/* Atmospheric top gradient */}
      <div className="absolute top-0 left-0 right-0 h-40 pointer-events-none"
        style={{ background: 'linear-gradient(180deg, rgba(2,12,27,0.8) 0%, transparent 100%)' }} />
      <div className="absolute bottom-0 left-0 right-0 h-32 pointer-events-none"
        style={{ background: 'linear-gradient(0deg, rgba(1,21,48,0.6) 0%, transparent 100%)' }} />

      {/* Top brand bar */}
      <div className="absolute top-0 left-0 right-0 px-8 py-5 flex items-center justify-between z-10">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl flex items-center justify-center"
            style={{ background: 'linear-gradient(135deg, rgba(34,211,238,0.25), rgba(56,189,248,0.15))', border: '1px solid rgba(34,211,238,0.3)' }}>
            <Waves className="w-5 h-5 text-cyan-300" strokeWidth={1.8} />
          </div>
          <div>
            <div className="font-black text-xl tracking-[0.15em] text-white">AQUALENS</div>
            <div className="text-[9px] tracking-[0.2em] text-cyan-400/60 uppercase">Ocean Intelligence Platform</div>
          </div>
        </div>
        <div className="flex items-center gap-4 text-[10px] text-slate-500">
          <div className="flex items-center gap-1.5"><span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />INCOIS Data Feed</div>
          <div className="flex items-center gap-1.5"><span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />DEMO MODE</div>
          <div className="flex items-center gap-1.5"><Satellite className="w-3 h-3 text-cyan-500" />7 Satellites Active</div>
        </div>
      </div>

      {/* Sign-in card */}
      <div className="relative z-10 w-full max-w-sm mx-4">
        {step === 'form' && (
          <div className="rounded-2xl overflow-hidden" style={{
            background: 'rgba(2,15,35,0.82)',
            border: '1px solid rgba(56,189,248,0.2)',
            backdropFilter: 'blur(32px)',
            boxShadow: '0 0 80px rgba(34,211,238,0.08), 0 20px 60px rgba(0,0,0,0.5)',
          }}>
            {/* Card top band */}
            <div className="h-1 w-full" style={{ background: 'linear-gradient(90deg, #22d3ee, #3b82f6, #a78bfa, #22d3ee)', backgroundSize: '300% 100%', animation: 'border-spin 4s linear infinite' }} />

            <div className="p-8">
              {/* Icon */}
              <div className="flex justify-center mb-5">
                <div className="relative">
                  <div className="w-16 h-16 rounded-2xl flex items-center justify-center"
                    style={{ background: 'linear-gradient(135deg, rgba(34,211,238,0.15), rgba(56,189,248,0.1))', border: '1px solid rgba(34,211,238,0.25)' }}>
                    <Waves className="w-8 h-8 text-cyan-300" strokeWidth={1.5} />
                  </div>
                  <div className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-green-400 border-2 border-[rgba(2,15,35,0.9)] flex items-center justify-center">
                    <div className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
                  </div>
                </div>
              </div>

              <h1 className="text-xl font-black text-white tracking-tight text-center mb-1">Sign in to AQUALENS</h1>
              <p className="text-[11px] text-slate-500 text-center mb-6 leading-relaxed">
                Satellite Embedding-Based Ocean Intelligence<br />
                <span className="text-cyan-500/70">MoES / INCOIS · SIH 2024</span>
              </p>

              <form onSubmit={handleLogin} className="space-y-4">
                <div>
                  <label className="block text-[10px] text-slate-500 uppercase tracking-widest mb-1.5">Researcher ID</label>
                  <input
                    type="text"
                    value={user}
                    onChange={e => setUser(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl text-sm text-white font-mono outline-none transition-all"
                    style={{ background: 'rgba(8,25,50,0.7)', border: '1px solid rgba(56,189,248,0.2)', color: '#22d3ee' }}
                    onFocus={e => e.currentTarget.style.borderColor = 'rgba(34,211,238,0.5)'}
                    onBlur={e => e.currentTarget.style.borderColor = 'rgba(56,189,248,0.2)'}
                  />
                </div>
                <div>
                  <label className="block text-[10px] text-slate-500 uppercase tracking-widest mb-1.5">Access Key</label>
                  <div className="relative">
                    <input
                      type={showPass ? 'text' : 'password'}
                      value={pass}
                      onChange={e => setPass(e.target.value)}
                      placeholder="Enter any key (demo)"
                      className="w-full px-4 py-3 rounded-xl text-sm text-white outline-none pr-12 transition-all"
                      style={{ background: 'rgba(8,25,50,0.7)', border: '1px solid rgba(56,189,248,0.2)' }}
                      onFocus={e => e.currentTarget.style.borderColor = 'rgba(34,211,238,0.5)'}
                      onBlur={e => e.currentTarget.style.borderColor = 'rgba(56,189,248,0.2)'}
                    />
                    <button type="button" onClick={() => setShowPass(!showPass)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-cyan-300 transition-colors">
                      {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                {error && <p className="text-[11px] text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">{error}</p>}

                <button type="submit"
                  className="w-full py-3.5 rounded-xl font-bold text-[13px] tracking-[0.1em] text-white flex items-center justify-center gap-2.5 transition-all group mt-2"
                  style={{ background: 'linear-gradient(135deg, #0e7490, #1d4ed8)', boxShadow: '0 6px 30px rgba(34,211,238,0.2)' }}
                  onMouseEnter={e => (e.currentTarget.style.boxShadow = '0 8px 40px rgba(34,211,238,0.35)')}
                  onMouseLeave={e => (e.currentTarget.style.boxShadow = '0 6px 30px rgba(34,211,238,0.2)')}>
                  ENTER OCEAN INTELLIGENCE
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </button>
              </form>

              {/* Credentials note */}
              <div className="mt-5 rounded-xl p-3.5" style={{ background: 'rgba(251,191,36,0.06)', border: '1px solid rgba(251,191,36,0.2)' }}>
                <div className="text-[10px] font-bold text-amber-400 mb-1.5 tracking-wider uppercase">Demo Access</div>
                <div className="text-[10px] text-slate-400 space-y-0.5">
                  <div>ID: <span className="text-cyan-300 font-mono">demo_researcher</span></div>
                  <div>Key: <span className="text-cyan-300 font-mono">any key</span></div>
                </div>
              </div>

              <div className="mt-4 flex items-center justify-center gap-4 text-[9px] text-slate-600">
                <div className="flex items-center gap-1"><Fish className="w-3 h-3" />ARGO Validated</div>
                <div className="flex items-center gap-1"><Anchor className="w-3 h-3" />GLORYS12 Ready</div>
                <div className="flex items-center gap-1"><Satellite className="w-3 h-3" />7-Channel Satellite</div>
              </div>
            </div>
          </div>
        )}

        {/* Connecting overlay */}
        {(step === 'connecting' || step === 'ready') && (
          <div className="rounded-2xl p-8 text-center" style={{
            background: 'rgba(2,15,35,0.9)',
            border: '1px solid rgba(56,189,248,0.2)',
            backdropFilter: 'blur(32px)',
            boxShadow: '0 0 80px rgba(34,211,238,0.1)',
          }}>
            <div className="w-16 h-16 rounded-2xl mx-auto mb-5 flex items-center justify-center"
              style={{ background: 'linear-gradient(135deg, rgba(34,211,238,0.2), rgba(56,189,248,0.1))', border: '1px solid rgba(34,211,238,0.3)' }}>
              <Waves className={`w-8 h-8 text-cyan-300 ${step !== 'ready' ? 'animate-pulse' : ''}`} />
            </div>

            <div className="font-bold text-white text-sm mb-6 tracking-wide">
              {step === 'ready' ? '✓ AQUALENS READY' : 'ESTABLISHING CONNECTION...'}
            </div>

            <div className="text-left space-y-2 mb-6">
              {CONNECT_STEPS.map((s, i) => (
                <div key={i} className={`flex items-center gap-2.5 text-[11px] transition-all ${
                  i < connectStep ? 'text-green-400' :
                  i === connectStep ? 'text-cyan-300' :
                  'text-slate-700'
                }`}>
                  <div className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${
                    i < connectStep ? 'bg-green-400' :
                    i === connectStep ? 'bg-cyan-400 animate-pulse' :
                    'bg-slate-700'
                  }`} />
                  <span className={i === connectStep ? 'font-semibold' : ''}>{s}</span>
                </div>
              ))}
            </div>

            <div className="h-1 rounded-full bg-slate-800 overflow-hidden">
              <div className="h-full rounded-full transition-all duration-500"
                style={{
                  width: `${((connectStep + 1) / CONNECT_STEPS.length) * 100}%`,
                  background: 'linear-gradient(90deg, #22d3ee, #3b82f6, #a78bfa)',
                }} />
            </div>
          </div>
        )}
      </div>

      {/* Bottom info */}
      <div className="absolute bottom-5 left-0 right-0 text-center text-[9px] text-slate-700 z-10">
        Research Prototype · Smart India Hackathon 2024 · Problem Statement SIH26066 · Ministry of Earth Sciences
      </div>
    </div>
  );
}
