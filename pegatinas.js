/* =========================================================================
   Pegatinas · Me gusta hablar Alto y claro
   - 19 pegatinas originales (SVG dibujado aquí, sin imágenes externas), redondas,
     pensadas para imprimir a 5 cm.
   - Las consigue el servidor a partir de las puntuaciones sincronizadas (api/_lib/pegatinas.js).
     Aquí solo se dibujan, se enseñan en el álbum del niño y el profe ve cuáles tiene que entregar.
   - En el servidor solo se guarda: niño, id de pegatina, fecha, entregada sí/no y los números del motivo.
   ========================================================================= */
const PEGATINAS_KEY = 'ligaHablaPegatinas';
const PEG_CATEGORIAS = ['Animales', 'Casa', 'Cocina', 'Colegio', 'Comida', 'Fútbol', 'Higiene', 'Naturaleza', 'Ropa', 'Transporte'];
const PEG_NIVELES = ['Super Principiante', 'Nivel 1', 'Nivel 2', 'Nivel 3'];
const pegN = (nums, i, def = 0) => (Array.isArray(nums) && Number.isFinite(Number(nums[i])) ? Number(nums[i]) : def);

// c1 = fondo, c2 = aro y detalles. dibujo = contenido SVG en un lienzo de 100×100 (centro 50,46).
const PEGATINAS = [
    { id: 'hola', nombre: '¡Hola!', etiqueta: 'HOLA', c1: '#fde68a', c2: '#f59e0b', como: 'Di bien 3 frases de «Llegar a clase».',
      razon: n => `Ha saludado bien al llegar al cole (${pegN(n, 0)} frases de saludo).`,
      dibujo: `<path d="M24 26h52a8 8 0 0 1 8 8v20a8 8 0 0 1-8 8H46l-12 10v-10H24a8 8 0 0 1-8-8V34a8 8 0 0 1 8-8z" fill="#fff" stroke="#b45309" stroke-width="3"/><text x="50" y="51" text-anchor="middle" font-size="17" font-weight="900" fill="#b45309">¡Hola!</text>` },
    { id: 'companero', nombre: 'Buen compañero', etiqueta: 'COMPAÑERO', c1: '#bbf7d0', c2: '#16a34a', como: 'Di bien 4 frases de «Con un compañero».',
      razon: n => `Sabe pedir cosas a un compañero (${pegN(n, 0)} frases).`,
      dibujo: `<circle cx="36" cy="44" r="15" fill="#fff" stroke="#15803d" stroke-width="3"/><circle cx="64" cy="44" r="15" fill="#fff" stroke="#15803d" stroke-width="3"/><circle cx="31" cy="41" r="2" fill="#15803d"/><circle cx="41" cy="41" r="2" fill="#15803d"/><circle cx="59" cy="41" r="2" fill="#15803d"/><circle cx="69" cy="41" r="2" fill="#15803d"/><path d="M30 48q6 6 12 0M58 48q6 6 12 0" fill="none" stroke="#15803d" stroke-width="2.5" stroke-linecap="round"/>` },
    { id: 'profe', nombre: 'Pregunto al profe', etiqueta: 'PREGUNTO', c1: '#bfdbfe', c2: '#2563eb', como: 'Di bien 4 frases de «Con el profe».',
      razon: n => `Sabe pedir y preguntar al profe (${pegN(n, 0)} frases).`,
      dibujo: `<circle cx="44" cy="50" r="14" fill="#fff" stroke="#1d4ed8" stroke-width="3"/><path d="M56 44l10-20" stroke="#1d4ed8" stroke-width="6" stroke-linecap="round"/><circle cx="67" cy="21" r="6" fill="#fff" stroke="#1d4ed8" stroke-width="3"/><circle cx="40" cy="48" r="2" fill="#1d4ed8"/><circle cx="48" cy="48" r="2" fill="#1d4ed8"/><path d="M39 55q5 4 10 0" fill="none" stroke="#1d4ed8" stroke-width="2.5" stroke-linecap="round"/><text x="25" y="34" font-size="16" font-weight="900" fill="#1d4ed8">?</text>` },
    { id: 'patio10', nombre: 'Rey del patio', etiqueta: 'PATIO', c1: '#fecaca', c2: '#dc2626', como: 'Di bien 10 frases de «En el patio».',
      razon: n => `Sabe jugar y hablar en el patio (${pegN(n, 0)} frases).`,
      dibujo: `<circle cx="50" cy="46" r="21" fill="#fff" stroke="#991b1b" stroke-width="3"/><path d="M50 36l9 6-3 10H44l-3-10z" fill="#991b1b"/><path d="M50 36v-11M59 42l10-4M56 52l6 9M44 52l-6 9M41 42l-10-4" stroke="#991b1b" stroke-width="2.5"/>` },
    { id: 'gracias', nombre: 'Muchas gracias', etiqueta: 'GRACIAS', c1: '#fbcfe8', c2: '#db2777', como: 'Di bien 3 frases de «Dar las gracias».',
      razon: n => `Da las gracias con educación (${pegN(n, 0)} frases).`,
      dibujo: `<path d="M50 68C26 52 22 40 28 31c6-8 17-7 22 2 5-9 16-10 22-2 6 9 2 21-22 37z" fill="#fff" stroke="#be185d" stroke-width="3.5" stroke-linejoin="round"/><path d="M36 38q3-5 8-4" fill="none" stroke="#f9a8d4" stroke-width="3" stroke-linecap="round"/>` },
    { id: 'adios', nombre: '¡Hasta mañana!', etiqueta: 'ADIÓS', c1: '#ddd6fe', c2: '#7c3aed', como: 'Di bien 3 frases de «Despedirse».',
      razon: n => `Sabe despedirse (${pegN(n, 0)} frases).`,
      dibujo: `<path d="M30 52V36a4 4 0 0 1 8 0v12V28a4 4 0 0 1 8 0v20V26a4 4 0 0 1 8 0v22V30a4 4 0 0 1 8 0v26c0 10-7 16-16 16s-14-5-17-11l-6-10a4 4 0 0 1 7-4z" fill="#fff" stroke="#6d28d9" stroke-width="3" stroke-linejoin="round"/><path d="M72 28q5 4 5 10M76 22q8 6 8 16" fill="none" stroke="#6d28d9" stroke-width="2.5" stroke-linecap="round"/>` },
    { id: 'dialogo', nombre: 'Gran conversador', etiqueta: 'DIÁLOGOS', c1: '#a5f3fc', c2: '#0891b2', como: 'Termina bien 3 diálogos distintos.',
      razon: n => `Ha completado bien ${pegN(n, 0)} diálogos (con el profe o con un compañero).`,
      dibujo: `<path d="M18 24h38a6 6 0 0 1 6 6v14a6 6 0 0 1-6 6H32l-9 8v-8h-5a6 6 0 0 1-6-6V30a6 6 0 0 1 6-6z" fill="#fff" stroke="#0e7490" stroke-width="3"/><path d="M82 40H50a6 6 0 0 0-6 6v12a6 6 0 0 0 6 6h18l9 8v-8h5a6 6 0 0 0 6-6V46a6 6 0 0 0-6-6z" fill="#cffafe" stroke="#0e7490" stroke-width="3"/><circle cx="28" cy="37" r="2.5" fill="#0e7490"/><circle cx="37" cy="37" r="2.5" fill="#0e7490"/><circle cx="46" cy="37" r="2.5" fill="#0e7490"/>` },
    { id: 'dirias', nombre: '¡Sé qué decir!', etiqueta: 'QUÉ DIRÍAS', c1: '#fef08a', c2: '#ca8a04', como: 'Acierta 10 preguntas distintas de «¿Qué dirías si…?».',
      razon: n => `Sabe qué decir en ${pegN(n, 0)} situaciones del cole.`,
      dibujo: `<path d="M50 20a17 17 0 0 0-10 31v7h20v-7a17 17 0 0 0-10-31z" fill="#fff" stroke="#a16207" stroke-width="3"/><rect x="41" y="60" width="18" height="5" rx="2" fill="#a16207"/><rect x="44" y="67" width="12" height="4" rx="2" fill="#a16207"/><path d="M50 58V44l-5-5M50 44l5-5" fill="none" stroke="#a16207" stroke-width="2.5"/><path d="M24 26l-6-4M76 26l6-4M22 42h-7M78 42h7" stroke="#a16207" stroke-width="3" stroke-linecap="round"/>` },
    { id: 'lector', nombre: 'Primera lectura', etiqueta: 'LECTOR', c1: '#fed7aa', c2: '#ea580c', como: 'Lee un cuento entero en voz alta.',
      razon: n => `Ha leído su primer cuento entero (${pegN(n, 0)} palabras por minuto, ${pegN(n, 1)} % leído).`,
      dibujo: `<path d="M50 30c-8-6-20-7-30-4v38c10-3 22-2 30 4 8-6 20-7 30-4V26c-10-3-22-2-30 4z" fill="#fff" stroke="#c2410c" stroke-width="3" stroke-linejoin="round"/><path d="M50 30v38" stroke="#c2410c" stroke-width="3"/><path d="M27 36q9-2 17 2M27 44q9-2 17 2M56 38q8-4 17-2M56 46q8-4 17-2" fill="none" stroke="#fdba74" stroke-width="2.5" stroke-linecap="round"/>` },
    { id: 'fluidez', nombre: 'Leo más rápido', etiqueta: 'FLUIDEZ', c1: '#fca5a5', c2: '#b91c1c', como: 'Vuelve a leer un cuento y léelo más rápido que la primera vez.',
      razon: n => `Ha mejorado su lectura: de ${pegN(n, 0)} a ${pegN(n, 1)} palabras por minuto.`,
      dibujo: `<path d="M58 20c10 2 16 8 18 18L56 58l-14-14z" fill="#fff" stroke="#991b1b" stroke-width="3" stroke-linejoin="round"/><circle cx="62" cy="36" r="5" fill="#fca5a5" stroke="#991b1b" stroke-width="2.5"/><path d="M44 42l-10 2-6 8 12 2M58 56l-2 10-8 6-2-12" fill="#fff" stroke="#991b1b" stroke-width="3" stroke-linejoin="round"/><path d="M38 62l-14 14M30 56l-8 8M44 68l-8 8" stroke="#991b1b" stroke-width="3" stroke-linecap="round"/>` },
    { id: 'precision', nombre: 'Lectura precisa', etiqueta: 'PRECISIÓN', c1: '#bbf7d0', c2: '#059669', como: 'Lee 3 cuentos casi sin fallos (95 % o más).',
      razon: n => `Ha leído ${pegN(n, 0)} cuentos con 95 % de precisión o más.`,
      dibujo: `<circle cx="50" cy="46" r="23" fill="#fff" stroke="#047857" stroke-width="3"/><circle cx="50" cy="46" r="15" fill="#a7f3d0" stroke="#047857" stroke-width="3"/><circle cx="50" cy="46" r="6" fill="#047857"/><path d="M50 46l24-20M68 24l8 2-2-8" fill="none" stroke="#047857" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round"/>` },
    { id: 'comprension', nombre: 'Lo he entendido', etiqueta: 'ENTIENDO', c1: '#c7d2fe', c2: '#4f46e5', como: 'Acierta todas las preguntas de un cuento.',
      razon: n => `Ha entendido un cuento: ${pegN(n, 0)} de ${pegN(n, 0)} preguntas bien.`,
      dibujo: `<circle cx="45" cy="42" r="17" fill="#fff" stroke="#4338ca" stroke-width="4"/><path d="M57 54l14 14" stroke="#4338ca" stroke-width="7" stroke-linecap="round"/><path d="M37 42l6 6 10-11" fill="none" stroke="#16a34a" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/>` },
    { id: 'nivel', nombre: '¡Subo de nivel!', etiqueta: 'NIVEL', c1: '#fde68a', c2: '#d97706', como: 'Repite el test de nivel y sube de nivel.',
      razon: n => `Ha subido de nivel en el test: de ${PEG_NIVELES[pegN(n, 0)] || pegN(n, 0)} a ${PEG_NIVELES[pegN(n, 1)] || pegN(n, 1)}.`,
      dibujo: `<path d="M20 68h16V56h14V44h14V32h16v36z" fill="#fff" stroke="#b45309" stroke-width="3" stroke-linejoin="round"/><path d="M26 46l18-18M44 28h-10M44 28v10" fill="none" stroke="#b45309" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/><path d="M72 18l2 5 5 1-4 3 1 5-4-3-5 3 1-5-4-3 5-1z" fill="#b45309"/>` },
    { id: 'racha3', nombre: '3 días seguidos', etiqueta: 'CONSTANCIA', c1: '#fdba74', c2: '#c2410c', como: 'Practica 3 días seguidos.',
      razon: n => `Ha practicado ${pegN(n, 0)} días seguidos.`,
      dibujo: `<path d="M50 72c-14 0-22-9-22-20 0-12 10-18 12-30 6 5 8 10 8 16 3-3 4-7 4-11 10 7 20 16 20 27 0 11-8 18-22 18z" fill="#fff" stroke="#c2410c" stroke-width="3" stroke-linejoin="round"/><text x="50" y="64" text-anchor="middle" font-size="24" font-weight="900" fill="#c2410c">3</text>` },
    { id: 'racha7', nombre: 'Una semana entera', etiqueta: 'SEMANA', c1: '#fecdd3', c2: '#e11d48', como: 'Practica 7 días seguidos.',
      razon: n => `Ha practicado ${pegN(n, 0)} días seguidos (¡una semana!).`,
      dibujo: `<rect x="24" y="26" width="52" height="44" rx="6" fill="#fff" stroke="#be123c" stroke-width="3"/><rect x="24" y="26" width="52" height="12" rx="6" fill="#be123c"/><path d="M36 20v10M64 20v10" stroke="#be123c" stroke-width="4" stroke-linecap="round"/><text x="50" y="64" text-anchor="middle" font-size="24" font-weight="900" fill="#be123c">7</text>` },
    { id: 'vocab', nombre: 'Experto en palabras', etiqueta: 'VOCABULARIO', c1: '#d9f99d', c2: '#65a30d', como: 'Di bien 5 palabras distintas de un mismo tema.',
      razon: n => `Ha dicho bien ${pegN(n, 0)} palabras de ${PEG_CATEGORIAS[pegN(n, 1, -1)] || 'un tema'}.`,
      dibujo: `<rect x="22" y="40" width="22" height="22" rx="4" fill="#fff" stroke="#4d7c0f" stroke-width="3"/><rect x="56" y="40" width="22" height="22" rx="4" fill="#fff" stroke="#4d7c0f" stroke-width="3"/><rect x="39" y="18" width="22" height="22" rx="4" fill="#ecfccb" stroke="#4d7c0f" stroke-width="3"/><text x="33" y="57" text-anchor="middle" font-size="15" font-weight="900" fill="#4d7c0f">A</text><text x="50" y="35" text-anchor="middle" font-size="15" font-weight="900" fill="#4d7c0f">B</text><text x="67" y="57" text-anchor="middle" font-size="15" font-weight="900" fill="#4d7c0f">C</text>` },
    { id: 'palabras25', nombre: '25 palabras', etiqueta: 'PALABRAS', c1: '#99f6e4', c2: '#0d9488', como: 'Di bien 25 palabras distintas.',
      razon: n => `Ya dice bien ${pegN(n, 0)} palabras distintas.`,
      dibujo: `<path d="M22 24h56a7 7 0 0 1 7 7v22a7 7 0 0 1-7 7H50l-14 12V60H22a7 7 0 0 1-7-7V31a7 7 0 0 1 7-7z" fill="#fff" stroke="#0f766e" stroke-width="3"/><text x="50" y="52" text-anchor="middle" font-size="24" font-weight="900" fill="#0f766e">25</text>` },
    { id: 'lector10', nombre: '10 lecturas', etiqueta: 'LECTURAS', c1: '#e9d5ff', c2: '#9333ea', como: 'Lee 10 veces en voz alta.',
      razon: n => `Ha leído en voz alta ${pegN(n, 0)} veces.`,
      dibujo: `<rect x="24" y="58" width="52" height="10" rx="2" fill="#fff" stroke="#7e22ce" stroke-width="3"/><rect x="28" y="46" width="46" height="10" rx="2" fill="#f3e8ff" stroke="#7e22ce" stroke-width="3"/><rect x="26" y="34" width="48" height="10" rx="2" fill="#fff" stroke="#7e22ce" stroke-width="3"/><text x="50" y="30" text-anchor="middle" font-size="18" font-weight="900" fill="#7e22ce">10</text>` },
    { id: 'hablar20', nombre: '¡Alto y claro!', etiqueta: 'ALTO Y CLARO', c1: '#bae6fd', c2: '#0284c7', como: 'Di bien 20 palabras o frases en «Hablar».',
      razon: n => `Ha dicho bien ${pegN(n, 0)} palabras o frases en «Hablar».`,
      dibujo: `<rect x="40" y="18" width="20" height="34" rx="10" fill="#fff" stroke="#0369a1" stroke-width="3"/><path d="M32 42a18 18 0 0 0 36 0" fill="none" stroke="#0369a1" stroke-width="3.5" stroke-linecap="round"/><path d="M50 60v8M40 70h20" stroke="#0369a1" stroke-width="3.5" stroke-linecap="round"/><path d="M24 30q-4 8 0 16M76 30q4 8 0 16" fill="none" stroke="#0369a1" stroke-width="3" stroke-linecap="round"/>` }
];
const pegDe = id => PEGATINAS.find(p => p.id === id);
let _pegSvgN = 0;
// SVG redondo con el mismo estilo para todas: aro de color, borde blanco discontinuo, dibujo y nombre curvado abajo
function pegSVG(id, tam = 120, { bloqueada = false } = {}) {
    const p = pegDe(id); if (!p) return '';
    const k = 'pg' + (++_pegSvgN);
    const filtro = bloqueada ? ' filter="url(#' + k + 'g)" opacity="0.35"' : '';
    return `<svg class="pegatina-svg" data-pegatina="${p.id}" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="${tam}" height="${tam}" role="img" aria-label="Pegatina ${p.nombre}"
        font-family="'Arial Rounded MT Bold','Nunito','Trebuchet MS',Arial,sans-serif">
      <defs>${bloqueada ? `<filter id="${k}g"><feColorMatrix type="saturate" values="0"/></filter>` : ''}
        <path id="${k}a" d="M18 54a32 32 0 0 0 64 0"/></defs>
      <g${filtro}>
        <circle cx="50" cy="50" r="49" fill="${p.c2}"/>
        <circle cx="50" cy="50" r="43" fill="${p.c1}"/>
        <circle cx="50" cy="50" r="46" fill="none" stroke="#fff" stroke-width="1.6" stroke-dasharray="3 2.4"/>
        <g transform="translate(50 42) scale(0.72) translate(-50 -46)">${p.dibujo}</g>
        <text font-size="${p.etiqueta.length > 9 ? 7.2 : 8.5}" font-weight="900" fill="${p.c2}" letter-spacing="0.6" text-anchor="middle"><textPath href="#${k}a" startOffset="50%">${p.etiqueta}</textPath></text>
      </g>
      ${bloqueada ? '<text x="50" y="58" text-anchor="middle" font-size="22">🔒</text>' : ''}
    </svg>`;
}
const pegEsc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const pegFecha = t => new Date(t).toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric' });

