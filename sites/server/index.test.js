import { describe, expect, it, vi } from 'vitest';
import server from './index.js';

describe('Sites runtime configuration', () => {
  it('serves account configuration from the deployment environment', async () => {
    const response = await server.fetch(
      new Request('https://qishi.example/__qishi/runtime-config'),
      {
        VITE_SUPABASE_URL: 'https://project.supabase.co',
        VITE_SUPABASE_PUBLISHABLE_KEY: 'sb_publishable_test',
        VITE_PUBLIC_APP_URL: 'https://qishi.example',
      },
    );

    expect(response.status).toBe(200);
    expect(response.headers.get('content-type')).toContain('application/json');
    expect(response.headers.get('cache-control')).toContain('no-store');
    await expect(response.json()).resolves.toMatchObject(
      {
        VITE_SUPABASE_URL: 'https://project.supabase.co',
        VITE_SUPABASE_PUBLISHABLE_KEY: 'sb_publishable_test',
        VITE_PUBLIC_APP_URL: 'https://qishi.example',
      },
    );
  });

  it('keeps application-shell fallback behavior for page requests', async () => {
    const assetFetch = vi
      .fn()
      .mockResolvedValueOnce(new Response('missing', { status: 404 }))
      .mockResolvedValueOnce(new Response('app shell'));

    const response = await server.fetch(
      new Request('https://qishi.example/room', {
        headers: { accept: 'text/html' },
      }),
      { ASSETS: { fetch: assetFetch } },
    );

    expect(await response.text()).toBe('app shell');
    expect(assetFetch).toHaveBeenCalledTimes(2);
  });
});
