/* Frases cotidianas: frases del cole por situaciones, «¿Qué dirías si…?» y diálogos cortos.
   Solo se guardan (y se sincronizan con la clave) puntuaciones: nunca lo que se oyó ni audio.
   Las frases, preguntas y respuestas de este bloque tienen voz grabada (scripts/generar-audios.py). */
const FRASES_KEY = 'ligaHablaFrases';
const FR_SITUACIONES = [
    { id: 'llegar', nombre: 'Llegar a clase', emoji: '🏫', desc: 'Saludar y empezar el día' },
    { id: 'companero', nombre: 'Con un compañero', emoji: '🤝', desc: 'Pedir cosas y trabajar juntos' },
    { id: 'profe', nombre: 'Con el profe', emoji: '🙋', desc: 'Pedir permiso y preguntar' },
    { id: 'patio', nombre: 'En el patio', emoji: '⚽', desc: 'Jugar, esperar turno y hacer las paces' },
    { id: 'gracias', nombre: 'Dar las gracias', emoji: '🙏', desc: 'Agradecer y contestar' },
    { id: 'adios', nombre: 'Despedirse', emoji: '👋', desc: 'Irse a casa' }
];
// n = dificultad (1 fácil · 2 media · 3 más difícil); e = escena con emojis; t = frase (con voz grabada)
const FRASES = [
    { id: 'f01', sit: 'llegar', n: 1, e: '👋🧒', t: '¡Hola!' },
    { id: 'f02', sit: 'llegar', n: 1, e: '🌞🏫', t: '¡Buenos días!' },
    { id: 'f03', sit: 'llegar', n: 1, e: '🧒👋🧑‍🏫', t: 'Buenos días, profe.' },
    { id: 'f04', sit: 'llegar', n: 2, e: '🧒💬🧒', t: '¿Qué tal estás?' },
    { id: 'f05', sit: 'llegar', n: 2, e: '😊👍', t: 'Estoy bien, gracias.' },
    { id: 'f06', sit: 'llegar', n: 2, e: '🎒❓', t: '¿Dónde dejo la mochila?' },
    { id: 'f07', sit: 'llegar', n: 3, e: '⏰🏃🚪', t: 'Perdón por llegar tarde.' },
    { id: 'f08', sit: 'llegar', n: 3, e: '🪑🧒❓', t: '¿Me puedo sentar aquí?' },
    { id: 'f09', sit: 'companero', n: 1, e: '✏️🙏', t: '¿Me dejas un lápiz?' },
    { id: 'f10', sit: 'companero', n: 1, e: '🧽✏️', t: '¿Me dejas la goma?' },
    { id: 'f11', sit: 'companero', n: 2, e: '📏🧒🧒', t: '¿Me prestas la regla, por favor?' },
    { id: 'f12', sit: 'companero', n: 2, e: '🧒🤝🧒', t: '¿Quieres ser mi pareja?' },
    { id: 'f13', sit: 'companero', n: 2, e: '📖🔢', t: '¿En qué página estamos?' },
    { id: 'f14', sit: 'companero', n: 3, e: '📝🤔🧒', t: '¿Me ayudas con este ejercicio?' },
    { id: 'f15', sit: 'companero', n: 3, e: '✏️🔁😊', t: 'Te lo devuelvo ahora mismo.' },
    { id: 'f16', sit: 'companero', n: 3, e: '🧩🧒🧒', t: '¿Hacemos el trabajo juntos?' },
    { id: 'f17', sit: 'profe', n: 1, e: '🚽🙋', t: '¿Puedo ir al baño?' },
    { id: 'f18', sit: 'profe', n: 1, e: '💧🙋', t: '¿Puedo beber agua?' },
    { id: 'f19', sit: 'profe', n: 1, e: '🤷🙋', t: 'No lo entiendo.' },
    { id: 'f20', sit: 'profe', n: 2, e: '🔁👂', t: '¿Me lo puedes repetir?' },
    { id: 'f21', sit: 'profe', n: 2, e: '🐢🗣️', t: '¿Puedes hablar más despacio?' },
    { id: 'f22', sit: 'profe', n: 2, e: '📝✅❓', t: '¿Está bien así?' },
    { id: 'f23', sit: 'profe', n: 2, e: '✍️🔤', t: '¿Cómo se escribe?' },
    { id: 'f24', sit: 'profe', n: 3, e: '📚🔍', t: '¿Qué significa esta palabra?' },
    { id: 'f25', sit: 'profe', n: 3, e: '🤕🙋', t: 'Me duele la cabeza.' },
    { id: 'f26', sit: 'profe', n: 3, e: '✅📝➡️', t: 'Ya he terminado. ¿Qué hago ahora?' },
    { id: 'f27', sit: 'patio', n: 1, e: '⚽🧒❓', t: '¿Jugamos?' },
    { id: 'f28', sit: 'patio', n: 1, e: '🙋🎲', t: '¡Me toca!' },
    { id: 'f29', sit: 'patio', n: 1, e: '👍😄', t: '¡Vale!' },
    { id: 'f30', sit: 'patio', n: 1, e: '🧒🙋⚽', t: '¿Puedo jugar?' },
    { id: 'f31', sit: 'patio', n: 2, e: '⚽🙏', t: '¿Me dejas el balón?' },
    { id: 'f32', sit: 'patio', n: 2, e: '🧒💛🧒', t: '¿Quieres jugar conmigo?' },
    { id: 'f33', sit: 'patio', n: 2, e: '👉🎲', t: 'Ahora te toca a ti.' },
    { id: 'f34', sit: 'patio', n: 2, e: '😔🙏', t: 'Lo siento.' },
    { id: 'f35', sit: 'patio', n: 2, e: '🤗👍', t: 'No pasa nada.' },
    { id: 'f36', sit: 'patio', n: 3, e: '🏃💨🏃', t: '¿Jugamos al pilla-pilla?' },
    { id: 'f37', sit: 'patio', n: 3, e: '🧒➕🧒🧒', t: '¿Juegas con nosotros?' },
    { id: 'f38', sit: 'patio', n: 3, e: '✋😟', t: 'Para, por favor. No me gusta.' },
    { id: 'f39', sit: 'patio', n: 3, e: '🩹🧒❓', t: '¿Estás bien? ¿Te has hecho daño?' },
    { id: 'f40', sit: 'gracias', n: 1, e: '🙏😊', t: 'Gracias.' },
    { id: 'f41', sit: 'gracias', n: 1, e: '💖🙏', t: '¡Muchas gracias!' },
    { id: 'f42', sit: 'gracias', n: 2, e: '🤝😊', t: 'Gracias por ayudarme.' },
    { id: 'f43', sit: 'gracias', n: 2, e: '😊👌', t: 'De nada.' },
    { id: 'f44', sit: 'gracias', n: 3, e: '✏️🙏🧒', t: 'Gracias por dejarme el lápiz.' },
    { id: 'f45', sit: 'gracias', n: 3, e: '🎁🤩', t: '¡Qué bonito! Muchas gracias.' },
    { id: 'f46', sit: 'adios', n: 1, e: '👋😄', t: '¡Adiós!' },
    { id: 'f47', sit: 'adios', n: 1, e: '🌙👋', t: '¡Hasta mañana!' },
    { id: 'f48', sit: 'adios', n: 2, e: '🧒👋🧑‍🏫', t: 'Adiós, profe. ¡Hasta mañana!' },
    { id: 'f49', sit: 'adios', n: 2, e: '🎒🏡', t: 'Me voy a casa.' },
    { id: 'f50', sit: 'adios', n: 3, e: '🎉📅', t: '¡Que tengas un buen fin de semana!' },
    { id: 'f51', sit: 'adios', n: 3, e: '👋📅😄', t: 'Nos vemos el lunes.' }
];
// ¿Qué dirías si…? p = situación (voz grabada); claves = grupos que TODOS deben aparecer (vale cualquier palabra
// de cada grupo, sin tildes, y se aceptan pequeñas diferencias); r = una forma de decirlo (voz grabada)
const FR_DIRIAS = [
    { id: 'q01', sit: 'llegar', e: '🏫🧑‍🏫', p: 'Llegas al cole por la mañana y ves a tu profe. ¿Qué le dices?', claves: [['hola', 'buenos dias', 'buenas']], r: '¡Buenos días, profe!' },
    { id: 'q02', sit: 'llegar', e: '🧒💬', p: 'Un compañero te pregunta qué tal estás. ¿Qué le contestas?', claves: [['bien', 'genial', 'regular', 'mal', 'fenomenal', 'cansado', 'cansada', 'contento', 'contenta']], r: 'Estoy bien, gracias.' },
    { id: 'q03', sit: 'llegar', e: '⏰🚪', p: 'Llegas tarde a clase. ¿Qué dices al entrar?', claves: [['perdon', 'siento', 'perdona', 'perdone', 'disculpa', 'disculpe']], r: 'Perdón por llegar tarde.' },
    { id: 'q04', sit: 'companero', e: '✏️❌', p: 'No tienes lápiz. ¿Qué le dices a tu compañero?', claves: [['lapiz', 'lapices'], ['dejas', 'prestas', 'dejarme', 'prestarme', 'puedes', 'das', 'tienes', 'deja', 'presta']], r: '¿Me dejas un lápiz, por favor?' },
    { id: 'q05', sit: 'companero', e: '📖❓', p: 'No sabes en qué página estáis. ¿Qué le preguntas a tu compañero?', claves: [['pagina', 'paginas']], r: '¿En qué página estamos?' },
    { id: 'q06', sit: 'companero', e: '🧩🧒', p: 'Quieres hacer el trabajo con un amigo. ¿Qué le dices?', claves: [['juntos', 'juntas', 'conmigo', 'pareja', 'contigo', 'equipo']], r: '¿Hacemos el trabajo juntos?' },
    { id: 'q07', sit: 'profe', e: '🚽🙋', p: 'Tienes que ir al baño. ¿Qué le dices a la profe?', claves: [['bano', 'servicio', 'aseo', 'pis', 'lavabo']], r: '¿Puedo ir al baño, por favor?' },
    { id: 'q08', sit: 'profe', e: '💨👂', p: 'La profe ha hablado muy deprisa y no lo has entendido. ¿Qué le dices?', claves: [['repetir', 'repite', 'repites', 'repetirlo', 'entiendo', 'entendido', 'despacio', 'otra vez']], r: '¿Me lo puedes repetir?' },
    { id: 'q09', sit: 'profe', e: '🥵💧', p: 'Tienes mucha sed. ¿Qué le preguntas a la profe?', claves: [['agua', 'beber']], r: '¿Puedo beber agua?' },
    { id: 'q10', sit: 'profe', e: '📝✅', p: 'Has terminado la ficha. ¿Qué le dices a la profe?', claves: [['terminado', 'acabado', 'termine', 'acabe', 'hecho', 'listo', 'lista', 'ya esta']], r: 'Ya he terminado. ¿Qué hago ahora?' },
    { id: 'q11', sit: 'patio', e: '⚽🧒🧒', p: 'En el patio, unos niños juegan al fútbol y tú quieres jugar. ¿Qué les dices?', claves: [['jugar', 'juego', 'jugamos', 'juegas', 'juegan']], r: '¿Puedo jugar con vosotros?' },
    { id: 'q12', sit: 'patio', e: '🎲👉', p: 'Estáis jugando y ahora es tu turno. ¿Qué dices?', claves: [['toca', 'turno', 'mi vez']], r: '¡Me toca!' },
    { id: 'q13', sit: 'patio', e: '💥😣', p: 'Sin querer, le das un golpe a un compañero. ¿Qué le dices?', claves: [['siento', 'perdon', 'perdona', 'disculpa', 'querer']], r: 'Lo siento. ¿Estás bien?' },
    { id: 'q14', sit: 'patio', e: '👟😔', p: 'Un niño te pide perdón porque te ha pisado sin querer. ¿Qué le contestas?', claves: [['pasa nada', 'tranquilo', 'tranquila', 'vale', 'perdonado', 'perdonada', 'nada']], r: 'No pasa nada.' },
    { id: 'q15', sit: 'patio', e: '⚽🙏', p: 'Quieres el balón un momento. ¿Qué le dices a tu amigo?', claves: [['balon', 'pelota'], ['dejas', 'prestas', 'pasas', 'dejarme', 'puedes', 'pasa', 'deja', 'da', 'das']], r: '¿Me dejas el balón, por favor?' },
    { id: 'q16', sit: 'gracias', e: '✏️🤝', p: 'Un compañero te ayuda a recoger los lápices. ¿Qué le dices?', claves: [['gracias']], r: '¡Muchas gracias!' },
    { id: 'q17', sit: 'gracias', e: '🙏🧒', p: 'Tu amigo te dice gracias. ¿Qué le contestas?', claves: [['nada', 'por ti', 'favor', 'de que']], r: 'De nada.' },
    { id: 'q18', sit: 'adios', e: '🔔🎒', p: 'Se acaban las clases y te vas a casa. ¿Qué le dices a la profe?', claves: [['adios', 'hasta', 'luego', 'manana', 'chao', 'chau', 'vemos']], r: '¡Adiós, profe! ¡Hasta mañana!' },
    { id: 'q19', sit: 'adios', e: '📅👋', p: 'Es viernes y te despides de tus amigos. ¿Qué les dices?', claves: [['adios', 'lunes', 'fin de semana', 'hasta', 'luego', 'vemos', 'chao']], r: '¡Hasta el lunes!' }
];
// Diálogos: la app hace de profe o de compañero (app) y el niño contesta. nino = una respuesta modelo
// (voz grabada, se ve con «Ayuda»); claves = palabras que valen para dar el turno por bueno (basta una).
const FR_DIALOGOS = [
    { id: 'd01', sit: 'llegar', quien: 'profe', titulo: 'Buenos días, profe', turnos: [
        { app: '¡Buenos días! ¿Qué tal estás?', nino: 'Muy bien, gracias. ¿Y tú?', claves: ['bien', 'genial', 'regular', 'mal', 'fenomenal', 'cansado', 'cansada', 'contento', 'contenta'] },
        { app: 'Muy bien. Deja la mochila en la percha, por favor.', nino: 'Vale. ¿Dónde me siento?', claves: ['vale', 'si', 'siento', 'sentarme', 'sitio', 'donde', 'aqui', 'ok', 'bueno', 'percha', 'mochila'] },
        { app: 'Siéntate aquí, al lado de Lucía.', nino: 'Gracias, profe.', claves: ['gracias', 'vale', 'bien', 'hola'] }
    ] },
    { id: 'd02', sit: 'companero', quien: 'compañero', titulo: 'No tengo lápiz', turnos: [
        { app: 'Hola. ¿Qué te pasa?', nino: 'No tengo lápiz. ¿Me dejas uno?', claves: ['lapiz', 'dejas', 'prestas', 'goma', 'tengo'] },
        { app: 'Sí, toma. Aquí tienes.', nino: 'Gracias. Te lo devuelvo luego.', claves: ['gracias'] },
        { app: 'De nada. ¿Hacemos el ejercicio juntos?', nino: '¡Vale! Lo hacemos juntos.', claves: ['vale', 'si', 'claro', 'bueno', 'juntos', 'juntas', 'genial', 'ok'] }
    ] },
    { id: 'd03', sit: 'profe', quien: 'profe', titulo: '¿Me lo puedes repetir?', turnos: [
        { app: 'Abrid el libro por la página doce y haced el ejercicio tres.', nino: 'Perdón, no lo entiendo. ¿Me lo puedes repetir?', claves: ['repetir', 'repite', 'repites', 'entiendo', 'entendido', 'otra vez', 'despacio', 'pagina', 'que'] },
        { app: 'Claro. Página doce, ejercicio tres.', nino: 'Vale, gracias.', claves: ['vale', 'gracias', 'ya', 'bien', 'ok', 'vale'] },
        { app: '¿Necesitas algo más?', nino: 'Sí. ¿Puedo ir al baño, por favor?', claves: ['bano', 'agua', 'no', 'nada', 'gracias', 'si'] }
    ] },
    { id: 'd04', sit: 'patio', quien: 'compañero', titulo: 'Jugamos en el patio', turnos: [
        { app: '¡Hola! Estamos jugando al pilla-pilla.', nino: '¿Puedo jugar con vosotros?', claves: ['jugar', 'juego', 'jugamos', 'puedo', 'juegas'] },
        { app: '¡Claro! Tú la llevas. ¡Corre!', nino: '¡Vale! ¡Voy a pillarte!', claves: ['vale', 'si', 'voy', 'corre', 'pillo', 'pillar', 'pillarte', 'bien', 'genial'] },
        { app: '¡Ay! Me he caído.', nino: '¿Estás bien? Lo siento.', claves: ['bien', 'siento', 'perdon', 'dano', 'ayudo', 'levanta', 'pasa'] },
        { app: 'Sí, no pasa nada. ¡Seguimos jugando!', nino: '¡Vale! ¡Ahora me toca a mí!', claves: ['vale', 'si', 'toca', 'bien', 'genial', 'jugamos', 'seguimos', 'bueno'] }
    ] },
    { id: 'd05', sit: 'gracias', quien: 'compañero', titulo: 'Se me ha caído el estuche', turnos: [
        { app: 'Mira, se te ha caído el estuche. Toma.', nino: '¡Muchas gracias!', claves: ['gracias'] },
        { app: 'De nada. ¿Te ayudo a recoger los lápices?', nino: 'Sí, gracias por ayudarme.', claves: ['si', 'gracias', 'vale', 'claro', 'no', 'bueno', 'ayudo'] },
        { app: '¡Ya está todo recogido!', nino: 'Eres muy amable. ¡Gracias!', claves: ['gracias', 'amable', 'genial', 'bien', 'guay'] }
    ] },
    { id: 'd06', sit: 'adios', quien: 'profe', titulo: 'Nos vamos a casa', turnos: [
        { app: 'Se ha acabado la clase. ¡Recoged las cosas!', nino: 'Vale, ya lo recojo.', claves: ['vale', 'si', 'ya', 'recojo', 'bueno', 'ok', 'recogemos'] },
        { app: '¡Adiós a todos! ¡Hasta mañana!', nino: '¡Adiós, profe! ¡Hasta mañana!', claves: ['adios', 'hasta', 'manana', 'luego', 'chao', 'vemos'] },
        { app: '¡Que tengas una buena tarde!', nino: 'Igualmente. ¡Hasta mañana!', claves: ['igualmente', 'gracias', 'tambien', 'adios', 'hasta', 'tu', 'ti'] }
    ] }
];
// FIN FRASES

