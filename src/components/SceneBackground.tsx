import { useEffect, useState, type CSSProperties } from 'react';
import type { Quality, Scene } from '../types';
import { AtmosphereCanvas } from './AtmosphereCanvas';
import { LivingDetails } from './LivingDetails';
import { ScenePicture } from './ScenePicture';

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
  const [loadedSceneId, setLoadedSceneId] = useState<string | null>(null);
  const [pointer, setPointer] = useState({ x: 0, y: 0 });
  const [systemReducedMotion, setSystemReducedMotion] = useState(false);
  const loaded = loadedSceneId === scene.id;

  useEffect(() => {
    const media = window.matchMedia('(prefers-reduced-motion: reduce)');
    const update = () => setSystemReducedMotion(media.matches);
    update();
    media.addEventListener?.('change', update);
    return () => media.removeEventListener?.('change', update);
  }, []);

  const effectsEnabled = motionEnabled && !systemReducedMotion;
  useEffect(() => {
    if (!effectsEnabled) setPointer({ x: 0, y: 0 });
  }, [effectsEnabled]);

  const style = {
    '--scene-overlay': dim ? scene.palette.overlay : 'rgba(0,0,0,.08)',
    '--parallax-x': `${pointer.x}px`,
    '--parallax-y': `${pointer.y}px`,
    '--foreground-x': `${pointer.x * -0.45}px`,
    '--foreground-y': `${pointer.y * -0.35}px`,
  } as CSSProperties;

  return (
    <div
      className={`scene-background ${effectsEnabled ? 'motion-enabled' : 'motion-disabled'}`}
      data-scene={scene.id}
      style={style}
      onPointerMove={(event) => {
        if (!effectsEnabled) {
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
      <ScenePicture
        className="scene-image scene-poster"
        scene={scene}
        variant="poster"
        alt=""
        aria-hidden="true"
      />
      <ScenePicture
        className={`scene-image scene-full ${loaded ? 'is-loaded' : ''}`}
        scene={scene}
        variant={quality === 'high' ? 'full' : 'poster'}
        fallbackToPoster
        alt={scene.name}
        onLoad={() => setLoadedSceneId(scene.id)}
        onError={() => setLoadedSceneId(scene.id)}
      />
      <div className="scene-parallax-glow" aria-hidden="true" />
      <div
        className={`scene-foreground foreground-${scene.effect}`}
        aria-hidden="true"
      />
      {effectsEnabled && <LivingDetails scene={scene} quality={quality} />}
      <AtmosphereCanvas
        effect={scene.effect}
        enabled={effectsEnabled}
        quality={quality}
      />
      <div className="scene-shade" aria-hidden="true" />
      {children}
    </div>
  );
}
