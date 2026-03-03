import zlib from 'zlib';
import { promisify } from 'util';

const gunzip = promisify(zlib.gunzip);

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Authorization, Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const url = req.url || '';
  const token = req.headers['authorization'];

  // Health check
  if (!url.includes('path=') && !url.includes('instruments') && !url.includes('proxy-post')) {
    return res.status(200).json({ status: 'Swing Scanner Proxy running', time: new Date().toISOString() });
  }

  // /instruments — decompress NSE.json.gz with Node zlib
  if (url.startsWith('/instruments')) {
    try {
      const gzUrl = 'https://assets.upstox.com/market-quote/instruments/exchange/NSE.json.gz';
      const resp = await fetch(gzUrl);
      if (!resp.ok) throw new Error('Upstox instruments fetch failed: ' + resp.status);

      const arrayBuf = await resp.arrayBuffer();
      const compressed = Buffer.from(arrayBuf);
      const decompressed = await gunzip(compressed);
      const all = JSON.parse(decompressed.toString('utf8'));

      const instruments = (Array.isArray(all) ? all : [])
        .filter(i => i.segment === 'NSE_EQ' && i.instrument_type === 'EQ')
        .map(i => ({
          symbol:          i.trading_symbol || i.short_name,
          name:            i.name || i.trading_symbol,
          instrument_key:  i.instrument_key,
          isin:            i.isin || '',
          instrument_type: 'EQ',
          sector:          i.sector_index || 'Other'
        }))
        .filter(i => i.symbol && i.instrument_key);

      console.log('NSE EQ instruments:', instruments.length);
      return res.status(200).json({ status: 'success', count: instruments.length, instruments });
    } catch (e) {
      console.error('Instruments error:', e.message);
      return res.status(500).json({ error: 'Instrument download failed: ' + e.message });
    }
  }

  if (!token) return res.status(401).json({ error: 'Missing Authorization header' });

  const qs = url.includes('?') ? url.slice(url.indexOf('?') + 1) : '';
  const params = new URLSearchParams(qs);
  const apiPath = params.get('path');

  // /proxy-post — POST to Upstox
  if (url.includes('proxy-post')) {
    if (!apiPath) return res.status(400).json({ error: 'Missing path param' });
    const upstoxUrl = 'https://api.upstox.com/v2' + apiPath;
    try {
      const r = await fetch(upstoxUrl, {
        method: 'POST',
        headers: { 'Authorization': token, 'Accept': 'application/json', 'Content-Type': 'application/json' },
        body: JSON.stringify(req.body || {})
      });
      const data = await r.json();
      return res.status(r.status).json(data);
    } catch (e) {
      return res.status(500).json({ error: e.message });
    }
  }

  // /proxy — GET to Upstox
  if (!apiPath) return res.status(400).json({ error: 'Missing path param. Use /proxy?path=/...' });

  const upstoxUrl = 'https://api.upstox.com/v2' + apiPath;
  console.log('GET', upstoxUrl);

  try {
    const r = await fetch(upstoxUrl, {
      headers: { 'Authorization': token, 'Accept': 'application/json' }
    });
    const data = await r.json();
    return res.status(r.status).json(data);
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
}
