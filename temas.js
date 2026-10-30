/* Me gusta hablar Alto y claro · Tema favorito del niño (fútbol, animales…)
   La elección se guarda en el perfil (gameState.tema; es una preferencia, no un dato personal) y se
   sincroniza con la clave. Cambia de verdad la app:
   - Aspecto: colores de acento, dibujos de fondo, mascota y celebraciones (texto y voz grabada).
   - Contenido: las palabras de su categoría salen más a menudo (Identificar, Hablar, «Dime una frase»)
     sin dejar de mezclar las demás, y se recomiendan antes los cuentos de su tema.
   - El test de nivel NO usa el tema (preguntas comparables para todos). */

const TEMAS = {
    mezcla: {
        nombre: 'De todo un poco', emoji: '🌈', cat: null, mascota: '🦉',
        rgb: { 500: '139 92 246', 600: '124 58 237', 700: '109 40 217', 900: '46 16 101' },
        fondo: ['🌈', '⭐', '🎈', '📚'], premio: '¡Bien!',
        descripcion: 'Un poco de todo: palabras de todas las categorías por igual.',
        frases: ['¡Muy bien!', '¡Genial, sigue así!'],
    },
    futbol: {
        nombre: 'Fútbol', emoji: '⚽', cat: 'Fútbol', mascota: '⚽',
        rgb: { 500: '34 197 94', 600: '22 163 74', 700: '21 128 61', 900: '20 83 45' },
        fondo: ['⚽', '🥅', '🏆', '👟'], premio: '¡GOOOL!',
        descripcion: 'Verde de estadio, celebraciones de gol y más palabras y cuentos de fútbol.',
        frases: ['¡Gooool! ¡Muy bien!', '¡Golazo!'],
    },
    animales: {
        nombre: 'Animales', emoji: '🐾', cat: 'Animales', mascota: '🐶',
        rgb: { 500: '245 158 11', 600: '217 119 6', 700: '180 83 9', 900: '120 53 15' },
        fondo: ['🐾', '🐶', '🐱', '🐦'], premio: '¡Guau!',
        descripcion: 'Colores de la selva, una mascota perruna y más palabras y cuentos de animales.',
        frases: ['¡Guau! ¡Muy bien!', '¡Eres un campeón de la selva!'],
    },
    comida: {
        nombre: 'Comida', emoji: '🍓', cat: 'Comida', mascota: '🍓',
        rgb: { 500: '244 63 94', 600: '225 29 72', 700: '190 18 60', 900: '136 19 55' },
        fondo: ['🍓', '🍎', '🥕', '🍌'], premio: '¡Delicioso!',
        descripcion: 'Colores de fresa y más palabras y cuentos de comida.',
        frases: ['¡Delicioso! ¡Muy bien!', '¡Qué rico te ha salido!'],
    },
    naturaleza: {
        nombre: 'Naturaleza', emoji: '🌳', cat: 'Naturaleza', mascota: '🌻',
        rgb: { 500: '20 184 166', 600: '13 148 136', 700: '15 118 110', 900: '19 78 74' },
        fondo: ['🌳', '🌸', '☀️', '🦋'], premio: '¡Precioso!',
        descripcion: 'Colores del bosque y más palabras y cuentos de la naturaleza.',
        frases: ['¡Precioso! ¡Muy bien!', '¡Brillas como el sol!'],
    },
    transporte: {
        nombre: 'Transporte', emoji: '🚂', cat: 'Transporte', mascota: '🚂',
        rgb: { 500: '59 130 246', 600: '37 99 235', 700: '29 78 216', 900: '30 58 138' },
        fondo: ['🚂', '🚲', '🚗', '✈️'], premio: '¡A toda máquina!',
        descripcion: 'Azul de carretera y más palabras y cuentos de coches, trenes y bicis.',
        frases: ['¡A toda máquina! ¡Muy bien!', '¡Pi, pi! ¡Genial!'],
    },
};
// FIN TEMAS
const TEMA_POR_DEFECTO = 'mezcla';

function temaClave(g) { const t = g && g.tema; return Object.prototype.hasOwnProperty.call(TEMAS, t) ? t : TEMA_POR_DEFECTO; }
function temaActual() { return TEMAS[temaClave(typeof gameState !== 'undefined' ? gameState : null)]; }
function temaCelebracion() { const f = temaActual().frases; return f[Math.floor(Math.random() * f.length)]; }

function temaBarajar(a, rnd = Math.random) {
    const r = a.slice();
    for (let i = r.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [r[i], r[j]] = [r[j], r[i]]; }
    return r;
}
// Ordena una lista dando prioridad a la categoría del tema SIN quitar las demás:
// patrón tema, otra, otra, tema, otra, otra… (≈ 1 de cada 3 al principio frente a ≈ 1 de cada 10 al azar)
function ordenConTema(lista, cat, rnd = Math.random) {
    if (!cat) return temaBarajar(lista, rnd);
    const T = temaBarajar(lista.filter(v => v.cat === cat), rnd), O = temaBarajar(lista.filter(v => v.cat !== cat), rnd);
    const r = [];
    while (T.length || O.length) {
        if (T.length) r.push(T.shift());
        for (let k = 0; k < 2 && O.length; k++) r.push(O.shift());
        if (!O.length) { r.push(...T); T.length = 0; }
    }
    return r;
}