/* ---------- Funciones puras (se prueban con node: test/frases.test.mjs) ---------- */
const FR_UMBRAL_BIEN = 80, FR_UMBRAL_CASI = 55; // puntuación de «Escucha y repite» (0-100)
const FR_ACTIVIDADES = ['repetir', 'dirias', 'dialogo'];
function frNorm(s) {
    if (typeof lecNorm === 'function') return lecNorm(s);
    return String(s == null ? '' : s).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9\s]/g, ' ').replace(/\s+/g, ' ').trim();
}
function frSim(a, b) { return typeof lecSim === 'function' ? lecSim(a, b) : (a === b ? 1 : 0); }
// ¿Aparece la opción (una palabra o varias seguidas) en lo que se oyó? Palabras cortas (≤ 3 letras): exactas.
function frOpcionEn(opcion, palabras, texto) {
    const op = frNorm(opcion);
    if (!op) return false;
    if (op.includes(' ')) {
        if ((' ' + texto + ' ').includes(' ' + op + ' ')) return true;
        const ops = op.split(' '), L = ops.length;
        for (let i = 0; i + L <= palabras.length; i++) if (ops.every((w, k) => (w.length <= 3 ? palabras[i + k] === w : frSim(palabras[i + k], w) >= 0.8))) return true;
        return false;
    }
    return palabras.some(w => (op.length <= 3 ? w === op : frSim(w, op) >= 0.8));
}
// «¿Qué dirías si…?»: vale si en alguna de las alternativas del reconocimiento aparecen TODOS los grupos
function frDiriasOk(alternativas, claves) {
    return (alternativas || []).some(a => {
        const texto = frNorm(a), palabras = texto.split(' ').filter(Boolean);
        return palabras.length > 0 && (claves || []).every(g => g.some(op => frOpcionEn(op, palabras, texto)));
    });
}
// «Escucha y repite»: cuánto se parece lo dicho a la frase (mejor de las alternativas)
function frPuntuar(alternativas, texto) {
    const ref = typeof lecPalabras === 'function' ? lecPalabras(texto) : frNorm(texto).split(' ').filter(Boolean);
    let mejor = { score: 0, estados: ref.map(() => 'n'), oido: '' };
    if (!ref.length) return mejor;
    (alternativas || []).forEach(a => {
        const hyp = typeof lecPalabras === 'function' ? lecPalabras(a) : frNorm(a).split(' ').filter(Boolean);
        if (!hyp.length) return;
        const al = lecAlinear(ref, hyp);
        const pts = al.estados.reduce((s, e) => s + (e === 'b' ? 1 : e === 'd' ? 0.5 : 0), 0);
        // Palabras de más (no repeticiones) restan un poco: «¿me dejas un lápiz rojo grande?» no es la frase
        const score = Math.max(0, Math.round(100 * pts / ref.length - 5 * Math.max(0, al.extras - 1)));
        if (score > mejor.score) mejor = { score, estados: al.estados, oido: a };
    });
    return mejor;
}
function frResultado(score) { return score >= FR_UMBRAL_BIEN ? 'perfecto' : score >= FR_UMBRAL_CASI ? 'casi' : 'otra'; }
// Diálogos: el turno vale si sale alguna de sus palabras clave o si se parece mucho a la respuesta modelo
function frTurnoOk(alternativas, turno) {
    if (frDiriasOk(alternativas, [turno.claves || []])) return true;
    return frPuntuar(alternativas, turno.nino).score >= 70;
}
const frFrase = id => FRASES.find(f => f.id === id) || FR_DIRIAS.find(f => f.id === id) || FR_DIALOGOS.find(f => f.id === id) || null;
// Conseguidas: frases repetidas bien (≥ 80 o valoradas bien por un adulto), «dirías» acertadas y diálogos completados
function frConseguidas(registros) {
    const s = new Set();
    (registros || []).forEach(r => { if (r && r.ok) s.add(r.fid); });
    return s;
}
function frProgresoSit(registros, sit) {
    const c = frConseguidas(registros);
    const cuenta = lista => { const de = lista.filter(x => x.sit === sit); return { ok: de.filter(x => c.has(x.id)).length, total: de.length }; };
    const frases = cuenta(FRASES), dirias = cuenta(FR_DIRIAS), dialogos = cuenta(FR_DIALOGOS);
    const total = frases.total + dirias.total + dialogos.total;
    return { frases, dirias, dialogos, pct: total ? Math.round(100 * (frases.ok + dirias.ok + dialogos.ok) / total) : 0 };
}
// Lo que se manda al servidor: solo identificadores y puntuaciones (nunca lo oído ni audio)
function frParaServidor(r) {
    return { id: r.id, t: r.t, fid: r.fid, sit: r.sit, act: r.act, score: r.score, ok: !!r.ok, metodo: r.metodo === 'adulto' ? 'adulto' : 'auto' };
}
function frasesVacias() { return { version: 1, registros: [] }; }