/* ---------- Pegatinas del niño (copia local de lo que dice el servidor) ---------- */
function cargarPegatinasLocal() {
    try { const d = JSON.parse(localStorage.getItem(PEGATINAS_KEY)); if (d && Array.isArray(d.lista)) return d; } catch (e) { }
    return { lista: [], vistas: [], rev: 0 };
}
let pegatinasData = typeof localStorage !== 'undefined' ? cargarPegatinasLocal() : { lista: [], vistas: [], rev: 0 };
function guardarPegatinasLocal() { try { localStorage.setItem(PEGATINAS_KEY, JSON.stringify(pegatinasData)); } catch (e) { } }
// Llamado desde sync.js con la respuesta del servidor
function aplicarPegatinasServidor(lista) {
    if (!Array.isArray(lista)) return;
    pegatinasData.lista = lista.filter(x => x && pegDe(x.id)).map(x => ({ id: x.id, t: Number(x.t) || 0, entregada: !!x.entregada, nums: Array.isArray(x.nums) ? x.nums : [] }));
    // En un dispositivo nuevo no se celebran las que ya tenía de antes (solo las recién conseguidas)
    const primeraVez = !pegatinasData.rev, ahora = Date.now();
    pegatinasData.rev = ahora;
    const sinVer = pegatinasData.lista.filter(x => !pegatinasData.vistas.includes(x.id));
    const nuevas = sinVer.filter(x => !primeraVez || x.t > ahora - 6e5);
    sinVer.forEach(x => { if (!nuevas.includes(x)) pegatinasData.vistas.push(x.id); });
    guardarPegatinasLocal();
    actualizarBotonPegatinas();
    if (nuevas.length) celebrarPegatina(nuevas.map(x => x.id));
}
function pegatinasHayQueRevisar() { return !pegatinasData.rev || Date.now() - pegatinasData.rev > 864e5; }
function actualizarBotonPegatinas() {
    const c = document.getElementById('pegatinas-cuenta');
    if (c) c.textContent = pegatinasData.lista.length;
    const b = document.getElementById('pegatinas-btn');
    if (b) b.classList.toggle('hidden', typeof rolActual !== 'undefined' && rolActual === 'profe');
}
// No interrumpimos al niño mientras habla o hace un ejercicio: la celebración espera a que termine
function pegOcupado() {
    try {
        const tab = id => { const el = document.getElementById('tab-' + id); return el && !el.classList.contains('hidden'); };
        if (tab('frases') && typeof frVista !== 'undefined' && ['repetir', 'dirias', 'dialogo'].includes(frVista.modo) && !document.getElementById('fr-dial-fin')) return true;
        if (tab('lectura') && typeof lecSesion !== 'undefined' && lecSesion) return true;
        if (tab('hablar') && typeof hablaSesion !== 'undefined' && hablaSesion) return true;
    } catch (e) { }
    return false;
}
let _pegEnEspera = [], _pegEsperaT = null;
function celebrarPegatina(ids) {
    const box = document.getElementById('pegatina-nueva');
    if (!box) return;
    _pegEnEspera = [...new Set(_pegEnEspera.concat(ids))];
    if (pegOcupado()) { if (!_pegEsperaT) _pegEsperaT = setInterval(() => { if (!pegOcupado()) { clearInterval(_pegEsperaT); _pegEsperaT = null; celebrarPegatina([]); } }, 2000); return; }
    ids = _pegEnEspera; _pegEnEspera = [];
    if (!ids.length) return;
    box.innerHTML = `<div class="bg-stadium-900 border-2 border-amber-400 rounded-3xl p-6 max-w-sm w-full mx-4 text-center">
        <div class="font-game text-2xl text-amber-300 mb-2">🎉 ¡Nueva pegatina!</div>
        <div class="flex flex-wrap justify-center gap-3 mb-3">${ids.map(id => `<div class="pegatina-pop">${pegSVG(id, 130)}<div class="text-sm font-bold text-white mt-1">${pegEsc(pegDe(id).nombre)}</div></div>`).join('')}</div>
        <p class="text-sm text-slate-300 mb-4">Tu profe la verá y te la dará en papel.</p>
        <button id="pegatina-nueva-ok" onclick="cerrarPegatinaNueva()" class="bg-pitch-600 hover:bg-pitch-500 text-white font-bold rounded-xl px-5 py-2">¡Genial!</button></div>`;
    box.dataset.ids = ids.join(',');
    box.classList.remove('hidden');
    try { decir(FRASES_VOZ.pegatina); } catch (e) { }
}
function cerrarPegatinaNueva() {
    const box = document.getElementById('pegatina-nueva');
    (box.dataset.ids || '').split(',').filter(Boolean).forEach(id => { if (!pegatinasData.vistas.includes(id)) pegatinasData.vistas.push(id); });
    guardarPegatinasLocal();
    box.classList.add('hidden');
}
function abrirPegatinas() {
    const m = document.getElementById('pegatinas-modal');
    if (!m) return;
    const tengo = new Map(pegatinasData.lista.map(x => [x.id, x]));
    const conClave = typeof syncMeta !== 'undefined' && syncMeta.conectado;
    document.getElementById('pegatinas-album').innerHTML = `
      <p class="text-sm text-slate-300 mb-3">Tienes <strong class="text-amber-300">${tengo.size}</strong> de ${PEGATINAS.length} pegatinas. ${conClave ? 'Tu profe te dará en papel las que consigas.' : 'Entra con tu clave para conseguir pegatinas.'}</p>
      <div class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
        ${PEGATINAS.map(p => {
        const t = tengo.get(p.id);
        return `<div class="peg-album-item bg-stadium-950 border ${t ? 'border-amber-400/70' : 'border-slate-800'} rounded-2xl p-3 text-center" data-pegatina="${p.id}" data-conseguida="${t ? 1 : 0}">
            ${pegSVG(p.id, 96, { bloqueada: !t })}
            <div class="text-xs font-bold ${t ? 'text-white' : 'text-slate-500'} mt-1">${pegEsc(p.nombre)}</div>
            <div class="text-[11px] ${t ? 'text-amber-200' : 'text-slate-500'}">${t ? (t.entregada ? '✅ Ya la tienes en papel' : '🎁 Conseguida el ' + pegFecha(t.t)) : pegEsc(p.como)}</div></div>`;
    }).join('')}
      </div>`;
    m.classList.remove('hidden');
    pegatinasData.vistas = [...new Set(pegatinasData.vistas.concat([...tengo.keys()]))];
    guardarPegatinasLocal();
}

