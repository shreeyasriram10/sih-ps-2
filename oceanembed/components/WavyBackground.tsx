'use client';

import { useEffect, useRef } from 'react';

export default function WavyBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId: number;
    let t = 0;

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };

    resize();
    window.addEventListener('resize', resize);

    const draw = () => {
      t += 0.005;
      const W = canvas.width;
      const H = canvas.height;

      ctx.clearRect(0, 0, W, H);

      // Draw 6 layered animated flowing waves with soft ocean gradients
      const waves = [
        { y: H * 0.2, amp: 25, freq: 0.003, speed: 0.8, color: 'rgba(2, 132, 199, 0.06)' },
        { y: H * 0.35, amp: 35, freq: 0.002, speed: 0.6, color: 'rgba(6, 182, 212, 0.05)' },
        { y: H * 0.5, amp: 45, freq: 0.0025, speed: 0.9, color: 'rgba(56, 189, 248, 0.06)' },
        { y: H * 0.65, amp: 30, freq: 0.0035, speed: 0.7, color: 'rgba(124, 58, 237, 0.035)' },
        { y: H * 0.8, amp: 40, freq: 0.002, speed: 0.5, color: 'rgba(14, 116, 163, 0.05)' },
        { y: H * 0.9, amp: 20, freq: 0.004, speed: 1.1, color: 'rgba(16, 185, 129, 0.04)' },
      ];

      waves.forEach((w) => {
        ctx.beginPath();
        ctx.moveTo(0, w.y);

        for (let x = 0; x <= W; x += 10) {
          const waveY =
            w.y +
            Math.sin(x * w.freq + t * w.speed) * w.amp +
            Math.cos((x * w.freq) / 2 + t * w.speed * 0.7) * (w.amp / 2);
          ctx.lineTo(x, waveY);
        }

        ctx.lineTo(W, H);
        ctx.lineTo(0, H);
        ctx.closePath();

        ctx.fillStyle = w.color;
        ctx.fill();

        // Wave crest line
        ctx.beginPath();
        ctx.moveTo(0, w.y);
        for (let x = 0; x <= W; x += 10) {
          const waveY =
            w.y +
            Math.sin(x * w.freq + t * w.speed) * w.amp +
            Math.cos((x * w.freq) / 2 + t * w.speed * 0.7) * (w.amp / 2);
          ctx.lineTo(x, waveY);
        }
        ctx.strokeStyle = w.color.replace(/0\.\d+\)/, '0.12)');
        ctx.lineWidth = 1.2;
        ctx.stroke();
      });

      animationFrameId = requestAnimationFrame(draw);
    };

    draw();

    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener('resize', resize);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 w-full h-full pointer-events-none z-0 opacity-80"
    />
  );
}
