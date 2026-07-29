import type { CSSProperties } from 'react';
import type { Quality, Scene } from '../types';

interface LivingDetailsProps {
  scene: Scene;
  quality: Quality;
}

export function LivingDetails({ scene, quality }: LivingDetailsProps) {
  if (!scene.details) return null;
  const strandCount = quality === 'high' ? 3 : 2;

  return (
    <div className="living-detail-plane" aria-hidden="true">
      {scene.details.glow && (
        <span
          className="living-glow"
          style={{
            left: `${scene.details.glow.x}%`,
            top: `${scene.details.glow.y}%`,
            width: `${scene.details.glow.size ?? 16}%`,
            '--living-glow':
              scene.details.glow.color ?? 'rgba(255, 194, 112, .24)',
          } as CSSProperties}
        />
      )}
      {scene.details.steam?.map((anchor, emitterIndex) => (
        <span
          className="steam-emitter"
          key={`${anchor.x}-${anchor.y}`}
          style={{
            left: `${anchor.x}%`,
            top: `${anchor.y}%`,
            width: `${4.6 * (anchor.scale ?? 1)}%`,
            height: `${17 * (anchor.scale ?? 1)}%`,
          }}
        >
          {Array.from({ length: strandCount }, (_, strandIndex) => (
            <i
              key={strandIndex}
              style={{
                animationDelay: `${-1.4 * strandIndex - emitterIndex * 0.75}s`,
                animationDuration: `${5.4 + strandIndex * 0.65}s`,
                '--steam-drift': `${(strandIndex % 2 === 0 ? -1 : 1) * (12 + strandIndex * 4)}%`,
              } as CSSProperties}
            />
          ))}
        </span>
      ))}
    </div>
  );
}
