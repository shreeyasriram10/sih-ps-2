'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { DEPTH_LEVELS } from '@/lib/constants';
import { DEMO_PROFILES, OceanProfile } from '@/lib/ocean-simulation';
import { Info } from 'lucide-react';

function tempToHSL(temp: number, min = 2, max = 31): string {
  const t = Math.max(0, Math.min(1, (temp - min) / (max - min)));
  if (t < 0.25) return '#0284c7';
  if (t < 0.5) return '#0d9488';
  if (t < 0.75) return '#d97706';
  return '#dc2626';
}

export default function Ocean3DPage() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [selectedDepthIdx, setSelectedDepthIdx] = useState(0);
  const [selectedDepth, setSelectedDepth] = useState(0);
  const [region, setRegion] = useState<'Arabian Sea' | 'Bay of Bengal'>('Arabian Sea');
  const [profiles, setProfiles] = useState<OceanProfile[]>([]);
  const [isCrossSection, setIsCrossSection] = useState(false);

  useEffect(() => {
    setProfiles(DEMO_PROFILES.filter(p => p.region === region && p.date === '2024-01-15'));
  }, [region]);

  useEffect(() => {
    setSelectedDepth(DEPTH_LEVELS[selectedDepthIdx]);
  }, [selectedDepthIdx]);

  // Draw 3D ocean visualization
  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas || profiles.length === 0) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    canvas.width = canvas.offsetWidth;
    canvas.height = canvas.offsetHeight;
    const W = canvas.width, H = canvas.height;

    ctx.fillStyle = '#f0f9ff';
    ctx.fillRect(0, 0, W, H);

    if (isCrossSection) {
      const p15 = profiles.find(p => p.lat === 15) ?? profiles[0];
      if (!p15) return;

      ctx.fillStyle = '#e0f2fe';
      ctx.fillRect(0, 0, W, H);

      const gridX = 80, gridY = 30;
      const gridW = W - 120, gridH = H - 80;

      ctx.strokeStyle = 'rgba(14,116,163,0.3)';
      ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.moveTo(gridX, gridY); ctx.lineTo(gridX, gridY + gridH); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(gridX, gridY + gridH); ctx.lineTo(gridX + gridW, gridY + gridH); ctx.stroke();

      const maxD = 1000;

      for (let i = 0; i < DEPTH_LEVELS.length - 1; i++) {
        const d1 = DEPTH_LEVELS[i], d2 = DEPTH_LEVELS[i + 1];
        const y1 = gridY + (d1 / maxD) * gridH;
        const y2 = gridY + (d2 / maxD) * gridH;
        const t1 = p15.reconstruction[d1], t2 = p15.reconstruction[d2];
        const grad = ctx.createLinearGradient(0, y1, 0, y2);
        grad.addColorStop(0, tempToHSL(t1));
        grad.addColorStop(1, tempToHSL(t2));
        ctx.fillStyle = grad;
        ctx.fillRect(gridX, y1, gridW, y2 - y1);
      }

      ctx.font = 'bold 10px monospace'; ctx.fillStyle = '#0c4a6e'; ctx.textAlign = 'right';
      for (const d of [0, 50, 100, 200, 500, 1000]) {
        const y = gridY + (d / maxD) * gridH;
        ctx.fillText(`${d}m`, gridX - 6, y + 4);
        ctx.strokeStyle = 'rgba(14,116,163,0.2)';
        ctx.beginPath(); ctx.moveTo(gridX, y); ctx.lineTo(gridX + gridW, y); ctx.stroke();
      }
    } else {
      // Stacked 3D Depth Planes
      const centerX = W / 2, centerY = H / 2 - 40;
      const planeW = 280, planeH = 140;
      const depthGap = 16;

      DEPTH_LEVELS.forEach((d, idx) => {
        const yOffset = centerY + (idx - DEPTH_LEVELS.length / 2) * depthGap;
        const isSelected = d === selectedDepth;

        const avgTemp = profiles.reduce((s, p) => s + (p.reconstruction[d] ?? 0), 0) / (profiles.length || 1);
        const color = tempToHSL(avgTemp);

        ctx.save();
        ctx.translate(centerX, yOffset);

        ctx.beginPath();
        ctx.moveTo(0, -planeH / 2);
        ctx.lineTo(planeW / 2, 0);
        ctx.lineTo(0, planeH / 2);
        ctx.lineTo(-planeW / 2, 0);
        ctx.closePath();

        ctx.fillStyle = color;
        ctx.globalAlpha = isSelected ? 0.95 : 0.45;
        ctx.fill();

        ctx.strokeStyle = isSelected ? '#0284c7' : 'rgba(14,116,163,0.3)';
        ctx.lineWidth = isSelected ? 3 : 1;
        ctx.stroke();

        if (isSelected) {
          ctx.fillStyle = '#0c4a6e';
          ctx.font = 'black 12px sans-serif';
          ctx.fillText(`Selected Depth: ${d}m (${avgTemp.toFixed(1)}°C)`, planeW / 2 + 15, 4);
        }

        ctx.restore();
      });
    }
  }, [profiles, selectedDepth, isCrossSection]);

  useEffect(() => { draw(); }, [draw]);

  return (
    <div className="min-h-screen py-8 ocean-gradient grid-bg">
      <div className="max-w-screen-xl mx-auto px-6 py-8">
        <div className="mb-6">
          <div className="section-label mb-1">3D Ocean Profile Explorer</div>
          <h1 className="text-3xl font-black text-sky-950 tracking-tight mb-2">Subsurface 3D Temperature Structure</h1>
          <p className="text-sm font-semibold text-sky-800/80 max-w-2xl">
            Visualize the reconstructed temperature field as a layered 3D ocean volume. Drag the depth slider to explore standard depth planes.
          </p>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-4 gap-6">
          {/* Controls */}
          <div className="xl:col-span-1 space-y-5">
            <div className="glass-strong p-5">
              <div className="section-label mb-3">Region</div>
              {(['Arabian Sea', 'Bay of Bengal'] as const).map(r => (
                <button key={r} onClick={() => setRegion(r)}
                  className={`w-full mb-2 px-4 py-2.5 text-xs font-black rounded-xl text-left transition-all ${
                    region === r ? 'bg-sky-600 text-white shadow-md' : 'bg-white/80 text-sky-900 border border-sky-200 hover:bg-sky-50'
                  }`}>{r}</button>
              ))}
            </div>

            <div className="glass-strong p-5">
              <div className="section-label mb-3">Depth Selection</div>
              <input type="range" min={0} max={DEPTH_LEVELS.length - 1} value={selectedDepthIdx}
                onChange={e => setSelectedDepthIdx(+e.target.value)}
                className="w-full mb-3" />
              <div className="text-center mb-4">
                <div className="text-3xl font-black text-sky-950 font-mono">{selectedDepth}m</div>
                <div className="text-[10px] font-bold text-sky-700 uppercase tracking-widest">Depth Level</div>
              </div>
              <div className="grid grid-cols-3 gap-1.5">
                {DEPTH_LEVELS.map((d, i) => {
                  const avgTemp = profiles.reduce((s, p) => s + (p.reconstruction[d] ?? 0), 0) / (profiles.length || 1);
                  return (
                    <button key={d} onClick={() => setSelectedDepthIdx(i)}
                      className={`px-1.5 py-2 text-[10px] rounded-lg font-mono text-center transition-all ${
                        d === selectedDepth ? 'bg-sky-600 text-white font-black shadow-sm' : 'bg-white/80 text-sky-900 border border-sky-200 hover:bg-sky-50 font-bold'
                      }`}>
                      <div className="font-extrabold">{d}m</div>
                      <div style={{ color: d === selectedDepth ? '#ffffff' : tempToHSL(avgTemp) }}>{avgTemp.toFixed(0)}°C</div>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="glass-strong p-5">
              <div className="section-label mb-3">View Mode</div>
              <div className="space-y-2">
                <button onClick={() => setIsCrossSection(false)}
                  className={`w-full px-4 py-2.5 text-xs font-bold rounded-xl text-left transition-all ${
                    !isCrossSection ? 'bg-sky-600 text-white shadow-md' : 'bg-white/80 text-sky-900 border border-sky-200 hover:bg-sky-50'
                  }`}>
                  <div className="font-black">3D LAYER VIEW</div>
                  <div className="text-[10px] opacity-80">Stacked depth planes</div>
                </button>
                <button onClick={() => setIsCrossSection(true)}
                  className={`w-full px-4 py-2.5 text-xs font-bold rounded-xl text-left transition-all ${
                    isCrossSection ? 'bg-sky-600 text-white shadow-md' : 'bg-white/80 text-sky-900 border border-sky-200 hover:bg-sky-50'
                  }`}>
                  <div className="font-black">CROSS-SECTION</div>
                  <div className="text-[10px] opacity-80">Vertical temperature slice</div>
                </button>
              </div>
            </div>

            {/* Temperature scale */}
            <div className="glass-strong p-5">
              <div className="section-label mb-3">Temperature Scale</div>
              <div className="flex items-center gap-2 font-mono text-xs font-black text-sky-900">
                <span>2°C</span>
                <div className="flex-1 h-4 rounded-lg overflow-hidden flex border border-sky-200 shadow-xs">
                  {Array.from({ length: 20 }).map((_, i) => (
                    <div key={i} className="flex-1" style={{ background: tempToHSL(2 + i * 1.5) }} />
                  ))}
                </div>
                <span>31°C</span>
              </div>
            </div>
          </div>

          {/* Canvas View */}
          <div className="xl:col-span-3">
            <div className="glass-strong p-5">
              <div className="rounded-xl overflow-hidden border border-sky-200 bg-sky-50 shadow-md" style={{ height: 520 }}>
                <canvas ref={canvasRef} className="w-full h-full" style={{ height: 520 }} />
              </div>
              <div className="mt-4 flex items-start gap-2 text-xs font-semibold text-sky-800">
                <Info className="w-4 h-4 text-sky-600 flex-shrink-0 mt-0.5" />
                <span>
                  3D isometric projection of reconstructed temperature field.
                  Each horizontal plane represents temperature at a single depth level.
                  The highlighted plane is the currently selected depth ({selectedDepth}m).
                </span>
              </div>

              {/* Temperature at Selected Depth */}
              {!isCrossSection && (
                <div className="mt-5 pt-4 border-t border-sky-200/80">
                  <div className="section-label mb-3">Temperature Grid at Depth: {selectedDepth}m</div>
                  <div className="flex flex-wrap gap-2.5">
                    {profiles.map((p, i) => (
                      <div key={i} className="bg-white/90 px-3.5 py-2.5 rounded-xl border border-sky-200 text-center min-w-[100px] shadow-xs">
                        <div className="text-[10px] font-bold text-sky-800 font-mono">{p.lat}°N {p.lon}°E</div>
                        <div className="font-black text-sm font-mono mt-0.5"
                          style={{ color: tempToHSL(p.reconstruction[selectedDepth]) }}>
                          {p.reconstruction[selectedDepth]?.toFixed(1)}°C
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