/* ---------- Datos guardados en el dispositivo ---------- */
const XP_FR_REPETIR = 10, XP_FR_DIRIAS = 15, XP_FR_DIALOGO = 25;
function cargarFrases() {
    try {
        const d = JSON.parse(localStorage.getItem(FRASES_KEY));
        if (d && Array.isArray(d.registros)) return d;
    } catch (e) { }
    return frasesVacias();
}
let frasesData = typeof localStorage !== 'undefined' ? cargarFrases() : frasesVacias();
function guardarFrases() {
    if (frasesData.registros.length > 3000) frasesData.registros = frasesData.registros.slice(-3000);
    try { localStorage.setItem(FRASES_KEY, JSON.stringify(frasesData)); } catch (e) { console.warn('No se pudieron guardar las frases', e); }
    if (typeof programarSync === 'function') programarSync();
}
function frRegistrar(o) {
    const ahora = Date.now();
    const hoy = claveDia(ahora);
    const yaHoy = frasesData.registros.some(r => r.fid === o.fid && r.act === o.act && r.ok && claveDia(r.t) === hoy);
    const r = { id: 'fr-' + ahora.toString(36) + '-' + Math.random().toString(36).slice(2, 7), t: ahora, fid: o.fid, sit: o.sit, act: o.act, score: Math.max(0, Math.min(100, Math.round(o.score || 0))), ok: !!o.ok, metodo: o.metodo === 'adulto' ? 'adulto' : 'auto' };
    frasesData.registros.push(r);
    guardarFrases();
    let xp = 0;
    if (r.ok && !yaHoy) { xp = o.act === 'dialogo' ? XP_FR_DIALOGO : o.act === 'dirias' ? XP_FR_DIRIAS : XP_FR_REPETIR; if (typeof addXP === 'function') addXP(xp); }
    return xp;
}

