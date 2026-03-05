export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Authorization, Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const token = req.headers['authorization'];
  const rawUrl = req.url || '';
  const qs = rawUrl.includes('?') ? rawUrl.slice(rawUrl.indexOf('?') + 1) : '';
  const params = new URLSearchParams(qs);
  const apiPath = params.get('path');

  // Health check
  if (!apiPath) {
    return res.status(200).json({ status: 'Swing Scanner Proxy running', time: new Date().toISOString() });
  }

  if (!token) return res.status(401).json({ error: 'Missing Authorization header' });

  const upstoxUrl = 'https://api.upstox.com/v2' + apiPath;

  if (req.method === 'POST') {
    try {
      const r = await fetch(upstoxUrl, {
        method: 'POST',
        headers: { 'Authorization': token, 'Accept': 'application/json', 'Content-Type': 'application/json' },
        body: JSON.stringify(req.body || {})
      });
      return res.status(r.status).json(await r.json());
    } catch (e) { return res.status(500).json({ error: e.message }); }
  }

  try {
    const r = await fetch(upstoxUrl, {
      headers: { 'Authorization': token, 'Accept': 'application/json' }
    });
    return res.status(r.status).json(await r.json());
  } catch (e) { return res.status(500).json({ error: e.message }); }
}
