import { useEffect, useRef, useState, type CSSProperties } from 'react';
import { isNativeApp } from '../native/mobile';
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
  const [systemReducedMotion, setSystemReducedMotion] = useState(false);
  const [constrainedDevice, setConstrainedDevice] = useState(
    () =>
      isNativeApp ||
      window.matchMedia(
        '(max-width: 820px), (pointer: coarse)',
      ).matches,
  );
  const backgroundRef = useRef<HTMLDivElement>(null);
  const parallaxFrame = useRef(0);
  const pendingParallax = useRef({ x: 0, y: 0 });
  const loaded = loadedSceneId === scene.id;

  useEffect(() => {
    const media = window.matchMedia('(prefers-reduced-motion: reduce)');
    const update = () => setSystemReducedMotion(media.matches);
    update();
    media.addEventListener?.('change', update);
    return () => media.removeEventListener?.('change', update);
  }, []);

  useEffect(() => {
    if (isNativeApp) return;
    const media = window.matchMedia(
      '(max-width: 820px), (pointer: coarse)',
    );
    const update = () => setConstrainedDevice(media.matches);
    update();
    media.addEventListener?.('change', update);
    return () => media.removeEventListener?.('change', update);
  }, []);

  const effectsEnabled = motionEnabled && !systemReducedMotion;
  const parallaxEnabled =
    effectsEnabled && !constrainedDevice && quality === 'high';
  const renderQuality = constrainedDevice ? 'low' : quality;

  const scheduleParallax = (x: number, y: number) => {
    pendingParallax.current = { x, y };
    if (parallaxFrame.current) return;
    parallaxFrame.current = window.requestAnimationFrame(() => {
      const element = backgroundRef.current;
      const point = pendingParallax.current;
      element?.style.setProperty('--parallax-x', `${point.x}px`);
      element?.style.setProperty('--parallax-y', `${point.y}px`);
      element?.style.setProperty('--foreground-x', `${point.x * -0.45}px`);
      element?.style.setProperty('--foreground-y', `${point.y * -0.35}px`);
      parallaxFrame.current = 0;
    });
  };

  useEffect(() => {
    if (!parallaxEnabled) scheduleParallax(0, 0);
    return () => {
      if (parallaxFrame.current) {
        window.cancelAnimationFrame(parallaxFrame.current);
        parallaxFrame.current = 0;
      }
    };
  }, [parallaxEnabled]);

  const style = {
    '--scene-overlay': dim ? scene.palette.overlay : 'rgba(0,0,0,.08)',
    '--parallax-x': '0px',
    '--parallax-y': '0px',
    '--foreground-x': '0px',
    '--foreground-y': '0px',
  } as CSSProperties;

  return (
    <div
      ref={backgroundRef}
      className={`scene-background ${effectsEnabled ? 'motion-enabled' : 'motion-disabled'}`}
      data-scene={scene.id}
      style={style}
      onPointerMove={(event) => {
        if (!parallaxEnabled) {
          return;
        }
        const rect = event.currentTarget.getBoundingClientRect();
        scheduleParallax(
          ((event.clientX - rect.left) / rect.width - 0.5) * -8,
          ((event.clientY - rect.top) / rect.height - 0.5) * -5,
        );
      }}
      onPointerLeave={() => {
        if (parallaxEnabled) scheduleParallax(0, 0);
      }}
    >
      {!loaded && (
        <ScenePicture
          className="scene-image scene-poster"
          scene={scene}
          variant="poster"
          alt=""
          aria-hidden="true"
        />
      )}
      <ScenePicture
        className={`scene-image scene-full ${loaded ? 'is-loaded' : ''}`}
        scene={scene}
        variant={quality === 'high' ? 'full' : 'poster'}
        sizes={constrainedDevice && quality === 'high' ? '420px' : undefined}
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
      {effectsEnabled && (
        <LivingDetails scene={scene} quality={renderQuality} />
      )}
      <AtmosphereCanvas
        effect={scene.effect}
        enabled={effectsEnabled}
        quality={renderQuality}
        performanceMode={constrainedDevice}
      />
      <div className="scene-shade" aria-hidden="true" />
      {children}
    </div>
  );
}
