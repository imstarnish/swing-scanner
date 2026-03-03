import zlib from 'zlib';
import { promisify } from 'util';
const gunzip = promisify(zlib.gunzip);
export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Authorization, Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  const token = req.headers['authorization'];
  const rawUrl = req.url || '';
  const qIndex = rawUrl.indexOf('?');
  const qs = qIndex >= 0 ? rawUrl.slice(qIndex + 1) : '';
  const params = new URLSearchParams(qs);
  const route = params.get('route') || 'proxy';
  const apiPath = params.get('path');
  console.log('route=' + route + ' path=' + apiPath);
  if (route === 'proxy' && !apiPath) {
    return res.status(200).json({ status: 'Swing Scanner Proxy running', time: new Date().toISOString() });
  }
  if (route === 'instruments') {
    try {
      const gzUrl = 'https://assets.upstox.com/market-quote/instruments/exchange/NSE.json.gz';
      const resp = await fetch(gzUrl);
      if (!resp.ok) throw new Error('Upstox fetch failed: HTTP ' + resp.status);
      const compressed = Buffer.from(await resp.arrayBuffer());
      const decompressed = await gunzip(compressed);
      const all = JSON.parse(decompressed.toString('utf8'));
      const instruments = (Array.isArray(all) ? all : [])
        .filter(i => i.segment === 'NSE_EQ' && i.instrument_type === 'EQ')
        .map(i => ({ symbol: i.trading_symbol || i.short_name, name: i.name || i.trading_symbol, instrument_key: i.instrument_key, isin: i.isin || '', instrument_type: 'EQ', sector: i.sector_index || 'Other' }))
        .filter(i => i.symbol && i.instrument_key);
      return res.status(200).json({ status: 'success', count: instruments.length, instruments });
    } catch (e) {
      return res.status(500).json({ error: 'Instrument download failed: ' + e.message });
    }
  }
  if (!token) return res.status(401).json({ error: 'Missing Authorization header' });
  if (!apiPath) return res.status(400).json({ error: 'Missing path param' });
  const upstoxUrl = 'https://api.upstox.com/v2' + apiPath;
  if (route === 'proxy-post') {
    try {
      const r = await fetch(upstoxUrl, { method: 'POST', headers: { 'Authorization': token, 'Accept': 'application/json', 'Content-Type': 'application/json' }, body: JSON.stringify(req.body || {}) });
      return res.status(r.status).json(await r.json());
    } catch (e) { return res.status(500).json({ error: e.message }); }
  }
  try {
    const r = await fetch(upstoxUrl, { headers: { 'Authorization': token, 'Accept': 'application/json' } });
    return res.status(r.status).json(await r.json());
  } catch (e) { return res.status(500).json({ error: e.message }); }
}
