/* =====================================================================
   Liga de Habla Soto Alto · Modo HABLAR (expresión oral)
   - El niño ve una foto, pulsa el micrófono y dice la palabra o una frase.
   - Reconocimiento de voz del navegador (Web Speech API, es-ES).
   - Historial de intentos en localStorage ('ligaHablaVoz').
   - Grabaciones de voz SOLO en este dispositivo (IndexedDB 'ligaHablaAudio').
   - No se sube nada a ningún servidor de Andel.
   Depende de index.html (visualVocab, gameState, shuffle, addXP) y de voz.js (decir, speakSpanish, pararVoz, FRASES_VOZ).
   ===================================================================== */

const HABLA_KEY = 'ligaHablaVoz';
const HABLA_MAX_INTENTOS = 3000;
const AUDIO_DB = 'ligaHablaAudio';
const AUDIO_STORE = 'grabaciones';
const AUDIO_MAX_TOTAL = 50;
const AUDIO_ULTIMAS_POR_PALABRA = 3;
const UMBRAL_PERFECTO = 0.8;
const UMBRAL_CASI = 0.55;
const XP_PALABRA = 15, XP_FRASE = 25, XP_ADULTO = 10;

const SpeechRec = window.SpeechRecognition || window.webkitSpeechRecognition || null;
const puedeGrabar = !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia && window.MediaRecorder);

// Frases de ejemplo para el modo "Dime una frase"
const ejemplosFrase = {
    'la cama': 'Yo duermo en la cama.',
    'la mesa': 'La comida está en la mesa.',
    'la silla': 'Me siento en la silla.',
    'el plato': 'Pongo la comida en el plato.',
    'el vaso': 'Bebo agua en el vaso.',
    'el cepillo de dientes': 'Me lavo con el cepillo de dientes.',
    'la pelota': 'Juego con la pelota en el parque.',
    'el perro': 'El perro corre mucho.',
    'el gato': 'El gato duerme en casa.',
    'la manzana': 'Me gusta comer la manzana.',
    'el balón': 'Chuto el balón a la portería.',
    'la camiseta': 'Mi camiseta es de color azul.'
};

/* ---------- Datos guardados ---------- */
function hablaDatosVacios() { return { version: 1, intentos: [], soloManual: false, sinGrabarConReconocimiento: false }; }
function cargarHabla() {
    try {
        const d = JSON.parse(localStorage.getItem(HABLA_KEY) || 'null');
        if (d && Array.isArray(d.intentos)) return Object.assign(hablaDatosVacios(), d);
    } catch (e) { console.warn('No se pudo leer el progreso al hablar', e); }
    return hablaDatosVacios();
}
let hablaData = cargarHabla();
function guardarHabla() {
    if (hablaData.intentos.length > HABLA_MAX_INTENTOS) hablaData.intentos = hablaData.intentos.slice(-HABLA_MAX_INTENTOS);
    try { localStorage.setItem(HABLA_KEY, JSON.stringify(hablaData)); }
    catch (e) { console.warn('No se pudo guardar el progreso al hablar', e); }
    if (typeof programarSync === 'function') programarSync(); // solo texto; el audio nunca se envía
}

/* ---------- Utilidades ---------- */
function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}
const ARTICULOS = new Set(['el', 'la', 'los', 'las', 'un', 'una', 'unos', 'unas', 'lo']);
function normTexto(s) {
    return String(s || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9\s]/g, ' ').replace(/\s+/g, ' ').trim();
}
function palabrasDe(s) { const n = normTexto(s); return n ? n.split(' ') : []; }
function sinArticulos(ws) { return ws.filter(w => !ARTICULOS.has(w)); }
function levenshtein(a, b) {
    if (a === b) return 0;
    if (!a.length) return b.length;
    if (!b.length) return a.length;
    let prev = Array.from({ length: b.length + 1 }, (_, i) => i);
    for (let i = 1; i <= a.length; i++) {
        const cur = [i];
        for (let j = 1; j <= b.length; j++) {
            cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
        }
        prev = cur;
    }
    return prev[b.length];
}
function similitud(a, b) {
    const m = Math.max(a.length, b.length);
    return m === 0 ? 1 : 1 - levenshtein(a, b) / m;
}
// Mejor parecido entre la palabra objetivo y cualquier trozo de lo que se oyó
function mejorCoincidencia(objetivoWs, oidoWs) {
    if (!oidoWs.length || !objetivoWs.length) return 0;
    const t = objetivoWs.join(' ');
    let best = similitud(t, oidoWs.join(' '));
    const n = objetivoWs.length;
    for (let len = Math.max(1, n - 1); len <= n + 1; len++) {
        for (let i = 0; i + len <= oidoWs.length; i++) {
            best = Math.max(best, similitud(t, oidoWs.slice(i, i + len).join(' ')));
        }
    }
    return best;
}
function objetivoDe(item) { return sinArticulos(palabrasDe(item.es)); }

