const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

module.exports = async function handler(request, response) {
  if (request.method !== 'POST') {
    response.setHeader('Allow', 'POST');
    return response.status(405).json({ error: 'Método no permitido.' });
  }
  const payload = request.body || {};
  const name = String(payload.name || '').trim().slice(0, 80);
  const email = String(payload.email || '').trim().slice(0, 160);
  const comment = String(payload.comment || '').trim().slice(0, 800);
  const image = String(payload.image || '').trim().slice(0, 180);
  if (!name || !comment || !email || !EMAIL_RE.test(email) || !image) {
    return response.status(422).json({ error: 'Revisa tu nombre, correo, imagen y comentario.' });
  }
  if (!process.env.RESEND_API_KEY || !process.env.BOOKING_FROM_EMAIL) {
    return response.status(503).json({ fallback: 'mailto' });
  }
  const to = process.env.BOOKING_TO_EMAIL || 'whbprojectmusic@gmail.com';
  const text = [
    'Nuevo comentario pendiente de moderación para la galería WHB.',
    '', `Nombre: ${name}`, `Correo: ${email}`, `Imagen: ${image}`, '', comment,
    '', 'No se publica automáticamente. Revisar y añadir a content/gallery-comments.json si se aprueba.'
  ].join('\n');
  const resend = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ from: process.env.BOOKING_FROM_EMAIL, to: [to], reply_to: email, subject: `Comentario de galería · ${name}`, text })
  });
  if (!resend.ok) return response.status(502).json({ error: 'No pudimos enviar el comentario a revisión.' });
  return response.status(200).json({ ok: true, moderated: true });
};
