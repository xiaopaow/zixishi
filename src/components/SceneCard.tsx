import { Check, Sparkles, UsersRound } from 'lucide-react';
import type { Scene } from '../types';
import { ScenePicture } from './ScenePicture';

interface SceneCardProps {
  scene: Scene;
  selected: boolean;
  onSelect: () => void;
  compact?: boolean;
  onlineCount?: number | null;
}

export function SceneCard({
  scene,
  selected,
  onSelect,
  compact = false,
  onlineCount = null,
}: SceneCardProps) {
  return (
    <button
      type="button"
      className={`scene-card ${selected ? 'selected' : ''} ${compact ? 'compact' : ''}`}
      onClick={onSelect}
      aria-pressed={selected}
    >
      <ScenePicture scene={scene} variant="poster" alt="" loading="lazy" />
      <span className="scene-card-shade" />
      <span className="scene-card-copy">
        <small><Sparkles size={12} /> 原创场景</small>
        <strong>{scene.shortName}</strong>
        {!compact && <em>{scene.description}</em>}
      </span>
      {onlineCount !== null && (
        <span className="scene-online">
          <UsersRound size={12} />
          {onlineCount} 人专注中
        </span>
      )}
      {selected && <span className="scene-check"><Check size={16} /></span>}
    </button>
  );
}
