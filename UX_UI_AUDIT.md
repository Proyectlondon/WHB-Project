# Auditoría UX/UI y contenido — WHB Project

## Hallazgos y correcciones

- El gesto táctil de canciones dependía de `touchend` y podía perderse en navegadores móviles. Se migró a Pointer Events, con umbral horizontal de 32 px y validación del ángulo para no robar el scroll vertical.
- El gesto solo se registra dentro de la ficha audiovisual. El resto de la página conserva el desplazamiento nativo.
- Las flechas siguen visibles como alternativa para teclado, ratón y personas que no usan gestos.
- La galería antigua y el mosaico general de videos quedan ocultos sin eliminar los datos. La ficha de cada canción conserva portada, texto y video oficial.
- La galería, cuando vuelva a habilitarse, mantiene su estado separado del reproductor para evitar parpadeos o cambios de video accidentales.
- Los controles táctiles principales se ajustaron a 44 px, con estados de foco visibles.
- El título de la canción usa una región `aria-live` para anunciar el cambio al lector de pantalla.
- El Cuaderno WHB incorpora las cinco entradas recuperadas dentro de la propia página. Las tres piezas cuyo cuerpo completo no está en el archivo local muestran únicamente el extracto verificable.
- Sobreescritura y Pajarillo e’ Monte ya tienen una ficha editorial útil; el indicador discreto de validación identifica las dos redacciones que deben revisar sus compositores.
- El catálogo antiguo en mosaico permanece oculto para no competir con la ficha editorial de cada canción.

## Contenido contrastado con Wix

Se incorporaron los textos recuperados sobre el origen Bogotá–Cundinamarca (2017), el significado de W.H.B. —“Whispering His Breath”—, el símbolo del diente de león, el sonido “Son del Monte”, la raíz folclórica colombiana, S.A.L., Pneuma y la división audiovisual 3FR.

Las fichas de Sobreescritura y Pajarillo e’ Monte se mantienen como información editorial pendiente cuando el archivo de Wix no aporta una biografía verificable. No se inventaron datos biográficos.

## Pruebas ejecutadas

- `node --check app.js`: correcto.
- `git diff --check`: correcto; solo quedan avisos de normalización de finales de línea de Git.
- El catálogo conserva 22 piezas audiovisuales.
- La auditoría local de medios verificó 32 Radio Versions, con duraciones entre 170,5 y 367,65 segundos y sin archivos truncados.
- La prueba de interacción local verificó seis modos del reproductor, el mini reproductor al salir de la sección, cero enlaces dependientes de Wix y ausencia de overflow horizontal en móvil.
- La prueba pública PWA verificó manifest, icono, `start_url`, service worker activo y ausencia de overflow horizontal en 390 px.
- La navegación conserva controles alternativos visibles y no depende del cursor personalizado.

## Revisión adversarial

- Deslizamiento diagonal: no cambia de canción.
- Deslizamiento corto: no cambia de canción.
- Deslizamiento horizontal dentro de la ficha: cambia una canción por gesto.
- Flechas: siguen siendo el camino explícito y accesible.
- Movimiento reducido: las transiciones respetan `prefers-reduced-motion`.
- Estado sin galería: no se muestra un bloque redundante ni se mezcla con el reproductor.

## Pendientes editoriales

- Validar con Daniel las dos fichas editoriales marcadas de Sobreescritura y Pajarillo e’ Monte.
- La publicación pública debe sincronizarse después de aprobar esta revisión local; no se modificó Vercel en este ciclo.
- Resend sigue pendiente de variables de producción y de una prueba real de reserva/comentario.
- La pantalla de instalación depende del navegador: el manifest y el service worker están listos; el visitante debe usar “Añadir a pantalla de inicio”.