/* ---------- Interfaz ---------- */
let frVista = { modo: 'inicio', sit: null, i: 0 };
let frSR = null;          // reconocimiento en marcha
let frDial = null;        // diálogo en curso: { d, turno, ok, intentos, hecho }
const frManual = () => typeof SpeechRec === 'undefined' || !SpeechRec || (typeof hablaData !== 'undefined' && hablaData.soloManual);
const frSitDe = id => FR_SITUACIONES.find(s => s.id === id) || FR_SITUACIONES[0];
const frE = s => (typeof esc === 'function' ? esc(s) : String(s));
const frBtn = 'font-bold rounded-xl px-4 py-2.5 text-sm transition disabled:opacity-50';
function frasesOcupada() { return !!frSR; }
function frSalir() { if (frSR) { try { frSR.abort(); } catch (e) { } frSR = null; } }

function renderFrases() {
    const box = document.getElementById('frases-app');
    if (!box) return;
    frSalir();
    if (frVista.modo === 'inicio') return frPintarInicio(box);
    if (frVista.modo === 'sit') return frPintarSit(box);
    if (frVista.modo === 'repetir') return frPintarRepetir(box);
    if (frVista.modo === 'dirias') return frPintarDirias(box);
    if (frVista.modo === 'dialogo') return frPintarDialogo(box);
}
function frIr(modo, extra = {}) { frVista = Object.assign({}, frVista, { modo, i: 0, intro: false }, extra); if (modo !== 'dialogo') frDial = null; renderFrases(); }
function frBarra(pct) { return `<div class="h-2 bg-stadium-800 rounded-full overflow-hidden"><div class="h-full bg-pitch-500" style="width:${pct}%"></div></div>`; }