function evaluarPalabra(alternativas, item) {
    const obj = objetivoDe(item);
    let mejor = { score: 0, oido: alternativas[0] || '' };
    alternativas.forEach(alt => {
        const oidoWs = sinArticulos(palabrasDe(alt));
        let s = mejorCoincidencia(obj, oidoWs);
        // Palabras compuestas ("cepillo de dientes"): decir solo la primera parte cuenta como "casi"
        if (obj.length > 1) s = Math.max(s, mejorCoincidencia([obj[0]], oidoWs) * 0.65);
        if (s > mejor.score) mejor = { score: s, oido: alt };
    });
    const resultado = mejor.score >= UMBRAL_PERFECTO ? 'perfecto' : mejor.score >= UMBRAL_CASI ? 'casi' : 'otra';
    return { resultado, score: Math.round(mejor.score * 100), oido: mejor.oido, motivo: '' };
}
function evaluarFrase(alternativas, item) {
    const obj = objetivoDe(item);
    let mejor = null;
    alternativas.forEach(alt => {
        const ws = palabrasDe(alt);
        const s = mejorCoincidencia(obj, sinArticulos(ws));
        const contiene = s >= UMBRAL_PERFECTO;
        const larga = ws.length >= 3;
        const rango = (contiene && larga) ? 3 : contiene ? 2 : (larga && s >= UMBRAL_CASI) ? 1 : 0;
        if (!mejor || rango > mejor.rango || (rango === mejor.rango && s > mejor.s)) mejor = { rango, s, alt, contiene, larga };
    });
    if (!mejor) return { resultado: 'otra', score: 0, oido: '', motivo: '' };
    let resultado = 'otra', motivo = '';
    if (mejor.rango === 3) resultado = 'perfecto';
    else if (mejor.rango === 2) { resultado = 'casi'; motivo = 'corta'; }
    else if (mejor.rango === 1) { resultado = 'casi'; motivo = 'palabra'; }
    else if (mejor.larga) motivo = 'palabra';
    const score = Math.round(mejor.s * (mejor.larga ? 100 : 70));
    return { resultado, score, oido: mejor.alt, motivo };
}
function esAcierto(r) { return r === 'perfecto' || r === 'bien'; }

/* ---------- Grabaciones en IndexedDB (solo en este dispositivo) ---------- */
let _dbPromise = null;
function audioDB() {
    if (_dbPromise) return _dbPromise;
    _dbPromise = new Promise((resolve, reject) => {
        if (!window.indexedDB) { reject(new Error('Sin IndexedDB')); return; }
        const req = indexedDB.open(AUDIO_DB, 1);
        req.onupgradeneeded = () => {
            const db = req.result;
            if (!db.objectStoreNames.contains(AUDIO_STORE)) db.createObjectStore(AUDIO_STORE, { keyPath: 'id' });
        };
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => reject(req.error);
    });
    _dbPromise.catch(() => { _dbPromise = null; });
    return _dbPromise;
}
function audioTx(modo, fn) {
    return audioDB().then(db => new Promise((resolve, reject) => {
        const tx = db.transaction(AUDIO_STORE, modo);
        const st = tx.objectStore(AUDIO_STORE);
        let out;
        const r = fn(st);
        if (r) r.onsuccess = () => { out = r.result; };
        tx.oncomplete = () => resolve(out);
        tx.onerror = () => reject(tx.error);
        tx.onabort = () => reject(tx.error);
    }));
}
function audioAll() { return audioTx('readonly', st => st.getAll()).then(r => r || []); }
function audioPut(rec) { return audioTx('readwrite', st => st.put(rec)); }
function audioDelete(ids) { return audioTx('readwrite', st => { ids.forEach(id => st.delete(id)); return null; }); }
function audioClear() { return audioTx('readwrite', st => st.clear()); }

// Conserva la primera grabación de cada palabra + las 3 últimas, y como máximo 50 en total
async function podarGrabaciones() {
    const todas = await audioAll();
    const porPalabra = {};
    todas.forEach(r => { (porPalabra[r.word] = porPalabra[r.word] || []).push(r); });
    const borrar = new Set();
    const primeras = new Set();
    Object.values(porPalabra).forEach(lista => {
        lista.sort((a, b) => a.t - b.t);
        primeras.add(lista[0].id);
        const conservar = new Set([lista[0].id, ...lista.slice(-AUDIO_ULTIMAS_POR_PALABRA).map(r => r.id)]);
        lista.forEach(r => { if (!conservar.has(r.id)) borrar.add(r.id); });
    });
    const quedan = todas.filter(r => !borrar.has(r.id)).sort((a, b) => a.t - b.t);
    let exceso = quedan.length - AUDIO_MAX_TOTAL;
    // Si hay demasiadas: primero se borran las más antiguas que no son la "primera" de su palabra; después cualquiera
    for (const r of quedan) { if (exceso <= 0) break; if (!primeras.has(r.id)) { borrar.add(r.id); exceso--; } }
    for (const r of quedan) { if (exceso <= 0) break; if (!borrar.has(r.id)) { borrar.add(r.id); exceso--; } }
    if (borrar.size) {
        await audioDelete([...borrar]);
        let cambiado = false;
        hablaData.intentos.forEach(i => { if (i.audioId && borrar.has(i.audioId)) { i.audioId = null; cambiado = true; } });
        if (cambiado) guardarHabla();
    }
}

/* ---------- Estado de la pantalla Hablar ---------- */
let hablaModo = 'palabra';
let hablaCat = 'Todas';
let hablaOrden = [];
let hablaPos = 0;
let hablaItem = null;
let hablaXPDado = false;
let hablaSesion = null;
let hablaPendiente = null; // grabación esperando la valoración del adulto

function hablaLista() { return hablaCat === 'Todas' ? visualVocab : visualVocab.filter(v => v.cat === hablaCat); }

