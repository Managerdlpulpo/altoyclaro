/* Liga de Habla Soto Alto · Test de nivel adaptativo (comprensión + vocabulario + conversación)
   - Corto (5-8 min como mucho) y se adapta: si el niño falla lo fácil, se salta lo difícil y termina antes.
   - Tres partes: Comprensión (oye y toca la foto), Vocabulario (di qué es) y Conversación
     (preguntas habladas con dificultad creciente y una mini-conversación en la frutería).
   - Puntuación sencilla y explicable (ver puntuarConversacion y calcularResultadoTest).
   - Privacidad: no se pregunta nada personal (nombre, edad, dirección, colegio). No se graba audio.
     Se guardan puntuaciones y resultado por pregunta (gameState.pruebas, se sincroniza con clave).
     Lo que dijo el niño en las respuestas libres se queda SOLO en este dispositivo (ligaHablaTestTextos)
     y nunca se envía al servidor.
   - Sin reconocimiento de voz (o si el adulto lo prefiere): el adulto valora cada respuesta con 3 botones.
   Depende de index.html (gameState, visualVocab, LEVELS, saveState, updateHUD, renderAll, shuffle),
   voz.js (decir, pararVoz, FRASES_VOZ) y hablar.js (SpeechRec, evaluarPalabra, normTexto, esc, hablaData). */

// Frases fijas del test. scripts/generar-audios.py lee este bloque para grabarlas: si añades una, regenera.
const FRASES_TEST = {
    intro: '¡Vamos a jugar un ratito! Escucha y responde. Si no sabes algo, no pasa nada.',
    introComp: 'Escucha y toca la foto correcta.',
    k1: 'Toca el perro.',
    k2: 'Toca la manzana.',
    k3: '¿Dónde duermes por la noche?',
    k4: '¿Con qué te lavas los dientes?',
    k5: 'Toca lo que usamos para beber agua.',
    introVoc: 'Ahora dime qué es cada cosa.',
    queEs: '¿Qué es esto?',
    introConv: '¡Ahora vamos a hablar un poquito!',
    c1: '¡Hola! ¿Qué tal estás?',
    c2: 'Mira esta camiseta. ¿De qué color es?',
    c3: '¿Qué haces tú con una pelota?',
    c4: '¿Qué te gusta comer?',
    c5: 'Mira esta foto. Cuéntame qué ves.',
    c6: '¿Qué hiciste ayer?',
    c7: '¿Qué vas a hacer el fin de semana?',
    introTienda: 'Ahora jugamos a la tienda. Yo soy la frutera.',
    d1: '¡Hola! Bienvenidos a la frutería. ¿Qué quieres comprar?',
    d1si: '¡Claro! ¿Cuántas quieres?',
    d1no: 'Tengo unas manzanas muy ricas. ¿Cuántas quieres?',
    d2si: '¡Perfecto! Son dos euros. ¿Quieres algo más?',
    d2no: 'Te pongo tres, ¿vale? Son dos euros. ¿Quieres algo más?',
    d3si: '¡Gracias a ti! ¡Hasta luego!',
    d3no: '¡Vale! Gracias por venir. ¡Hasta luego!',
    gracias: '¡Gracias!',
    seguimos: '¡Seguimos!',
    noTeOigo: 'No te he oído. ¿Lo dices otra vez?',
    fin: '¡Test terminado! ¡Lo has hecho genial!',
    mejorado: '¡Has mejorado mucho!',
    aJugar: '¡Vamos a jugar!'
};
// FIN FRASES_TEST

const TN_TEXTOS_KEY = 'ligaHablaTestTextos';   // respuestas libres, SOLO en este dispositivo
const TN_MAX_PRUEBAS = 10, TN_MAX_TEXTOS = 3;
const TN_CFG = { rapidoMs: 6000, silencioMs: 2500, maxMin: 8, pesos: { comp: 30, voc: 25, conv: 45 } };
const XP_BASE_NIVEL = { 0: 0, 1: 100, 2: 250, 3: 500 };   // = nextXP del nivel anterior (LEVELS)
const TN_BLOQUES = { comp: 'Comprensión', voc: 'Vocabulario', conv: 'Conversación' };

