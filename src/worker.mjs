const BASE_PATH = '/thiep-cuoi';

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (url.pathname === BASE_PATH || url.pathname === BASE_PATH + '/admin' || url.pathname === '/admin') {
      url.pathname += '/';
      return Response.redirect(url.href, 308);
    }

    const mounted = url.pathname.startsWith(BASE_PATH + '/');
    if (mounted) url.pathname = url.pathname.slice(BASE_PATH.length);

    const response = await env.ASSETS.fetch(new Request(url, request));

    // Keep asset redirects (for example, /index.html -> /) under the mount path.
    const location = response.headers.get('Location');
    if (!mounted || response.status < 300 || response.status >= 400 || !location) {
      return response;
    }

    const target = new URL(location, url);
    if (target.origin !== url.origin) return response;

    target.pathname = BASE_PATH + target.pathname;
    const headers = new Headers(response.headers);
    headers.set('Location', target.href);
    return new Response(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers
    });
  }
};