function renderHablar() {
    const cats = ['Todas', ...new Set(visualVocab.map(v => v.cat))];
    const cont = document.getElementById('habla-categorias');
    if (!cont) return;
    cont.innerHTML = '';
    cats.forEach(c => {
        const b = document.createElement('button');
        b.className = 'chip-btn bg-stadium-800 hover:bg-pitch-700 text-white text-xs px-3 py-1.5 rounded-lg border border-slate-700' + (c === hablaCat ? ' active' : '');
        b.innerText = c;
        b.onclick = () => { hablaCat = c; renderHablar(); };
        cont.appendChild(b);
    });
    hablaOrden = shuffle(hablaLista());
    hablaPos = 0;
    mostrarItemHabla();
    actualizarAvisoSoporte();
}

function actualizarAvisoSoporte() {
    const el = document.getElementById('habla-aviso-soporte');
    if (!el) return;
    let msg = '';
    if (hablaData.soloManual) {
        msg = '👩‍🏫 Está activada la valoración por un adulto: el programa graba la voz y un adulto pulsa si lo ha dicho bien o hay que practicar.';
    } else if (!SpeechRec) {
        msg = '🙂 Este navegador no puede entender la voz automáticamente. Para que el programa te escuche y te corrija, usa <strong>Chrome</strong> (en Android o en el ordenador) o <strong>Safari</strong> actualizado en iPhone/iPad. Mientras tanto, puedes grabarte y un adulto dirá si lo has dicho bien.';
    }
    if (!puedeGrabar && (hablaData.soloManual || !SpeechRec)) msg += '<br>Este navegador tampoco permite grabar audio; el adulto puede escuchar en directo y valorar.';
    el.innerHTML = msg;
    el.classList.toggle('hidden', !msg);
}

function setModoHabla(m) {
    cancelarSesionHabla();
    hablaModo = m;
    document.getElementById('habla-modo-palabra').classList.toggle('active', m === 'palabra');
    document.getElementById('habla-modo-frase').classList.toggle('active', m === 'frase');
    mostrarItemHabla();
}

function mostrarItemHabla() {
    if (!hablaOrden.length) hablaOrden = shuffle(hablaLista());
    hablaItem = hablaOrden[hablaPos % hablaOrden.length];
    hablaXPDado = false;
    hablaPendiente = null;
    const item = hablaItem;
    document.getElementById('habla-image').src = item.img;
    document.getElementById('habla-image').alt = 'Foto';
    document.getElementById('habla-category').innerText = item.cat;
    const pal = document.getElementById('habla-palabra');
    const consigna = document.getElementById('habla-consigna');
    const btnPista = document.getElementById('habla-btn-pista');
    const btnEj = document.getElementById('habla-btn-ejemplo');
    if (hablaModo === 'frase') {
        consigna.innerHTML = 'Di una frase con la palabra:';
        pal.innerText = '«' + item.es + '»';
        pal.classList.remove('hidden');
        btnPista.classList.add('hidden');
        btnEj.classList.remove('hidden');
    } else {
        consigna.innerHTML = '¿Qué es esto? ¡Dilo en voz alta!';
        pal.innerText = item.es;
        pal.classList.add('hidden');
        btnPista.classList.remove('hidden');
        btnEj.classList.add('hidden');
    }
    document.getElementById('habla-resultado').classList.add('hidden');
    document.getElementById('habla-manual').classList.add('hidden');
    setEstadoHabla('Pulsa el micrófono y habla');
}

function hablaSiguiente() {
    cancelarSesionHabla();
    hablaPos++;
    if (hablaPos >= hablaOrden.length) {
        const anterior = hablaItem;
        hablaOrden = shuffle(hablaLista());
        if (hablaOrden.length > 1 && hablaOrden[0] === anterior) hablaOrden.push(hablaOrden.shift());
        hablaPos = 0;
    }
    mostrarItemHabla();
}
function hablaEscuchar() { if (hablaItem) speakSpanish(hablaItem.es); }
function hablaPista() {
    if (!hablaItem) return;
    document.getElementById('habla-palabra').classList.remove('hidden');
    speakSpanish(hablaItem.es);
}
function hablaEjemplo() {
    if (!hablaItem) return;
    speakSpanish(ejemplosFrase[hablaItem.es] || ('Yo veo ' + hablaItem.es + '.'));
}
function setEstadoHabla(txt) { const e = document.getElementById('habla-estado'); if (e) e.innerHTML = txt; }
function setMicUI(activo) {
    const b = document.getElementById('habla-mic');
    if (!b) return;
    b.classList.toggle('listening', activo);
    b.innerHTML = activo ? '<i class="fa-solid fa-stop"></i>' : '<i class="fa-solid fa-microphone"></i>';
}

/* ---------- Micrófono ---------- */
function elegirMime() {
    const tipos = ['audio/webm;codecs=opus', 'audio/webm', 'audio/mp4', 'audio/ogg;codecs=opus'];
    if (!window.MediaRecorder || !MediaRecorder.isTypeSupported) return '';
    return tipos.find(t => MediaRecorder.isTypeSupported(t)) || '';
}