/* ---------- Preguntas (fijas, para poder comparar un test con el siguiente) ---------- */
const TN_COMP = [
    { id: 'k1', texto: FRASES_TEST.k1, ok: 'el perro', otras: ['el gato', 'la manzana', 'la cama'] },
    { id: 'k2', texto: FRASES_TEST.k2, ok: 'la manzana', otras: ['el plato', 'la pelota', 'la silla'] },
    { id: 'k3', texto: FRASES_TEST.k3, ok: 'la cama', otras: ['la mesa', 'la silla', 'la camiseta'] },
    { id: 'k4', texto: FRASES_TEST.k4, ok: 'el cepillo de dientes', otras: ['el vaso', 'el plato', 'la camiseta'] },
    { id: 'k5', texto: FRASES_TEST.k5, ok: 'el vaso', otras: ['el plato', 'la manzana', 'la silla'] }
];
const TN_VOC = [
    { id: 'v1', es: 'el gato' },
    { id: 'v2', es: 'la pelota', otrasValidas: ['el balón'] },
    { id: 'v3', es: 'la mesa' },
    { id: 'v4', es: 'la camiseta' },
    { id: 'v5', es: 'el cepillo de dientes' }
];
const COLORES = ['rojo', 'roja', 'azul', 'verde', 'amarillo', 'amarilla', 'blanco', 'blanca', 'negro', 'negra', 'gris', 'rosa', 'naranja', 'morado', 'morada', 'marron', 'lila', 'color', 'claro', 'oscuro'];
const COMIDAS = ['manzana', 'manzanas', 'pizza', 'pasta', 'macarrones', 'espaguetis', 'arroz', 'pollo', 'carne', 'pescado', 'fruta', 'frutas', 'platano', 'platanos', 'pan', 'leche', 'chocolate', 'helado', 'helados', 'patatas', 'sopa', 'huevo', 'huevos', 'galletas', 'queso', 'yogur', 'tortilla', 'hamburguesa', 'hamburguesas', 'naranja', 'naranjas', 'fresa', 'fresas', 'uva', 'uvas', 'sandia', 'melon', 'pera', 'peras', 'verdura', 'verduras', 'ensalada', 'lentejas', 'cuscus', 'dulces', 'caramelos', 'tarta', 'pastel', 'bocadillo', 'zumo', 'agua', 'tomate', 'tomates'];
const NUMEROS = ['uno', 'una', 'dos', 'tres', 'cuatro', 'cinco', 'seis', 'siete', 'ocho', 'nueve', 'diez', 'doce', 'veinte', 'kilo', 'kilos', 'medio', 'muchas', 'muchos', 'pocas', 'todas', 'bolsa'];
// nivel = escalón de dificultad (1 fácil … 4 conversación de varios turnos). min = nº de palabras para "respuesta larga".
const TN_CONV = [
    { id: 'c1', nivel: 1, texto: FRASES_TEST.c1, min: 3, claves: ['bien', 'mal', 'genial', 'contento', 'contenta', 'feliz', 'cansado', 'cansada', 'regular', 'gracias', 'triste', 'fenomenal', 'estupendo', 'estupenda', 'super', 'hola', 'tu', 'guay', 'perfecto'] },
    { id: 'c2', nivel: 1, texto: FRASES_TEST.c2, foto: 'la camiseta', min: 3, claves: COLORES },
    { id: 'c3', nivel: 2, texto: FRASES_TEST.c3, foto: 'la pelota', min: 3, claves: ['juego', 'jugar', 'jugamos', 'chuto', 'chutar', 'tiro', 'tirar', 'lanzo', 'lanzar', 'paso', 'pasar', 'gol', 'goles', 'futbol', 'boto', 'botar', 'patada', 'pelota', 'balon', 'cojo', 'coger', 'atrapo', 'baloncesto', 'porteria', 'amigos'] },
    { id: 'c4', nivel: 2, texto: FRASES_TEST.c4, min: 3, claves: COMIDAS.concat(['gusta', 'gustan', 'encanta', 'comer', 'como']) },
    { id: 'c5', nivel: 3, texto: FRASES_TEST.c5, foto: 'el perro', min: 4, largo: 8, continuo: true, claves: ['perro', 'perrito', 'animal', 'ojos', 'orejas', 'pelo', 'cola', 'sentado', 'tumbado', 'hierba', 'campo', 'suelo', 'casa', 'blanco', 'negro', 'marron', 'grande', 'pequeno', 'bonito', 'lengua', 'patas', 'nariz', 'mira', 'mirando', 'jugando', 'contento', 'collar', 'arbol'] },
    { id: 'c6', nivel: 3, texto: FRASES_TEST.c6, min: 3, tiempo: 'pasado', continuo: true, claves: ['ayer', 'parque', 'casa', 'colegio', 'cole', 'futbol', 'amigos', 'amiga', 'amigo', 'tele', 'television', 'abuela', 'abuelo', 'mama', 'papa', 'hermano', 'hermana', 'playa', 'piscina', 'deberes', 'clase', 'tienda', 'calle', 'bici', 'pelota', 'juegos', 'dibujo', 'cena', 'comida', 'nada'] },
    { id: 'c7', nivel: 3, texto: FRASES_TEST.c7, min: 3, tiempo: 'futuro', continuo: true, claves: ['sabado', 'domingo', 'parque', 'playa', 'casa', 'abuela', 'abuelo', 'amigos', 'amiga', 'amigo', 'futbol', 'cine', 'piscina', 'montana', 'campo', 'tienda', 'jugar', 'ver', 'tele', 'pasear', 'visitar', 'comer', 'dormir', 'descansar', 'bici', 'familia', 'mama', 'papa', 'excursion', 'nada'] },
    { id: 'd1', nivel: 4, texto: FRASES_TEST.d1, min: 2, dialogo: true, claves: COMIDAS.concat(['quiero', 'quisiera', 'comprar', 'fruta', 'kilo', 'dame', 'pongame']) },
    { id: 'd2', nivel: 4, min: 2, dialogo: true, claves: NUMEROS, digitos: true },
    { id: 'd3', nivel: 4, min: 2, dialogo: true, permiteNo: true, claves: ['no', 'si', 'gracias', 'nada', 'adios', 'vale', 'ya', 'todo', 'luego', 'tambien', 'mas', 'chao'].concat(COMIDAS) }
];
// Para pasar al siguiente escalón de conversación hace falta este % en el anterior:
const TN_PASAR_ESCALON = { 1: 40, 2: 50, 3: 50 };

/* ---------- Análisis de la respuesta (simple y explicable) ---------- */
// Palabras conservando tildes (para distinguir "jugué" de "juego").
function tnPalabras(s) {
    return String(s || '').toLowerCase().normalize('NFC').replace(/[^\p{L}\p{N}\s]/gu, ' ').split(/\s+/).filter(Boolean);
}
function tnSinTilde(w) { return w.normalize('NFD').replace(/[\u0300-\u036f]/g, ''); }
const VERBOS = new Set(['estoy', 'estas', 'esta', 'estamos', 'estan', 'es', 'soy', 'eres', 'son', 'somos', 'hay', 'tengo', 'tiene', 'tienes', 'tenemos', 'tienen',
    'quiero', 'quiere', 'quieres', 'queremos', 'gusta', 'gustan', 'encanta', 'encantan', 'juego', 'juega', 'juegas', 'juegan', 'como', 'come', 'comes', 'comen', 'bebo', 'bebe',
    'voy', 'vas', 'va', 'vamos', 'van', 'hago', 'hace', 'haces', 'hacen', 'veo', 've', 'ves', 'vemos', 'tiro', 'tira', 'chuto', 'chuta', 'lanzo', 'lanza', 'paso', 'pasa',
    'corro', 'corre', 'corren', 'salto', 'salta', 'duermo', 'duerme', 'miro', 'mira', 'miran', 'puedo', 'puede', 'se', 'sabe', 'pongo', 'pone', 'compro', 'necesito',
    'prefiero', 'ladra', 'vive', 'llevo', 'lleva', 'cojo', 'coge', 'boto', 'bota', 'meto', 'mete', 'dame', 'deme', 'pongame', 'quisiera', 'parece', 'veo', 'creo']);
const PASADO = new Set(['fui', 'fue', 'fuimos', 'fueron', 'fuiste', 'hice', 'hizo', 'hicimos', 'hicieron', 'tuve', 'tuvo', 'tuvimos', 'estuve', 'estuvo', 'estuvimos',
    'vi', 'vio', 'vimos', 'di', 'dio', 'dimos', 'puse', 'pude', 'quise', 'vine', 'vino', 'dije', 'dijo', 'era', 'eras', 'éramos', 'había', 'estaba', 'jugaba', 'comí', 'jugué']);
