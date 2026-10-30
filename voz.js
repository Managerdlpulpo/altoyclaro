/* voz.js — Cómo habla la app.
   1) Si la frase está grabada en /audio (voz neuronal natural generada con Piper, ver scripts/generar-audios.py),
      se reproduce ese MP3.
   2) Si no (texto dinámico, archivo que falla o el profe lo desactiva), se usa la voz del navegador,
      eligiendo la voz española más natural disponible.
   Se carga antes que hablar.js. Expone: decir(), speakSpanish(), pararVoz(), FRASES_VOZ y el selector de voz. */

// Frases fijas que dice la app. scripts/generar-audios.py lee este bloque para grabarlas: si añades una, regenera.
const FRASES_VOZ = {
    perfecto: '¡Perfecto!',
    muyBien: '¡Muy bien!',
    buenaFrase: '¡Qué buena frase!',
    casi: '¡Casi!',
    otraVez: 'Inténtalo otra vez.',
    correcto: '¡Correcto!',
    laCorrectaEs: 'La correcta es:',
    aPracticar: '¡A practicar!',
    gol: '¡Gol! ¡Muy bien!'
};
// FIN FRASES_VOZ

const VOZ_PREF_KEY = 'altoyclaroVoz';
const VOZ_RATE = 0.9, VOZ_PITCH = 1.05;

let vozPrefs = { nombre: '', grabada: true };
try { Object.assign(vozPrefs, JSON.parse(localStorage.getItem(VOZ_PREF_KEY) || '{}')); } catch (e) {}
function guardarVozPrefs() { try { localStorage.setItem(VOZ_PREF_KEY, JSON.stringify(vozPrefs)); } catch (e) {} }

// Últimas 20 cosas dichas (para depurar y para las pruebas): window.__vozLog
function anotarVoz(e) { const l = (window.__vozLog = window.__vozLog || []); l.push(e); if (l.length > 20) l.shift(); }

/* ---------- Audios grabados ---------- */
function claveTexto(t) {
    return String(t).normalize('NFC').trim().replace(/\s+/g, ' ').toLowerCase();
}
let audioManifest = null;      // { clave normalizada: 'audio/archivo.mp3?v=hash' }
const manifestListo = fetch('audio/manifest.json', { cache: 'no-cache' })
    .then(r => r.ok ? r.json() : null)
    .then(m => {
        audioManifest = {};
        if (m && m.archivos) for (const [texto, a] of Object.entries(m.archivos)) audioManifest[claveTexto(texto)] = 'audio/' + a.f + '?v=' + a.v;
    })
    .catch(() => { audioManifest = {}; });

function urlGrabada(texto) {
    if (!vozPrefs.grabada || !audioManifest) return null;
    return audioManifest[claveTexto(texto)] || null;
}

// Un único elemento <audio> reutilizado: en iOS, una vez "desbloqueado" con un toque, se puede reproducir después
// (p. ej. al terminar el reconocimiento de voz) sin otro toque.
const vozAudio = new Audio();
vozAudio.preload = 'auto';
let vozDesbloqueada = false;
function desbloquearVoz() {
    if (vozDesbloqueada) return;
    vozDesbloqueada = true;
    try { if (window.speechSynthesis) window.speechSynthesis.getVoices(); } catch (e) {}
    if (!vozAudio.src) {
        // 0,05 s de silencio (WAV mínimo) solo para desbloquear el elemento de audio
        vozAudio.src = 'data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQAAAAA=';
        vozAudio.muted = true;
        const silencio = vozAudio.src;
        vozAudio.play().then(() => { if (vozAudio.src === silencio) vozAudio.pause(); }).catch(() => {}).finally(() => { vozAudio.muted = false; });
    }
}
['pointerdown', 'touchend', 'keydown'].forEach(ev => document.addEventListener(ev, desbloquearVoz, { capture: true, passive: true }));

function reproducirArchivo(url, turno) {
    return new Promise(resolve => {
        if (turno !== vozTurno) return resolve(false);
        let hecho = false;
        const entrada = { via: 'archivo', url };
        const fin = ok => { if (hecho) return; hecho = true; entrada.ok = ok; vozAudio.onended = vozAudio.onerror = null; clearTimeout(t); vozFinActual = null; resolve(ok); };
        vozFinActual = () => fin(true);
        const t = setTimeout(() => fin(vozAudio.currentTime > 0), 15000);
        vozAudio.onended = () => fin(true);
        vozAudio.onerror = () => fin(false);
        vozAudio.muted = false;
        vozAudio.src = url;
        anotarVoz(entrada);
        const p = vozAudio.play();
        if (p && p.catch) p.catch(e => { console.warn('No se pudo reproducir el audio grabado, uso la voz del navegador.', e && e.name); fin(false); });
    });
}