async function hablaMic() {
    if (hablaSesion) { detenerSesionHabla(); return; }
    if (!hablaItem) return;
    if (typeof pararVoz === 'function') pararVoz(); else if (window.speechSynthesis) window.speechSynthesis.cancel();
    document.getElementById('habla-resultado').classList.add('hidden');
    document.getElementById('habla-manual').classList.add('hidden');
    hablaPendiente = null;

    const usarSR = !!SpeechRec && !hablaData.soloManual;
    const s = {
        item: hablaItem, modo: hablaModo, usarSR, alts: [], chunks: [],
        sr: null, rec: null, stream: null, mime: '', error: null,
        srHecho: !usarSR, recHecho: true, terminado: false, cancelado: false, timer: null
    };
    hablaSesion = s;
    setMicUI(true);
    setEstadoHabla('🎙️ Preparando el micrófono…');

    // 1) Grabación (opcional) — el permiso se pide solo ahora, al pulsar
    const grabar = puedeGrabar && !(usarSR && hablaData.sinGrabarConReconocimiento);
    if (grabar) {
        try {
            s.stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            if (s.cancelado) { s.stream.getTracks().forEach(t => t.stop()); return; }
            s.mime = elegirMime();
            s.rec = s.mime ? new MediaRecorder(s.stream, { mimeType: s.mime }) : new MediaRecorder(s.stream);
            s.rec.ondataavailable = e => { if (e.data && e.data.size) s.chunks.push(e.data); };
            s.rec.onstop = () => {
                if (s.stream) s.stream.getTracks().forEach(t => t.stop());
                s.recHecho = true;
                terminarSesionHabla(s);
            };
            s.recHecho = false;
            s.rec.start();
        } catch (e) {
            console.warn('No se pudo grabar', e);
            if (s.stream) s.stream.getTracks().forEach(t => t.stop());
            s.rec = null; s.recHecho = true;
            if (!usarSR) {
                const denegado = e && (e.name === 'NotAllowedError' || e.name === 'SecurityError');
                finSesionError(s, denegado
                    ? '🔒 Necesito permiso para usar el micrófono. Pulsa el candado de la barra de direcciones y permite el micrófono.'
                    : '🎙️ No encuentro el micrófono. Puedes decirlo en voz alta y que un adulto lo valore.');
                if (!denegado) mostrarManual(null);
                return;
            }
        }
    }
    if (s.cancelado) return;

    // 2) Reconocimiento de voz
    if (usarSR) {
        try {
            const r = new SpeechRec();
            r.lang = 'es-ES';
            r.interimResults = false;
            r.continuous = false;
            r.maxAlternatives = 5;
            r.onresult = e => {
                for (let i = 0; i < e.results.length; i++) {
                    const res = e.results[i];
                    for (let j = 0; j < res.length; j++) if (res[j].transcript) s.alts.push(res[j].transcript.trim());
                }
            };
            r.onerror = e => { s.error = e.error || 'error'; };
            r.onend = () => {
                s.srHecho = true;
                if (s.rec && s.rec.state !== 'inactive') { try { s.rec.stop(); } catch (_) { } }
                terminarSesionHabla(s);
            };
            s.sr = r;
            r.start();
        } catch (e) {
            console.warn('No se pudo iniciar el reconocimiento', e);
            s.error = 'start';
            s.srHecho = true;
            if (s.rec && s.rec.state !== 'inactive') s.rec.stop();
            else terminarSesionHabla(s);
        }
    }
    if (!s.sr && !s.rec) { terminarSesionHabla(s); return; } // sin reconocimiento ni grabación: valora el adulto
    setEstadoHabla(s.modo === 'frase' ? '👂 Te escucho… di tu frase' : '👂 Te escucho… ¡di la palabra!');
    s.timer = setTimeout(() => { if (hablaSesion === s) detenerSesionHabla(); }, s.modo === 'frase' ? 12000 : 8000);
}

function detenerSesionHabla() {
    const s = hablaSesion;
    if (!s) return;
    if (s.sr) { try { s.sr.stop(); } catch (_) { } }
    if (s.rec && s.rec.state !== 'inactive') { try { s.rec.stop(); } catch (_) { } }
    if (!s.sr && !s.rec) terminarSesionHabla(s);
}

function cancelarSesionHabla() {
    const s = hablaSesion;
    if (!s) return;
    s.cancelado = true;
    clearTimeout(s.timer);
    if (s.sr) { try { s.sr.abort(); } catch (_) { } }
    if (s.rec && s.rec.state !== 'inactive') { try { s.rec.stop(); } catch (_) { } }
    if (s.stream) s.stream.getTracks().forEach(t => t.stop());
    hablaSesion = null;
    setMicUI(false);
}

function finSesionError(s, msg) {
    s.terminado = true;
    clearTimeout(s.timer);
    if (hablaSesion === s) hablaSesion = null;
    setMicUI(false);
    setEstadoHabla(msg);
}

function terminarSesionHabla(s) {
    if (s.terminado || s.cancelado || !s.srHecho || !s.recHecho) return;
    s.terminado = true;
    clearTimeout(s.timer);
    if (hablaSesion === s) hablaSesion = null;
    setMicUI(false);
    const blob = s.chunks.length ? new Blob(s.chunks, { type: (s.rec && s.rec.mimeType) || s.mime || s.chunks[0].type || 'audio/webm' }) : null;

    if (!s.usarSR) {
        mostrarManual(blob);
        return;
    }
    if (!s.alts.length) {
        const err = s.error;
        if (err === 'audio-capture' && s.rec) {
            // En algunos móviles no se puede grabar y reconocer a la vez: a partir de ahora solo reconocemos
            hablaData.sinGrabarConReconocimiento = true; guardarHabla();
            setEstadoHabla('🔄 En este dispositivo no se puede grabar y escuchar a la vez. Pulsa otra vez el micrófono (se guardará solo el texto).');
        } else if (err === 'not-allowed' || err === 'service-not-allowed') {
            setEstadoHabla('🔒 Necesito permiso para usar el micrófono. Pulsa el candado de la barra de direcciones y permite el micrófono.');
        } else if (err === 'network') {
            setEstadoHabla('📶 Para entender tu voz hace falta internet. Comprueba la conexión o pide a un adulto que valore.');
            mostrarManual(blob);
        } else if (err === 'language-not-supported') {
            setEstadoHabla('Este navegador no reconoce castellano. Un adulto puede valorar la grabación.');
            mostrarManual(blob);
        } else {
            setEstadoHabla('🤫 No te he oído. Habla un poco más alto y cerca del micrófono, y vuelve a pulsar.');
        }
        return;
    }
    const ev = s.modo === 'frase' ? evaluarFrase(s.alts, s.item) : evaluarPalabra(s.alts, s.item);
    mostrarResultado(ev, s);
    registrarIntento({ item: s.item, modo: s.modo, metodo: 'auto', oido: ev.oido, alternativas: s.alts.slice(0, 5), score: ev.score, resultado: ev.resultado, blob });
}

