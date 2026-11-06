/**
 * OmniToolify Cloudflare Worker.
 *
 * Routing:
 *  - /api/health        -> JSON health response
 *  - /api/* (other)     -> JSON 404 (never the SPA HTML)
 *  - everything else     -> Workers Static Assets (../dist) with SPA fallback
 *
 * Workers Static Assets (`env.ASSETS`) does the static serving; this script
 * only intercepts /api/* and forwards the rest. No Firebase Admin SDK, no
 * service-account credentials, and no authentication logic here yet.
 */

export interface Env {
  ASSETS: {
    fetch(request: Request): Promise<Response>;
  };
}

const HEALTH_RESPONSE = {
  ok: true,
  service: 'omnitoolify',
  ts: 0,
} as const;

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);

    if (url.pathname === '/api/health') {
      return Response.json(
        { ...HEALTH_RESPONSE, ts: Date.now() },
        { headers: { 'Cache-Control': 'no-store' } },
      );
    }

    if (url.pathname.startsWith('/api/')) {
      return Response.json(
        { ok: false, error: 'Not found' },
        { status: 404, headers: { 'Cache-Control': 'no-store' } },
      );
    }

    // Static assets (SPA + assets) — never reachable from /api/* above.
    return env.ASSETS.fetch(request);
  },
};
