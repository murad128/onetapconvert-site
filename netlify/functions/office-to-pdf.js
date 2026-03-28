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
    if (!body.fileBase64) return safeJson(400, { error: 'No file provided' });

    const resp = await fetch(`${BACKEND_URL}/office-to-pdf`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(55000)
    });

    const text = await resp.text();
    if (!text) return safeJson(503, { error: 'Empty response. Please try again.' });

    let data;
    try { data = JSON.parse(text); } catch(e) {
      return safeJson(503, { error: 'Invalid server response.' });
    }

    return safeJson(resp.status, data);

  } catch (err) {
    const isTimeout = err.name === 'TimeoutError';
    return safeJson(503, {
      error: isTimeout ? 'Conversion timed out. Please try a smaller file.' : 'Error: ' + err.message
    });
  }
};
