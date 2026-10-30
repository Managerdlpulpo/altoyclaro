# Me gusta hablar Alto y claro

Juego web para que los niños practiquen vocabulario y expresión oral en español
(Diccionario, prueba de nivel, penaltis y **Modo Hablar**). Es una web estática
(`index.html`, `hablar.js`, `voz.js`, `test-nivel.js`, `sync.js`) con funciones `/api` en Vercel
para las claves de acceso y la sincronización.

## Acceso obligatorio con clave

La app **no se puede usar sin clave** (ya no existe el modo «solo en este dispositivo»).
Al abrirla, `sync.js` pregunta al servidor (`POST /api/acceso {accion:"sesion"}`) y,
mientras no haya sesión válida, solo se muestra `#acceso-pantalla` (el resto de la
página está oculto con `html.sin-acceso`):

- **«Entrar con mi clave»** — clave personal del niño (`XXXX-XXXX`, máx. 2 dispositivos).
  Cookie `ayc_sesion` HttpOnly firmada con la subclave `firma-sesion` (180 días).
  La primera vez, si el dispositivo tiene progreso de antes, se pregunta si añadirlo
  a la clave o borrarlo.
- **«Soy el profe»** — la clave `ALTOYCLARO_CLAVE`. Crea la cookie `ayc_profe`
  (HttpOnly, Secure, SameSite=Lax, **8 h**) firmada con otra subclave distinta
  (`firma-sesion-profe`); lleva una huella HMAC de la clave del profe, así que al
  cambiar `ALTOYCLARO_CLAVE` se cierran todas las sesiones de profe. Con ella el profe
  usa el juego (sin sincronizar nada suyo) y gestiona las claves sin volver a escribirla.
- Si la clave se anula o cambia, el dispositivo se libera o caduca la sesión, se vuelve a
  la pantalla de acceso con el motivo (se comprueba al abrir, cada 5 min, al volver a la
  pestaña y en cada sincronización).
- Si el servidor o la base de datos no responden (`503 {codigo:"bd"}`), se muestra un
  mensaje claro con «Reintentar» y **no se deja entrar**.

Variables de entorno (Vercel), sin valores por defecto: `ALTOYCLARO_CLAVE`,
`ALTOYCLARO_SECRETO` (de él se derivan subclaves distintas para cada firma) y
`DATABASE_URL`/`POSTGRES_URL`.

> **Ojo:** el repositorio es público y la web es estática, así que los archivos
> (`index.html`, `*.js`, `audio/`, `img/`) se pueden descargar sin clave. La clave
> protege el uso de la app y los datos del servidor (progreso, claves), no el código
> ni los recursos fijos del juego.

## Cómo suena la voz

1. **Voz grabada natural (por defecto).** Todo el texto fijo del juego (palabras,
   frases de ejemplo y frases de ánimo) está pregrabado en `audio/*.mp3` con una
   voz neuronal (Piper). `audio/manifest.json` relaciona cada texto con su archivo.
2. **Voz del navegador (respaldo).** Si falta un archivo, falla la descarga o el
   texto es dinámico, se usa `speechSynthesis` eligiendo la mejor voz española del
   dispositivo (es-ES primero; se prefieren voces Natural/Neural/Online/Enhanced/
   Premium/Siri, Google español, Mónica, Paulina…; se evitan eSpeak y compactas),
   con velocidad 0.9 y tono 1.05.

En el **panel del profesor → 🔊 Voz** se puede desactivar la voz grabada y elegir
manualmente la voz del navegador (se guarda en `localStorage`).

Las grabaciones de los niños **nunca salen del dispositivo**. Las voces "online"
del navegador (p. ej. Edge Natural o Google) pueden enviar el *texto del juego* a su
proveedor; nunca la voz ni el nombre del niño (ver `privacidad.html`).

## Regenerar los audios (palabras nuevas)

El script lee automáticamente todos los campos `es:` de `index.html`, los
`ejemplosFrase` de `hablar.js` (todas las frases de cada palabra), el bloque `FRASES_VOZ` de `voz.js` y el bloque
`FRASES_TEST` de `test-nivel.js` (preguntas del test de nivel), el bloque `CUENTOS` de
`lectura.js` (títulos, frases, preguntas y respuestas de los cuentos) y las frases de
celebración de cada tema (`TEMAS` en `temas.js`). Al añadir
palabras o frases basta con volver a ejecutarlo: sólo genera lo nuevo o cambiado,
mantiene los nombres de archivo y borra los mp3 que ya no se usan.

Requisitos: `python3`, `ffmpeg` y `pip install piper-tts` (el modelo de voz se
descarga solo la primera vez, en `~/.cache/altoyclaro-piper` o `$PIPER_VOCES`).

