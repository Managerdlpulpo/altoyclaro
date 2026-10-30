#!/usr/bin/env python3
"""Genera los audios naturales de la app (audio/*.mp3 + audio/manifest.json) con Piper, en local y gratis.

Lee los textos fijos del código:
  - index.html: todos los campos  es: '...'  (vocabulario, penaltis)
  - hablar.js : las frases de ejemplo (const ejemplosFrase = { ... })
  - voz.js    : las frases de ánimo (const FRASES_VOZ = { ... } hasta // FIN FRASES_VOZ)
  - test-nivel.js: preguntas y respuestas del test de nivel (const FRASES_TEST = { ... } hasta // FIN FRASES_TEST)
Solo genera lo nuevo o lo que ha cambiado y borra los MP3 que ya no se usan.

Requisitos: Python 3.9+, ffmpeg (con libmp3lame) y  pip install piper-tts
Uso:
  python3 scripts/generar-audios.py                 # genera lo que falte
  python3 scripts/generar-audios.py --forzar        # regenera todo
  python3 scripts/generar-audios.py --comprobar     # solo dice si falta algo (código de salida 1 si falta)
  python3 scripts/generar-audios.py --elegir-mejor 3  # 3 tomas por frase y se queda con la más natural
                                                     # (opcional; necesita torch: pip install torch librosa)
"""
import argparse, hashlib, json, os, re, shutil, subprocess, sys, tempfile, unicodedata, urllib.request, wave

RAIZ = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
DIR_AUDIO = os.path.join(RAIZ, 'audio')
MANIFEST = os.path.join(DIR_AUDIO, 'manifest.json')

# Voz elegida: sharvard (es_ES), hablante femenina "F". Ver README (licencia y por qué).
VOZ = 'es_ES-sharvard-medium'
HABLANTE = 'F'
URL_VOZ = 'https://huggingface.co/rhasspy/piper-voices/resolve/main/es/es_ES/sharvard/medium/'
AJUSTES = dict(length_scale=1.1, noise_scale=0.5, noise_w_scale=0.6)  # 1.1 = un poco más despacio, para niños
BITRATE = '48k'
VERSION_PROCESO = '1'  # súbelo si cambias el procesado de audio para regenerar todo
LICENCIA = ('Voz Piper "es_ES-sharvard-medium" (hablante F), entrenada con el Sharvard Corpus '
            '(Aubanel, García Lecumberri y Cooke, 2014; Universidad de Edimburgo), licencia CC BY 3.0. '
            'Audio generado con Piper (https://github.com/OHF-Voice/piper1-gpl).')


def leer(nombre):
    with open(os.path.join(RAIZ, nombre), encoding='utf-8') as f:
        return f.read()


def literales(trozo):
    out = []
    for m in re.finditer(r"""(['"])((?:\\.|(?!\1).)*)\1""", trozo):
        out.append(re.sub(r"\\(.)", r"\1", m.group(2)))
    return out


def textos_fijos():
    textos = []
    html = leer('index.html')
    for m in re.finditer(r"""\bes\s*:\s*(['"])((?:\\.|(?!\1).)*)\1""", html):
        textos.append(re.sub(r"\\(.)", r"\1", m.group(2)))
    hab = leer('hablar.js')
    m = re.search(r"const ejemplosFrase = \{(.*?)\n\};", hab, re.S)
    if not m:
        sys.exit('No encuentro ejemplosFrase en hablar.js')
    for linea in m.group(1).splitlines():
        lit = literales(linea)
        textos.extend(lit[1:])  # 'palabra': ['frase 1', 'frase 2', …]
    for archivo, bloque in (('voz.js', 'FRASES_VOZ'), ('test-nivel.js', 'FRASES_TEST')):
        m = re.search(r"const " + bloque + r" = \{(.*?)// FIN " + bloque, leer(archivo), re.S)
        if not m:
            sys.exit(f'No encuentro {bloque} en {archivo}')
        for linea in m.group(1).splitlines():
            lit = literales(linea)
            if lit:
                textos.append(lit[-1])
    vistos, unicos = set(), []
    for t in textos:
        t = unicodedata.normalize('NFC', re.sub(r'\s+', ' ', t.strip()))
        k = t.lower()
        if t and k not in vistos:
            vistos.add(k)
            unicos.append(t)
    return unicos


