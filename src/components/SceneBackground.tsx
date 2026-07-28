import { useEffect, useState, type CSSProperties } from 'react';
import type { Quality, Scene } from '../types';
import { AtmosphereCanvas } from './AtmosphereCanvas';

interface SceneBackgroundProps {
  scene: Scene;
  motionEnabled: boolean;
  quality: Quality;
  dim?: boolean;
  children?: React.ReactNode;
}

export function SceneBackground({
  scene,
  motionEnabled,
  quality,
  dim = true,
  children,
}: SceneBackgroundProps) {
  const [loaded, setLoaded] = useState(false);
  const [pointer, setPointer] = useState({ x: 0, y: 0 });

  useEffect(() => {
    setLoaded(false);
  }, [scene.id]);

  const style = {
    '--scene-overlay': dim ? scene.palette.overlay : 'rgba(0,0,0,.08)',
    '--parallax-x': `${pointer.x}px`,
    '--parallax-y': `${pointer.y}px`,
  } as CSSProperties;

  return (
    <div
      className="scene-background"
      style={style}
      onPointerMove={(event) => {
        if (!motionEnabled || window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
          return;
        }
        const rect = event.currentTarget.getBoundingClientRect();
        setPointer({
          x: ((event.clientX - rect.left) / rect.width - 0.5) * -8,
          y: ((event.clientY - rect.top) / rect.height - 0.5) * -5,
        });
      }}
      onPointerLeave={() => setPointer({ x: 0, y: 0 })}
    >
      <img
        className="scene-image scene-poster"
        src={scene.poster}
        alt=""
        aria-hidden="true"
      />
      <img
        className={`scene-image scene-full ${loaded ? 'is-loaded' : ''}`}
        src={quality === 'high' ? scene.image : scene.poster}
        alt={scene.name}
        onLoad={() => setLoaded(true)}
      />
      <div className="scene-parallax-glow" aria-hidden="true" />
      <AtmosphereCanvas
        effect={scene.effect}
        enabled={motionEnabled}
        quality={quality}
      />
      <div className="scene-shade" aria-hidden="true" />
      {children}
    </div>
  );
}