```bash
python3 scripts/generar-audios.py                 # genera lo que falte
python3 scripts/generar-audios.py --comprobar     # sale con error si falta o sobra algo
python3 scripts/generar-audios.py --forzar        # regenera todo
python3 scripts/generar-audios.py --elegir-mejor 3  # varias tomas, se queda la mejor
```

`--elegir-mejor` es opcional y necesita además `torch`, `torchaudio` y
`faster-whisper`: elige la toma que mejor entiende un reconocedor de voz y, entre
ellas, la de mejor calidad estimada (UTMOS).

Formato: MP3 mono, 48 kbps, 22,05 kHz, volumen normalizado (-16 LUFS).

## Voz elegida y licencia

- Voz: **`es_ES-sharvard-medium`, locutora F** (Piper), `length_scale` 1.1.
  Se compararon varias voces (davefx, sharvard F/M, es_MX claude, carlfm) con
  UTMOS; sharvard F fue la más natural.
- Datos: corpus *Sharvard* (Universidad de Edimburgo; Aubanel, García Lecumberri y
  Cooke, 2014), licencia **CC BY 3.0** → atribución incluida en `privacidad.html`.
- Aviso: el modelo sharvard se afinó a partir del checkpoint inglés *lessac*, cuyos
  datos (Blizzard 2013) tienen licencia de investigación. Si se quiere una cadena de
  licencias totalmente limpia, alternativas: `es_ES-carlfm-x_low` (dominio público,
  voz masculina, menor calidad) o `es_MX-claude-high` (acento mexicano). Para
  cambiar, editar la voz en `scripts/generar-audios.py` y ejecutar con `--forzar`.
- Piper (GPL) sólo se usa en local para generar los archivos; no se publica.

## Test de nivel (`test-nivel.js`)

Test inicial de 5–8 minutos, adaptativo y sin preguntas personales. La app lee cada
pregunta en voz alta (audio grabado) y el niño contesta tocando o hablando.

1. **👂 Comprensión** (5): «Toca el perro» → 4 fotos. Se para tras 2 fallos seguidos.
2. **🗣️ Vocabulario** (5): «¿Qué es esto?» con una foto; reconocimiento de voz con
   comparación difusa (perfecto = 1, casi = 0,5). Se para tras 2 fallos seguidos.
3. **💬 Conversación** por escalones (solo se pasa al siguiente si se supera el anterior):
   1. saludo y color (≥ 40 %), 2. ¿qué haces con…? / ¿qué te gusta…? (≥ 50 %),
   3. describir una foto, pasado («¿Qué hiciste ayer?») y futuro (≥ 50 %),
   4. mini-diálogo de 3 turnos (frutería, panadería, parque o cocina) que responde a lo que dice.

**Preguntas distintas en cada test.** Las preguntas salen de bancos (al principio de
`test-nivel.js`) y se sortean con una semilla en cada test (`tnPlanTest`), para que el
niño no pueda aprenderlas de memoria:

| Parte | Banco | En cada test |
|---|---|---|
| Comprensión | 12 «Toca el…» + 21 «¿Qué animal vuela?, ¿con qué te secas?…» | 2 + 3 |
| Vocabulario | 30 palabras: 12 fáciles, 12 medias, 6 difíciles | 3 + 1 + 1 |
| Conversación 1 | 4 saludos + 5 colores | 1 + 1 |
| Conversación 2 | 6 «¿qué haces con…?» + 5 «¿qué te gusta…?» | 1 + 1 |
| Conversación 3 | 5 fotos para describir + 4 pasado + 4 futuro | 1 + 1 + 1 |
| Mini-diálogo | 4 situaciones con respuestas según lo que diga | 1 |

- En Comprensión, la foto correcta, las 3 fotos de distracción (de otras categorías) y su
  orden cambian cada vez; Comprensión y Vocabulario nunca preguntan la misma palabra.
- No se repiten preguntas de los 2 últimos tests del niño (se guardan solo los ids de las
  preguntas y la semilla, en el dispositivo y en la sincronización).
- Las variantes de un mismo tipo puntúan igual (mismos criterios y mismo máximo), así que
  los resultados se pueden comparar entre tests. `npm test` lo comprueba con 3000 semillas.
- Las fotos nuevas están en `img/vocab/` (Wikimedia Commons; autores y licencias en
  `img/CREDITOS.md`).