def slug(t):
    s = unicodedata.normalize('NFD', t.lower())
    s = ''.join(c for c in s if unicodedata.category(c) != 'Mn')
    s = re.sub(r'[^a-z0-9]+', '-', s).strip('-')
    return (s[:60].strip('-')) or 'audio'


def huella(t):
    datos = json.dumps([t, VOZ, HABLANTE, AJUSTES, BITRATE, VERSION_PROCESO], sort_keys=True, ensure_ascii=False)
    return hashlib.sha1(datos.encode()).hexdigest()[:12]


def modelo():
    d = os.environ.get('PIPER_VOCES', os.path.expanduser('~/.cache/altoyclaro-piper'))
    os.makedirs(d, exist_ok=True)
    onnx = os.path.join(d, VOZ + '.onnx')
    for f in (VOZ + '.onnx', VOZ + '.onnx.json'):
        p = os.path.join(d, f)
        if not os.path.exists(p) or os.path.getsize(p) < 1000:
            print('Descargando', f, '…')
            urllib.request.urlretrieve(URL_VOZ + f, p + '.part')
            os.replace(p + '.part', p)
    return onnx


def ffmpeg(*args, nivel='error'):
    r = subprocess.run(['ffmpeg', '-hide_banner', '-nostats', '-v', nivel, '-y', *args], capture_output=True, text=True)
    if r.returncode:
        sys.exit('ffmpeg falló: ' + r.stderr)
    return r


def palabras(t):
    s = unicodedata.normalize('NFD', t.lower())
    s = ''.join(c for c in s if unicodedata.category(c) != 'Mn')
    return re.sub(r'[^a-z0-9 ]', ' ', s).split()


class Puntuador:
    """Elige la mejor toma: primero que se entienda (reconocedor Whisper, si está instalado: pip install faster-whisper)
    y después la más natural (MOS estimado con UTMOS: pip install torch). Opcional."""
    def __init__(self):
        import torch, numpy  # noqa
        self.torch, self.np = torch, numpy
        self.m = torch.hub.load('tarepan/SpeechMOS:v1.2.0', 'utmos22_strong', trust_repo=True)
        try:
            from faster_whisper import WhisperModel
            self.asr = WhisperModel('small', device='cpu', compute_type='int8')
        except ImportError:
            print('(sin faster-whisper: no se comprueba que se entienda cada toma)')
            self.asr = None

    def __call__(self, wav, texto):
        import difflib
        r = subprocess.run(['ffmpeg', '-v', 'quiet', '-i', wav, '-f', 's16le', '-ac', '1', '-ar', '16000', '-'], capture_output=True)
        a = self.np.frombuffer(r.stdout, self.np.int16).astype(self.np.float32) / 32768
        with self.torch.no_grad():
            mos = self.m(self.torch.from_numpy(a)[None], 16000).item()
        claro = 1.0
        if self.asr:
            oido = ' '.join(s.text for s in self.asr.transcribe(a, language='es', beam_size=5)[0])
            claro = difflib.SequenceMatcher(None, palabras(texto), palabras(oido)).ratio()
        return (round(claro, 2), mos)


def sintetizar(voz, cfg, texto, wav):
    with wave.open(wav, 'wb') as w:
        voz.synthesize_wav(texto, w, syn_config=cfg)


