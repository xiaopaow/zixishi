import { useEffect, useRef } from 'react';
import type { Quality, SceneEffect } from '../types';

interface Particle {
  x: number;
  y: number;
  speed: number;
  size: number;
  alpha: number;
  drift: number;
  phase: number;
}

interface Twinkle {
  x: number;
  y: number;
  size: number;
  phase: number;
}

interface AtmosphereCanvasProps {
  effect: SceneEffect;
  enabled: boolean;
  quality: Quality;
  performanceMode?: boolean;
}

export function AtmosphereCanvas({
  effect,
  enabled,
  quality,
  performanceMode = false,
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
    let twinkles: Twinkle[] = [];
    const count = performanceMode ? 30 : quality === 'high' ? 92 : 42;

    const seedParticles = () => {
      particles = Array.from({ length: count }, () => ({
        x: Math.random() * width * (effect === 'snow' ? 0.82 : 1),
        y: Math.random() * height * (effect === 'snow' ? 0.82 : 1),
        speed:
          effect === 'rain' || effect === 'city' || effect === 'train'
            ? 4 + Math.random() * 7
            : effect === 'snow'
              ? 0.3 + Math.random() * 0.75
              : effect === 'ginkgo'
                ? 0.28 + Math.random() * 0.7
                : effect === 'classroom'
                  ? 0.08 + Math.random() * 0.24
                : 0.12 + Math.random() * 0.45,
        size:
          effect === 'rain' || effect === 'city' || effect === 'train'
            ? 8 + Math.random() * 18
            : effect === 'snow'
              ? 0.8 + Math.random() * 2.3
              : effect === 'ginkgo'
                ? 3.2 + Math.random() * 6
                : effect === 'classroom'
                  ? 0.7 + Math.random() * 1.8
                : 12 + Math.random() * 54,
        alpha: 0.05 + Math.random() * 0.2,
        drift: -0.25 + Math.random() * 0.5,
        phase: Math.random() * Math.PI * 2,
      }));
      twinkles = Array.from(
        {
          length: performanceMode
            ? 8
            : quality === 'high'
              ? 26
              : 12,
        },
        () => ({
          x: width * (0.43 + Math.random() * 0.53),
          y: height * (0.38 + Math.random() * 0.36),
          size: 0.6 + Math.random() * 1.4,
          phase: Math.random() * Math.PI * 2,
        }),
      );
    };

    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      const ratio = Math.min(
        window.devicePixelRatio || 1,
        performanceMode ? 1 : quality === 'high' ? 1.5 : 1,
      );
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

    const drawCityLights = () => {
      twinkles.forEach((light) => {
        const pulse = 0.5 + Math.sin(frame * 0.035 + light.phase) * 0.5;
        context.fillStyle = `rgba(244,187,104,${0.035 + pulse * 0.18})`;
        context.fillRect(light.x, light.y, light.size, light.size * 0.72);
      });
    };

    const drawSnow = () => {
      particles.forEach((particle) => {
        const pulse = 0.72 + Math.sin(frame * 0.025 + particle.phase) * 0.28;
        context.fillStyle = `rgba(238,248,255,${(particle.alpha + 0.08) * pulse})`;
        context.beginPath();
        context.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2);
        context.fill();
        particle.x += particle.drift * 0.65;
        particle.y += particle.speed;
        if (
          particle.y > height * 0.82 ||
          particle.x < 0 ||
          particle.x > width * 0.82
        ) {
          particle.x = Math.random() * width * 0.82;
          particle.y = -8;
        }
      });
    };

    const drawGinkgo = () => {
      particles.slice(0, Math.floor(count * 0.72)).forEach((particle, index) => {
        const angle = frame * 0.012 + particle.phase + index * 0.17;
        context.save();
        context.translate(particle.x, particle.y);
        context.rotate(angle);
        context.fillStyle = `rgba(220,164,64,${particle.alpha + 0.13})`;
        context.beginPath();
        context.ellipse(
          0,
          0,
          particle.size,
          particle.size * 0.48,
          0,
          0,
          Math.PI * 2,
        );
        context.fill();
        context.restore();
        particle.x += particle.drift * 0.8 + Math.sin(angle) * 0.22;
        particle.y += particle.speed;
        if (particle.y > height + 12 || particle.x < -14 || particle.x > width + 14) {
          particle.x = width * (0.28 + Math.random() * 0.7);
          particle.y = -12;
        }
      });
    };

    const drawTrainWindow = () => {
      context.save();
      context.beginPath();
      context.rect(0, 0, width * 0.74, height * 0.82);
      context.clip();
      drawRain(true);
      const travel = (frame * 2.1) % (width * 1.55);
      const reflectionX = width * 1.15 - travel;
      const glow = context.createLinearGradient(
        reflectionX - 80,
        0,
        reflectionX + 80,
        0,
      );
      glow.addColorStop(0, 'rgba(225,184,112,0)');
      glow.addColorStop(0.5, 'rgba(225,184,112,0.07)');
      glow.addColorStop(1, 'rgba(225,184,112,0)');
      context.fillStyle = glow;
      context.fillRect(reflectionX - 80, 0, 160, height * 0.82);
      context.restore();
    };

    const drawClassroomDust = () => {
      particles.slice(0, Math.floor(count * 0.68)).forEach((particle) => {
        const pulse = 0.45 + Math.sin(frame * 0.018 + particle.phase) * 0.42;
        context.fillStyle = `rgba(255,225,164,${(particle.alpha + 0.06) * pulse})`;
        context.beginPath();
        context.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2);
        context.fill();
        particle.x += particle.drift * 0.22;
        particle.y -= particle.speed;
        if (particle.y < -8 || particle.x < -8 || particle.x > width + 8) {
          particle.x = width * (0.3 + Math.random() * 0.68);
          particle.y = height + 8;
        }
      });
    };

    let animationFrame = 0;
    let lastPaintAt = 0;
    const frameInterval = performanceMode
      ? 1000 / 24
      : quality === 'low'
        ? 1000 / 30
        : 0;

    function scheduleFrame() {
      if (!animationFrame && document.visibilityState === 'visible') {
        animationFrame = window.requestAnimationFrame(render);
      }
    }

    function render(timestamp: number) {
      animationFrame = 0;
      if (frameInterval && timestamp - lastPaintAt < frameInterval) {
        scheduleFrame();
        return;
      }
      lastPaintAt = timestamp;
      context!.clearRect(0, 0, width, height);
      if (effect === 'rain') drawRain();
      if (effect === 'city') {
        drawRain(true);
        drawCityLights();
      }
      if (effect === 'mist') drawMist();
      if (effect === 'sea') drawSea();
      if (effect === 'snow') drawSnow();
      if (effect === 'ginkgo') drawGinkgo();
      if (effect === 'train') drawTrainWindow();
      if (effect === 'classroom') drawClassroomDust();
      frame += 1;
      scheduleFrame();
    }

    const handleVisibility = () => {
      if (document.visibilityState === 'hidden') {
        window.cancelAnimationFrame(animationFrame);
        animationFrame = 0;
      } else {
        lastPaintAt = 0;
        scheduleFrame();
      }
    };
    const observer = new ResizeObserver(resize);
    observer.observe(canvas);
    document.addEventListener('visibilitychange', handleVisibility);
    resize();
    scheduleFrame();
    return () => {
      observer.disconnect();
      document.removeEventListener('visibilitychange', handleVisibility);
      window.cancelAnimationFrame(animationFrame);
    };
  }, [effect, enabled, performanceMode, quality]);

  if (!enabled) return null;
  return <canvas ref={canvasRef} className="atmosphere-canvas" aria-hidden="true" />;
}
