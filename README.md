# Alto y Claro · Liga de Habla Soto Alto

Juego web para que los niños practiquen vocabulario y expresión oral en español
(Diccionario, prueba de nivel, penaltis y **Modo Hablar**). Es una web estática
(`index.html`, `hablar.js`, `voz.js`, `sync.js`) con funciones `/api` en Vercel
para las claves de acceso y la sincronización.

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
`ejemplosFrase` de `hablar.js` y el bloque `FRASES_VOZ` de `voz.js`. Al añadir
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
41 archivos ≈ 320 KB en total.

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

## Pruebas

```bash
npm test                                            # API (claves y sincronización)
NODE_PATH=/ruta/a/playwright-core/node_modules node test/e2e-voz.cjs        # voz
NODE_PATH=/ruta/a/playwright-core/node_modules node test/e2e-navegador.cjs  # juego
```

Los tests de navegador levantan `test/servidor-local.mjs` y usan Chrome headless.