/* ---------- Voz del navegador (speechSynthesis) ---------- */
let vocesListas = null;
function vocesDisponibles() {
    if (!window.speechSynthesis) return Promise.resolve([]);
    const ya = speechSynthesis.getVoices();
    if (ya.length) return Promise.resolve(ya);
    if (!vocesListas) vocesListas = new Promise(resolve => {
        const listo = () => { const v = speechSynthesis.getVoices(); if (v.length) { clearInterval(iv); clearTimeout(to); resolve(v); } };
        speechSynthesis.addEventListener && speechSynthesis.addEventListener('voiceschanged', listo);
        const iv = setInterval(listo, 150);
        const to = setTimeout(() => { clearInterval(iv); vocesListas = null; resolve(speechSynthesis.getVoices()); }, 1500);
    });
    return vocesListas;
}
function langDe(v) { return String(v.lang || '').replace('_', '-').toLowerCase(); }
function esVozEspanola(v) { return /^es(-|$)/.test(langDe(v)); }
// Puntuación: cuanto más alta, más natural. Prioriza es-ES y voces neuronales; evita eSpeak y voces "compact".
function puntuarVoz(v) {
    const n = (v.name || '') + ' ' + (v.voiceURI || '');
    const lang = langDe(v);
    let p = 0;
    if (lang === 'es-es') p += 30; else if (lang.startsWith('es')) p += 15; else return -1000;
    if (/natural|neural/i.test(n)) p += 45;
    if (/online/i.test(n)) p += 25;                       // Edge: "Microsoft Elvira Online (Natural)"
    if (/enhanced|premium|mejorada|siri/i.test(n)) p += 35; // Apple/iOS mejoradas
    if (/google/i.test(n)) p += 25;                        // "Google español" (Chrome)
    if (/m[oó]nica|paulina|marisol|elvira|helena|laura|dalia|lucia|luc[ií]a|ximena|paloma|esperanza|sabina/i.test(n)) p += 10;
    if (/espeak|compact|eloquence|robot|novelty|grandma|grandpa|bad news|bells|jester|whisper|zarvox|superstar/i.test(n)) p -= 60;
    if (v.default) p += 2;
    return p;
}
function vocesEspanolasOrdenadas(lista) {
    return lista.filter(esVozEspanola).sort((a, b) => puntuarVoz(b) - puntuarVoz(a));
}
function elegirVoz(lista) {
    const es = vocesEspanolasOrdenadas(lista);
    if (vozPrefs.nombre) { const v = es.find(x => x.name === vozPrefs.nombre); if (v) return v; }
    return es[0] || null;
}
function decirNavegador(texto, turno) {
    return new Promise(resolve => {
        if (!window.speechSynthesis || turno !== vozTurno) return resolve(false);
        vocesDisponibles().then(lista => {
            if (turno !== vozTurno) return resolve(false);
            const u = new SpeechSynthesisUtterance(texto);
            const v = elegirVoz(lista);
            if (v) { u.voice = v; u.lang = v.lang; } else u.lang = 'es-ES';
            u.rate = VOZ_RATE; u.pitch = VOZ_PITCH;
            let hecho = false;
            const fin = ok => { if (!hecho) { hecho = true; clearTimeout(t); resolve(ok); } };
            const t = setTimeout(() => fin(true), 4000 + texto.length * 150);
            u.onend = () => fin(true);
            u.onerror = () => fin(false);
            anotarVoz({ via: 'navegador', texto, voz: v ? v.name : '', rate: u.rate, pitch: u.pitch });
            speechSynthesis.speak(u);
        });
    });
}

/* ---------- API pública ---------- */
let vozTurno = 0;
let vozFinActual = null;
function pararVoz() {
    vozTurno++;
    if (vozFinActual) vozFinActual();
    try { vozAudio.pause(); } catch (e) {}
    if (window.speechSynthesis) window.speechSynthesis.cancel();
}
// decir('texto') o decir(['¡Muy bien!', 'el perro']): cada trozo usa su audio grabado si existe.
// Con { navegador: true } se salta las grabaciones (para probar la voz del navegador elegida).
async function decir(partes, opciones = {}) {
    pararVoz();
    const turno = vozTurno;
    const lista = (Array.isArray(partes) ? partes : [partes]).map(p => String(p || '').trim()).filter(Boolean);
    if (!audioManifest) await Promise.race([manifestListo, new Promise(r => setTimeout(r, 800))]);
    for (const texto of lista) {
        if (turno !== vozTurno) return;
        const url = opciones.navegador ? null : urlGrabada(texto);
        let ok = false;
        if (url) ok = await reproducirArchivo(url, turno);
        if (!ok && turno === vozTurno) await decirNavegador(texto, turno);
    }
}
function speakSpanish(text) { decir(text); }

/* ---------- Selector de voz (Panel del Profesor) ---------- */
async function renderSelectorVoz() {
    const sel = document.getElementById('voz-select');
    const chk = document.getElementById('voz-grabada');
    if (chk) chk.checked = vozPrefs.grabada !== false;
    if (!sel) return;
    const es = vocesEspanolasOrdenadas(await vocesDisponibles());
    sel.innerHTML = '';
    const auto = document.createElement('option');
    auto.value = ''; auto.textContent = es.length ? `Automática (${es[0].name})` : 'Automática';
    sel.appendChild(auto);
    es.forEach(v => { const o = document.createElement('option'); o.value = v.name; o.textContent = `${v.name} (${v.lang})`; sel.appendChild(o); });
    sel.value = es.some(v => v.name === vozPrefs.nombre) ? vozPrefs.nombre : '';
    const info = document.getElementById('voz-info');
    if (info) info.textContent = es.length ? '' : 'Este navegador no tiene voces en español; se usarán solo las grabaciones.';
}
function cambiarVoz(nombre) { vozPrefs.nombre = nombre || ''; guardarVozPrefs(); }
function cambiarVozGrabada(v) { vozPrefs.grabada = !!v; guardarVozPrefs(); }
function probarVoz() { decir('Hola, soy la voz de este dispositivo. ¡Vamos a jugar!', { navegador: true }); }
function probarVozGrabada() { decir(['¡Hola!', 'Me gusta el fútbol.']); }
if (window.speechSynthesis && speechSynthesis.addEventListener) {
    speechSynthesis.addEventListener('voiceschanged', () => {
        const m = document.getElementById('teacher-modal');
        if (m && !m.classList.contains('hidden')) renderSelectorVoz();
    });
}