function frPintarInicio(box) {
    const regs = frasesData.registros;
    box.innerHTML = `
      <div class="flex flex-wrap justify-between items-start gap-2 mb-1">
        <h3 class="font-game text-xl text-white">💬 Frases cotidianas</h3>
        <button onclick="abrirPegatinas()" class="text-xs bg-stadium-800 border border-slate-700 rounded-xl px-3 py-1.5 text-amber-300 font-bold">🏅 Mis pegatinas</button>
      </div>
      <p class="text-sm text-slate-300 mb-4">Las frases que se usan cada día en el cole. Elige una situación: escucha y repite, piensa qué dirías y habla con el profe o con un compañero.</p>
      <div id="fr-situaciones" class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        ${FR_SITUACIONES.map(s => {
        const p = frProgresoSit(regs, s.id);
        return `<button onclick="frIr('sit', { sit: '${s.id}' })" data-sit="${s.id}" class="fr-sit text-left bg-stadium-950 border border-slate-800 hover:border-pitch-500 rounded-2xl p-4 transition">
            <div class="flex items-center gap-3 mb-2"><span class="text-4xl" aria-hidden="true">${s.emoji}</span>
              <div><div class="font-bold text-white">${frE(s.nombre)}</div><div class="text-xs text-slate-400">${frE(s.desc)}</div></div></div>
            ${frBarra(p.pct)}
            <div class="text-[11px] text-slate-400 mt-1">🔁 ${p.frases.ok}/${p.frases.total} frases · 🤔 ${p.dirias.ok}/${p.dirias.total} · 🎭 ${p.dialogos.ok ? '✅' : '—'}</div>
          </button>`;
    }).join('')}
      </div>
      ${frManual() ? '<p class="text-xs text-amber-200 mt-4">🎧 Sin reconocimiento de voz automático: el adulto escucha y pulsa ✅ o 🔁.</p>' : ''}`;
}
function frPintarSit(box) {
    const s = frSitDe(frVista.sit), p = frProgresoSit(frasesData.registros, s.id);
    box.innerHTML = `
      <button onclick="frIr('inicio')" class="text-xs text-sky-300 underline mb-3">← Situaciones</button>
      <div class="flex items-center gap-3 mb-4"><span class="text-5xl" aria-hidden="true">${s.emoji}</span>
        <div><h3 class="font-game text-xl text-white">${frE(s.nombre)}</h3><div class="text-xs text-slate-400">${frE(s.desc)} · ${p.pct} % conseguido</div></div></div>
      <div class="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <button id="fr-act-repetir" onclick="frIr('repetir')" class="bg-stadium-950 border border-slate-800 hover:border-pitch-500 rounded-2xl p-4 text-left">
          <div class="text-3xl">🔁</div><div class="font-bold text-white">Escucha y repite</div><div class="text-xs text-slate-400">${p.frases.ok}/${p.frases.total} frases conseguidas</div></button>
        <button id="fr-act-dirias" onclick="frIr('dirias')" class="bg-stadium-950 border border-slate-800 hover:border-pitch-500 rounded-2xl p-4 text-left">
          <div class="text-3xl">🤔</div><div class="font-bold text-white">¿Qué dirías si…?</div><div class="text-xs text-slate-400">${p.dirias.ok}/${p.dirias.total} acertadas</div></button>
        <button id="fr-act-dialogo" onclick="frIr('dialogo')" class="bg-stadium-950 border border-slate-800 hover:border-pitch-500 rounded-2xl p-4 text-left">
          <div class="text-3xl">🎭</div><div class="font-bold text-white">Diálogo</div><div class="text-xs text-slate-400">${p.dialogos.ok ? '✅ Completado' : 'Habla con el ' + (FR_DIALOGOS.find(d => d.sit === s.id) || {}).quien}</div></button>
      </div>`;
}

/* ----- Reconocimiento de una sola respuesta ----- */
function frEscuchar(btnId, alTerminar) {
    if (frSR) return;
    if (typeof pararVoz === 'function') pararVoz();
    const b = document.getElementById(btnId); const txt = b ? b.innerHTML : '';
    if (b) { b.innerHTML = '👂 Te escucho…'; b.disabled = true; }
    const alts = []; let err = null;
    try {
        const r = new SpeechRec();
        r.lang = 'es-ES'; r.continuous = false; r.interimResults = false; r.maxAlternatives = 5;
        r.onresult = e => { for (let i = 0; i < e.results.length; i++) for (let j = 0; j < e.results[i].length; j++) if (e.results[i][j].transcript) alts.push(e.results[i][j].transcript.trim()); };
        r.onerror = e => { err = e.error || 'error'; };
        r.onend = () => {
            if (frSR !== r) return;
            frSR = null;
            if (b) { b.innerHTML = txt; b.disabled = false; }
            alTerminar(alts, err);
        };
        frSR = r;
        r.start();
        setTimeout(() => { if (frSR === r) { try { r.stop(); } catch (_) { } } }, 9000);
    } catch (e) { frSR = null; if (b) { b.innerHTML = txt; b.disabled = false; } }
}
const frNoOido = err => err === 'not-allowed' ? '🔒 Necesito permiso para usar el micrófono.' : '🤔 No te he oído. Pulsa el botón y habla.';
function frBotonesAdulto(fn) {
    return `<div class="flex flex-wrap gap-2 justify-center mt-2"><span class="text-xs text-slate-400 w-full text-center">Valoración del adulto:</span>
      <button id="fr-ad-bien" onclick="${fn}(true)" class="${frBtn} bg-emerald-600 hover:bg-emerald-500 text-white">✅ Lo ha dicho bien</button>
      <button id="fr-ad-mal" onclick="${fn}(false)" class="${frBtn} bg-stadium-800 border border-slate-700 text-slate-200">🔁 Hay que practicar</button></div>`;
}
function frXpHtml(xp) { return xp ? ` <span class="text-amber-400 text-base">+${xp} XP</span>` : ''; }

