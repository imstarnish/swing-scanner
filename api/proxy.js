export default async function handler(req, res) {
// Allow all origins (CORS)
res.setHeader("Access-Control-Allow-Origin", "*");
res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
res.setHeader("Access-Control-Allow-Headers", "Authorization, Content-Type");

// Handle preflight
if (req.method === "OPTIONS") return res.status(200).end();

// Health check
if (!req.query.path) {
return res.status(200).json({ status: "✅ Swing Scanner Proxy running", time: new Date().toISOString() });
}

const path = req.query.path;
const token = req.headers["authorization"];

if (!token) {
return res.status(401).json({ error: "Missing Authorization header" });
}

const url = `https://api.upstox.com/v2${path}`;
console.log("Proxying:", url);

try {
const response = await fetch(url, {
headers: {
Authorization: token,
Accept: "application/json",
},
});
const data = await response.json();
return res.status(response.status).json(data);
} catch (err) {
return res.status(500).json({ error: err.message });
}
}
