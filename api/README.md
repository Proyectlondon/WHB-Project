# Recepción de reservas

`booking.js` usa Resend cuando existen estas variables de entorno en Vercel:

- `RESEND_API_KEY`: clave privada de Resend.
- `BOOKING_FROM_EMAIL`: remitente verificado, por ejemplo `WHB Project <reservas@tu-dominio.com>`.
- `BOOKING_TO_EMAIL`: opcional; por defecto usa `whbprojectmusic@gmail.com`.

Si faltan las dos primeras variables, el formulario conserva `mailto:` como respaldo y no pierde la solicitud.
