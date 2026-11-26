// Vercel serverless function: the production version of the Discogs proxy in vite.config.js.
// The browser calls /api/discogs/<path>; this forwards it to https://api.discogs.com/<path> with the
// DISCOGS_TOKEN (a Vercel environment variable) so the token never reaches the browser.
// Same safety rule as local dev: only the two read-only calls the app needs are allowed through.

const ALLOWED = [/^\/database\/search$/, /^\/releases\/\d+\/?$/];
const UA = 'VinylScout/0.1 (ENTI 333 student prototype)';

export default async function handler(req, res) {
  const url = new URL(req.url, 'http://localhost');
  const path = url.pathname.replace(/^\/api\/discogs/, '') || '/';

  if (!['GET', 'HEAD'].includes(req.method) || !ALLOWED.some((re) => re.test(path))) {
    res.status(403).json({ message: 'VinylScout proxy only allows Discogs searches and release lookups.' });
    return;
  }

  const token = (process.env.DISCOGS_TOKEN || '').trim();
  try {
    const upstream = await fetch(`https://api.discogs.com${path}${url.search}`, {
      headers: { 'User-Agent': UA, Accept: 'application/json', ...(token ? { Authorization: `Discogs token=${token}` } : {}) },
    });
    const body = await upstream.text();
    res.status(upstream.status);
    res.setHeader('Content-Type', upstream.headers.get('content-type') || 'application/json');
    for (const h of ['x-discogs-ratelimit', 'x-discogs-ratelimit-remaining', 'x-discogs-ratelimit-used']) {
      const v = upstream.headers.get(h);
      if (v) res.setHeader(h, v);
    }
    // short edge cache: well inside the Discogs terms' 6-hour freshness limit
    if (upstream.ok) res.setHeader('Cache-Control', 'public, s-maxage=600, stale-while-revalidate=1800');
    res.send(body);
  } catch {
    res.status(502).json({ message: 'Could not reach Discogs.' });
  }
}