/* ----- Escucha y repite ----- */
function frListaRepetir() { return FRASES.filter(f => f.sit === frVista.sit).sort((a, b) => a.n - b.n); }
function frPintarRepetir(box) {
    const lista = frListaRepetir(), f = lista[frVista.i] || lista[0], c = frConseguidas(frasesData.registros);
    box.innerHTML = `
      <button onclick="frIr('sit')" class="text-xs text-sky-300 underline mb-3">← ${frE(frSitDe(frVista.sit).nombre)}</button>
      <h3 class="font-game text-lg text-white mb-2">🔁 Escucha y repite</h3>
      <div class="flex flex-wrap gap-1 mb-4" id="fr-chips">${lista.map((x, k) => `<button onclick="frVista.i=${k}; renderFrases()" class="text-xs px-2 py-1 rounded-lg border ${k === frVista.i ? 'border-pitch-500 bg-pitch-600/30 text-white' : 'border-slate-700 bg-stadium-800 text-slate-300'}">${c.has(x.id) ? '✅' : '○'} ${k + 1}</button>`).join('')}</div>
      <div class="bg-stadium-950 border border-slate-800 rounded-3xl p-6 text-center" id="fr-tarjeta" data-fid="${f.id}">
        <div class="text-6xl mb-3 tracking-widest" aria-hidden="true">${f.e}</div>
        <div class="font-game text-2xl sm:text-3xl text-white mb-1" id="fr-texto">${frE(f.t)}</div>
        <div class="text-xs text-slate-400 mb-4">${'⭐'.repeat(f.n)} ${f.n === 1 ? 'fácil' : f.n === 2 ? 'media' : 'más difícil'}</div>
        <div class="flex flex-wrap gap-2 justify-center">
          <button onclick="decir(frListaRepetir()[frVista.i].t)" class="${frBtn} bg-sky-600 hover:bg-sky-500 text-white">🔊 Escuchar</button>
          ${frManual() ? '' : `<button id="fr-hablar" onclick="frRepetirVoz()" class="${frBtn} bg-rose-600 hover:bg-rose-500 text-white">🎙️ Ahora tú</button>`}
        </div>
        ${frManual() ? frBotonesAdulto('frRepetirAdulto') : ''}
        <div id="fr-resultado" class="mt-4" role="status"></div>
      </div>
      <div class="flex justify-between mt-3">
        <button onclick="frMover(-1)" class="text-sm text-slate-300 ${frVista.i ? '' : 'invisible'}">← Anterior</button>
        <button id="fr-siguiente" onclick="frMover(1)" class="text-sm text-sky-300 font-bold ${frVista.i < lista.length - 1 ? '' : 'invisible'}">Siguiente →</button>
      </div>`;
    const intro = !frVista.intro; frVista.intro = true; // la primera vez: «Escucha y repite.»
    setTimeout(() => { if (frVista.modo === 'repetir' && document.getElementById('fr-tarjeta')) decir(intro ? [FRASES_VOZ.escuchaRepite, f.t] : f.t); }, 250);
}
function frMover(d) { const n = frVista.modo === 'repetir' ? frListaRepetir().length : FR_DIRIAS.filter(q => q.sit === frVista.sit).length; frVista.i = Math.max(0, Math.min(n - 1, frVista.i + d)); renderFrases(); }
function frPalabrasColor(texto, estados) {
    let k = 0;
    return texto.split(/\s+/).map(w => {
        const n = typeof lecPalabras === 'function' ? lecPalabras(w).length : 1;
        const es = estados.slice(k, k + n); k += n;
        const e = !n ? 'b' : es.includes('m') || es.includes('s') || es.includes('n') ? 'm' : es.includes('d') ? 'd' : 'b';
        const cls = e === 'b' ? 'text-emerald-300' : e === 'd' ? 'text-amber-300' : 'text-red-300 underline decoration-dotted';
        return `<span class="${cls}">${frE(w)}</span>`;
    }).join(' ');
}
function frRepetirVoz() {
    const f = frListaRepetir()[frVista.i];
    frEscuchar('fr-hablar', (alts, err) => {
        const res = document.getElementById('fr-resultado');
        if (!res || frListaRepetir()[frVista.i] !== f) return;
        if (!alts.length) { res.innerHTML = `<div class="text-sm text-amber-200">${frNoOido(err)}</div>`; return; }
        const ev = frPuntuar(alts, f.t), resultado = frResultado(ev.score);
        const xp = frRegistrar({ fid: f.id, sit: f.sit, act: 'repetir', score: ev.score, ok: resultado === 'perfecto', metodo: 'auto' });
        frMostrarRepetir(resultado, ev, xp, f);
    });
}
function frRepetirAdulto(bien) {
    const f = frListaRepetir()[frVista.i];
    const xp = frRegistrar({ fid: f.id, sit: f.sit, act: 'repetir', score: bien ? 100 : 0, ok: bien, metodo: 'adulto' });
    frMostrarRepetir(bien ? 'perfecto' : 'otra', null, xp, f);
}
function frMostrarRepetir(resultado, ev, xp, f) {
    const res = document.getElementById('fr-resultado');
    const palabras = ev ? `<div class="text-lg mt-1">${frPalabrasColor(f.t, ev.estados)}</div><div class="text-xs text-slate-400 mt-1">He oído: «${frE(ev.oido)}» · ${ev.score} %</div>` : '';
    if (resultado === 'perfecto') {
        res.innerHTML = `<div class="bg-emerald-950/70 border-2 border-emerald-400 rounded-2xl p-3"><div class="font-game text-xl text-emerald-300">${temaMascota()} ¡Muy bien!${frXpHtml(xp)}</div>${palabras}</div>`;
        decir(temaFrase());
    } else if (resultado === 'casi') {
        res.innerHTML = `<div class="bg-amber-950/60 border-2 border-amber-400 rounded-2xl p-3"><div class="font-game text-xl text-amber-300">👏 ¡Casi!</div>${palabras}<div class="text-xs text-amber-100 mt-1">Escucha otra vez y repite.</div></div>`;
        decir([FRASES_VOZ.casi, f.t]);
    } else {
        res.innerHTML = `<div class="bg-stadium-800 border-2 border-slate-600 rounded-2xl p-3"><div class="font-game text-xl text-slate-200">💪 ¡A practicar!</div>${palabras}<div class="text-xs text-slate-300 mt-1">Escucha y prueba otra vez.</div></div>`;
        decir([FRASES_VOZ.otraVez, f.t]);
    }
}

