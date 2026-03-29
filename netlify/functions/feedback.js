const BOT_TOKEN = '8798510190:AAEwnO5ZjICKqL6MTiLlcCaqBQJ1aTJUO4A';
const CHAT_ID = '1871988010';

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  try {
    const { message, email, tool, url } = JSON.parse(event.body || '{}');
    if (!message) return { statusCode: 400, body: JSON.stringify({ error: 'No message' }) };

    const text = [
      '🔔 *OneTapConvert Feedback*',
      '',
      `📝 *Mesaj:* ${message}`,
      email ? `📧 *Email:* ${email}` : '',
      tool ? `🛠️ *Alət:* ${tool}` : '',
      url ? `🔗 *Səhifə:* ${url}` : '',
      '',
      `⏰ ${new Date().toISOString()}`
    ].filter(Boolean).join('\n');

    await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: CHAT_ID, text, parse_mode: 'Markdown' })
    });

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ok: true })
    };
  } catch (err) {
    return { statusCode: 500, body: JSON.stringify({ error: err.message }) };
  }
};