Cada respuesta de conversación suma 1 punto por criterio: **R** responde, **L** frase
(≥ 2–4 palabras), **V** usa un verbo, **K** tiene que ver con la pregunta, **Q** rápido
(≤ 6 s), **T** tiempo verbal correcto (pasado/futuro) y **X** descripción larga (≥ 8 palabras).
Las preguntas a las que no se llega cuentan 0.

- Subpuntuaciones: Comprensión, Vocabulario y Conversación (0–100 %).
- Total = 30 % Comprensión + 25 % Vocabulario + 45 % Conversación.
- Nivel: 0 (< 20), 1 (≥ 20), 2 (≥ 45 y Conversación ≥ 25 %), 3 (≥ 70 y Conversación ≥ 55 %).
- XP inicial: 0 / 100 / 250 / 500 (+10); al repetir el test el XP no baja nunca.

Sin reconocimiento de voz (o si falla el micrófono, o se elige «Prefiero que valore un
adulto»), un adulto valora con 3 botones: *No responde / Palabras sueltas / Frases*.
El profe puede repetir el test (Panel del profe → «Repetir test de nivel») y ver el
historial con la mejora en «Mi progreso». Se sincronizan solo las puntuaciones, el
resultado de cada pregunta y qué preguntas salieron (ids); lo que
dijo el niño se queda en el dispositivo. No se graba audio en el test.

## Leo en voz alta (`lectura.js`)

19 cuentos originales en 4 niveles (0: ~25 palabras, 1: ~42, 2: ~70, 3: ~100), cada uno
con 2-4 preguntas de comprensión (elegir o responder en voz alta). El niño lee en voz alta
y el reconocimiento de voz del navegador (modo continuo) se alinea palabra a palabra con
el texto: en directo se marca por dónde va y al terminar cada palabra sale de color
(verde bien, amarillo con dudas, rojo mal, gris saltada).

| Métrica | Definición |
|---|---|
| Precisión | palabras bien o «con dudas» ÷ palabras hasta donde llegó leyendo (mal o saltadas restan; las no leídas al final no cuentan) |
| PCPM (palabras correctas por minuto) | palabras bien ÷ minutos desde que empieza a leer hasta la última palabra reconocida |
| Leído | % del texto hasta la última palabra reconocida |
| Pausas | silencios de más de 3 s entre palabras |
| Repeticiones / autocorrecciones | palabras dichas dos veces / empezó mal y se corrigió (no penalizan) |
| Pronunciación | parecido medio entre lo oído y el texto (aproximado); las «con dudas» la bajan |
| Estrellas | ⭐⭐⭐ precisión ≥ 90 y leído ≥ 90 · ⭐⭐ ≥ 70 y ≥ 60 · ⭐ el resto con algo leído |

Es una estimación: el reconocedor corrige palabras «al vuelo», así que una palabra mal
dicha puede aparecer bien. Sin reconocimiento de voz, un adulto cronometra y toca las
palabras con error. Un cuento se desbloquea si es de su nivel o menor, o con ⭐⭐ en el
anterior. Solo se sincronizan las puntuaciones; lo que entendió el reconocedor y la
grabación opcional («Guardar mi lectura», para comparar la primera y la última) se
quedan en el dispositivo. Gráficas de PCPM y precisión en «Mi progreso».

## Tema favorito (`temas.js`)

Botón del tema arriba (y en la primera pantalla). Cambia colores, fondo, mascota y la
celebración hablada, y da prioridad (1 de cada 3) a las palabras con foto de su
categoría en Identificar, Hablar («Todas») y «Dime una frase», al chip del Diccionario
y al cuento recomendado. No cambia el test de nivel. Se guarda en el perfil
sincronizado (el servidor solo acepta los temas de la lista).

## Pruebas

```bash
npm test                                            # API, sorteo del test, lectura (alineación, PCPM) y temas
NODE_PATH=/ruta/a/playwright-core/node_modules node test/e2e-voz.cjs        # voz
NODE_PATH=/ruta/a/playwright-core/node_modules node test/e2e-navegador.cjs  # acceso con clave (niño, profe, anular, servidor caído)
NODE_PATH=/ruta/a/playwright-core/node_modules node test/e2e-test-nivel.cjs  # test de nivel (respuestas simuladas)
NODE_PATH=/ruta/a/playwright-core/node_modules node test/e2e-lectura.cjs    # leo en voz alta y temas (reconocimiento simulado)
```

Los tests de navegador usan `test/servidor-local.mjs` (arrancarlo antes, con
`ALTOYCLARO_CLAVE=profe-local-prueba` y un `ALTOYCLARO_SECRETO` cualquiera) y Chrome headless.
`e2e-voz` y `e2e-test-nivel` simulan la sesión (`/api/acceso`) para probar solo el juego.