const NO_VERBO_E_O = new Set(['café', 'bebé', 'qué', 'sé', 'fé', 'pié', 'olé', 'puré', 'chalé', 'dominó', 'yo', 'judo', 'kárate', 'dé', 'té', 'mamá', 'papá', 'allí', 'aquí', 'sí', 'así', 'también']);
const NO_VERBO_IA = new Set(['día', 'días', 'tía', 'tías', 'mía', 'mías', 'sandía', 'sandías', 'policía', 'todavía', 'alegría', 'frutería', 'panadería', 'librería', 'energía', 'lavandería', 'pastelería', 'fantasía', 'lejía', 'geografía', 'guía']);
function tienePasado(ws) {
    for (let i = 0; i < ws.length; i++) {
        const w = ws[i];
        if (PASADO.has(w)) return true;
        if (w.length >= 4 && /[éó]$/.test(w) && !NO_VERBO_E_O.has(w)) return true;          // jugué, comió
        if (w.length >= 5 && /(aste|iste|aron|ieron|ábamos|aban|abas)$/.test(w)) return true;   // jugaste, comieron, jugaban
        if (w.length >= 5 && /aba$/.test(w)) return true;                                      // jugaba
        if (w.length >= 4 && /ía$/.test(w) && !NO_VERBO_IA.has(w)) return true;                // comía
        if (['he', 'ha', 'has', 'hemos', 'han'].includes(w) && ws[i + 1] && /(ado|ido)$/.test(ws[i + 1])) return true; // he jugado
    }
    return false;
}
function tieneFuturo(ws) {
    for (let i = 0; i < ws.length; i++) {
        const w = ws[i];
        if (['voy', 'vas', 'va', 'vamos', 'van'].includes(w) && ws[i + 1] === 'a' && ws[i + 2] && /(ar|er|ir)$/.test(tnSinTilde(ws[i + 2]))) return true; // voy a jugar
        if (w.length >= 4 && /(ré|rás|rá|remos|rán)$/.test(w)) return true;                    // jugaré, iremos
        if (['iré', 'irá', 'iremos'].includes(w)) return true;
    }
    return false;
}
function tieneVerbo(ws) {
    if (ws.some(w => VERBOS.has(tnSinTilde(w)) || VERBOS.has(w))) return true;
    if (ws.some(w => w.length >= 5 && /(ando|iendo|yendo|amos|emos|imos)$/.test(tnSinTilde(w)))) return true; // jugando, comemos
    return tienePasado(ws) || tieneFuturo(ws);
}
const NO_SE = new Set(['no se', 'no lo se', 'no entiendo', 'no', 'nada', 'no se nada', 'ni idea', 'que', 'eh', 'mmm', 'hmm']);

// Criterios (1 punto cada uno). Letras guardadas por pregunta:
//  R = responde · L = respuesta de varias palabras (>= min) · V = frase completa (tiene verbo)
//  K = palabra clave relacionada con la pregunta · Q = rápido (empieza a hablar en <= 6 s)
//  T = usa pasado/futuro (solo en "¿Qué hiciste ayer?" y "¿Qué vas a hacer…?") · X = descripción larga (>= 8 palabras)
function maxConversacion(item, adulto) {
    return 5 + (item.tiempo ? 1 : 0) + (item.largo ? 1 : 0) - (adulto ? 1 : 0); // con el adulto no se mide el tiempo (Q)
}
function puntuarConversacion(item, texto, latMs) {
    const ws = tnPalabras(texto);
    const m = maxConversacion(item, false);
    if (!ws.length) return { p: 0, m, c: '', relevante: false };
    const norm = normTexto(texto);
    if (!item.permiteNo && NO_SE.has(norm)) return { p: 1, m, c: 'R', relevante: false };
    const sin = ws.map(tnSinTilde);
    let c = 'R';
    if (ws.length >= item.min) c += 'L';
    if (tieneVerbo(ws)) c += 'V';
    const relevante = sin.some(w => item.claves.includes(w)) || (item.digitos && /\d/.test(texto));
    if (relevante) c += 'K';
    if (latMs != null && latMs <= TN_CFG.rapidoMs) c += 'Q';
    if (item.tiempo === 'pasado' && tienePasado(ws)) c += 'T';
    if (item.tiempo === 'futuro' && tieneFuturo(ws)) c += 'T';
    if (item.largo && ws.length >= item.largo) c += 'X';
    return { p: c.length, m, c, relevante };
}
// Valoración del adulto (sin reconocimiento): 0 = no responde, 1 = palabras sueltas, 2 = frases.
function puntuarAdulto(item, valor) {
    const m = maxConversacion(item, true);
    if (valor === 2) return { p: m, m, c: 'RLVK' + (item.tiempo ? 'T' : '') + (item.largo ? 'X' : ''), r: 'frases', relevante: true };
    if (valor === 1) return { p: 2, m, c: 'RK', r: 'sueltas', relevante: true };
    return { p: 0, m, c: '', r: 'nr', relevante: false };
}

/* ---------- Resultado: subpuntuaciones, total y nivel ---------- */
// Comprensión = aciertos/5 · Vocabulario = (perfecto 1, casi 0,5)/5 · Conversación = puntos/puntos posibles
// (lo que no se llegó a preguntar cuenta 0). Total = 30% Comprensión + 25% Vocabulario + 45% Conversación.
// Nivel: total >= 70 → 3, >= 45 → 2, >= 20 → 1, si no 0; el 3 exige Conversación >= 55% y el 2 >= 25%.
function calcularResultadoTest(items, adulto) {
    const por = id => items.find(i => i.id === id);
    const comp = Math.round(100 * TN_COMP.reduce((s, q) => s + ((por(q.id) || {}).p || 0), 0) / TN_COMP.length);
    const voc = Math.round(100 * TN_VOC.reduce((s, q) => s + ((por(q.id) || {}).p || 0), 0) / TN_VOC.length);
    let pc = 0, mc = 0;
    TN_CONV.forEach(q => { const r = por(q.id); pc += r ? r.p : 0; mc += r ? r.m : maxConversacion(q, adulto); });
    const conv = Math.round(100 * pc / mc);
    const P = TN_CFG.pesos;
    const total = Math.round((P.comp * comp + P.voc * voc + P.conv * conv) / (P.comp + P.voc + P.conv));
    let nivel = total >= 70 ? 3 : total >= 45 ? 2 : total >= 20 ? 1 : 0;
    if (nivel === 3 && conv < 55) nivel = 2;
    if (nivel === 2 && conv < 25) nivel = 1;
    return { comp, voc, conv, total, nivel };
}
function pctEscalon(items, n) {
    let p = 0, m = 0;
    TN_CONV.filter(q => q.nivel === n).forEach(q => { const r = items.find(i => i.id === q.id); if (r) { p += r.p; m += r.m; } });
    return m ? Math.round(100 * p / m) : 0;
}

/* ---------- Estado del test en curso ---------- */
let tn = null;
const tnDormir = ms => new Promise(r => setTimeout(r, ms));
function tnFoto(es) { return (visualVocab.find(v => v.es === es) || {}).img || ''; }
function tnEl(id) { return document.getElementById(id); }
function tnEsperar() { return new Promise(res => { tn.esperando = res; }); }
function tnResponder(v) { if (tn && tn.esperando) { const f = tn.esperando; tn.esperando = null; f(v); } }
function tnParado() { return !tn || tn.parar; }
function tnTiempoAgotado() { return Date.now() - tn.t0 > TN_CFG.maxMin * 60000; }

