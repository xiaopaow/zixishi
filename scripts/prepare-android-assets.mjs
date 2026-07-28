import { mkdir, readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const outputDirectory = new URL('../assets/', import.meta.url);
await mkdir(outputDirectory, { recursive: true });
const outputPath = (filename) =>
  fileURLToPath(new URL(filename, outputDirectory));

const sourceIcon = await readFile(
  new URL('../public/icon.svg', import.meta.url),
);

const foregroundSvg = `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1024 1024">
  <defs>
    <linearGradient id="leaf" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#f1d9a8"/>
      <stop offset="1" stop-color="#caa36c"/>
    </linearGradient>
  </defs>
  <circle cx="512" cy="520" r="256" fill="none" stroke="#f7f1e6" stroke-width="44" opacity=".96"/>
  <path d="M512 346v184l124 74" fill="none" stroke="#f7f1e6" stroke-width="44" stroke-linecap="round" stroke-linejoin="round"/>
  <path d="M374 340c-16-124 68-198 186-192 8 116-62 196-186 192Z" fill="url(#leaf)"/>
  <path d="M380 330c62-42 108-90 152-152" fill="none" stroke="#28584f" stroke-width="18" stroke-linecap="round" opacity=".78"/>
</svg>`;

const backgroundSvg = `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1024 1024">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#28584f"/>
      <stop offset="1" stop-color="#102f2b"/>
    </linearGradient>
  </defs>
  <rect width="1024" height="1024" fill="url(#bg)"/>
</svg>`;

const splashSvg = (dark = false) => `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 2732 2732">
  <defs>
    <radialGradient id="glow">
      <stop offset="0" stop-color="#d8b77a" stop-opacity=".18"/>
      <stop offset=".55" stop-color="#244f48" stop-opacity=".08"/>
      <stop offset="1" stop-color="${dark ? '#0b2622' : '#173c36'}" stop-opacity="0"/>
    </radialGradient>
    <linearGradient id="leaf" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#f1d9a8"/>
      <stop offset="1" stop-color="#caa36c"/>
    </linearGradient>
  </defs>
  <rect width="2732" height="2732" fill="${dark ? '#0b2622' : '#173c36'}"/>
  <circle cx="1366" cy="1366" r="1060" fill="url(#glow)"/>
  <g transform="translate(726 726) scale(1.25)">
    <circle cx="512" cy="520" r="256" fill="none" stroke="#f7f1e6" stroke-width="44" opacity=".96"/>
    <path d="M512 346v184l124 74" fill="none" stroke="#f7f1e6" stroke-width="44" stroke-linecap="round" stroke-linejoin="round"/>
    <path d="M374 340c-16-124 68-198 186-192 8 116-62 196-186 192Z" fill="url(#leaf)"/>
    <path d="M380 330c62-42 108-90 152-152" fill="none" stroke="#28584f" stroke-width="18" stroke-linecap="round" opacity=".78"/>
  </g>
</svg>`;

await Promise.all([
  sharp(sourceIcon).resize(1024, 1024).png().toFile(outputPath('icon-only.png')),
  sharp(Buffer.from(foregroundSvg)).png().toFile(outputPath('icon-foreground.png')),
  sharp(Buffer.from(backgroundSvg)).png().toFile(outputPath('icon-background.png')),
  sharp(Buffer.from(splashSvg())).png().toFile(outputPath('splash.png')),
  sharp(Buffer.from(splashSvg(true))).png().toFile(outputPath('splash-dark.png')),
]);

console.log('Prepared deterministic Android icon and splash sources in assets/.');
