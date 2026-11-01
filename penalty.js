/* Me gusta hablar Alto y claro · Juego de PENALTY
   Antes había solo 2 frases por nivel (y el nivel 0 no tenía ninguna: usaba las 2 del nivel 1) y se recorrían en orden,
   así que salían siempre las mismas dos. Ahora:
   - El banco se arma con lo que ya tiene voz grabada: las palabras del vocabulario (con su categoría), las frases
     de ejemplo de «Hablar» y las frases cotidianas, según el nivel del niño (nivel 0 = palabras sueltas).
   - Se juega con una «bolsa» barajada: no se repite ninguna hasta que salen todas; el tema favorito sale más a
     menudo (ordenConTema) y las últimas que salieron (también tras recargar) van al final de la bolsa nueva.
   - Nunca sale la misma dos veces seguidas. Las opciones incorrectas se eligen al azar entre las del mismo tipo.
   Depende de index.html (visualVocab, gameState, addXP), hablar.js (ejemplosFrase), frases.js (FRASES), temas.js y voz.js. */
const PEN_KEY = 'ligaHablaPenalty';
const PEN_RECIENTES = 12;
const PEN_OPCIONES = 3;
// Frases de fútbol y del cole que ya estaban en el juego (con voz grabada)
const PEN_EXTRA = [
    { es: '¡Pasa la pelota!', n: 1, cat: 'Fútbol' },
    { es: '¿Puedo ir al baño?', n: 1, cat: null },
    { es: 'Me gusta el fútbol.', n: 2, cat: 'Fútbol' },
    { es: '¡Buen partido!', n: 2, cat: 'Fútbol' },
    { es: '¿Cuándo es tu cumpleaños?', n: 3, cat: null },
    { es: '¿Dónde vives?', n: 3, cat: null }
];

function penNivel(n) { n = Math.round(Number(n)); return Number.isFinite(n) ? Math.max(0, Math.min(3, n)) : 1; }
// Banco de preguntas para un nivel. fuentes = { vocab, ejemplos, frases } (inyectable en las pruebas)
function penBanco(nivel, fuentes) {
    const n = penNivel(nivel);
    const vocab = fuentes.vocab || [], ejemplos = fuentes.ejemplos || {}, frases = fuentes.frases || [];
    const catDe = {}; vocab.forEach(v => { catDe[v.es] = v.cat; });
    const out = [], vistos = new Set();
    const meter = (es, tipo, cat) => { const k = String(es).trim(); if (!k || vistos.has(k.toLowerCase())) return; vistos.add(k.toLowerCase()); out.push({ es: k, tipo, cat: cat || null }); };
    const palabras = () => vocab.forEach(v => meter(v.es, 'palabra', v.cat));
    const ejemplosDe = cuantos => Object.entries(ejemplos).forEach(([pal, lista]) => (lista || []).slice(0, cuantos).forEach(f => meter(f, 'frase', catDe[pal])));
    const cotidianas = (min, max) => frases.filter(f => f.n >= min && f.n <= max).forEach(f => meter(f.t, 'frase', null));
    const extra = (min, max) => PEN_EXTRA.filter(f => f.n >= min && f.n <= max).forEach(f => meter(f.es, 'frase', f.cat));
    if (n === 0) palabras();
    else if (n === 1) { palabras(); ejemplosDe(1); cotidianas(1, 1); extra(1, 1); }
    else if (n === 2) { ejemplosDe(3); cotidianas(1, 2); extra(1, 2); }
    else { ejemplosDe(3); cotidianas(2, 3); extra(2, 3); }
    return out;
}
function penBarajar(a, rnd = Math.random) {
    const r = a.slice();
    for (let i = r.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [r[i], r[j]] = [r[j], r[i]]; }
    return r;
}
// Bolsa nueva: barajada (con el tema primero si hay ordenar), lo reciente al final y nunca empieza por la última que salió
function penBolsa(banco, { cat = null, recientes = [], ultima = null, rnd = Math.random, ordenar = null } = {}) {
    let orden = ordenar ? ordenar(banco, cat, rnd) : penBarajar(banco, rnd);
    const rec = new Set(recientes);
    if (rec.size && rec.size < orden.length) orden = orden.filter(q => !rec.has(q.es)).concat(orden.filter(q => rec.has(q.es)));
    if (ultima && orden.length > 1 && orden[0].es === ultima) { const k = 1 + Math.floor(rnd() * (orden.length - 1)); [orden[0], orden[k]] = [orden[k], orden[0]]; }
    return orden;
}
// Opciones: la correcta + incorrectas del mismo tipo (palabra con palabras, frase con frases), barajadas
function penOpciones(q, banco, rnd = Math.random, total = PEN_OPCIONES) {
    const mismo = banco.filter(x => x.es !== q.es && x.tipo === q.tipo);
    const otros = mismo.length >= total - 1 ? mismo : banco.filter(x => x.es !== q.es);
    const malas = penBarajar(otros, rnd).slice(0, total - 1).map(x => x.es);
    return penBarajar([q.es, ...malas], rnd);
}