function iniciarTestNivel({ repeticion = false } = {}) {
    if (tn && tn.esperando) { tn.parar = true; tnResponder({ parar: true }); }
    const adulto = !SpeechRec || !!(typeof hablaData !== 'undefined' && hablaData.soloManual);
    tn = {
        id: 't' + Date.now().toString(36), t0: Date.now(), repeticion, items: [], textos: {},
        adulto, empezoAdulto: adulto, parar: false, esperando: null, rec: null, finPregunta: 0,
        nivelAntes: repeticion ? gameState.level : null, aviso: adulto && !SpeechRec ? 'Este navegador no reconoce la voz: un adulto valora las respuestas habladas.' : adulto ? 'Valoración por un adulto (sin reconocimiento automático).' : ''
    };
    ['setup-step-profile', 'setup-step-result'].forEach(id => tnEl(id).classList.add('hidden'));
    tnEl('setup-step-test').classList.remove('hidden');
    tnEl('test-options').innerHTML = '';
    tnEl('test-feedback').classList.add('hidden');
    ejecutarTest().catch(e => { console.error('Error en el test de nivel', e); if (tn && !tn.terminado) terminarTest(); });
}
// Repetir el test desde el panel del profe (el perfil ya existe; no se pide otra vez).
function repetirTestNivel() {
    if (!gameState || !gameState.name) return;
    if (!confirm('¿Repetir el test de nivel? Dura unos 5 minutos.\nEl nivel se actualizará con el nuevo resultado (luego puedes cambiarlo a mano). Los puntos (XP) no bajan.')) return;
    const tm = tnEl('teacher-modal'); if (tm && !tm.classList.contains('hidden')) toggleTeacherModal();
    tnEl('setup-modal').classList.remove('hidden');
    iniciarTestNivel({ repeticion: true });
}
function terminarTestAhora() {
    if (!tn || tn.terminado) return;
    if (!confirm('¿Terminar el test ahora? El nivel se calculará con lo hecho hasta aquí.')) return;
    tn.parar = true; tn.incompleto = true;
    if (tn.rec) { try { tn.rec.abort(); } catch (e) { } }
    pararVoz();
    tnResponder({ parar: true });
}

async function ejecutarTest() {
    await tnDecir(FRASES_TEST.intro, { soloTexto: true, titulo: '¡Hola!' });
    await bloqueComprension();
    await bloqueVocabulario();
    await bloqueConversacion();
    terminarTest();
}
// Muestra un mensaje del "profe" de la app y lo dice en voz alta.
async function tnDecir(texto, { titulo = '' } = {}) {
    if (tnParado()) return;
    tn.actual = null;
    pintarPantalla({ bloque: titulo || '', texto, controles: '' });
    await decir(texto);
    await tnDormir(250);
}

/* ---------- Pantalla de una pregunta ---------- */
function pintarPantalla({ bloque, paso, texto, foto, controles, ocultarTexto }) {
    tnEl('test-progress').innerText = bloque ? (paso ? `${bloque} · ${paso}` : bloque) : 'Test';
    tnEl('test-question-area').innerHTML = `
        ${tn && tn.aviso ? `<p class="text-[11px] text-amber-300 bg-amber-500/10 border border-amber-500/30 rounded-lg px-2 py-1 mb-3">${esc(tn.aviso)}</p>` : ''}
        <div class="flex items-start gap-3 mb-3">
            <div class="text-3xl shrink-0">🧑‍🏫</div>
            <div class="bg-stadium-800 border border-slate-700 rounded-2xl rounded-tl-none px-4 py-3 text-white font-bold flex-1">
                <span id="tn-pregunta">${ocultarTexto ? '' : esc(texto)}</span>
                ${texto ? `<button id="tn-repetir" onclick="tnRepetirPregunta()" class="ml-2 text-sky-300 text-sm" title="Escuchar otra vez" aria-label="Escuchar otra vez"><i class="fa-solid fa-volume-high"></i></button>` : ''}
            </div>
        </div>
        ${foto ? `<img src="${esc(tnFoto(foto))}" alt="" class="w-48 h-48 object-cover rounded-2xl mx-auto mb-3 border-2 border-slate-700" onerror="this.style.visibility='hidden'">` : ''}
        <div id="tn-controles">${controles || ''}</div>
        <div id="tn-oido" class="text-center text-sm text-slate-300 mt-3 min-h-[1.25rem]"></div>`;
    tnEl('test-options').innerHTML = controles === '' ? '' : `
        <div class="flex justify-between items-center pt-3 border-t border-slate-800 mt-2">
            <button id="tn-saltar" onclick="tnResponder({ saltar: true })" class="text-xs text-slate-300 bg-stadium-800 border border-slate-700 px-3 py-2 rounded-lg">🤷 No lo sé / Saltar</button>
            <button id="tn-terminar" onclick="terminarTestAhora()" class="text-[11px] text-slate-400 underline">Terminar ahora (adulto)</button>
        </div>`;
    if (tn) tn.textoActual = texto;
}
function tnRepetirPregunta() {
    if (!tn || !tn.textoActual) return;
    decir(tn.textoActual).then(() => { if (tn) tn.finPregunta = Date.now(); });
}
async function tnPreguntar(texto) {
    if (tnParado()) return;
    tn.finPregunta = Date.now() + 60000; // hasta que termine de hablar
    await decir(texto);
    if (tn) tn.finPregunta = Math.min(tn.finPregunta, Date.now());
}
function tnOido(html) { const o = tnEl('tn-oido'); if (o) o.innerHTML = html; }
function tnAnotar(r) { r.l = r.l == null ? undefined : Math.round(r.l / 100) / 10; if (r.l === undefined) delete r.l; tn.items.push(r); }

/* ---------- 1) Comprensión: oye y toca la foto ---------- */
async function bloqueComprension() {
    if (tnParado()) return;
    await tnDecir(FRASES_TEST.introComp, { titulo: TN_BLOQUES.comp });
    let fallosSeguidos = 0;
    for (let i = 0; i < TN_COMP.length; i++) {
        if (tnParado() || tnTiempoAgotado()) return;
        const q = TN_COMP[i];
        tn.actual = q.id;
        const opciones = shuffle([q.ok].concat(q.otras));
        pintarPantalla({
            bloque: TN_BLOQUES.comp, paso: `${i + 1}/${TN_COMP.length}`, texto: q.texto, controles: `
            <div class="grid grid-cols-2 gap-3">${opciones.map(es => `
                <button class="tn-foto bg-stadium-800 border-2 border-slate-700 hover:border-pitch-500 rounded-2xl overflow-hidden aspect-square" data-es="${esc(es)}" aria-label="foto">
                    <img src="${esc(tnFoto(es))}" alt="" class="w-full h-full object-cover" onerror="this.style.visibility='hidden'">
                </button>`).join('')}</div>`
        });
        document.querySelectorAll('.tn-foto').forEach(b => b.onclick = () => { pararVoz(); tnResponder({ es: b.dataset.es, boton: b }); });
        tnPreguntar(q.texto);
        const r = await tnEsperar();
        if (r.parar) return;
        const ok = !r.saltar && r.es === q.ok;
        tnAnotar({ id: q.id, b: 'comp', r: r.saltar ? 'salto' : ok ? 'ok' : 'mal', p: ok ? 1 : 0, m: 1, c: ok ? 'K' : '' });
        if (r.boton) r.boton.classList.add(ok ? 'border-emerald-400' : 'border-slate-500');
        await decir(ok ? FRASES_VOZ.muyBien : FRASES_TEST.seguimos);
        fallosSeguidos = ok ? 0 : fallosSeguidos + 1;
        if (fallosSeguidos >= 2) return; // dos fallos seguidos: pasamos a la siguiente parte
    }
}

