export default async function handler(req, res) {
  // CORS headers — required for browser fetch calls
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Authorization, Content-Type');

  // Preflight
  if (req.method === 'OPTIONS') return res.status(200).end();

  const url = req.url || '';
  const token = req.headers['authorization'];

  // ── Health check — GET /proxy with no path param ─────────────────────
  if (!url.includes('path=') && !url.includes('instruments')) {
    return res.status(200).json({
      status: 'Swing Scanner Proxy running',
      time: new Date().toISOString(),
      version: '2.0'
    });
  }

  // ── /instruments — proxy to Upstox public JSON instrument file ─────
  // The app's authenticated call to /instruments?segment=NSE_EQ goes via /proxy
  // This fallback endpoint fetches Upstox's public JSON directly (no gzip, no auth needed)
  if (url.startsWith('/instruments') && !url.includes('path=')) {
    try {
      // Upstox publishes a plain JSON file for NSE instruments (no auth, no gzip)
      const jsonUrl = 'https://assets.upstox.com/market-quote/instruments/exchange/NSE.json';
      const resp = await fetch(jsonUrl, {
        headers: { 'Accept': 'application/json' }
      });
      if (!resp.ok) throw new Error('NSE JSON fetch failed: ' + resp.status);
      const all = await resp.json();

      // Filter to EQ only
      const instruments = (Array.isArray(all) ? all : all.data || [])
        .filter(i => i.instrument_type === 'EQ' || (!i.instrument_type && i.segment === 'NSE_EQ'))
        .map(i => ({
          symbol:         i.tradingsymbol || i.symbol,
          name:           i.name || i.tradingsymbol || i.symbol,
          instrument_key: i.instrument_key,
          isin:           i.isin || '',
          instrument_type:'EQ',
          sector:         i.sector_index || i.industry || 'Other'
        }))
        .filter(i => i.symbol && i.instrument_key);

      console.log('NSE instruments served:', instruments.length);
      return res.status(200).json({ status: 'success', instruments });
    } catch (e) {
      console.error('Instruments error:', e.message);
      return res.status(500).json({ error: e.message });
    }
  }

  // ── Requires auth token for all Upstox calls below ───────────────────
  if (!token) {
    return res.status(401).json({ error: 'Missing Authorization header' });
  }

  // ── Parse path from query string ─────────────────────────────────────
  // URL is like /proxy?path=%2Fmarket-quote%2Fltp%3F...
  const queryStart = url.indexOf('?');
  const queryStr   = queryStart >= 0 ? url.slice(queryStart + 1) : '';
  const params     = new URLSearchParams(queryStr);
  const apiPath    = params.get('path');

  if (!apiPath) {
    return res.status(400).json({ error: 'Missing path param. Use /proxy?path=/market-quote/ltp...' });
  }

  // ── POST to Upstox (order placement) ─────────────────────────────────
  if (url.includes('proxy-post')) {
    const upstoxUrl = 'https://api.upstox.com/v2' + apiPath;
    try {
      const upstoxResp = await fetch(upstoxUrl, {
        method: 'POST',
        headers: {
          'Authorization': token,
          'Accept': 'application/json',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(req.body || {})
      });
      const data = await upstoxResp.json();
      return res.status(upstoxResp.status).json(data);
    } catch (e) {
      return res.status(500).json({ error: e.message });
    }
  }

  // ── GET to Upstox ─────────────────────────────────────────────────────
  const upstoxUrl = 'https://api.upstox.com/v2' + apiPath;
  console.log('Proxying GET:', upstoxUrl);

  try {
    const upstoxResp = await fetch(upstoxUrl, {
      headers: {
        'Authorization': token,
        'Accept': 'application/json'
      }
    });
    const data = await upstoxResp.json();
    return res.status(upstoxResp.status).json(data);
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
}