/* ---------- En la página ---------- */
let penEstado = { clave: '', banco: [], bolsa: [], i: 0, actual: null };
function penCargarRecientes() { try { const d = JSON.parse(localStorage.getItem(PEN_KEY) || '{}'); return Array.isArray(d.r) ? d.r.slice(-PEN_RECIENTES) : []; } catch (e) { return []; } }
function penGuardarReciente(es) {
    const r = penCargarRecientes().filter(x => x !== es); r.push(es);
    try { localStorage.setItem(PEN_KEY, JSON.stringify({ r: r.slice(-PEN_RECIENTES) })); } catch (e) { }
}
function penFuentes() {
    return {
        vocab: typeof visualVocab !== 'undefined' ? visualVocab : [],
        ejemplos: typeof ejemplosFrase !== 'undefined' ? ejemplosFrase : {},
        frases: typeof FRASES !== 'undefined' ? FRASES : []
    };
}
function penCat() { return typeof temaActual === 'function' ? temaActual().cat : null; }
function penPreparar(forzar) {
    const nivel = penNivel(typeof gameState !== 'undefined' ? gameState.level : 1), cat = penCat();
    const clave = nivel + '|' + (cat || '');
    if (forzar || clave !== penEstado.clave || !penEstado.banco.length) {
        penEstado.banco = penBanco(nivel, penFuentes());
        penEstado.clave = clave; penEstado.bolsa = []; penEstado.i = 0;
    }
    if (penEstado.i >= penEstado.bolsa.length) {
        penEstado.bolsa = penBolsa(penEstado.banco, {
            cat, recientes: penCargarRecientes(), ultima: penEstado.actual && penEstado.actual.es,
            ordenar: typeof ordenConTema === 'function' ? ordenConTema : null
        });
        penEstado.i = 0;
    }
}
function penaltyActual() { if (!penEstado.actual) { penPreparar(); penEstado.actual = penEstado.bolsa[penEstado.i]; } return penEstado.actual; }
function renderPenalty() {
    penPreparar();
    // Si cambió el nivel o el tema, la pregunta en pantalla se sustituye; si no, se muestra la de la bolsa
    const q = penEstado.bolsa[penEstado.i];
    if (!q) return;
    penEstado.actual = q;
    penGuardarReciente(q.es);
    document.getElementById('penalty-spanish-text').innerText = q.es;
    document.getElementById('goal-result-box').classList.add('hidden');
    const grid = document.getElementById('penalty-options-grid');
    grid.innerHTML = '';
    grid.dataset.pregunta = q.es;
    penOpciones(q, penEstado.banco).forEach(opt => {
        const b = document.createElement('button');
        b.className = 'bg-stadium-800 hover:bg-pitch-700 text-white font-bold p-3.5 rounded-xl border border-slate-700';
        b.innerText = opt;
        b.onclick = () => {
            if (opt === q.es) {
                grid.querySelectorAll('button').forEach(x => { x.disabled = true; }); // un solo gol por pregunta
                b.classList.add('correct');
                document.getElementById('goal-result-box').classList.remove('hidden');
                addXP(20);
                decir(typeof temaCelebracion === 'function' ? temaCelebracion() : FRASES_VOZ.gol);
            } else {
                b.classList.add('wrong');
                setTimeout(() => b.classList.remove('wrong'), 800);
            }
        };
        grid.appendChild(b);
    });
}
function nextPenalty() { penEstado.i++; renderPenalty(); }
function playCurrentTTS() { const q = penaltyActual(); if (q) speakSpanish(q.es); }

if (typeof module !== 'undefined' && module.exports) {
    module.exports = { PEN_EXTRA, penNivel, penBanco, penBolsa, penOpciones, penBarajar };
}