/* ---------- 2) Vocabulario: di qué es ---------- */
async function bloqueVocabulario() {
    if (tnParado() || tnTiempoAgotado()) return;
    await tnDecir(FRASES_TEST.introVoc, { titulo: TN_BLOQUES.voc });
    let fallosSeguidos = 0;
    for (let i = 0; i < TN_VOC.length; i++) {
        if (tnParado() || tnTiempoAgotado()) return;
        const q = TN_VOC[i];
        tn.actual = q.id;
        const r = await preguntaHablada({
            bloque: TN_BLOQUES.voc, paso: `${i + 1}/${TN_VOC.length}`, texto: FRASES_TEST.queEs, foto: q.es,
            botonesAdulto: [['Lo dice bien', 2], ['Casi', 1], ['No lo dice', 0]]
        });
        if (r.parar) return;
        let res;
        if (r.adulto != null) res = { r: ['otra', 'casi', 'perfecto'][r.adulto], p: [0, 0.5, 1][r.adulto], c: r.adulto ? 'R' : '' };
        else if (r.saltar || !r.alts.length) res = { r: r.saltar ? 'salto' : 'nr', p: 0, c: '' };
        else {
            const ev = [q].concat((q.otrasValidas || []).map(es => ({ es }))).map(it => evaluarPalabra(r.alts, it))
                .sort((a, b) => b.score - a.score)[0];
            res = { r: ev.resultado, p: ev.resultado === 'perfecto' ? 1 : ev.resultado === 'casi' ? 0.5 : 0, c: 'R' + (r.lat != null && r.lat <= TN_CFG.rapidoMs ? 'Q' : '') };
            tn.textos[q.id] = r.texto;
        }
        tnAnotar({ id: q.id, b: 'voc', r: res.r, p: res.p, m: 1, c: res.c, l: r.lat });
        await decir(res.p >= 1 ? FRASES_VOZ.muyBien : FRASES_TEST.seguimos);
        fallosSeguidos = res.p === 0 ? fallosSeguidos + 1 : 0;
        if (fallosSeguidos >= 2) return;
    }
}

/* ---------- 3) Conversación: preguntas habladas por escalones ---------- */
async function bloqueConversacion() {
    if (tnParado() || tnTiempoAgotado()) return;
    await tnDecir(FRASES_TEST.introConv, { titulo: TN_BLOQUES.conv });
    for (const escalon of [1, 2, 3]) {
        const qs = TN_CONV.filter(q => q.nivel === escalon);
        for (const q of qs) {
            if (tnParado() || tnTiempoAgotado()) return;
            await preguntaConversacion(q, q.texto, `${TN_CONV.indexOf(q) + 1}`);
        }
        if (tnParado()) return;
        if (pctEscalon(tn.items, escalon) < TN_PASAR_ESCALON[escalon]) return; // no sube de dificultad
    }
    // 4) Mini-conversación en la frutería (3 turnos; la frutera contesta según lo que diga el niño)
    if (tnParado() || tnTiempoAgotado()) return;
    await tnDecir(FRASES_TEST.introTienda, { titulo: 'En la frutería' });
    let pregunta = FRASES_TEST.d1;
    const respuestas = { d1: ['d1si', 'd1no'], d2: ['d2si', 'd2no'], d3: ['d3si', 'd3no'] };
    for (const id of ['d1', 'd2', 'd3']) {
        if (tnParado() || tnTiempoAgotado()) return;
        const q = TN_CONV.find(x => x.id === id);
        const res = await preguntaConversacion(q, pregunta, `Turno ${id[1]}/3`, { titulo: 'En la frutería', sinAnimo: true });
        if (!res) return;
        const [si, no] = respuestas[id];
        const sig = FRASES_TEST[res.relevante ? si : no];
        if (id === 'd3') { pintarPantalla({ bloque: 'En la frutería', texto: sig, foto: 'la manzana', controles: '' }); await decir(sig); }
        else pregunta = sig;
    }
}
async function preguntaConversacion(q, texto, paso, { titulo, sinAnimo } = {}) {
    tn.actual = q.id;
    const r = await preguntaHablada({
        bloque: titulo || TN_BLOQUES.conv, paso, texto, foto: q.foto || (q.dialogo ? 'la manzana' : ''),
        continuo: !!q.continuo, maxMs: q.continuo ? 15000 : 8000,
        botonesAdulto: [['No responde', 0], ['Responde con palabras sueltas', 1], ['Responde con frases' + (q.tiempo === 'pasado' ? ' (en pasado)' : q.tiempo === 'futuro' ? ' (en futuro)' : ''), 2]]
    });
    if (r.parar) return null;
    let res;
    if (r.adulto != null) res = puntuarAdulto(q, r.adulto);
    else if (r.saltar) res = { p: 0, m: maxConversacion(q, false), c: '', r: 'salto', relevante: false };
    else {
        res = puntuarConversacion(q, r.texto, r.lat);
        res.r = r.texto ? 'respuesta' : 'nr';
        if (r.texto) tn.textos[q.id] = r.texto;
    }
    tnAnotar({ id: q.id, b: 'conv', r: res.r, p: res.p, m: res.m, c: res.c, l: r.lat });
    if (!sinAnimo) await decir(res.p > 0 ? FRASES_TEST.gracias : FRASES_TEST.seguimos);
    return res;
}

