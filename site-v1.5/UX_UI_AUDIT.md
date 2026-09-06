# Auditoría UX/UI y contenido — WHB Project

## Hallazgos y correcciones

- El gesto táctil de canciones dependía de `touchend` y podía perderse en navegadores móviles. Se migró a Pointer Events, con umbral horizontal de 32 px y validación del ángulo para no robar el scroll vertical.
- El gesto solo se registra dentro de la ficha audiovisual. El resto de la página conserva el desplazamiento nativo.
- Las flechas siguen visibles como alternativa para teclado, ratón y personas que no usan gestos.
- La galería antigua y el mosaico general de videos quedan ocultos sin eliminar los datos. La ficha de cada canción conserva portada, texto y video oficial.
- La galería, cuando vuelva a habilitarse, mantiene su estado separado del reproductor para evitar parpadeos o cambios de video accidentales.
- Los controles táctiles principales se ajustaron a 44 px, con estados de foco visibles.
- El título de la canción usa una región `aria-live` para anunciar el cambio al lector de pantalla.

## Contenido contrastado con Wix

Se incorporaron los textos recuperados sobre el origen Bogotá–Cundinamarca (2017), el significado de W.H.B. —“Whispering His Breath”—, el símbolo del diente de león, el sonido “Son del Monte”, la raíz folclórica colombiana, S.A.L., Pneuma y la división audiovisual 3FR.

Las fichas de Sobreescritura y Pajarillo e’ Monte se mantienen como información editorial pendiente cuando el archivo de Wix no aporta una biografía verificable. No se inventaron datos biográficos.

## Pruebas ejecutadas

- `node --check app.js`: correcto.
- `git diff --check`: correcto; solo quedan avisos de normalización de finales de línea de Git.
- El catálogo conserva 22 piezas audiovisuales.
- La navegación conserva controles alternativos visibles y no depende del cursor personalizado.

## Revisión adversarial

- Deslizamiento diagonal: no cambia de canción.
- Deslizamiento corto: no cambia de canción.
- Deslizamiento horizontal dentro de la ficha: cambia una canción por gesto.
- Flechas: siguen siendo el camino explícito y accesible.
- Movimiento reducido: las transiciones respetan `prefers-reduced-motion`.
- Estado sin galería: no se muestra un bloque redundante ni se mezcla con el reproductor.

## Pendientes editoriales

El material de Wix también contiene entradas de blog y detalles extensos de las producciones. Se pueden convertir en un archivo editorial o sección de historias cuando se defina qué piezas desean publicar primero.