/* ---------- Panel del profe: pegatinas por entregar ---------- */
let pegProfe = { pendientes: [], entregadas: [] };
function pegBadge(n) {
    const b = document.getElementById('badge-pegatinas');
    if (!b) return;
    b.textContent = n > 99 ? '99+' : String(n);
    b.classList.toggle('hidden', !n);
    const btn = b.closest('button');
    if (btn) btn.title = n ? `Panel del profe · ${n} pegatina(s) por entregar` : 'Panel del profe';
}
async function cargarPegatinasProfe({ aviso = false } = {}) {
    if (typeof llamarAdmin !== 'function') return;
    const r = await llamarAdmin('pegatinas');
    if (r.status !== 200 || !r.datos.ok) { const c = document.getElementById('admin-pegatinas'); if (c) c.innerHTML = `<p class="text-xs text-red-300">${pegEsc(r.datos.mensaje || 'No se pudieron cargar las pegatinas.')}</p>`; return; }
    pegProfe = { pendientes: r.datos.pendientes || [], entregadas: r.datos.entregadas || [] };
    pegBadge(pegProfe.pendientes.length);
    pintarPegatinasProfe();
    if (aviso && pegProfe.pendientes.length) {
        const a = document.getElementById('aviso-pegatinas');
        if (a) {
            a.innerHTML = `🏅 Tienes <strong>${pegProfe.pendientes.length}</strong> pegatina(s) por entregar. <button onclick="abrirPanelPegatinas()" class="underline font-bold">Ver</button> <button onclick="this.parentElement.classList.add('hidden')" class="ml-2 text-amber-200/70" aria-label="Cerrar">✕</button>`;
            a.classList.remove('hidden');
        }
    }
}
function abrirPanelPegatinas() {
    const a = document.getElementById('aviso-pegatinas'); if (a) a.classList.add('hidden');
    if (typeof toggleTeacherModal === 'function') {
        const m = document.getElementById('teacher-modal');
        if (m && m.classList.contains('hidden')) toggleTeacherModal();
    }
    setTimeout(() => { const s = document.getElementById('admin-pegatinas-bloque'); if (s) s.scrollIntoView({ behavior: 'smooth', block: 'start' }); }, 100);
}
function pintarPegatinasProfe() {
    const c = document.getElementById('admin-pegatinas');
    if (!c) return;
    const P = pegProfe.pendientes, E = pegProfe.entregadas;
    c.innerHTML = `
      ${P.length ? `<div class="space-y-2" id="peg-pendientes">${P.map(x => {
        const p = pegDe(x.id); if (!p) return '';
        return `<div class="peg-pendiente flex items-center gap-3 bg-stadium-950 border border-amber-500/40 rounded-xl p-2" data-nino="${pegEsc(x.nino)}" data-pegatina="${x.id}">
            ${pegSVG(x.id, 56)}
            <div class="flex-1 min-w-0"><div class="text-sm font-bold text-white">${pegEsc(x.alias)} · <span class="text-amber-300">${pegEsc(p.nombre)}</span></div>
              <div class="text-[11px] text-slate-300 peg-motivo">${pegEsc(p.razon(x.nums))}</div>
              <div class="text-[10px] text-slate-500">Conseguida el ${pegFecha(x.t)}</div></div>
            <button onclick="entregarPegatina('${pegEsc(x.nino)}','${x.id}')" class="peg-entregar shrink-0 text-[11px] bg-emerald-600 hover:bg-emerald-500 text-white font-bold px-2 py-1.5 rounded-lg">✅ Entregada</button></div>`;
    }).join('')}</div>` : '<p class="text-xs text-slate-400">No hay pegatinas pendientes. ¡Todo entregado!</p>'}
      <div class="flex flex-wrap gap-2 mt-3">
        <button id="peg-imprimir-pend" onclick="imprimirPegatinas('pendientes')" ${P.length ? '' : 'disabled'} class="text-[11px] bg-amber-500 text-stadium-950 font-bold px-2 py-1.5 rounded-lg disabled:opacity-50">🖨️ Imprimir las pendientes (con nombre)</button>
        <button id="peg-imprimir-todas" onclick="imprimirPegatinas('todas')" class="text-[11px] bg-stadium-800 border border-slate-700 text-slate-200 font-bold px-2 py-1.5 rounded-lg">🖨️ Hoja con todas las pegatinas</button>
      </div>
      <details class="mt-3"><summary class="text-xs text-slate-300 cursor-pointer">📜 Historial de entregadas (${E.length})</summary>
        <div class="mt-2 space-y-1" id="peg-historial">${E.length ? E.map(x => { const p = pegDe(x.id); return p ? `<div class="text-[11px] text-slate-400">✅ ${pegFecha(x.entregadaT || x.t)} · <strong class="text-slate-200">${pegEsc(x.alias)}</strong> · ${pegEsc(p.nombre)} — ${pegEsc(p.razon(x.nums))}</div>` : ''; }).join('') : '<div class="text-[11px] text-slate-500">Todavía no se ha entregado ninguna.</div>'}</div></details>`;
}
async function entregarPegatina(nino, pegatina) {
    const r = await llamarAdmin('entregar', { id: nino, pegatina });
    if (r.status !== 200) { if (typeof adminMensaje === 'function') adminMensaje(r.datos.mensaje || 'No se pudo marcar.', 'error'); return; }
    await cargarPegatinasProfe();
    if (typeof adminRefrescar === 'function') adminRefrescar();
}
// Hoja A4 para imprimir: pegatinas de 5 cm en 3 columnas; en «pendientes», con el nombre debajo
function imprimirPegatinas(modo = 'todas', { sinDialogo = false } = {}) {
    const h = document.getElementById('hoja-pegatinas');
    if (!h) return;
    const items = modo === 'pendientes' ? pegProfe.pendientes.filter(x => pegDe(x.id)).map(x => ({ id: x.id, alias: x.alias })) : PEGATINAS.map(p => ({ id: p.id, alias: '' }));
    h.innerHTML = `
      <div class="hoja-barra no-print"><strong>${modo === 'pendientes' ? 'Pegatinas por entregar' : 'Todas las pegatinas'}</strong> · ${items.length} · tamaño real 5 cm. Imprime en A4 al 100 % (sin «ajustar a la página»).
        <button onclick="window.print()">🖨️ Imprimir</button> <button onclick="cerrarHojaPegatinas()">✕ Cerrar</button></div>
      <div class="hoja-rejilla">${items.map(x => `<div class="hoja-item">${pegSVG(x.id, 189)}<div class="hoja-nombre">${pegEsc(x.alias || pegDe(x.id).nombre)}</div></div>`).join('')}</div>`;
    h.dataset.modo = modo;
    h.classList.remove('hidden');
    document.documentElement.classList.add('imprimiendo-pegatinas');
    if (!sinDialogo) setTimeout(() => { try { window.print(); } catch (e) { } }, 300);
}
function cerrarHojaPegatinas() {
    const h = document.getElementById('hoja-pegatinas');
    if (h) { h.classList.add('hidden'); h.innerHTML = ''; }
    document.documentElement.classList.remove('imprimiendo-pegatinas');
}
function crearModalesPegatinas() {
    if (typeof document === 'undefined' || document.getElementById('pegatinas-modal')) return;
    document.body.insertAdjacentHTML('beforeend', `
    <div id="pegatinas-modal" class="modal hidden" style="z-index:105">
      <div class="bg-stadium-900 border border-slate-700 rounded-3xl p-5 max-w-3xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        <div class="flex justify-between items-center mb-3"><h3 class="font-game text-xl text-white">🏅 Mis pegatinas</h3>
          <button onclick="document.getElementById('pegatinas-modal').classList.add('hidden')" class="text-slate-400" aria-label="Cerrar">✕</button></div>
        <div id="pegatinas-album"></div>
      </div>
    </div>
    <div id="pegatina-nueva" class="modal hidden" style="z-index:120"></div>
    <div id="hoja-pegatinas" class="hidden"></div>`);
    actualizarBotonPegatinas();
}
if (typeof window !== 'undefined') window.addEventListener('DOMContentLoaded', crearModalesPegatinas);

if (typeof module !== 'undefined' && module.exports) module.exports = { PEGATINAS, PEG_CATEGORIAS, pegSVG, pegDe };