// Pregunta que se contesta hablando: con reconocimiento (micro) o, si no hay, con los botones del adulto.
// Devuelve { alts, texto, lat } | { adulto: 0|1|2 } | { saltar } | { parar }.
async function preguntaHablada(opc) {
    let intentosSinOir = 0;
    pintarPantalla({ bloque: opc.bloque, paso: opc.paso, texto: opc.texto, foto: opc.foto, controles: null });
    pintarControlesHabla(opc);
    tnPreguntar(opc.texto);
    while (true) {
        const a = await tnEsperar();
        if (a.parar || a.saltar || a.adulto != null) return a;
        if (a.cambiarAAdulto) { pintarControlesHabla(opc); continue; }
        if (a.escuchar) {
            if (tn.finPregunta > Date.now()) { pararVoz(); tn.finPregunta = Date.now(); }
            const boton = tnEl('tn-mic');
            if (boton) { boton.disabled = true; boton.innerHTML = '<i class="fa-solid fa-ear-listen mr-2"></i>Te escucho…'; boton.classList.add('animate-pulse'); }
            const o = await escucharTN({ continuo: opc.continuo, maxMs: opc.maxMs || 8000 });
            if (tnParado()) return { parar: true };
            if (o.error && ['not-allowed', 'service-not-allowed', 'network', 'audio-capture', 'language-not-supported', 'no-disponible'].includes(o.error)) {
                tn.adulto = true;
                tn.aviso = o.error === 'not-allowed' || o.error === 'service-not-allowed' ? 'No hay permiso para el micrófono: un adulto valora las respuestas.' : 'El reconocimiento de voz no funciona ahora: un adulto valora las respuestas.';
                pintarPantalla({ bloque: opc.bloque, paso: opc.paso, texto: opc.texto, foto: opc.foto, controles: null });
                pintarControlesHabla(opc);
                continue;
            }
            if (!o.texto) {
                intentosSinOir++;
                if (intentosSinOir >= 2) return { alts: [], texto: '', lat: null };
                tnOido('No te he oído. Toca el micro otra vez.');
                pintarControlesHabla(opc);
                await decir(FRASES_TEST.noTeOigo);
                tn.finPregunta = Date.now();
                continue;
            }
            tnOido(`He oído: «${esc(o.texto)}»`);
            const lat = o.tHabla ? Math.max(0, o.tHabla - tn.finPregunta) : null;
            await tnDormir(600);
            return { alts: o.alts, texto: o.texto, lat };
        }
    }
}
function pintarControlesHabla(opc) {
    const c = tnEl('tn-controles');
    if (!c) return;
    if (tn.adulto) {
        c.innerHTML = `<p class="text-[11px] text-slate-400 text-center mb-2">Adulto: escucha la respuesta y elige.</p>
            <div class="grid gap-2">${opc.botonesAdulto.map(([t, v]) => `<button id="tn-adulto-${v}" onclick="tnResponder({ adulto: ${v} })" class="w-full ${v === 2 ? 'bg-emerald-700 hover:bg-emerald-600' : v === 1 ? 'bg-amber-700 hover:bg-amber-600' : 'bg-stadium-800 hover:bg-slate-700'} text-white font-bold py-3 rounded-xl border border-slate-700 text-sm">${esc(t)}</button>`).join('')}</div>`;
    } else {
        c.innerHTML = `<button id="tn-mic" onclick="tnResponder({ escuchar: true })" class="w-full bg-pitch-600 hover:bg-pitch-500 text-white font-bold py-4 rounded-2xl text-lg"><i class="fa-solid fa-microphone mr-2"></i>Hablar</button>
            <div class="text-center mt-2"><button onclick="tn.adulto = true; tn.aviso = 'Valoración por un adulto.'; tnResponder({ cambiarAAdulto: true })" class="text-[11px] text-slate-400 underline">Prefiero que valore un adulto</button></div>`;
    }
}

// Escucha una vez con el reconocimiento del navegador. No se graba audio.
function escucharTN({ continuo = false, maxMs = 8000 } = {}) {
    return new Promise(resolve => {
        let r;
        try { r = new SpeechRec(); } catch (e) { return resolve({ alts: [], texto: '', tHabla: null, error: 'no-disponible' }); }
        r.lang = 'es-ES'; r.interimResults = false; r.maxAlternatives = 5; r.continuous = !!continuo;
        let tHabla = null, alts = [], partes = [], error = null, hecho = false, silencio = null, tope = null;
        const fin = () => {
            if (hecho) return; hecho = true; clearTimeout(tope); clearTimeout(silencio);
            if (tn) tn.rec = null;
            const texto = (continuo ? partes.join(' ') : (alts[0] || '')).replace(/\s+/g, ' ').trim();
            resolve({ alts: continuo ? (texto ? [texto] : []) : alts, texto, tHabla, error });
        };
        r.onspeechstart = () => { if (tHabla == null) tHabla = Date.now(); };
        r.onresult = e => {
            if (tHabla == null) tHabla = Date.now();
            for (let i = e.resultIndex || 0; i < e.results.length; i++) {
                const res = e.results[i];
                if (continuo) { if (res.isFinal !== false && res[0]) partes.push(res[0].transcript); }
                else alts = Array.from(res).map(a => a.transcript).filter(Boolean);
            }
            if (continuo) { clearTimeout(silencio); silencio = setTimeout(() => { try { r.stop(); } catch (e) { } }, TN_CFG.silencioMs); }
        };
        r.onerror = e => { error = (e && e.error) || 'error'; };
        r.onend = fin;
        tope = setTimeout(() => { try { r.stop(); } catch (e) { } setTimeout(fin, 1500); }, maxMs);
        if (tn) tn.rec = r;
        try { r.start(); } catch (e) { error = 'no-disponible'; fin(); }
    });
}

/* ---------- Final: guardar, nivel, XP y pantallas de resultado ---------- */
function terminarTest() {
    if (!tn || tn.terminado) return;
    tn.terminado = true; tn.parar = true;
    pararVoz();
    if (tn.repeticion && !tn.items.length) { tnEl('setup-modal').classList.add('hidden'); tn = null; return; } // retake cancelado sin respuestas
    const res = calcularResultadoTest(tn.items, tn.adulto);
    const prueba = {
        id: tn.id, t: Date.now(), nivel: res.nivel, nivelAntes: tn.nivelAntes, total: res.total, comp: res.comp, voc: res.voc, conv: res.conv,
        modo: tn.empezoAdulto ? 'adulto' : tn.adulto ? 'mixto' : 'auto', completo: !tn.incompleto && !tnTiempoAgotado(),
        dur: Math.round((Date.now() - tn.t0) / 1000), items: tn.items
    };
    const anterior = (gameState.pruebas || []).slice(-1)[0] || null;
    gameState.pruebas = (gameState.pruebas || []).concat([prueba]).slice(-TN_MAX_PRUEBAS);
    gameState.level = res.nivel;
    gameState.xp = Math.max(gameState.xp || 0, XP_BASE_NIVEL[res.nivel] + (tn.repeticion ? 0 : 10)); // los XP nunca bajan
    guardarTextosTest(tn.id, tn.textos);
    saveState();
    if (typeof updateHUD === 'function') updateHUD();
    mostrarResultadoNino(prueba, anterior);
    tn.prueba = prueba;
}
function guardarTextosTest(id, textos) {
    if (!Object.keys(textos).length) return;
    try {
        const todos = JSON.parse(localStorage.getItem(TN_TEXTOS_KEY) || '{}');
        todos[id] = textos;
        const ids = Object.keys(todos).sort().slice(-TN_MAX_TEXTOS);
        localStorage.setItem(TN_TEXTOS_KEY, JSON.stringify(Object.fromEntries(ids.map(k => [k, todos[k]]))));
    } catch (e) { }
}
function textosTest(id) { try { return (JSON.parse(localStorage.getItem(TN_TEXTOS_KEY) || '{}'))[id] || {}; } catch (e) { return {}; } }
function borrarTextosTest() {
    if (!confirm('¿Borrar de este dispositivo lo que dijo el niño en los tests? Las puntuaciones se mantienen.')) return;
    localStorage.removeItem(TN_TEXTOS_KEY);
    renderHistorialTest();
    const v = tnEl('tn-vista-profe'); if (v && !v.classList.contains('hidden') && tn && tn.prueba) v.innerHTML = htmlResultadoProfe(tn.prueba);
}

