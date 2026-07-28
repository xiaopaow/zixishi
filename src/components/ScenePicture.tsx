import type { ImgHTMLAttributes, SyntheticEvent } from 'react';
import type { Scene } from '../types';

interface ScenePictureProps
  extends Omit<ImgHTMLAttributes<HTMLImageElement>, 'src' | 'srcSet'> {
  scene: Scene;
  variant?: 'full' | 'poster';
  fallbackToPoster?: boolean;
}

const responsiveSources = (source: string, nativeWidth: number) => {
  const extensionIndex = source.lastIndexOf('.');
  if (extensionIndex < 0) return source;
  const base = source.slice(0, extensionIndex);
  const extension = source.slice(extensionIndex);
  const candidates = [`${base}-1280${extension} 1280w`];
  if (nativeWidth >= 2560) {
    candidates.push(`${base}-2560${extension} 2560w`);
  }
  candidates.push(`${source} ${nativeWidth}w`);
  return candidates.join(', ');
};

export function ScenePicture({
  scene,
  variant = 'full',
  fallbackToPoster = false,
  onError,
  sizes,
  width,
  height,
  ...imageProps
}: ScenePictureProps) {
  const avif = variant === 'full' ? scene.avif : scene.posterAvif;
  const webp = variant === 'full' ? scene.image : scene.poster;
  const fallback = fallbackToPoster ? scene.poster : webp;
  const responsive = variant === 'full';

  const handleError = (event: SyntheticEvent<HTMLImageElement>) => {
    event.currentTarget
      .closest('picture')
      ?.querySelectorAll('source')
      .forEach((source) => source.remove());
    event.currentTarget.removeAttribute('srcset');
    if (event.currentTarget.getAttribute('src') !== fallback) {
      event.currentTarget.src = fallback;
    }
    onError?.(event);
  };

  return (
    <picture className="scene-picture">
      <source
        srcSet={responsive ? responsiveSources(avif, scene.imageWidth) : avif}
        sizes={responsive ? (sizes ?? '100vw') : undefined}
        type="image/avif"
      />
      <img
        {...imageProps}
        src={webp}
        srcSet={
          responsive ? responsiveSources(webp, scene.imageWidth) : undefined
        }
        sizes={responsive ? (sizes ?? '100vw') : sizes}
        width={width ?? (responsive ? scene.imageWidth : 720)}
        height={height ?? (responsive ? scene.imageHeight : 405)}
        onError={handleError}
      />
    </picture>
  );
}
