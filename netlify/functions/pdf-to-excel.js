const BACKEND_URL = 'https://onetapconvert-pdf-api-production.up.railway.app';

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  const safeJson = (code, body) => ({
    statusCode: code,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  });

  try {
    const body = JSON.parse(event.body || '{}');
    if (body.ping) return safeJson(200, { pong: true });

    const resp = await fetch(`${BACKEND_URL}/convert`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(25000)
    });

    const text = await resp.text();
    if (!text) return safeJson(503, { error: 'Empty response from server. Please try again.' });

    let data;
    try { data = JSON.parse(text); } catch(e) {
      return safeJson(503, { error: 'Invalid server response. Please try again.' });
    }

    return safeJson(resp.status, data);

  } catch (err) {
    const isTimeout = err.name === 'TimeoutError';
    return safeJson(503, {
      error: isTimeout ? 'Request timed out. Please try again.' : 'Error: ' + err.message
    });
  }
};