function estrellas(pct) { const n = pct >= 70 ? 3 : pct >= 40 ? 2 : 1; return '⭐'.repeat(n) + '<span class="opacity-25">' + '⭐'.repeat(3 - n) + '</span>'; }
function mostrarResultadoNino(p, anterior) {
    tnEl('setup-step-test').classList.add('hidden');
    tnEl('setup-step-result').classList.remove('hidden');
    const mejora = anterior && p.total > anterior.total;
    const fila = (emoji, nombre, pct) => `<div class="flex items-center justify-between bg-stadium-800 rounded-xl px-4 py-2"><span class="text-white font-bold">${emoji} ${nombre}</span><span class="text-xl">${estrellas(pct)}</span></div>`;
    tnEl('result-level-text').innerHTML = `
        <p class="text-lg text-white font-bold mb-1">¡Lo has hecho genial!</p>
        ${mejora ? '<p class="text-emerald-300 font-bold mb-2">📈 ¡Has mejorado!</p>' : ''}
        <p class="mb-3">Tu nivel: <strong class="text-amber-400">${esc(LEVELS[p.nivel].name)}</strong></p>
        <div class="space-y-2 text-left max-w-sm mx-auto mb-4">
            ${fila('👂', 'Escuchar', p.comp)}${fila('🗣️', 'Palabras', p.voc)}${fila('💬', 'Hablar', p.conv)}
        </div>
        <button id="tn-ver-profe" onclick="verResultadoProfe()" class="text-xs bg-stadium-800 border border-slate-700 text-slate-200 px-3 py-2 rounded-lg mb-3">👩‍🏫 Resultados para el profe</button>
        <div id="tn-vista-profe" class="hidden text-left mb-4"></div>`;
    decir([FRASES_TEST.fin].concat(mejora ? [FRASES_TEST.mejorado] : [], [FRASES_TEST.aJugar]));
}
function verResultadoProfe() {
    const v = tnEl('tn-vista-profe');
    const p = (tn && tn.prueba) || (gameState.pruebas || []).slice(-1)[0];
    if (!v || !p) return;
    v.innerHTML = htmlResultadoProfe(p);
    v.classList.toggle('hidden');
}

/* ---------- Vista del profe: subpuntuaciones, qué trabajar, detalle ---------- */
const TN_ETIQUETA = { ok: '✅ Bien', mal: '❌ Falla', perfecto: '✅ Perfecto', casi: '🟡 Casi', otra: '❌ No', respuesta: '💬 Responde', nr: '— No responde', salto: '🤷 Saltada', sueltas: '🟡 Palabras sueltas', frases: '✅ Frases' };
const TN_CRITERIO = { R: 'responde', L: 'varias palabras', V: 'frase con verbo', K: 'relacionada', Q: 'rápido', T: 'pasado/futuro', X: 'descripción larga' };
function tnNombreItem(id) {
    const c = TN_COMP.find(q => q.id === id); if (c) return c.texto;
    const v = TN_VOC.find(q => q.id === id); if (v) return 'Decir: ' + v.es;
    return ({ d1: 'Frutería: ¿Qué quieres comprar?', d2: 'Frutería: ¿Cuántas quieres?', d3: 'Frutería: ¿Quieres algo más?' })[id] || (TN_CONV.find(q => q.id === id) || {}).texto || id;
}
function queTrabajar(p) {
    const it = id => p.items.find(i => i.id === id);
    const conv = p.items.filter(i => i.b === 'conv' && i.r !== 'salto');
    const out = [];
    if (p.comp < 60) out.push('<b>Comprensión</b>: escuchar y señalar. Jugad a «Identificar fotos» y al «Diccionario visual» con el audio.');
    const malVoc = TN_VOC.filter(q => { const r = it(q.id); return !r || r.p < 1; }).map(q => q.es);
    if (p.voc < 60) out.push(`<b>Vocabulario</b>: practicad «Di la palabra»${malVoc.length ? ' con: ' + malVoc.map(esc).join(', ') : ''}.`);
    const respondidas = conv.filter(i => i.p > 0);
    if (respondidas.length && respondidas.filter(i => i.c.includes('V')).length < respondidas.length / 2) out.push('<b>Frases completas</b>: responde con palabras sueltas. Usad «Dime una frase» y modelad frases con verbo («Yo como…», «El perro está…»).');
    if (!conv.length || conv.every(i => i.p === 0)) out.push('<b>Conversación</b>: todavía no responde a preguntas. Empezad con saludos y preguntas de sí/no, con gestos y fotos.');
    const c6 = it('c6'), c7 = it('c7');
    if (c6 && !c6.c.includes('T')) out.push('<b>Pasado</b>: preguntad «¿Qué hiciste…?» cada día y dad el modelo («Ayer jugué…, fui…»).');
    if (c7 && !c7.c.includes('T')) out.push('<b>Futuro</b>: practicad «Voy a + verbo» («Mañana voy a jugar…»).');
    if (!c6 && !c7 && p.conv >= 25) out.push('<b>Pasado y futuro</b>: aún no se ha llegado a estas preguntas; trabajad primero frases en presente.');
    const d = ['d1', 'd2', 'd3'].map(it).filter(Boolean);
    if (p.nivel >= 2 && (!d.length || d.reduce((s, i) => s + i.p, 0) / d.reduce((s, i) => s + i.m, 0) < 0.5)) out.push('<b>Diálogo por turnos</b>: juegos de rol (la tienda, el parque) con 2-3 preguntas seguidas.');
    const auto = conv.filter(i => i.l != null && i.p > 0);
    if (auto.length >= 2 && auto.filter(i => !i.c.includes('Q')).length >= auto.length / 2) out.push('<b>Tiempo de respuesta</b>: tarda en empezar a hablar. Dadle tiempo, repetid la pregunta despacio y con gestos.');
    if (!out.length) out.push('¡Muy buen nivel! Seguid con descripciones más largas, cuentos y conversaciones de varios turnos.');
    return out;
}
function htmlResultadoProfe(p) {
    const lista = gameState.pruebas || [];
    const idx = lista.findIndex(x => x.id === p.id);
    const ant = idx > 0 ? lista[idx - 1] : null;
    const textos = textosTest(p.id);
    const delta = (k) => ant ? (() => { const d = p[k] - ant[k]; return `<span class="${d > 0 ? 'text-emerald-400' : d < 0 ? 'text-rose-400' : 'text-slate-400'} text-[11px] ml-1">${d > 0 ? '+' : ''}${d}</span>`; })() : '';
    const barra = (n, k) => `<div><div class="flex justify-between text-xs"><span class="text-slate-200 font-bold">${n}</span><span class="text-white font-bold">${p[k]}%${delta(k)}</span></div>
        <div class="h-2 bg-stadium-950 rounded-full overflow-hidden mt-1"><div class="h-full ${p[k] >= 70 ? 'bg-emerald-500' : p[k] >= 40 ? 'bg-amber-500' : 'bg-rose-500'}" style="width:${p[k]}%"></div></div></div>`;
    const filas = p.items.map(i => `<tr class="border-t border-slate-800 align-top">
        <td class="py-1 pr-2 text-slate-400">${TN_BLOQUES[i.b] ? TN_BLOQUES[i.b].slice(0, 4) + '.' : ''}</td>
        <td class="pr-2 text-white">${esc(tnNombreItem(i.id))}${textos[i.id] ? `<div class="text-slate-400 italic">«${esc(textos[i.id])}»</div>` : ''}</td>
        <td class="pr-2 whitespace-nowrap">${TN_ETIQUETA[i.r] || esc(i.r)}</td>
        <td class="pr-2 whitespace-nowrap">${i.p}/${i.m}</td>
        <td class="text-slate-400">${i.b === 'conv' ? esc(i.c.split('').map(x => TN_CRITERIO[x]).filter(Boolean).join(', ')) : ''}${i.l != null ? ` <span class="whitespace-nowrap">(${i.l} s)</span>` : ''}</td></tr>`).join('');
    return `<div id="tn-informe" class="bg-stadium-950 border border-slate-800 rounded-2xl p-4 text-xs space-y-3">
        <div class="flex flex-wrap justify-between gap-2">
            <div><div class="text-white font-bold text-sm">Test de nivel · ${esc(fmtFecha(p.t))}</div>
            <div class="text-slate-400">${esc(gameState.name || '')} · Duración ${Math.floor(p.dur / 60)} min ${p.dur % 60} s · ${p.modo === 'auto' ? 'Reconocimiento automático' : p.modo === 'adulto' ? 'Valorado por un adulto' : 'Automático + adulto'}${p.completo ? '' : ' · <span class="text-amber-300">terminado antes</span>'}</div></div>
            <div class="text-right"><div class="text-amber-400 font-bold text-sm">${esc(LEVELS[p.nivel].name)}${p.nivelAntes != null && p.nivelAntes !== p.nivel ? ` <span class="text-slate-400">(antes ${p.nivelAntes})</span>` : ''}</div><div class="text-slate-300">Total ${p.total}/100${delta('total')}</div></div>
        </div>
        <div class="grid gap-2">${barra('👂 Comprensión', 'comp')}${barra('🗣️ Vocabulario', 'voc')}${barra('💬 Conversación', 'conv')}</div>
        <div><div class="text-white font-bold mb-1">Qué trabajar</div><ul class="list-disc pl-4 space-y-1 text-slate-200">${queTrabajar(p).map(x => `<li>${x}</li>`).join('')}</ul></div>
        <details><summary class="cursor-pointer text-sky-300">Detalle por pregunta</summary>
            <div class="overflow-x-auto mt-2"><table class="w-full text-left"><thead class="text-slate-400"><tr><th class="pr-2">Parte</th><th class="pr-2">Pregunta</th><th class="pr-2">Resultado</th><th class="pr-2">Puntos</th><th>Criterios</th></tr></thead><tbody>${filas}</tbody></table></div>
            <p class="text-[11px] text-slate-400 mt-2">Las preguntas que no aparecen no se llegaron a hacer (el test se adapta) y cuentan 0. ${Object.keys(textos).length ? 'Lo que dijo el niño se guarda solo en este dispositivo y no se envía al servidor. <button onclick="borrarTextosTest()" class="underline text-rose-300">Borrar respuestas</button>' : ''}</p>
        </details>
        <p class="text-[11px] text-slate-500">Cómo se calcula: Comprensión = aciertos de 5 · Vocabulario = palabras dichas (casi = media) de 5 · Conversación = puntos por responder, varias palabras, frase con verbo, palabra relacionada, rapidez y (en las difíciles) pasado/futuro y descripción larga. Total = 30% + 25% + 45%. Nivel 3 ≥ 70, 2 ≥ 45, 1 ≥ 20.</p>
    </div>`;
}

