// Me gusta hablar Alto y claro · pegatinas (logros)
// Se calculan en el servidor SOLO con las puntuaciones sincronizadas (nunca audio ni transcripciones).
// Cada pegatina conseguida guarda: niño, id de pegatina, fecha, si el profe ya la entregó y unos pocos números
// para explicar el motivo (p. ej. [32, 48] = de 32 a 48 palabras por minuto). El texto se monta en el navegador.

export const PEGATINAS_IDS = [
    'hola', 'companero', 'profe', 'patio10', 'gracias', 'adios', 'dialogo', 'dirias',
    'lector', 'fluidez', 'precision', 'comprension', 'nivel', 'racha3', 'racha7',
    'vocab', 'palabras25', 'lector10', 'hablar20'
];
export const CATEGORIAS_VOCAB = ['Animales', 'Casa', 'Cocina', 'Colegio', 'Comida', 'Fútbol', 'Higiene', 'Naturaleza', 'Ropa', 'Transporte'];

const _fmtDia = new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Madrid', year: 'numeric', month: '2-digit', day: '2-digit' });
export function diaMadrid(t) { return _fmtDia.format(new Date(Number(t))); }
const diaNum = d => Math.round(Date.UTC(+d.slice(0, 4), +d.slice(5, 7) - 1, +d.slice(8, 10)) / 864e5);

// Racha más larga de días seguidos con práctica (hora de Madrid)
export function rachaMaxima(ts) {
    const dias = [...new Set(ts.filter(t => Number(t) > 0).map(t => diaNum(diaMadrid(t))))].sort((a, b) => a - b);
    let max = 0, act = 0;
    dias.forEach((d, i) => { act = i && d === dias[i - 1] + 1 ? act + 1 : 1; if (act > max) max = act; });
    return max;
}

const bienPalabra = i => i && (i.resultado === 'perfecto' || i.resultado === 'bien' || Number(i.score) >= 80);
const okSit = (frases, sit) => new Set(frases.filter(f => f.ok && f.sit === sit && /^f/.test(f.fid || '')).map(f => f.fid)).size;
const autoCompleta = l => l && l.metodo !== 'adulto' && Number(l.compl) >= 90;

// Devuelve { idPegatina: [números del motivo] } con las pegatinas que se cumplen ahora mismo.
export function evaluarPegatinas({ intentos = [], lecturas = [], frases = [], pruebas = [] } = {}) {
    const out = {};
    const porT = (a, b) => Number(a.t) - Number(b.t);
    intentos = intentos.filter(Boolean).slice().sort(porT);
    lecturas = lecturas.filter(Boolean).slice().sort(porT);
    frases = frases.filter(Boolean).slice().sort(porT);

    // Frases cotidianas por situación (frases distintas conseguidas en "Escucha y repite")
    const umbrales = { hola: ['llegar', 3], companero: ['companero', 4], profe: ['profe', 4], patio10: ['patio', 10], gracias: ['gracias', 3], adios: ['adios', 3] };
    for (const [id, [sit, n]] of Object.entries(umbrales)) { const c = okSit(frases, sit); if (c >= n) out[id] = [c]; }
    const dial = new Set(frases.filter(f => f.ok && f.act === 'dialogo').map(f => f.fid)).size;
    if (dial >= 3) out.dialogo = [dial];
    const dir = new Set(frases.filter(f => f.ok && f.act === 'dirias').map(f => f.fid)).size;
    if (dir >= 10) out.dirias = [dir];

    // Lectura
    const primera = lecturas.find(autoCompleta);
    if (primera) out.lector = [Math.round(primera.ppm), Math.round(primera.compl)];
    const primeraPorCuento = {};
    for (const l of lecturas) {
        if (!autoCompleta(l) || !Number(l.ppm)) continue;
        const p = primeraPorCuento[l.cuento];
        if (!p) { primeraPorCuento[l.cuento] = l; continue; }
        const a = Math.round(p.ppm), d = Math.round(l.ppm);
        if (!out.fluidez && d >= a * 1.2 && d - a >= 5) out.fluidez = [a, d, Math.round(l.nivel || 0)];
    }
    const precisas = lecturas.filter(l => autoCompleta(l) && Number(l.prec) >= 95).length;
    if (precisas >= 3) out.precision = [precisas];
    const comp = lecturas.find(l => Number(l.comp) === 100 && Number(l.compN) >= 2);
    if (comp) out.comprension = [Math.round(comp.compN)];
    if (lecturas.length >= 10) out.lector10 = [lecturas.length];

    // Test de nivel repetido con subida
    const subida = (pruebas || []).filter(p => p && p.nivelAntes != null && Number(p.nivel) > Number(p.nivelAntes)).sort(porT)[0];
    if (subida) out.nivel = [Number(subida.nivelAntes), Number(subida.nivel)];

    // Constancia (días seguidos practicando cualquier cosa)
    const racha = rachaMaxima([...intentos, ...lecturas, ...frases].map(x => x.t));
    if (racha >= 3) out.racha3 = [racha];
    if (racha >= 7) out.racha7 = [racha];

    // Vocabulario
    const buenas = intentos.filter(bienPalabra);
    const porCat = {};
    buenas.forEach(i => { (porCat[i.categoria] = porCat[i.categoria] || new Set()).add(i.palabra); });
    let mejor = null;
    for (const [cat, s] of Object.entries(porCat)) {
        const idx = CATEGORIAS_VOCAB.indexOf(cat);
        if (idx >= 0 && s.size >= 5 && (!mejor || s.size > mejor[0])) mejor = [s.size, idx];
    }
    if (mejor) out.vocab = mejor;
    const distintas = new Set(buenas.map(i => i.palabra)).size;
    if (distintas >= 25) out.palabras25 = [distintas];
    if (buenas.length >= 20) out.hablar20 = [buenas.length];
    return out;
}
