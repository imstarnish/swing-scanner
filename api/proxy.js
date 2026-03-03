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

  // ── /instruments — fetch & parse Upstox NSE instrument CSV ───────────
  if (url.includes('instruments')) {
    try {
      const csvUrl = 'https://assets.upstox.com/market-quote/instruments/exchange/complete.csv.gz';
      const resp = await fetch(csvUrl);
      if (!resp.ok) throw new Error('CSV fetch failed: ' + resp.status);

      const buffer = await resp.arrayBuffer();
      const ds = new DecompressionStream('gzip');
      const writer = ds.writable.getWriter();
      writer.write(buffer);
      writer.close();

      const reader = ds.readable.getReader();
      const chunks = [];
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        chunks.push(value);
      }
      const total = chunks.reduce((a, c) => a + c.length, 0);
      const merged = new Uint8Array(total);
      let offset = 0;
      for (const chunk of chunks) { merged.set(chunk, offset); offset += chunk.length; }
      const text = new TextDecoder().decode(merged);

      const lines = text.split('\n');
      const headers = lines[0].split(',').map(h => h.trim().replace(/"/g, ''));
      const idxKey  = headers.indexOf('instrument_key');
      const idxSym  = headers.indexOf('tradingsymbol');
      const idxName = headers.indexOf('name');
      const idxType = headers.indexOf('instrument_type');
      const idxExch = headers.indexOf('exchange');
      const idxIsin = headers.indexOf('isin');
      const idxSec  = headers.indexOf('sector_index');

      const instruments = [];
      for (let i = 1; i < lines.length; i++) {
        const row = lines[i].split(',');
        if (row.length < 5) continue;
        const exch = (row[idxExch] || '').replace(/"/g, '').trim();
        const type = (row[idxType] || '').replace(/"/g, '').trim();
        if (exch !== 'NSE' || type !== 'EQ') continue;
        const sym  = (row[idxSym]  || '').replace(/"/g, '').trim();
        const name = (row[idxName] || sym).replace(/"/g, '').trim();
        const key  = (row[idxKey]  || '').replace(/"/g, '').trim();
        const isin = (row[idxIsin] || '').replace(/"/g, '').trim();
        const sec  = (row[idxSec]  || 'Other').replace(/"/g, '').trim();
        if (!sym || !key) continue;
        instruments.push({ symbol: sym, name, instrument_key: key, isin, instrument_type: type, sector: sec });
      }

      return res.status(200).json({ status: 'success', instruments });
    } catch (e) {
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