function mostrarResultado(ev, s) {
    const box = document.getElementById('habla-resultado');
    const oido = ev.oido ? `<div class="text-xs text-slate-300 mt-1">He oído: «<strong class="text-white">${esc(ev.oido)}</strong>»</div>` : '';
    let html = '';
    if (ev.resultado === 'perfecto') {
        let xp = 0;
        if (s.item === hablaItem && !hablaXPDado) { xp = s.modo === 'frase' ? XP_FRASE : XP_PALABRA; hablaXPDado = true; addXP(xp); }
        html = `<div class="bg-emerald-950/80 border-2 border-emerald-400 rounded-2xl p-4">
            <div class="text-2xl font-game text-emerald-300">🌟 ¡Perfecto!${xp ? ` <span class="text-amber-400 text-lg">+${xp} XP</span>` : ''}</div>${oido}</div>`;
        decir(s.modo === 'frase' ? [FRASES_VOZ.muyBien, FRASES_VOZ.buenaFrase] : [FRASES_VOZ.perfecto, s.item.es]);
    } else if (ev.resultado === 'casi') {
        let pista = 'Escucha cómo se dice y prueba otra vez.';
        if (ev.motivo === 'corta') pista = 'Muy bien la palabra. Ahora di una frase más larga (3 palabras o más).';
        if (ev.motivo === 'palabra') pista = `Buena frase, pero tiene que salir la palabra «${esc(s.item.es)}».`;
        decir(FRASES_VOZ.casi);
        html = `<div class="bg-amber-950/60 border-2 border-amber-400 rounded-2xl p-4">
            <div class="text-2xl font-game text-amber-300">👏 ¡Casi!</div>${oido}
            <div class="text-sm text-amber-100 mt-2">${pista}</div>
            <button onclick="${s.modo === 'frase' ? 'hablaEjemplo()' : 'hablaPista()'}" class="mt-3 bg-pitch-600 hover:bg-pitch-500 text-white text-sm font-bold px-4 py-2 rounded-xl"><i class="fa-solid fa-volume-high mr-1"></i> Escuchar</button></div>`;
    } else {
        const pista = ev.motivo === 'palabra' ? `Recuerda usar la palabra «${esc(s.item.es)}».` : 'Escucha la palabra y vuelve a pulsar el micrófono.';
        decir(FRASES_VOZ.otraVez);
        html = `<div class="bg-rose-950/50 border-2 border-rose-400 rounded-2xl p-4">
            <div class="text-2xl font-game text-rose-300">💪 Inténtalo otra vez</div>${oido}
            <div class="text-sm text-rose-100 mt-2">${pista}</div>
            <button onclick="${s.modo === 'frase' ? 'hablaEjemplo()' : 'hablaPista()'}" class="mt-3 bg-pitch-600 hover:bg-pitch-500 text-white text-sm font-bold px-4 py-2 rounded-xl"><i class="fa-solid fa-volume-high mr-1"></i> Escuchar</button></div>`;
    }
    box.innerHTML = html;
    box.classList.remove('hidden');
    setEstadoHabla(ev.resultado === 'perfecto' ? 'Pulsa «Siguiente» para otra foto' : 'Pulsa el micrófono para intentarlo de nuevo');
}

/* ---------- Valoración por un adulto ---------- */
function mostrarManual(blob) {
    hablaPendiente = { item: hablaItem, modo: hablaModo, blob };
    document.getElementById('habla-manual-play').classList.toggle('hidden', !blob);
    document.getElementById('habla-manual').classList.remove('hidden');
    if (blob) setEstadoHabla('✅ Grabado. Escuchad la grabación y valorad.');
    else if (!document.getElementById('habla-estado').innerText.includes('micrófono')) setEstadoHabla('Di la palabra en voz alta y que un adulto la valore.');
}
let _audioActual = null;
function reproducirBlob(blob) {
    if (!blob) return;
    if (_audioActual) { _audioActual.pause(); URL.revokeObjectURL(_audioActual.src); }
    const a = new Audio(URL.createObjectURL(blob));
    _audioActual = a;
    a.play().catch(e => console.warn('No se pudo reproducir', e));
}
function hablaReproducirPendiente() { if (hablaPendiente) reproducirBlob(hablaPendiente.blob); }
function hablaValorar(bien) {
    const p = hablaPendiente;
    if (!p) return;
    hablaPendiente = null;
    document.getElementById('habla-manual').classList.add('hidden');
    const box = document.getElementById('habla-resultado');
    if (bien) {
        let xp = 0;
        if (p.item === hablaItem && !hablaXPDado) { xp = XP_ADULTO; hablaXPDado = true; addXP(xp); }
        decir(FRASES_VOZ.muyBien);
        box.innerHTML = `<div class="bg-emerald-950/80 border-2 border-emerald-400 rounded-2xl p-4"><div class="text-2xl font-game text-emerald-300">🌟 ¡Muy bien!${xp ? ` <span class="text-amber-400 text-lg">+${xp} XP</span>` : ''}</div></div>`;
        setEstadoHabla('Pulsa «Siguiente» para otra foto');
    } else {
        box.innerHTML = `<div class="bg-amber-950/60 border-2 border-amber-400 rounded-2xl p-4"><div class="text-2xl font-game text-amber-300">💪 ¡A practicar!</div><div class="text-sm text-amber-100 mt-1">Escucha y prueba otra vez.</div></div>`;
        setEstadoHabla('Pulsa el micrófono para intentarlo de nuevo');
        decir([FRASES_VOZ.aPracticar, p.item.es]);
    }
    box.classList.remove('hidden');
    registrarIntento({ item: p.item, modo: p.modo, metodo: 'adulto', oido: '', alternativas: [], score: bien ? 100 : 0, resultado: bien ? 'bien' : 'practicar', blob: p.blob });
}