/* ---------- "Mi progreso": historial de tests ---------- */
function renderHistorialTest() {
    const cont = tnEl('prog-test');
    if (!cont) return;
    const lista = (gameState && gameState.pruebas) || [];
    if (!lista.length) {
        cont.innerHTML = `<p class="text-xs text-slate-400 mb-2">Todavía no hay resultados del test de nivel nuevo.</p>
            <button onclick="repetirTestNivel()" class="bg-amber-500 text-stadium-950 text-xs font-bold px-3 py-2 rounded-lg">🧭 Hacer el test de nivel</button>`;
        return;
    }
    const filas = lista.slice().reverse().map((p, i, arr) => {
        const ant = arr[i + 1];
        const d = ant ? p.total - ant.total : null;
        return `<tr class="border-t border-slate-800"><td class="py-1 pr-2 whitespace-nowrap text-slate-400">${esc(fmtFecha(p.t))}</td><td class="pr-2 text-amber-300">${p.nivel}</td><td class="pr-2">${p.comp}%</td><td class="pr-2">${p.voc}%</td><td class="pr-2">${p.conv}%</td><td class="whitespace-nowrap">${p.total}${d != null ? ` <span class="${d > 0 ? 'text-emerald-400' : d < 0 ? 'text-rose-400' : 'text-slate-400'}">(${d > 0 ? '+' : ''}${d})</span>` : ''}</td></tr>`;
    }).join('');
    cont.innerHTML = `<div class="overflow-x-auto"><table class="w-full text-left text-xs"><thead class="text-slate-400"><tr><th class="pr-2">Fecha</th><th class="pr-2">Nivel</th><th class="pr-2">👂 Compr.</th><th class="pr-2">🗣️ Vocab.</th><th class="pr-2">💬 Conv.</th><th>Total</th></tr></thead><tbody>${filas}</tbody></table></div>
        <div class="flex flex-wrap gap-2 my-3">
            <button onclick="repetirTestNivel()" class="bg-amber-500 text-stadium-950 text-xs font-bold px-3 py-2 rounded-lg">🧭 Repetir test de nivel</button>
        </div>
        ${htmlResultadoProfe(lista[lista.length - 1])}`;
}
if (typeof renderProgresoHabla === 'function') {
    const _renderProgresoHabla = renderProgresoHabla;
    renderProgresoHabla = function () { _renderProgresoHabla(); renderHistorialTest(); };
}
function verUltimoTest() {
    const tm = tnEl('teacher-modal'); if (tm && !tm.classList.contains('hidden')) toggleTeacherModal();
    switchTab('progreso');
    const c = tnEl('prog-test-card'); if (c) c.scrollIntoView({ behavior: 'smooth', block: 'start' });
}
