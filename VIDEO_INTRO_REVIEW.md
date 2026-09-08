# Apertura del diente de león

## Candidatas locales

- `assets/video/hero-whb-dandelion-v1.mp4`: primera prueba H3 Max, 8 s, 16:9, 768p. Tiene una atmósfera cálida y una buena salida inicial de semillas, pero acerca demasiado la cámara al final.
- `assets/video/hero-whb-dandelion-v2.mp4`: candidata activa. Mantiene el encuadre, vacía la flor de forma más legible y lleva la nube de semillas hacia la derecha y arriba.

## Integración local

La apertura local utiliza la v2 y su fotograma inicial como poster. Al terminar, una capa crema cubre el último instante para que el paso al sitio no dependa de que el modelo consiga un blanco absoluto en el último fotograma.

## Verificación

- Modelo: MiniMax H3 Max.
- Resolución: 768p.
- Relación: 16:9.
- Duración: 8 segundos.
- Audio: silenciado.
- `qa/hero-video-audit.cjs`: correcto; la reproducción avanza y carga la v2.

## Pendiente antes de publicar

Probar la transición en un teléfono real y elegir entre conservar la v2 o generar una tercera toma si se desea eliminar por completo las siluetas duplicadas que aparecen brevemente en la nube de semillas.
