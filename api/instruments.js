import zlib from 'zlib';
import { promisify } from 'util';
const gunzip = promisify(zlib.gunzip);

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Authorization, Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();

  try {
    const gzUrl = 'https://assets.upstox.com/market-quote/instruments/exchange/NSE.json.gz';
    const resp = await fetch(gzUrl);
    if (!resp.ok) throw new Error('Upstox fetch failed: HTTP ' + resp.status);

    const compressed = Buffer.from(await resp.arrayBuffer());
    const decompressed = await gunzip(compressed);
    const all = JSON.parse(decompressed.toString('utf8'));

    const instruments = (Array.isArray(all) ? all : [])
      .filter(i => i.segment === 'NSE_EQ' && i.instrument_type === 'EQ')
      .map(i => ({
        symbol:         i.trading_symbol || i.short_name,
        name:           i.name || i.trading_symbol,
        instrument_key: i.instrument_key,
        isin:           i.isin || '',
        instrument_type:'EQ',
        sector:         i.sector_index || 'Other'
      }))
      .filter(i => i.symbol && i.instrument_key);

    return res.status(200).json({ status: 'success', count: instruments.length, instruments });
  } catch (e) {
    return res.status(500).json({ error: 'Instrument download failed: ' + e.message });
  }
}
