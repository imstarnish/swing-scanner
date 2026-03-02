exports.handler = async function (event) {
// CORS headers
const headers = {
“Access-Control-Allow-Origin”: “*”,
“Access-Control-Allow-Methods”: “GET, OPTIONS”,
“Access-Control-Allow-Headers”: “Authorization, Content-Type”,
“Content-Type”: “application/json”,
};

// Preflight
if (event.httpMethod === “OPTIONS”) {
return { statusCode: 200, headers, body: “” };
}

// Health check
const path = event.queryStringParameters?.path;
if (!path) {
return {
statusCode: 200,
headers,
body: JSON.stringify({ status: “✅ Swing Scanner Proxy running”, time: new Date().toISOString() }),
};
}

const token = event.headers[“authorization”];
if (!token) {
return {
statusCode: 401,
headers,
body: JSON.stringify({ error: “Missing Authorization header” }),
};
}

const url = `https://api.upstox.com/v2${path}`;
console.log(“Proxying:”, url);

try {
const response = await fetch(url, {
headers: {
Authorization: token,
Accept: “application/json”,
},
});
const data = await response.json();
return {
statusCode: response.status,
headers,
body: JSON.stringify(data),
};
} catch (err) {
return {
statusCode: 500,
headers,
body: JSON.stringify({ error: err.message }),
};
}
};