/* ---------- Registro de intentos ---------- */
function registrarIntento(o) {
    const id = Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
    const intento = {
        id, t: Date.now(), palabra: o.item.es, categoria: o.item.cat, modo: o.modo, metodo: o.metodo,
        oido: o.oido || '', alternativas: o.alternativas || [], score: o.score, resultado: o.resultado,
        audioId: o.blob ? id : null
    };
    hablaData.intentos.push(intento);
    guardarHabla();
    if (o.blob) {
        o.blob.arrayBuffer()
            .then(buf => audioPut({ id, word: o.item.es, t: intento.t, modo: o.modo, type: o.blob.type, data: buf }))
            .then(() => podarGrabaciones())
            .catch(e => {
                console.warn('No se pudo guardar la grabación', e);
                intento.audioId = null; guardarHabla();
            });
    }
}

/* ---------- Panel "Mi progreso al hablar" ---------- */
let agrupacionProgreso = 'dia';
function setAgrupacionProgreso(a) {
    agrupacionProgreso = a;
    document.getElementById('prog-btn-dia').classList.toggle('active', a === 'dia');
    document.getElementById('prog-btn-semana').classList.toggle('active', a === 'semana');
    renderGrafico();
}
function claveDia(t) { const d = new Date(t); return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); }
function claveSemana(t) {
    const d = new Date(t); d.setHours(0, 0, 0, 0);
    const dia = (d.getDay() + 6) % 7; // lunes = 0
    d.setDate(d.getDate() - dia);
    return claveDia(d.getTime());
}
function etiquetaFecha(clave) { const [y, m, d] = clave.split('-'); return `${d}/${m}`; }
function fmtFecha(t) { const d = new Date(t); return d.toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: '2-digit' }) + ' ' + d.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' }); }

function estadisticasPorPalabra() {
    const m = {};
    hablaData.intentos.forEach(i => { (m[i.palabra] = m[i.palabra] || []).push(i); });
    const res = {};
    Object.entries(m).forEach(([w, lista]) => {
        lista.sort((a, b) => a.t - b.t);
        const ult3 = lista.slice(-3);
        const ult5 = lista.slice(-5);
        const aciertos3 = ult3.filter(i => esAcierto(i.resultado)).length;
        const dominada = aciertos3 >= 2 && esAcierto(lista[lista.length - 1].resultado);
        const tasa5 = ult5.filter(i => esAcierto(i.resultado)).length / ult5.length;
        const cuesta = !dominada && lista.length >= 2 && tasa5 < 0.5;
        res[w] = { lista, total: lista.length, aciertos: lista.filter(i => esAcierto(i.resultado)).length, dominada, cuesta, tasa5 };
    });
    return res;
}

