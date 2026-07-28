import type { ImgHTMLAttributes, SyntheticEvent } from 'react';
import type { Scene } from '../types';

interface ScenePictureProps
  extends Omit<ImgHTMLAttributes<HTMLImageElement>, 'src'> {
  scene: Scene;
  variant?: 'full' | 'poster';
  fallbackToPoster?: boolean;
}

export function ScenePicture({
  scene,
  variant = 'full',
  fallbackToPoster = false,
  onError,
  ...imageProps
}: ScenePictureProps) {
  const avif = variant === 'full' ? scene.avif : scene.posterAvif;
  const webp = variant === 'full' ? scene.image : scene.poster;
  const fallback = fallbackToPoster ? scene.poster : webp;

  const handleError = (event: SyntheticEvent<HTMLImageElement>) => {
    event.currentTarget
      .closest('picture')
      ?.querySelector('source')
      ?.remove();
    if (!event.currentTarget.src.endsWith(fallback)) {
      event.currentTarget.src = fallback;
    }
    onError?.(event);
  };

  return (
    <picture className="scene-picture">
      <source srcSet={avif} type="image/avif" />
      <img
        {...imageProps}
        src={webp}
        onError={handleError}
      />
    </picture>
  );
}
