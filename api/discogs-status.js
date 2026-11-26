// Vercel serverless function: tells the UI whether a Discogs token is configured, without revealing it.
export default function handler(_req, res) {
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Cache-Control', 'no-store');
  res.status(200).send(JSON.stringify({ token: !!(process.env.DISCOGS_TOKEN || '').trim() }));
}