def a_mp3(wav, mp3):
    # Quita silencios del principio y del final, deja 60 ms de margen, normaliza volumen (2 pasadas) y codifica MP3 mono.
    recorte = ('silenceremove=start_periods=1:start_threshold=-50dB:start_silence=0.03,'
               'areverse,silenceremove=start_periods=1:start_threshold=-50dB:start_silence=0.08,areverse,'
               'adelay=60,apad=pad_dur=0.12,highpass=f=60')
    r = ffmpeg('-i', wav, '-af', recorte + ',loudnorm=I=-16:TP=-1.5:LRA=11:print_format=json', '-f', 'null', '-', nivel='info')
    med = json.loads(re.findall(r'\{[^{}]*\}', r.stderr)[-1])
    ln = ('loudnorm=I=-16:TP=-1.5:LRA=11:linear=true:measured_I={input_i}:measured_TP={input_tp}:'
          'measured_LRA={input_lra}:measured_thresh={input_thresh}:offset={target_offset}').format(**med)
    ffmpeg('-i', wav, '-af', recorte + ',' + ln, '-ac', '1', '-ar', '22050', '-c:a', 'libmp3lame', '-b:a', BITRATE, mp3)


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument('--forzar', action='store_true')
    ap.add_argument('--comprobar', action='store_true')
    ap.add_argument('--elegir-mejor', type=int, default=1, metavar='N')
    a = ap.parse_args()

    textos = textos_fijos()
    viejo = {}
    if os.path.exists(MANIFEST):
        with open(MANIFEST, encoding='utf-8') as f:
            viejo = json.load(f).get('archivos', {})
    pend = [t for t in textos if a.forzar or t not in viejo or viejo[t].get('h') != huella(t)
            or not os.path.exists(os.path.join(DIR_AUDIO, viejo[t]['f']))]
    sobran = [t for t in viejo if t not in textos]
    print(f'{len(textos)} textos fijos; {len(pend)} por generar; {len(sobran)} sobran.')
    if a.comprobar:
        for t in pend:
            print('  falta:', t)
        sys.exit(1 if pend or sobran else 0)
    if not shutil.which('ffmpeg'):
        sys.exit('Falta ffmpeg.')
    try:
        from piper import PiperVoice, SynthesisConfig
    except ImportError:
        sys.exit('Falta Piper: pip install piper-tts')

    os.makedirs(DIR_AUDIO, exist_ok=True)
    nuevo, usados = {}, set()
    for t in textos:  # nombres estables: los existentes se mantienen
        if t in viejo and t not in pend:
            nuevo[t] = viejo[t]
            usados.add(viejo[t]['f'])
    voz = cfg = punt = None
    if pend:
        voz = PiperVoice.load(modelo())
        sid = voz.config.speaker_id_map.get(HABLANTE) if voz.config.speaker_id_map else None
        cfg = SynthesisConfig(speaker_id=sid, **AJUSTES)
        if a.elegir_mejor > 1:
            punt = Puntuador()
    with tempfile.TemporaryDirectory() as tmp:
        for i, t in enumerate(pend, 1):
            base = viejo[t]['f'][:-4] if t in viejo else slug(t)
            nombre, n = base + '.mp3', 2
            while nombre in usados:
                nombre, n = f'{base}-{n}.mp3', n + 1
            usados.add(nombre)
            tomas, k = [], 0
            # N tomas; si ninguna se entiende del todo, hasta 3N
            while k < max(1, a.elegir_mejor) or (punt and k < 3 * a.elegir_mejor and max(tomas)[0][0] < 1):
                wav = os.path.join(tmp, f'{i}-{k}.wav')
                sintetizar(voz, cfg, t, wav)
                tomas.append((punt(wav, t) if punt else (1, 0), wav))
                k += 1
            (claro, mos), wav = max(tomas)
            destino = os.path.join(DIR_AUDIO, nombre)
            a_mp3(wav, destino)
            with open(destino, 'rb') as f:
                v = hashlib.sha1(f.read()).hexdigest()[:8]
            nuevo[t] = {'f': nombre, 'v': v, 'h': huella(t)}
            print(f'  [{i}/{len(pend)}] {nombre}' + (f'  (se entiende {claro:.0%}, MOS {mos:.2f}, {k} tomas)' if punt else ''))
    for f in os.listdir(DIR_AUDIO):
        if f.endswith('.mp3') and f not in usados:
            os.remove(os.path.join(DIR_AUDIO, f))
            print('  borrado', f)
    out = {'voz': f'{VOZ} ({HABLANTE})', 'licencia': LICENCIA, 'archivos': {t: nuevo[t] for t in textos}}
    with open(MANIFEST, 'w', encoding='utf-8') as f:
        json.dump(out, f, ensure_ascii=False, indent=1)
        f.write('\n')
    total = sum(os.path.getsize(os.path.join(DIR_AUDIO, x)) for x in os.listdir(DIR_AUDIO))
    print(f'Listo: {len(textos)} audios, {total / 1024:.0f} KB en audio/.')


if __name__ == '__main__':
    main()