/* ----- ¿Qué dirías si…? ----- */
function frListaDirias() { return FR_DIRIAS.filter(q => q.sit === frVista.sit); }
function frPintarDirias(box) {
    const lista = frListaDirias(), q = lista[frVista.i] || lista[0], c = frConseguidas(frasesData.registros);
    box.innerHTML = `
      <button onclick="frIr('sit')" class="text-xs text-sky-300 underline mb-3">← ${frE(frSitDe(frVista.sit).nombre)}</button>
      <h3 class="font-game text-lg text-white mb-2">🤔 ¿Qué dirías si…?</h3>
      <div class="flex flex-wrap gap-1 mb-4">${lista.map((x, k) => `<button onclick="frVista.i=${k}; renderFrases()" class="text-xs px-2 py-1 rounded-lg border ${k === frVista.i ? 'border-pitch-500 bg-pitch-600/30 text-white' : 'border-slate-700 bg-stadium-800 text-slate-300'}">${c.has(x.id) ? '✅' : '○'} ${k + 1}</button>`).join('')}</div>
      <div class="bg-stadium-950 border border-slate-800 rounded-3xl p-6 text-center" id="fr-tarjeta" data-fid="${q.id}">
        <div class="text-6xl mb-3" aria-hidden="true">${q.e}</div>
        <div class="text-lg sm:text-xl text-white mb-4" id="fr-pregunta">${frE(q.p)}</div>
        <div class="flex flex-wrap gap-2 justify-center">
          <button onclick="decir(frListaDirias()[frVista.i].p)" class="${frBtn} bg-sky-600 hover:bg-sky-500 text-white">🔊 Escuchar</button>
          ${frManual() ? '' : `<button id="fr-hablar" onclick="frDiriasVoz()" class="${frBtn} bg-rose-600 hover:bg-rose-500 text-white">🎙️ Contestar</button>`}
          <button id="fr-pista" onclick="frDiriasPista()" class="${frBtn} bg-stadium-800 border border-slate-700 text-slate-200">💡 Ayuda</button>
        </div>
        ${frManual() ? frBotonesAdulto('frDiriasAdulto') : ''}
        <div id="fr-resultado" class="mt-4" role="status"></div>
      </div>
      <div class="flex justify-between mt-3">
        <button onclick="frMover(-1)" class="text-sm text-slate-300 ${frVista.i ? '' : 'invisible'}">← Anterior</button>
        <button id="fr-siguiente" onclick="frMover(1)" class="text-sm text-sky-300 font-bold ${frVista.i < lista.length - 1 ? '' : 'invisible'}">Siguiente →</button>
      </div>`;
    setTimeout(() => { if (frVista.modo === 'dirias' && document.getElementById('fr-tarjeta')) decir(q.p); }, 250);
}
function frDiriasPista() {
    const q = frListaDirias()[frVista.i];
    document.getElementById('fr-resultado').innerHTML = `<div class="text-sm text-sky-200">💡 Podrías decir: «<strong>${frE(q.r)}</strong>»</div>`;
    decir([FRASES_VOZ.podriasDecir, q.r]);
}
function frDiriasVoz() {
    const q = frListaDirias()[frVista.i];
    frEscuchar('fr-hablar', (alts, err) => {
        const res = document.getElementById('fr-resultado');
        if (!res || frListaDirias()[frVista.i] !== q) return;
        if (!alts.length) { res.innerHTML = `<div class="text-sm text-amber-200">${frNoOido(err)}</div>`; return; }
        const ok = frDiriasOk(alts, q.claves);
        const xp = frRegistrar({ fid: q.id, sit: q.sit, act: 'dirias', score: ok ? 100 : 0, ok, metodo: 'auto' });
        frMostrarDirias(ok, xp, q, alts[0]);
    });
}
function frDiriasAdulto(bien) {
    const q = frListaDirias()[frVista.i];
    const xp = frRegistrar({ fid: q.id, sit: q.sit, act: 'dirias', score: bien ? 100 : 0, ok: bien, metodo: 'adulto' });
    frMostrarDirias(bien, xp, q, '');
}
function frMostrarDirias(ok, xp, q, oido) {
    const res = document.getElementById('fr-resultado');
    const o = oido ? `<div class="text-xs text-slate-400 mt-1">He oído: «${frE(oido)}»</div>` : '';
    if (ok) {
        res.innerHTML = `<div class="bg-emerald-950/70 border-2 border-emerald-400 rounded-2xl p-3"><div class="font-game text-xl text-emerald-300">${temaMascota()} ¡Muy bien dicho!${frXpHtml(xp)}</div>${o}<div class="text-xs text-emerald-100 mt-1">También se puede decir: «${frE(q.r)}»</div></div>`;
        decir(temaFrase());
    } else {
        res.innerHTML = `<div class="bg-amber-950/60 border-2 border-amber-400 rounded-2xl p-3"><div class="font-game text-xl text-amber-300">🤔 Casi…</div>${o}<div class="text-sm text-amber-100 mt-1">Podrías decir: «<strong>${frE(q.r)}</strong>». Escúchalo y prueba otra vez.</div></div>`;
        decir([FRASES_VOZ.podriasDecir, q.r]);
    }
}