function renderProgresoHabla() {
    const ints = hablaData.intentos;
    const nombre = document.getElementById('prog-nombre');
    if (!nombre) return;
    nombre.innerText = (gameState && gameState.name ? gameState.name + ' · ' : '') + 'Todo se guarda solo en este dispositivo.';
    document.getElementById('prog-solo-manual').checked = !!hablaData.soloManual;

    const total = ints.length;
    const aciertos = ints.filter(i => esAcierto(i.resultado)).length;
    const stats = estadisticasPorPalabra();
    const dominadas = Object.entries(stats).filter(([, s]) => s.dominada).map(([w]) => w);
    const cuestan = Object.entries(stats).filter(([, s]) => s.cuesta).sort((a, b) => a[1].tasa5 - b[1].tasa5).map(([w]) => w);
    const dias = new Set(ints.map(i => claveDia(i.t))).size;
    const frases = ints.filter(i => i.modo === 'frase' && esAcierto(i.resultado)).length;
    const tarjeta = (v, l, c) => `<div class="bg-stadium-950 border border-slate-800 rounded-2xl p-3 text-center"><div class="text-2xl font-game font-bold ${c}">${v}</div><div class="text-[11px] text-slate-400">${l}</div></div>`;
    document.getElementById('prog-resumen').innerHTML =
        tarjeta(total, 'intentos', 'text-white') +
        tarjeta(total ? Math.round(aciertos / total * 100) + '%' : '—', 'aciertos', 'text-emerald-400') +
        tarjeta(`${dominadas.length}/${visualVocab.length}`, 'palabras dominadas', 'text-amber-400') +
        tarjeta(frases, 'frases bien dichas', 'text-sky-400');

    // Tendencia: primeros intentos frente a los más recientes
    const tend = document.getElementById('prog-tendencia');
    if (total >= 6) {
        const mitad = Math.floor(total / 2);
        const pct = arr => Math.round(arr.filter(i => esAcierto(i.resultado)).length / arr.length * 100);
        const a = pct(ints.slice(0, mitad)), b = pct(ints.slice(mitad));
        const txt = b > a ? `📈 ¡Está mejorando! Al principio acertaba el <strong>${a}%</strong> y ahora el <strong>${b}%</strong>.`
            : b === a ? `➡️ Se mantiene en el <strong>${b}%</strong> de aciertos. ¡A seguir practicando!`
                : `💪 Ahora acierta el <strong>${b}%</strong> (antes el ${a}%). Quizá está probando palabras o frases más difíciles.`;
        tend.innerHTML = `<div class="bg-sky-950/40 border border-sky-700/50 text-sky-100 rounded-xl p-3">${txt} <span class="text-slate-400">(${dias} ${dias === 1 ? 'día' : 'días'} practicando)</span></div>`;
    } else {
        tend.innerHTML = total ? `<div class="text-slate-400 text-xs">Haz unos cuantos intentos más para ver cómo mejora.</div>`
            : `<div class="text-slate-400 text-xs">Todavía no hay intentos. Ve a la pestaña <strong>Hablar</strong> y pulsa el micrófono.</div>`;
    }

    renderGrafico();

    const chip = (w, c) => `<span class="${c} px-2.5 py-1 rounded-lg border">${esc(w)}</span>`;
    document.getElementById('prog-dominadas').innerHTML = dominadas.length
        ? dominadas.map(w => chip(w, 'bg-emerald-900/40 border-emerald-600/50 text-emerald-200')).join('')
        : '<span class="text-xs text-slate-500">Aún ninguna. Una palabra está dominada cuando se dice bien 2 de las 3 últimas veces.</span>';
    document.getElementById('prog-cuestan').innerHTML = cuestan.length
        ? cuestan.map(w => chip(w, 'bg-amber-900/30 border-amber-600/50 text-amber-200')).join('')
        : '<span class="text-xs text-slate-500">¡Ninguna por ahora!</span>';

    // Últimos intentos
    const ult = ints.slice(-12).reverse();
    const etiqueta = { perfecto: '🌟 Perfecto', casi: '👏 Casi', otra: '💪 Otra vez', bien: '👍 Bien (adulto)', practicar: '🔁 Practicar (adulto)' };
    document.getElementById('prog-ultimos').innerHTML = ult.length ? `<table class="w-full text-left">
        <thead class="text-slate-400"><tr><th class="py-1 pr-2">Fecha</th><th class="pr-2">Palabra</th><th class="pr-2 hidden sm:table-cell">Modo</th><th class="pr-2">Ha dicho</th><th>Resultado</th></tr></thead>
        <tbody>${ult.map(i => `<tr class="border-t border-slate-800"><td class="py-1 pr-2 whitespace-nowrap text-slate-400">${esc(fmtFecha(i.t))}</td><td class="pr-2 text-white">${esc(i.palabra)}</td><td class="pr-2 hidden sm:table-cell">${i.modo === 'frase' ? 'Frase' : 'Palabra'}</td><td class="pr-2 text-slate-300">${esc(i.oido || '—')}</td><td class="whitespace-nowrap">${etiqueta[i.resultado] || esc(i.resultado)}</td></tr>`).join('')}</tbody></table>`
        : '<span class="text-slate-500">Sin intentos todavía.</span>';

    renderGrabaciones();
}

function renderGrafico() {
    const cont = document.getElementById('prog-grafico');
    if (!cont) return;
    const ints = hablaData.intentos;
    if (!ints.length) { cont.innerHTML = '<div class="text-xs text-slate-500 py-6 text-center">Aquí aparecerá una barra por cada día de práctica.</div>'; return; }
    const fn = agrupacionProgreso === 'semana' ? claveSemana : claveDia;
    const grupos = {};
    ints.forEach(i => { const k = fn(i.t); (grupos[k] = grupos[k] || { n: 0, ok: 0 }); grupos[k].n++; if (esAcierto(i.resultado)) grupos[k].ok++; });
    const claves = Object.keys(grupos).sort().slice(-14);
    cont.innerHTML = `<div class="flex items-end gap-1.5 h-40 border-b border-slate-700 pb-0">${claves.map(k => {
        const g = grupos[k]; const p = Math.round(g.ok / g.n * 100);
        const color = p >= 70 ? 'bg-emerald-500' : p >= 40 ? 'bg-amber-400' : 'bg-rose-400';
        return `<div class="bar-col h-full" title="${etiquetaFecha(k)}: ${p}% de ${g.n} intentos">
            <div class="text-[10px] text-slate-300 mb-0.5">${p}%</div>
            <div class="${color} w-full max-w-[36px] rounded-t-md" style="height:${Math.max(p, 3)}%"></div></div>`;
    }).join('')}</div>
    <div class="flex gap-1.5 mt-1">${claves.map(k => `<div class="bar-col text-[10px] text-slate-400 text-center leading-tight">${agrupacionProgreso === 'semana' ? 'sem. ' : ''}${etiquetaFecha(k)}<br><span class="text-slate-500">${grupos[k].n} int.</span></div>`).join('')}</div>`;
}

