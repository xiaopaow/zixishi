import { useEffect, useRef } from 'react';
import type { Quality, SceneEffect } from '../types';

interface Particle {
  x: number;
  y: number;
  speed: number;
  size: number;
  alpha: number;
  drift: number;
}

interface AtmosphereCanvasProps {
  effect: SceneEffect;
  enabled: boolean;
  quality: Quality;
}

export function AtmosphereCanvas({
  effect,
  enabled,
  quality,
}: AtmosphereCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !enabled) return;
    const context = canvas.getContext('2d');
    if (!context) return;
    let frame = 0;
    let width = 0;
    let height = 0;
    let particles: Particle[] = [];
    const count = quality === 'high' ? 92 : 42;

    const seedParticles = () => {
      particles = Array.from({ length: count }, () => ({
        x: Math.random() * width,
        y: Math.random() * height,
        speed:
          effect === 'rain' || effect === 'city'
            ? 4 + Math.random() * 7
            : 0.12 + Math.random() * 0.45,
        size:
          effect === 'rain' || effect === 'city'
            ? 8 + Math.random() * 18
            : 12 + Math.random() * 54,
        alpha: 0.05 + Math.random() * 0.2,
        drift: -0.25 + Math.random() * 0.5,
      }));
    };

    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      const ratio = Math.min(window.devicePixelRatio || 1, quality === 'high' ? 1.5 : 1);
      width = rect.width;
      height = rect.height;
      canvas.width = Math.round(width * ratio);
      canvas.height = Math.round(height * ratio);
      context.setTransform(ratio, 0, 0, ratio, 0, 0);
      seedParticles();
    };

    const drawRain = (city = false) => {
      context.lineCap = 'round';
      particles.forEach((particle) => {
        context.beginPath();
        context.strokeStyle = city
          ? `rgba(188,211,226,${particle.alpha * 0.7})`
          : `rgba(210,233,235,${particle.alpha})`;
        context.lineWidth = city ? 0.7 : 0.9;
        context.moveTo(particle.x, particle.y);
        context.lineTo(particle.x - particle.size * 0.18, particle.y + particle.size);
        context.stroke();
        particle.x -= particle.speed * 0.18;
        particle.y += particle.speed;
        if (particle.y > height + 30 || particle.x < -30) {
          particle.x = Math.random() * width + 20;
          particle.y = -30;
        }
      });
    };

    const drawMist = () => {
      context.globalCompositeOperation = 'screen';
      particles.forEach((particle, index) => {
        const gradient = context.createRadialGradient(
          particle.x,
          particle.y,
          0,
          particle.x,
          particle.y,
          particle.size,
        );
        gradient.addColorStop(0, `rgba(229,240,225,${particle.alpha * 0.7})`);
        gradient.addColorStop(1, 'rgba(229,240,225,0)');
        context.fillStyle = gradient;
        context.beginPath();
        context.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2);
        context.fill();
        particle.x += particle.speed + Math.sin(frame / 160 + index) * 0.08;
        particle.y += particle.drift * 0.12;
        if (particle.x > width + particle.size) particle.x = -particle.size;
      });
      context.globalCompositeOperation = 'source-over';
    };

    const drawSea = () => {
      particles.slice(0, Math.floor(count * 0.55)).forEach((particle, index) => {
        const pulse = 0.5 + Math.sin(frame / 45 + index) * 0.5;
        context.fillStyle = `rgba(255,224,181,${particle.alpha * pulse})`;
        context.beginPath();
        context.arc(particle.x, particle.y, Math.max(1, particle.size / 18), 0, Math.PI * 2);
        context.fill();
        particle.x += particle.drift * 0.22;
        particle.y -= particle.speed * 0.18;
        if (particle.y < -10) {
          particle.y = height + 10;
          particle.x = Math.random() * width;
        }
      });
    };

    const render = () => {
      context.clearRect(0, 0, width, height);
      if (effect === 'rain') drawRain();
      if (effect === 'city') drawRain(true);
      if (effect === 'mist') drawMist();
      if (effect === 'sea') drawSea();
      frame += 1;
      animationFrame = window.requestAnimationFrame(render);
    };

    let animationFrame = 0;
    const observer = new ResizeObserver(resize);
    observer.observe(canvas);
    resize();
    render();
    return () => {
      observer.disconnect();
      window.cancelAnimationFrame(animationFrame);
    };
  }, [effect, enabled, quality]);

  if (!enabled) return null;
  return <canvas ref={canvasRef} className="atmosphere-canvas" aria-hidden="true" />;
}