/* ----- Diálogo ----- */
function frPintarDialogo(box) {
    const d = FR_DIALOGOS.find(x => x.sit === frVista.sit);
    if (!frDial || frDial.d !== d) frDial = { d, turno: 0, ok: 0, intentos: 0, hecho: [], fin: false };
    const quienEmoji = d.quien === 'profe' ? '🧑‍🏫' : '🧒';
    const burbujas = [];
    for (let k = 0; k <= Math.min(frDial.turno, d.turnos.length - 1); k++) {
        const t = d.turnos[k];
        burbujas.push(`<div class="flex gap-2 items-end"><span class="text-3xl">${quienEmoji}</span><div class="bg-stadium-800 text-white rounded-2xl rounded-bl-none px-4 py-2 max-w-[80%]">${frE(t.app)}
            <button onclick="decir(${JSON.stringify(t.app).replace(/"/g, '&quot;')})" class="ml-1 text-sky-300" aria-label="Escuchar">🔊</button></div></div>`);
        if (frDial.hecho[k] != null) burbujas.push(`<div class="flex gap-2 items-end justify-end"><div class="${frDial.hecho[k] ? 'bg-emerald-700' : 'bg-amber-700'} text-white rounded-2xl rounded-br-none px-4 py-2 max-w-[80%] fr-turno-nino">${frDial.hecho[k] ? '✅' : '💬'} ${frE(t.nino)}</div><span class="text-3xl">${temaMascota()}</span></div>`);
    }
    const t = d.turnos[frDial.turno];
    box.innerHTML = `
      <button onclick="frIr('sit')" class="text-xs text-sky-300 underline mb-3">← ${frE(frSitDe(frVista.sit).nombre)}</button>
      <h3 class="font-game text-lg text-white mb-1">🎭 ${frE(d.titulo)}</h3>
      <p class="text-xs text-slate-400 mb-3">Yo hago de ${d.quien === 'profe' ? 'profe' : 'compañero'}. Escucha y contesta.</p>
      <div id="fr-chat" class="space-y-3 bg-stadium-950 border border-slate-800 rounded-3xl p-4 mb-3">${burbujas.join('')}</div>
      <div id="fr-dial-control" class="text-center">
        ${frDial.fin ? frResumenDialogo() : `
          <div class="flex flex-wrap gap-2 justify-center">
            ${frManual() ? '' : `<button id="fr-hablar" onclick="frDialogoVoz()" class="${frBtn} bg-rose-600 hover:bg-rose-500 text-white">🎙️ Contestar</button>`}
            <button id="fr-pista" onclick="frDialogoPista()" class="${frBtn} bg-stadium-800 border border-slate-700 text-slate-200">💡 Ayuda</button>
          </div>
          ${frManual() ? frBotonesAdulto('frDialogoAdulto') : ''}
          <div id="fr-resultado" class="mt-3" role="status"></div>`}
      </div>`;
    if (!frDial.fin && frDial.hecho[frDial.turno] == null && !frDial.dicho) { frDial.dicho = true; setTimeout(() => { if (frVista.modo === 'dialogo' && frDial && frDial.d === d) decir(t.app); }, 250); }
}
function frDialogoPista() {
    const t = frDial.d.turnos[frDial.turno];
    document.getElementById('fr-resultado').innerHTML = `<div class="text-sm text-sky-200">💡 Puedes decir: «<strong>${frE(t.nino)}</strong>»</div>`;
    decir([FRASES_VOZ.podriasDecir, t.nino]);
}
function frDialogoVoz() {
    const dial = frDial, k = dial.turno, t = dial.d.turnos[k];
    frEscuchar('fr-hablar', (alts, err) => {
        if (frDial !== dial || dial.turno !== k) return;
        const res = document.getElementById('fr-resultado');
        if (!alts.length) { if (res) res.innerHTML = `<div class="text-sm text-amber-200">${frNoOido(err)}</div>`; return; }
        const ok = frTurnoOk(alts, t);
        if (!ok && dial.intentos < 1) {
            dial.intentos++;
            if (res) res.innerHTML = `<div class="text-sm text-amber-200">He oído: «${frE(alts[0])}». Prueba otra vez o pulsa 💡 Ayuda.</div>`;
            decir(FRASES_VOZ.otraVez);
            return;
        }
        frDialogoTurno(ok, 'auto');
    });
}
function frDialogoAdulto(bien) { frDialogoTurno(bien, 'adulto'); }
function frDialogoTurno(ok, metodo) {
    const dial = frDial; if (!dial || dial.fin) return;
    dial.hecho[dial.turno] = ok; if (ok) dial.ok++;
    dial.metodo = dial.metodo === 'adulto' || metodo === 'adulto' ? 'adulto' : 'auto';
    dial.intentos = 0; dial.dicho = false;
    if (dial.turno >= dial.d.turnos.length - 1) {
        dial.fin = true;
        const score = Math.round(100 * dial.ok / dial.d.turnos.length);
        dial.score = score;
        dial.xp = frRegistrar({ fid: dial.d.id, sit: dial.d.sit, act: 'dialogo', score, ok: score >= 66, metodo: dial.metodo });
        renderFrases();
        decir(score >= 66 ? [temaFrase(), FRASES_VOZ.dialogoBien] : FRASES_VOZ.sigueAsi);
        return;
    }
    if (ok) decir(FRASES_VOZ.muyBien);
    dial.turno++;
    setTimeout(() => { if (frDial === dial) renderFrases(); }, ok ? 900 : 300);
}
function frResumenDialogo() {
    const d = frDial;
    return `<div class="${d.score >= 66 ? 'bg-emerald-950/70 border-emerald-400' : 'bg-amber-950/60 border-amber-400'} border-2 rounded-2xl p-4" id="fr-dial-fin">
      <div class="font-game text-xl ${d.score >= 66 ? 'text-emerald-300' : 'text-amber-300'}">${d.score >= 66 ? temaMascota() + ' ¡Qué bien has hablado!' : '💪 ¡Sigue practicando!'}${frXpHtml(d.xp)}</div>
      <div class="text-sm text-slate-200 mt-1">${d.ok} de ${d.d.turnos.length} respuestas bien.</div>
      <button onclick="frDial=null; frIr('dialogo')" class="mt-3 ${frBtn} bg-pitch-600 hover:bg-pitch-500 text-white">🔁 Otra vez</button>
      <button onclick="frIr('sit')" class="mt-3 ${frBtn} bg-stadium-800 border border-slate-700 text-slate-200">Terminar</button></div>`;
}

/* ----- Mi progreso: frases por situación ----- */
function renderProgresoFrases() {
    const box = typeof document !== 'undefined' && document.getElementById('prog-frases');
    if (!box) return;
    const regs = frasesData.registros;
    box.innerHTML = `<h4 class="font-bold text-sm text-white mb-2">💬 Frases cotidianas</h4>
      ${regs.length ? '' : '<p class="text-xs text-slate-400 mb-2">Todavía no hay práctica de frases.</p>'}
      <div class="grid grid-cols-1 sm:grid-cols-2 gap-2" id="prog-frases-sit">${FR_SITUACIONES.map(s => {
        const p = frProgresoSit(regs, s.id);
        return `<div class="text-xs text-slate-300"><div class="flex justify-between"><span>${s.emoji} ${frE(s.nombre)}</span><span>${p.pct} %</span></div>${frBarra(p.pct)}
          <div class="text-[11px] text-slate-500">${p.frases.ok}/${p.frases.total} frases · ${p.dirias.ok}/${p.dirias.total} «¿qué dirías?» · diálogo ${p.dialogos.ok ? '✅' : '—'}</div></div>`;
    }).join('')}</div>`;
}
if (typeof renderProgresoHabla === 'function') {
    const _renderProgresoHablaSinFrases = renderProgresoHabla;
    renderProgresoHabla = function () { const r = _renderProgresoHablaSinFrases.apply(this, arguments); try { renderProgresoFrases(); } catch (e) { console.error(e); } return r; };
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = { FR_SITUACIONES, FRASES, FR_DIRIAS, FR_DIALOGOS, FR_ACTIVIDADES, frNorm, frOpcionEn, frDiriasOk, frPuntuar, frResultado, frTurnoOk, frConseguidas, frProgresoSit, frParaServidor, frasesVacias, frFrase };
}
