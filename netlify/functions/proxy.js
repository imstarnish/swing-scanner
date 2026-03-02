exports.handler = async function(event) {

var headers = {
'Access-Control-Allow-Origin': '*',
'Access-Control-Allow-Methods': 'GET, OPTIONS',
'Access-Control-Allow-Headers': 'Authorization, Content-Type',
'Content-Type': 'application/json'
};

if (event.httpMethod === 'OPTIONS') {
return { statusCode: 200, headers: headers, body: '' };
}

var params = event.queryStringParameters || {};
var path = params.path;

if (!path) {
return {
statusCode: 200,
headers: headers,
body: JSON.stringify({ status: 'Proxy running', time: new Date().toISOString() })
};
}

var token = event.headers['authorization'] || event.headers['Authorization'];

if (!token) {
return {
statusCode: 401,
headers: headers,
body: JSON.stringify({ error: 'Missing Authorization header' })
};
}

var url = 'https://api.upstox.com/v2' + path;

try {
var response = await fetch(url, {
headers: {
'Authorization': token,
'Accept': 'application/json'
}
});
var data = await response.json();
return {
statusCode: response.status,
headers: headers,
body: JSON.stringify(data)
};
} catch (err) {
return {
statusCode: 500,
headers: headers,
body: JSON.stringify({ error: err.message })
};
}

};