let _grabacionesCache = {};
async function renderGrabaciones() {
    const cont = document.getElementById('prog-grabaciones');
    if (!cont) return;
    let todas = [];
    try { todas = await audioAll(); }
    catch (e) { cont.innerHTML = '<span class="text-xs text-slate-500">Este navegador no permite guardar grabaciones.</span>'; return; }
    _grabacionesCache = {};
    todas.forEach(r => { _grabacionesCache[r.id] = r; });
    const porPalabra = {};
    todas.forEach(r => { (porPalabra[r.word] = porPalabra[r.word] || []).push(r); });
    const palabras = Object.keys(porPalabra).sort((a, b) => a.localeCompare(b, 'es'));
    if (!palabras.length) { cont.innerHTML = '<span class="text-xs text-slate-500">Todavía no hay grabaciones guardadas.</span>'; return; }
    const resultadoDe = id => { const i = hablaData.intentos.find(x => x.audioId === id); return i ? (esAcierto(i.resultado) ? '✅' : i.resultado === 'casi' ? '🟡' : '🔁') : ''; };
    cont.innerHTML = palabras.map(w => {
        const lista = porPalabra[w].sort((a, b) => a.t - b.t);
        const primera = lista[0], ultima = lista[lista.length - 1];
        const btn = (r, txt) => `<button onclick="reproducirGrabacion('${r.id}')" class="bg-stadium-800 hover:bg-slate-700 border border-slate-700 text-slate-200 text-xs px-3 py-1.5 rounded-lg whitespace-nowrap"><i class="fa-solid fa-play text-sky-400 mr-1"></i>${txt} <span class="text-slate-400">${esc(fmtFecha(r.t))}</span> ${resultadoDe(r.id)}</button>`;
        return `<div class="flex flex-wrap items-center gap-2 border-t border-slate-800 pt-2">
            <span class="font-bold text-white min-w-[8rem]">${esc(w)}</span>
            ${btn(primera, 'Primera')}
            ${lista.length > 1 ? btn(ultima, 'Última') : '<span class="text-[11px] text-slate-500">(solo una grabación)</span>'}
        </div>`;
    }).join('');
}
function reproducirGrabacion(id) {
    const r = _grabacionesCache[id];
    if (!r) return;
    reproducirBlob(new Blob([r.data], { type: r.type || 'audio/webm' }));
}

function setSoloManual(v) {
    hablaData.soloManual = !!v;
    guardarHabla();
    actualizarAvisoSoporte();
}

function descargar(nombre, contenido, tipo) {
    const url = URL.createObjectURL(new Blob([contenido], { type: tipo }));
    const a = document.createElement('a');
    a.href = url; a.download = nombre;
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 2000);
}
function exportarProgreso(formato) {
    const nombre = (gameState && gameState.name ? gameState.name : 'alumno').replace(/[^\p{L}\p{N}_-]+/gu, '_');
    const fecha = claveDia(Date.now());
    if (formato === 'json') {
        const stats = estadisticasPorPalabra();
        const datos = {
            exportado: new Date().toISOString(),
            alumno: gameState ? { nombre: gameState.name, edad: gameState.age, pais: gameState.country, nivel: gameState.level, xp: gameState.xp, testsDeNivel: gameState.pruebas || [] } : null,
            resumen: Object.fromEntries(Object.entries(stats).map(([w, s]) => [w, { intentos: s.total, aciertos: s.aciertos, dominada: s.dominada, cuesta: s.cuesta }])),
            intentos: hablaData.intentos.map(i => ({ fecha: new Date(i.t).toISOString(), palabra: i.palabra, categoria: i.categoria, modo: i.modo, metodo: i.metodo, oido: i.oido, alternativas: i.alternativas, puntuacion: i.score, resultado: i.resultado, grabacion: !!i.audioId }))
        };
        descargar(`progreso-habla-${nombre}-${fecha}.json`, JSON.stringify(datos, null, 2), 'application/json');
    } else {
        const q = v => '"' + String(v == null ? '' : v).replace(/"/g, '""') + '"';
        const filas = [['fecha', 'hora', 'palabra', 'categoria', 'modo', 'valorado_por', 'lo_que_se_oyo', 'puntuacion', 'resultado', 'grabacion']];
        hablaData.intentos.forEach(i => {
            const d = new Date(i.t);
            filas.push([d.toLocaleDateString('es-ES'), d.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' }), i.palabra, i.categoria, i.modo, i.metodo === 'adulto' ? 'adulto' : 'automatico', i.oido, i.score, i.resultado, i.audioId ? 'si' : 'no']);
        });
        descargar(`progreso-habla-${nombre}-${fecha}.csv`, '\ufeff' + filas.map(f => f.map(q).join(';')).join('\r\n'), 'text/csv;charset=utf-8');
    }
}
async function borrarGrabaciones() {
    if (!confirm('¿Borrar todas las grabaciones de voz de este dispositivo? El historial de intentos se mantiene.')) return;
    try { await audioClear(); } catch (e) { console.warn(e); }
    hablaData.intentos.forEach(i => { i.audioId = null; });
    guardarHabla();
    renderProgresoHabla();
}
async function borrarHistorialHabla() {
    const conClave = typeof syncMeta !== 'undefined' && syncMeta.conectado;
    const pregunta = conClave
        ? '¿Borrar TODO el progreso al hablar?\n\nSe borrarán los intentos guardados con tu clave (también en tu otro dispositivo) y las grabaciones de este dispositivo.'
        : '¿Borrar TODO el progreso al hablar (intentos y grabaciones) de este dispositivo?';
    if (!confirm(pregunta)) return;
    try { await audioClear(); } catch (e) { console.warn(e); }
    const soloManual = hablaData.soloManual;
    hablaData = hablaDatosVacios();
    hablaData.soloManual = soloManual;
    guardarHabla();
    if (typeof syncHistorialBorrado === 'function') syncHistorialBorrado();
    renderProgresoHabla();
}
