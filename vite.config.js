import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

// The browser calls /api/discogs/... and this server forwards it to https://api.discogs.com.
// Why a proxy: the optional DISCOGS_TOKEN stays on the server (never shipped to the browser),
// and we can send the descriptive User-Agent Discogs asks API clients to use.
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), ''); // reads .env / .env.local, incl. non-VITE_ vars
  const token = (env.DISCOGS_TOKEN || '').trim();

  const discogsProxy = {
    '/api/discogs': {
      target: 'https://api.discogs.com',
      changeOrigin: true,
      rewrite: (p) => p.replace(/^\/api\/discogs/, ''),
      headers: {
        'User-Agent': 'VinylScout/0.1 (ENTI 333 student prototype)',
        ...(token ? { Authorization: `Discogs token=${token}` } : {}),
      },
    },
  };

  // Lets the UI know whether a token is configured, without revealing it.
  const status = (_req, res) => { res.setHeader('Content-Type', 'application/json'); res.end(JSON.stringify({ token: !!token })); };

  // Guard: the token gives full access to the owner's Discogs account, so when this server is
  // shared (tunnel / Replit) only the two read-only calls the app needs may pass through the proxy.
  const ALLOWED = [/^\/database\/search\?[^#]*$/, /^\/releases\/\d+\/?(\?[^#]*)?$/];
  const guard = (req, res, next) => {
    const path = req.url || '';
    if ((req.method === 'GET' || req.method === 'HEAD') && ALLOWED.some((re) => re.test(path))) return next();
    res.statusCode = 403;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({ message: 'VinylScout proxy only allows Discogs searches and release lookups.' }));
  };

  const statusPlugin = {
    name: 'discogs-status-and-guard',
    configureServer(server) { server.middlewares.use('/api/discogs-status', status); server.middlewares.use('/api/discogs', guard); },
    configurePreviewServer(server) { server.middlewares.use('/api/discogs-status', status); server.middlewares.use('/api/discogs', guard); },
  };

  return {
    plugins: [react(), statusPlugin],
    server: { allowedHosts: true, proxy: discogsProxy },
    preview: { allowedHosts: true, proxy: discogsProxy },
  };
});
