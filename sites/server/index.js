const isPageRequest = (request) =>
  request.method === 'GET' &&
  (request.headers.get('accept') ?? '').includes('text/html');

const runtimeConfigResponse = (env) => {
  const config = {
    VITE_SUPABASE_URL: env?.VITE_SUPABASE_URL ?? '',
    VITE_SUPABASE_PUBLISHABLE_KEY:
      env?.VITE_SUPABASE_PUBLISHABLE_KEY ??
      env?.VITE_SUPABASE_ANON_KEY ??
      '',
    VITE_PUBLIC_APP_URL: env?.VITE_PUBLIC_APP_URL ?? '',
  };
  const serialized = JSON.stringify(config)
    .replaceAll('\u2028', '\\u2028')
    .replaceAll('\u2029', '\\u2029');

  return new Response(
    `globalThis.__QISHI_CONFIG__ = ${serialized};`,
    {
      headers: {
        'content-type': 'text/javascript; charset=utf-8',
        'cache-control': 'no-store, max-age=0',
      },
    },
  );
};

export default {
  async fetch(request, env) {
    const requestUrl = new URL(request.url);
    if (
      request.method === 'GET' &&
      requestUrl.pathname === '/runtime-config.js'
    ) {
      return runtimeConfigResponse(env);
    }

    if (!env?.ASSETS?.fetch) {
      return new Response('Static asset binding is unavailable.', { status: 503 });
    }

    const response = await env.ASSETS.fetch(request);
    if (response.status !== 404 || !isPageRequest(request)) {
      return response;
    }

    const url = requestUrl;
    url.pathname = '/index.html';
    url.search = '';
    return env.ASSETS.fetch(new Request(url, request));
  },
};
