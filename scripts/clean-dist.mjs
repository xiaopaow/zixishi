import { rm } from 'node:fs/promises';
import { basename, dirname, resolve } from 'node:path';

const workspace = resolve(process.cwd());
const output = resolve(workspace, 'dist');

if (dirname(output) !== workspace || basename(output) !== 'dist') {
  throw new Error(`Refusing to clean unexpected build directory: ${output}`);
}

await rm(output, { recursive: true, force: true });
