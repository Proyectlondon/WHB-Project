const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

module.exports = async function handler(request, response) {
  if (request.method !== 'POST') {
    response.setHeader('Allow', 'POST');
    return response.status(405).json({ error: 'Método no permitido.' });
  }

  const payload = request.body || {};
  const required = ['name', 'email', 'date', 'location', 'request', 'guests'];
  const missing = required.filter((key) => !String(payload[key] || '').trim());
  if (missing.length || !EMAIL_RE.test(String(payload.email || '').trim())) {
    return response.status(422).json({ error: 'Revisa los campos obligatorios y el correo.' });
  }

  // La función queda preparada para Resend, pero no transmite nada hasta que
  // el proyecto tenga RESEND_API_KEY y un remitente verificado configurados.
  if (!process.env.RESEND_API_KEY || !process.env.BOOKING_FROM_EMAIL) {
    return response.status(503).json({ fallback: 'mailto' });
  }

  const to = process.env.BOOKING_TO_EMAIL || 'whbprojectmusic@gmail.com';
  const subject = `Solicitud WHB / 3FR · ${payload.request}`;
  const text = [
    `Nombre: ${payload.name}`,
    `Correo: ${payload.email}`,
    `Fecha tentativa: ${payload.date}`,
    `Ciudad y lugar: ${payload.location}`,
    `Solicitud: ${payload.request}`,
    `Asistentes: ${payload.guests}`,
    '',
    'Contexto:',
    payload.message || 'Sin detalles adicionales.'
  ].join('\n');

  const resend = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ from: process.env.BOOKING_FROM_EMAIL, to: [to], reply_to: payload.email, subject, text })
  });
  if (!resend.ok) return response.status(502).json({ error: 'No pudimos entregar la solicitud.' });
  return response.status(200).json({ ok: true });
};