/* ---------- Aspecto ---------- */
function temaFondoSVG(emojis) {
    const pos = [[14, 30], [74, 18], [44, 66], [100, 80], [18, 104], [80, 118]];
    const txt = pos.map((p, k) => `<text x="${p[0]}" y="${p[1]}" font-size="22" opacity="0.07" transform="rotate(${k % 2 ? 12 : -10} ${p[0]} ${p[1]})">${emojis[k % emojis.length]}</text>`).join('');
    return `url("data:image/svg+xml;charset=utf-8,${encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" width="128" height="128">${txt}</svg>`)}")`;
}
let temaAplicado = null;
function aplicarTema() {
    if (typeof document === 'undefined') return;
    const clave = temaClave(typeof gameState !== 'undefined' ? gameState : null), t = TEMAS[clave];
    // Si cambia el tema (aquí o en el otro dispositivo, por la sincronización) se reordena el contenido
    if (temaAplicado && temaAplicado !== clave) setTimeout(temaContenidoCambiado, 0);
    temaAplicado = clave;
    const raiz = document.documentElement;
    Object.entries(t.rgb).forEach(([k, v]) => raiz.style.setProperty('--ac-' + k, v));
    raiz.dataset.tema = clave;
    document.body && (document.body.style.backgroundImage = temaFondoSVG(t.fondo));
    const m = document.getElementById('header-mascota'); if (m) m.textContent = t.mascota;
    const b = document.getElementById('tema-btn'); if (b) { b.innerHTML = `<span aria-hidden="true">${t.emoji}</span><span class="hidden sm:inline">${t.nombre}</span>`; b.title = b.ariaLabel = 'Mi tema: ' + t.nombre + ' (cambiar)'; }
    const w = document.getElementById('welcome-tema');
    if (w) w.innerHTML = t.cat ? `${t.emoji} Tu tema: <strong>${t.nombre}</strong>. Verás más palabras y cuentos de ${t.nombre.toLowerCase()}, mezclados con los demás. <button onclick="abrirTemas()" class="underline text-white/80">Cambiar</button>`
        : `${t.emoji} Tu tema: <strong>${t.nombre}</strong>. <button onclick="abrirTemas()" class="underline text-white/80">Elige tu tema favorito</button>`;
    const g = document.getElementById('goal-titulo'); if (g) g.textContent = t.premio;
}
function temaBotonesHTML(sel, accion) {
    return Object.entries(TEMAS).map(([k, t]) => `<button type="button" data-tema="${k}" onclick="${accion}('${k}')"
        class="tema-opcion text-left rounded-2xl border-2 p-3 transition ${k === sel ? 'border-white bg-white/10' : 'border-slate-700 bg-stadium-800 hover:border-slate-500'}"
        style="--c:rgb(${t.rgb[500]})">
        <div class="text-2xl">${t.emoji} <span class="inline-block w-3 h-3 rounded-full align-middle" style="background:rgb(${t.rgb[500]})"></span></div>
        <div class="font-bold text-white text-sm mt-1">${t.nombre}</div>
        <div class="text-[11px] text-slate-400 leading-snug">${t.descripcion}</div></button>`).join('');
}
function abrirTemas() {
    const m = document.getElementById('tema-modal');
    document.getElementById('tema-opciones').innerHTML = temaBotonesHTML(temaClave(gameState), 'elegirTema');
    m.classList.remove('hidden');
}
function cerrarTemas() { document.getElementById('tema-modal').classList.add('hidden'); }
function elegirTema(k) {
    if (!TEMAS[k]) return;
    gameState.tema = k;
    saveState();      // se sincroniza con la clave (sync.js)
    updateHUD();      // aplica el tema y reordena el contenido
    cerrarTemas();
    decir(TEMAS[k].frases[0]);
}
// En la pantalla de bienvenida (antes de crear el perfil)
let temaElegidoSetup = null;
function elegirTemaSetup(k) {
    temaElegidoSetup = k;
    document.getElementById('setup-temas').innerHTML = temaBotonesHTML(k, 'elegirTemaSetup');
}
function temaContenidoCambiado() {
    if (typeof reordenarIdentificar === 'function') reordenarIdentificar();
    if (typeof renderAll === 'function') renderAll();
    if (typeof renderLectura === 'function' && (typeof lecturaOcupada !== 'function' || !lecturaOcupada())) renderLectura();
}

if (typeof updateHUD === 'function') {
    const _updateHUDSinTema = updateHUD;
    updateHUD = function () { _updateHUDSinTema(); aplicarTema(); };
}
if (typeof document !== 'undefined') {
    aplicarTema();
    const st = document.getElementById('setup-temas');
    if (st) st.innerHTML = temaBotonesHTML(null, 'elegirTemaSetup');
}
if (typeof module !== 'undefined' && module.exports) module.exports = { TEMAS, temaClave, ordenConTema, temaBarajar };
