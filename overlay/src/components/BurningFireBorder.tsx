import React, { useEffect, useRef } from 'react';

interface BurningFireBorderProps {
  borderRadius?: number;
}

interface Ember {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  alpha: number;
  life: number;
  maxLife: number;
}

export const BurningFireBorder: React.FC<BurningFireBorderProps> = ({ borderRadius = 5 }) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animId: number;
    let width = 0;
    let height = 13;
    const pad = 3; // Ultra-tight 3px buffer for compact 13px bar

    const resize = () => {
      const parent = canvas.parentElement;
      if (!parent) return;
      const rect = parent.getBoundingClientRect();
      width = Math.round(rect.width);
      height = Math.round(rect.height) || 13;

      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = (width + pad * 2) * dpr;
      canvas.height = (height + pad * 2) * dpr;

      // Position canvas exactly -pad from parent top-left so (pad, pad) maps to (0, 0)
      canvas.style.position = 'absolute';
      canvas.style.top = `-${pad}px`;
      canvas.style.left = `-${pad}px`;
      canvas.style.width = `${width + pad * 2}px`;
      canvas.style.height = `${height + pad * 2}px`;

      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };

    resize();
    const ro = new ResizeObserver(resize);
    if (canvas.parentElement) {
      ro.observe(canvas.parentElement);
    }

    const R = Math.min(borderRadius, height / 2);

    const getPerimeterData = (W: number, H: number, radius: number) => {
      const L1 = Math.max(0, W - 2 * radius); // Top
      const L2 = 0.5 * Math.PI * radius;     // Top-Right
      const L3 = Math.max(0, H - 2 * radius); // Right
      const L4 = 0.5 * Math.PI * radius;     // Bottom-Right
      const L5 = L1;                         // Bottom
      const L6 = 0.5 * Math.PI * radius;     // Bottom-Left
      const L7 = L3;                         // Left
      const L8 = 0.5 * Math.PI * radius;     // Top-Left
      const total = L1 + L2 + L3 + L4 + L5 + L6 + L7 + L8;
      return { L1, L2, L3, L4, L5, L6, L7, L8, total };
    };

    const getPointAt = (
      dist: number,
      W: number,
      H: number,
      radius: number,
      data: ReturnType<typeof getPerimeterData>
    ) => {
      const { L1, L2, L3, L4, L5, L6, L7, L8, total } = data;
      let d = ((dist % total) + total) % total;

      if (d <= L1) {
        const t = L1 > 0 ? d / L1 : 0;
        return { x: radius + t * (W - 2 * radius), y: 0, nx: 0, ny: -1, tx: 1, ty: 0 };
      }
      d -= L1;

      if (d <= L2) {
        const angle = 1.5 * Math.PI + (d / L2) * (0.5 * Math.PI);
        return {
          x: W - radius + Math.cos(angle) * radius,
          y: radius + Math.sin(angle) * radius,
          nx: Math.cos(angle),
          ny: Math.sin(angle),
          tx: -Math.sin(angle),
          ty: Math.cos(angle)
        };
      }
      d -= L2;

      if (d <= L3) {
        const t = L3 > 0 ? d / L3 : 0;
        return { x: W, y: radius + t * (H - 2 * radius), nx: 1, ny: 0, tx: 0, ty: 1 };
      }
      d -= L3;

      if (d <= L4) {
        const angle = (d / L4) * (0.5 * Math.PI);
        return {
          x: W - radius + Math.cos(angle) * radius,
          y: H - radius + Math.sin(angle) * radius,
          nx: Math.cos(angle),
          ny: Math.sin(angle),
          tx: -Math.sin(angle),
          ty: Math.cos(angle)
        };
      }
      d -= L4;

      if (d <= L5) {
        const t = L5 > 0 ? d / L5 : 0;
        return { x: W - radius - t * (W - 2 * radius), y: H, nx: 0, ny: 1, tx: -1, ty: 0 };
      }
      d -= L5;

      if (d <= L6) {
        const angle = 0.5 * Math.PI + (d / L6) * (0.5 * Math.PI);
        return {
          x: radius + Math.cos(angle) * radius,
          y: H - radius + Math.sin(angle) * radius,
          nx: Math.cos(angle),
          ny: Math.sin(angle),
          tx: -Math.sin(angle),
          ty: Math.cos(angle)
        };
      }
      d -= L6;

      if (d <= L7) {
        const t = L7 > 0 ? d / L7 : 0;
        return { x: 0, y: H - radius - t * (H - 2 * radius), nx: -1, ny: 0, tx: 0, ty: -1 };
      }
      d -= L7;

      const angle = Math.PI + (d / L8) * (0.5 * Math.PI);
      return {
        x: radius + Math.cos(angle) * radius,
        y: radius + Math.sin(angle) * radius,
        nx: Math.cos(angle),
        ny: Math.sin(angle),
        tx: -Math.sin(angle),
        ty: Math.cos(angle)
      };
    };

    // Delicate embers
    const emberCount = 10;
    const embers: Ember[] = [];

    const initEmber = (e: Ember, pData: ReturnType<typeof getPerimeterData>) => {
      const p = getPointAt(Math.random() * pData.total, width, height, R, pData);
      e.x = p.x + pad;
      e.y = p.y + pad;
      e.vx = p.nx * (Math.random() * 0.15 + 0.05) + (Math.random() - 0.5) * 0.1;
      e.vy = p.ny * (Math.random() * 0.15 + 0.05) - (Math.random() * 0.2 + 0.08);
      e.size = Math.random() * 0.9 + 0.5;
      e.life = 0;
      e.maxLife = Math.random() * 70 + 60;
      e.alpha = Math.random() * 0.5 + 0.2;
    };

    const initialData = getPerimeterData(width || 260, height || 22, R);
    for (let i = 0; i < emberCount; i++) {
      const e: Ember = {} as any;
      initEmber(e, initialData);
      e.life = Math.random() * e.maxLife;
      embers.push(e);
    }

    let startTime = performance.now();

    const render = (now: number) => {
      animId = requestAnimationFrame(render);

      if (width <= 0 || height <= 0) return;

      const t = (now - startTime) * 0.001;
      const pData = getPerimeterData(width, height, R);

      ctx.clearRect(0, 0, width + pad * 2, height + pad * 2);

      const makeRoundedPath = (ctx: CanvasRenderingContext2D) => {
        const x = pad;
        const y = pad;
        const w = width;
        const h = height;
        const r = R;

        ctx.beginPath();
        ctx.moveTo(x + r, y);
        ctx.lineTo(x + w - r, y);
        ctx.arcTo(x + w, y, x + w, y + r, r);
        ctx.lineTo(x + w, y + h - r);
        ctx.arcTo(x + w, y + h, x + w - r, y + h, r);
        ctx.lineTo(x + r, y + h);
        ctx.arcTo(x, y + h, x, y + h - r, r);
        ctx.lineTo(x, y + r);
        ctx.arcTo(x, y, x + r, y, r);
        ctx.closePath();
      };

      ctx.save();
      ctx.globalCompositeOperation = 'lighter';

      // 1. Subtle, tight outer glow
      makeRoundedPath(ctx);
      ctx.lineWidth = 2.4;
      ctx.strokeStyle = 'rgba(245, 120, 0, 0.35)';
      ctx.stroke();

      // 2. Crisp, thin burning strand (perfectly flush on the 1px border)
      makeRoundedPath(ctx);
      ctx.lineWidth = 1.3;
      ctx.strokeStyle = 'rgba(251, 165, 25, 0.85)';
      ctx.stroke();

      // 3. Delicate hot-yellow core filament
      makeRoundedPath(ctx);
      ctx.lineWidth = 0.7;
      ctx.strokeStyle = 'rgba(255, 245, 175, 0.95)';
      ctx.stroke();

      // 4. Subtle, calm licking flame wisps (75% slower, very tight to the rim)
      const flameCount = 24;
      const speed = pData.total * 0.025; // 75% slower circulation

      for (let i = 0; i < flameCount; i++) {
        const offsetDist = (i * (pData.total / flameCount) + t * speed) % pData.total;
        const pt = getPointAt(offsetDist, width, height, R, pData);

        // Calm, gentle breathing motion
        const flamePhase = t * 1.5 + i * 1.8;
        const lickHeight = 1.0 + Math.sin(flamePhase) * 0.9; // Tiny 1.0 - 1.9px lick
        const trailLength = 3.5 + Math.cos(flamePhase * 0.7) * 1.5;

        const bx = pt.x + pad;
        const by = pt.y + pad;

        const tx = bx + pt.nx * lickHeight - pt.tx * trailLength;
        const ty = by + pt.ny * lickHeight - pt.ty * trailLength;

        const cx = bx + pt.nx * (lickHeight * 0.7) - pt.tx * (trailLength * 0.4);
        const cy = by + pt.ny * (lickHeight * 0.7) - pt.ty * (trailLength * 0.4);

        const grad = ctx.createLinearGradient(bx, by, tx, ty);
        grad.addColorStop(0, 'rgba(255, 235, 150, 0.85)');
        grad.addColorStop(0.5, 'rgba(245, 120, 0, 0.55)');
        grad.addColorStop(1, 'rgba(180, 30, 0, 0)');

        ctx.beginPath();
        ctx.moveTo(bx, by);
        ctx.quadraticCurveTo(cx, cy, tx, ty);
        ctx.lineWidth = 1.0;
        ctx.strokeStyle = grad;
        ctx.lineCap = 'round';
        ctx.stroke();
      }

      // 5. Calm, subtle floating embers
      for (let i = 0; i < embers.length; i++) {
        const e = embers[i];
        e.life++;
        e.x += e.vx;
        e.y += e.vy;

        const progress = e.life / e.maxLife;
        if (progress >= 1) {
          initEmber(e, pData);
          continue;
        }

        const currentAlpha = e.alpha * (1 - progress);
        const currentSize = Math.max(0.3, e.size * (1 - progress * 0.5));

        ctx.beginPath();
        ctx.arc(e.x, e.y, currentSize, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(255, ${Math.floor(180 + (1 - progress) * 60)}, 50, ${currentAlpha})`;
        ctx.fill();
      }

      ctx.restore();
    };

    animId = requestAnimationFrame(render);

    return () => {
      cancelAnimationFrame(animId);
      ro.disconnect();
    };
  }, [borderRadius]);

  return (
    <canvas
      ref={canvasRef}
      className="pointer-events-none z-30 overflow-visible select-none"
    />
  );
};
