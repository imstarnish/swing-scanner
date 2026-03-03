export default async function handler(req, res) {
res.setHeader('Access-Control-Allow-Origin', '*');
res.setHeader('Access-Control-Allow-Methods','GET, OPTIONS');
res.setHeader('Access-Control-Allow-Headers', 'Authorization, Content-Type');
if (req.method === ‘OPTIONS’) return res.status(200).end();

const path = req.query.path;
const token = req.headers['authorization'];

// Health check
if (!path && req.url.indexOf('instruments') === -1) {
return res.status(200).json({ status: 'Swing Scanner Proxy running', time: new Date().toISOString() });
}

// ── /instruments — fetch and parse Upstox NSE instrument list ──────────
if (req.url.indexOf('instruments') !== -1 && req.url.indexOf('path') === -1) {
try {
const csvUrl = 'https://assets.upstox.com/market-quote/instruments/exchange/complete.csv.gz';
const resp = await fetch(csvUrl);
if (!resp.ok) throw new Error('CSV fetch failed: ' + resp.status);

  // Decompress gzip
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
  const totalLength = chunks.reduce((a, c) => a + c.length, 0);
  const merged = new Uint8Array(totalLength);
  let offset = 0;
  for (const chunk of chunks) { merged.set(chunk, offset); offset += chunk.length; }
  const text = new TextDecoder().decode(merged);

  // Parse CSV
  // Upstox CSV columns: instrument_key,exchange_token,tradingsymbol,name,last_price,
  //                     expiry,strike,tick_size,lot_size,instrument_type,option_type,
  //                     exchange,isin,sector_index,industry
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
    // Only NSE equity stocks
    if (exch !== 'NSE' || type !== 'EQ') continue;
    const sym  = (row[idxSym]  || '').replace(/"/g, '').trim();
    const name = (row[idxName] || sym).replace(/"/g, '').trim();
    const key  = (row[idxKey]  || '').replace(/"/g, '').trim();
    const isin = (row[idxIsin] || '').replace(/"/g, '').trim();
    const sec  = (row[idxSec]  || 'Other').replace(/"/g, '').trim();
    if (!sym || !key) continue;
    instruments.push({ symbol: sym, name: name, instrument_key: key, isin: isin, instrument_type: type, sector: sec });
  }

  console.log('Parsed', instruments.length, 'NSE EQ instruments');
  return res.status(200).json({ status: 'success', instruments: instruments });

} catch(e) {
  console.error('Instruments error:', e.message);
  return res.status(500).json({ error: e.message });
}
}

// ── /proxy-post?path=… — POST to Upstox API (for order placement) ──
if (req.url.indexOf('proxy-post') !== -1) {
const postPath = req.query.path;
if (!postPath) return res.status(400).json({ error: 'Missing path' });
if (!token) return res.status(401).json({ error: 'Missing Authorization' });
const postUrl = 'https://api.upstox.com/v2' + postPath;
try {
const response = await fetch(postUrl, {
method: 'POST',
headers: { 'Authorization': token, 'Accept': 'application/json', 'Content-Type': 'application/json' },
body: JSON.stringify(req.body || {})
});
const data = await response.json();
return res.status(response.status).json(data);
} catch(err) {
return res.status(500).json({ error: err.message });
}
}

// ── /proxy?path=… — GET to Upstox API ───────────────────────────────
if (!path) return res.status(400).json({ error: 'Missing path param' });
if (!token) return res.status(401).json({ error: 'Missing Authorization header' });

const url = 'https://api.upstox.com/v2' + path;
console.log('Proxying GET:', url);

try {
const response = await fetch(url, {
headers: { 'Authorization': token, 'Accept': 'application/json' }
});
const data = await response.json();
return res.status(response.status).json(data);
} catch(err) {
return res.status(500).json({ error: err.message });
}
}
