/**
 * Zero-dependency server-side Auth & API Proxy for RoomiesForms.
 * Keeps GAS_API_KEY and GOOGLE_CLIENT_SECRET out of the browser bundle.
 *
 * Required environment variables:
 *   GAS_URL              - Deployed Google Apps Script /exec URL
 *   GAS_API_KEY          - Rotated Apps Script API_SECRET
 *   GOOGLE_CLIENT_ID     - OAuth 2.0 Client ID
 *   GOOGLE_CLIENT_SECRET - OAuth 2.0 Client Secret (optional if GAS handles authGoogle)
 *   ALLOWED_ORIGINS      - Comma-separated origins (default: https://roomiesforms-gqiq.onrender.com,http://localhost:5173)
 *   PORT                 - HTTP port (default: 5001)
 */

import http from 'node:http';

const PORT = Number(process.env.PORT || 5001);
const GAS_URL = (process.env.GAS_URL || '').trim();
const GAS_API_KEY = (process.env.GAS_API_KEY || '').trim();
const GOOGLE_CLIENT_ID = (process.env.GOOGLE_CLIENT_ID || '').trim();
const GOOGLE_CLIENT_SECRET = (process.env.GOOGLE_CLIENT_SECRET || '').trim();
const ALLOWED_ORIGINS = (
  process.env.ALLOWED_ORIGINS ||
  'https://roomiesforms-gqiq.onrender.com,http://localhost:5173'
)
  .split(',')
  .map((o) => o.trim())
  .filter(Boolean);

function corsHeaders(origin) {
  const allowed = ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0] || '*';
  return {
    'Access-Control-Allow-Origin': allowed,
    'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Content-Type': 'application/json; charset=utf-8',
  };
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    let size = 0;
    req.on('data', (chunk) => {
      size += chunk.length;
      if (size > 2 * 1024 * 1024) {
        reject(new Error('Payload too large'));
        req.destroy();
        return;
      }
      chunks.push(chunk);
    });
    req.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
    req.on('error', reject);
  });
}

async function exchangeGoogleCode(code, redirectUri) {
  const params = new URLSearchParams({
    code,
    client_id: GOOGLE_CLIENT_ID,
    client_secret: GOOGLE_CLIENT_SECRET,
    redirect_uri: redirectUri,
    grant_type: 'authorization_code',
  });
  const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: params.toString(),
  });
  const tokenJson = await tokenRes.json();
  if (!tokenRes.ok || !tokenJson.id_token) {
    throw new Error(tokenJson.error_description || 'Google token exchange failed.');
  }
  const infoRes = await fetch(
    `https://oauth2.googleapis.com/tokeninfo?id_token=${encodeURIComponent(tokenJson.id_token)}`,
  );
  const info = await infoRes.json();
  if (!infoRes.ok || info.aud !== GOOGLE_CLIENT_ID || String(info.email_verified) !== 'true') {
    throw new Error('Google ID token verification failed.');
  }
  if (!/@(selu\.edu|southeastern\.edu)$/i.test(info.email || '')) {
    throw new Error('Please sign in with a Southeastern (@selu.edu or @southeastern.edu) account.');
  }
  return { email: info.email, fullName: info.name };
}

async function forwardToGas(payload) {
  if (!GAS_URL) {
    throw new Error('GAS_URL is not configured on the proxy server.');
  }
  const target = new URL(GAS_URL);
  if (GAS_API_KEY) {
    target.searchParams.set('key', GAS_API_KEY);
  }
  const res = await fetch(target.toString(), {
    method: 'POST',
    redirect: 'follow',
    headers: { 'Content-Type': 'text/plain;charset=utf-8' },
    body: JSON.stringify(payload),
  });
  const text = await res.text();
  return { status: res.status, text };
}

const server = http.createServer(async (req, res) => {
  const origin = req.headers.origin || '';
  const headers = corsHeaders(origin);

  if (req.method === 'OPTIONS') {
    res.writeHead(204, headers);
    res.end();
    return;
  }

  if (req.method === 'GET' && req.url === '/health') {
    res.writeHead(200, headers);
    res.end(JSON.stringify({ ok: true, service: 'roomiesforms-proxy' }));
    return;
  }

  if (req.method !== 'POST') {
    res.writeHead(405, headers);
    res.end(JSON.stringify({ ok: false, error: 'Method not allowed' }));
    return;
  }

  try {
    const raw = await readBody(req);
    const body = JSON.parse(raw || '{}');

    if (body.action === 'authGoogle' && GOOGLE_CLIENT_ID && GOOGLE_CLIENT_SECRET) {
      const verified = await exchangeGoogleCode(body.code, body.redirectUri);
      const gasRes = await forwardToGas({
        action: 'login',
        email: verified.email,
        fullName: verified.fullName,
      });
      res.writeHead(gasRes.status, headers);
      res.end(gasRes.text);
      return;
    }

    const gasRes = await forwardToGas(body);
    res.writeHead(gasRes.status, headers);
    res.end(gasRes.text);
  } catch (err) {
    res.writeHead(400, headers);
    res.end(JSON.stringify({ ok: false, error: err?.message || 'Proxy error', status: 400 }));
  }
});

server.listen(PORT, () => {
  console.log(`RoomiesForms Auth/API Proxy listening on port ${PORT}`);
});
