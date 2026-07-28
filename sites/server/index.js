const isPageRequest = (request) =>
  request.method === 'GET' &&
  (request.headers.get('accept') ?? '').includes('text/html');

export default {
  async fetch(request, env) {
    if (!env?.ASSETS?.fetch) {
      return new Response('Static asset binding is unavailable.', { status: 503 });
    }

    const response = await env.ASSETS.fetch(request);
    if (response.status !== 404 || !isPageRequest(request)) {
      return response;
    }

    const url = new URL(request.url);
    url.pathname = '/index.html';
    url.search = '';
    return env.ASSETS.fetch(new Request(url, request));
  },
};
