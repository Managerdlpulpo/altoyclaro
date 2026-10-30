/* Me gusta hablar Alto y claro · 📖 Leo en voz alta
   - Cuentos cortos ORIGINALES (niveles 0-3). El niño lee en voz alta; el reconocimiento de voz del
     navegador (es-ES, continuo) escucha y se alinea palabra a palabra con el texto.
   - Se mide (de forma APROXIMADA): precisión, palabras correctas por minuto, pausas largas,
     autocorrecciones, hasta dónde ha leído e indicador de pronunciación; luego preguntas de comprensión.
   - Se guarda en este dispositivo ('ligaHablaLectura'). Con clave, al servidor SOLO van las puntuaciones
     (nunca lo que se oyó ni el audio). La grabación (opcional) se queda SOLO en este dispositivo.
   Formato: una frase por línea (scripts/generar-audios.py lee este bloque para grabar las frases). */

const CUENTOS = [
    {
        id: 'l0-gato', nivel: 0, tema: 'animales', foto: 'el gato', titulo: 'El gato Bigotes',
        texto: [
            'Bigotes es un gato gris.',
            'Bigotes duerme en la cama de Ana.',
            'Por la mañana, Bigotes bebe leche y juega con una pelota.',
            'Ana quiere mucho a Bigotes.',
        ],
        preguntas: [
            { tipo: 'elegir', p: '¿De qué color es Bigotes?', ops: ['Gris', 'Negro', 'Blanco'], ok: 0 },
            { tipo: 'decir', p: '¿Dónde duerme Bigotes?', claves: ['cama'], r: 'En la cama de Ana.' },
        ]
    },
    {
        id: 'l0-manzana', nivel: 0, tema: 'comida', foto: 'la manzana', titulo: 'La manzana roja',
        texto: [
            'Leo tiene una manzana roja.',
            'La manzana es grande y dulce.',
            'Leo lava la manzana.',
            'Después, se la come en el patio con su amiga Sara.',
        ],
        preguntas: [
            { tipo: 'elegir', p: '¿De qué color es la manzana?', ops: ['Roja', 'Verde', 'Amarilla'], ok: 0 },
            { tipo: 'decir', p: '¿Dónde se come Leo la manzana?', claves: ['patio'], r: 'En el patio.' },
        ]
    },
    {
        id: 'l0-balon', nivel: 0, tema: 'futbol', foto: 'el balón', titulo: 'Mi balón',
        texto: [
            'Tengo un balón nuevo.',
            'Es blanco y negro.',
            'Juego al fútbol con mi hermano.',
            'Yo chuto fuerte y el balón entra en la portería.',
            '¡Gol!',
        ],
        preguntas: [
            { tipo: 'elegir', p: '¿Con quién juega al fútbol?', ops: ['Con su hermano', 'Con su abuela', 'Solo'], ok: 0 },
            { tipo: 'decir', p: '¿De qué colores es el balón?', claves: ['blanco', 'negro'], r: 'Blanco y negro.' },
        ]
    },
    {
        id: 'l0-dientes', nivel: 0, tema: 'mezcla', foto: 'el cepillo de dientes', titulo: 'Los dientes de Hugo',
        texto: [
            'Hugo se lava los dientes.',
            'Usa su cepillo azul y un poco de pasta.',
            'Se lava por la mañana y por la noche.',
            '¡Qué sonrisa tan bonita!',
        ],
        preguntas: [
            { tipo: 'elegir', p: '¿De qué color es el cepillo?', ops: ['Azul', 'Rojo', 'Verde'], ok: 0 },
            { tipo: 'decir', p: '¿Cuándo se lava Hugo los dientes?', claves: ['manana', 'noche'], r: 'Por la mañana y por la noche.' },
        ]
    },
    {
        id: 'l0-flor', nivel: 0, tema: 'naturaleza', foto: 'la flor', titulo: 'La flor del jardín',
        texto: [
            'En el jardín hay una flor amarilla.',
            'Sale el sol y la flor se abre.',
            'Una abeja pequeña viene a visitarla.',
            'Mi abuela riega la flor con agua.',
        ],
        preguntas: [
            { tipo: 'elegir', p: '¿Quién visita la flor?', ops: ['Una abeja', 'Un perro', 'Un pez'], ok: 0 },
            { tipo: 'decir', p: '¿Con qué riega la abuela la flor?', claves: ['agua'], r: 'Con agua.' },
        ]
    },
    {
        id: 'l1-perro', nivel: 1, tema: 'animales', foto: 'el perro', titulo: 'El perro en el parque',
        texto: [
            'Mi perro se llama Rayo.',
            'Es pequeño, marrón y muy rápido.',
            'Todas las tardes vamos al parque.',
            'Allí Rayo corre detrás de los pájaros, pero nunca los atrapa.',
            'Cuando se cansa, se tumba debajo de un árbol.',
            'Luego volvemos a casa y bebe mucha agua.',
        ],
        preguntas: [
            { tipo: 'elegir', p: '¿Cómo se llama el perro?', ops: ['Rayo', 'Toby', 'Sol'], ok: 0 },
            { tipo: 'decir', p: '¿Qué hace Rayo cuando se cansa?', claves: ['tumba', 'arbol', 'descansa', 'duerme', 'tumbarse'], r: 'Se tumba debajo de un árbol.' },
            { tipo: 'elegir', p: '¿Cuándo van al parque?', ops: ['Por la tarde', 'Por la noche', 'Nunca'], ok: 0 },
        ]
    },
    {
        id: 'l1-desayuno', nivel: 1, tema: 'comida', foto: 'el vaso', titulo: 'El desayuno',
        texto: [
            'Por la mañana, Lucía desayuna en la cocina.',
            'Su padre le pone un vaso de leche y pan con tomate.',
            'Lucía también se come un plátano.',
            'Después se lava las manos, coge la mochila y sale hacia el colegio.',
            '¡Hoy tiene clase de música!',
        ],
        preguntas: [
            { tipo: 'elegir', p: '¿Qué bebe Lucía?', ops: ['Leche', 'Zumo', 'Agua'], ok: 0 },
            { tipo: 'decir', p: '¿Qué fruta se come Lucía?', claves: ['platano', 'platanos'], r: 'Un plátano.' },
        ]
    },
    {
        id: 'l1-pajaro', nivel: 1, tema: 'naturaleza', foto: 'el pájaro', titulo: 'El pájaro en la ventana',
        texto: [
            'Un pájaro azul se para en mi ventana.',
            'Canta una canción muy alegre.',
            'Le pongo unas migas de pan en un plato pequeño.',
            'El pájaro come, mueve las alas y se va volando hacia los árboles.',
            'Mañana, a lo mejor, vuelve a visitarme.',
        ],
        preguntas: [
            { tipo: 'elegir', p: '¿De qué color es el pájaro?', ops: ['Azul', 'Rojo', 'Negro'], ok: 0 },
            { tipo: 'decir', p: '¿Qué le da de comer al pájaro?', claves: ['pan', 'migas'], r: 'Migas de pan.' },
        ]
    },
    {
        id: 'l1-fruta', nivel: 1, tema: 'comida', foto: 'la fresa', titulo: 'La frutería',
        texto: [
            'El sábado voy con mi madre a la frutería.',
            'Compramos naranjas, plátanos y fresas.',
            'Las fresas son rojas y huelen muy bien.',
            'El frutero me regala una mandarina.',
            'Yo le digo: «¡Muchas gracias!».',
            'En casa preparamos una macedonia para merendar.',
        ],
        preguntas: [
            { tipo: 'elegir', p: '¿Qué le regala el frutero?', ops: ['Una mandarina', 'Una fresa', 'Una manzana'], ok: 0 },
            { tipo: 'decir', p: '¿Qué le dice el niño al frutero?', claves: ['gracias'], r: '¡Muchas gracias!' },
        ]
    },
    {
        id: 'l1-bici', nivel: 1, tema: 'transporte', foto: 'la bicicleta', titulo: 'La bicicleta de Marta',
        texto: [
            'Marta tiene una bicicleta roja.',
            'Los domingos va al parque con su padre.',
            'Siempre lleva el casco puesto.',
            'Al principio iba despacio, pero ahora ya pedalea muy bien.',
            'Cuando ve una cuesta, Marta grita: «¡Allá voy!».',
            'Y baja con mucho cuidado.',
        ],
        preguntas: [
            { tipo: 'elegir', p: '¿Qué lleva siempre Marta?', ops: ['El casco', 'Una gorra', 'Una mochila'], ok: 0 },
            { tipo: 'decir', p: '¿De qué color es la bicicleta?', claves: ['roja', 'rojo'], r: 'Roja.' },
        ]
    },
    {
        id: 'l2-partido', nivel: 2, tema: 'futbol', foto: 'la camiseta', titulo: 'El partido del sábado',
        texto: [
            'El sábado jugamos un partido contra el equipo del otro colegio.',
            'Yo llevaba la camiseta verde con el número siete.',
            'Al principio estábamos nerviosos y ellos marcaron el primer gol.',
            'En el descanso, la entrenadora nos pidió que pasáramos más el balón.',
            'En la segunda parte, Pablo me dio un pase muy bueno y yo marqué.',
            'Al final empatamos a uno.',
            'Después del partido, nos dimos la mano y merendamos todos juntos.',
        ],
        preguntas: [
            { tipo: 'elegir', p: '¿Qué número llevaba en la camiseta?', ops: ['El siete', 'El diez', 'El uno'], ok: 0 },
            { tipo: 'decir', p: '¿Cómo terminó el partido?', claves: ['empate', 'empataron', 'empatamos', 'empatar', 'uno'], r: 'Empataron a uno.' },
            { tipo: 'elegir', p: '¿Qué hicieron después del partido?', ops: ['Merendaron juntos', 'Se fueron a dormir', 'Vieron la tele'], ok: 0 },
        ]
    },
    {
        id: 'l2-tortilla', nivel: 2, tema: 'comida', foto: 'los huevos', titulo: 'Cocinamos una tortilla',
        texto: [
            'Ayer mi abuelo y yo hicimos una tortilla de patatas.',
            'Primero, él peló y cortó las patatas, porque el cuchillo corta mucho.',
            'Yo batí cuatro huevos en un plato hondo con un tenedor.',
            'Luego lo mezclamos todo con un poco de sal.',
            'El abuelo le dio la vuelta a la tortilla con un plato grande.',
            '¡Casi se cae!',
            'Al final nos salió redonda y muy rica, y la comimos con pan.',
        ],
        preguntas: [
            { tipo: 'elegir', p: '¿Cuántos huevos batió?', ops: ['Cuatro', 'Dos', 'Diez'], ok: 0 },
            { tipo: 'decir', p: '¿Quién cortó las patatas?', claves: ['abuelo'], r: 'El abuelo.' },
        ]
    },
    {
        id: 'l2-parque', nivel: 2, tema: 'mezcla', foto: 'la pelota', titulo: 'La tarde en el parque',
        texto: [
            'Después del colegio fuimos al parque con mis primos.',
            'Primero subimos al tobogán y luego jugamos a la pelota.',
            'De repente, la pelota rodó hasta un charco y se llenó de barro.',
            'Mi prima Elena la limpió con un pañuelo.',
            'Más tarde merendamos un bocadillo sentados en un banco.',
            'Cuando empezó a oscurecer, nos despedimos de los columpios y volvimos a casa cansados y contentos.',
        ],
        preguntas: [
            { tipo: 'elegir', p: '¿Dónde cayó la pelota?', ops: ['En un charco', 'En el río', 'En un árbol'], ok: 0 },
            { tipo: 'decir', p: '¿Quién limpió la pelota?', claves: ['elena', 'prima'], r: 'Su prima Elena.' },
        ]
    },
    {
        id: 'l2-lluvia', nivel: 2, tema: 'naturaleza', foto: 'el árbol', titulo: 'Un día de lluvia',
        texto: [
            'El martes llovió muchísimo durante toda la mañana.',
            'No pudimos salir al patio, así que la profesora nos leyó un cuento en clase.',
            'Por la ventana veíamos cómo caían las gotas de las hojas del árbol.',
            'A la salida, me puse las botas de agua y salté en todos los charcos.',
            'Mi madre se rio y me dijo que parecía una rana.',
            'Por la tarde salió el sol y apareció un arcoíris precioso.',
        ],
        preguntas: [
            { tipo: 'elegir', p: '¿Qué apareció por la tarde?', ops: ['Un arcoíris', 'La luna', 'La nieve'], ok: 0 },
            { tipo: 'decir', p: '¿A qué animal se parecía saltando en los charcos?', claves: ['rana', 'ranas'], r: 'A una rana.' },
        ]
    },
    {
        id: 'l2-tren', nivel: 2, tema: 'transporte', foto: 'el tren', titulo: 'El viaje en tren',
        texto: [
            'En verano fuimos en tren a visitar a mis tíos.',
            'El tren salió muy temprano de la estación.',
            'Yo me senté al lado de la ventana para ver el paisaje.',
            'Vimos montañas, ríos y muchas vacas en el campo.',
            'Durante el viaje jugamos a las cartas y comimos fruta.',
            'Tres horas después, el tren llegó a su destino.',
            'Mis tíos nos esperaban en el andén con una gran sonrisa.',
        ],
        preguntas: [
            { tipo: 'elegir', p: '¿Dónde se sentó?', ops: ['Al lado de la ventana', 'En el suelo', 'Junto a la puerta'], ok: 0 },
            { tipo: 'decir', p: '¿Qué animales vieron en el campo?', claves: ['vacas', 'vaca'], r: 'Vacas.' },
            { tipo: 'elegir', p: '¿Cuánto duró el viaje?', ops: ['Tres horas', 'Un día', 'Diez minutos'], ok: 0 },
        ]
    },
    {
        id: 'l3-granja', nivel: 3, tema: 'animales', foto: 'el caballo', titulo: 'La granja del tío Juan',
        texto: [
            'El fin de semana pasado fuimos a la granja del tío Juan.',
            'Nada más llegar, su perro Lobo salió a recibirnos moviendo la cola.',
            'El tío nos enseñó las vacas, las gallinas y un caballo marrón que se llamaba Trueno.',
            '«¿Puedo darle de comer?», le pregunté.',
            '«Claro, pero ponle la zanahoria en la mano abierta», me contestó.',
            'Trueno se la comió en un segundo y me hizo cosquillas con los labios.',
            'Por la tarde recogimos huevos todavía calientes y los llevamos a la cocina en una cesta.',
            'Antes de irnos, el tío Juan nos prometió que en primavera podríamos montar a caballo.',
            '¡Estoy deseando volver!',
        ],
        preguntas: [
            { tipo: 'elegir', p: '¿Cómo se llamaba el caballo?', ops: ['Trueno', 'Lobo', 'Rayo'], ok: 0 },
            { tipo: 'decir', p: '¿Qué le dio de comer al caballo?', claves: ['zanahoria', 'zanahorias'], r: 'Una zanahoria.' },
            { tipo: 'elegir', p: '¿Qué podrán hacer en primavera?', ops: ['Montar a caballo', 'Ir a la playa', 'Pescar en el río'], ok: 0 },
        ]
    },
    {
        id: 'l3-cumple', nivel: 3, tema: 'mezcla', foto: 'la mesa', titulo: 'La sorpresa de cumpleaños',
        texto: [
            'El jueves era el cumpleaños de mi madre, y mi hermana y yo le preparamos una sorpresa.',
            'Por la mañana, mientras ella trabajaba, hicimos un dibujo enorme con globos y flores.',
            'Mi padre nos ayudó a preparar un bizcocho de chocolate.',
            'Después pusimos la mesa con el mantel bueno y escondimos el regalo debajo de una silla.',
            'Cuando mamá abrió la puerta, apagamos las luces y gritamos: «¡Sorpresa!».',
            'Ella se llevó las manos a la cara y empezó a reírse.',
            '«¡Es el mejor cumpleaños de mi vida!», dijo mientras soplaba las velas.',
            'Luego comimos bizcocho hasta que no pudimos más.',
        ],
        preguntas: [
            { tipo: 'elegir', p: '¿De qué era el bizcocho?', ops: ['De chocolate', 'De limón', 'De fresa'], ok: 0 },
            { tipo: 'decir', p: '¿Qué gritaron cuando entró mamá?', claves: ['sorpresa'], r: '¡Sorpresa!' },
            { tipo: 'elegir', p: '¿Dónde escondieron el regalo?', ops: ['Debajo de una silla', 'En el armario', 'En la cama'], ok: 0 },
        ]
    },
    {
        id: 'l3-manos', nivel: 3, tema: 'mezcla', foto: 'la toalla', titulo: 'Las manos limpias',
        texto: [
            'Un día, en clase, la profesora Carmen nos hizo un experimento.',
            'Echó un poco de purpurina en las manos de Daniel y le pidió que saludara a sus compañeros.',
            'En pocos minutos, casi toda la clase tenía las manos brillantes.',
            '«Los microbios son como la purpurina, pero no se ven», nos explicó.',
            'Después fuimos al baño y nos lavamos las manos con agua y jabón.',
            'Contamos hasta veinte mientras frotábamos entre los dedos y debajo de las uñas.',
            'Al final, nos secamos con la toalla.',
            'Desde ese día, me lavo las manos antes de comer y después de jugar en el patio.',
        ],
        preguntas: [
            { tipo: 'elegir', p: '¿Qué echó la profesora en las manos de Daniel?', ops: ['Purpurina', 'Pintura', 'Arena'], ok: 0 },
            { tipo: 'decir', p: '¿Hasta qué número contaron?', claves: ['veinte'], r: 'Hasta veinte.' },
        ]
    },
    {
        id: 'l3-final', nivel: 3, tema: 'futbol', foto: 'el balón', titulo: 'La final del torneo',
        texto: [
            'Por fin llegó el día de la final del torneo del barrio.',
            'Nuestro equipo, los Leones, jugaba contra los Tigres, que no habían perdido ningún partido.',
            'Las gradas estaban llenas de familias con bufandas y carteles.',
            'En la primera parte, los Tigres marcaron dos goles y nosotros solo uno.',
            'En el descanso, nuestra capitana, Irene, nos animó: «¡Todavía podemos ganar si jugamos juntos!».',
            'En la segunda parte, Irene empató con un remate de cabeza.',
            'Faltaba un minuto cuando Samuel robó el balón y me lo pasó.',
            'Respiré hondo, chuté con todas mis fuerzas y el balón entró por la escuadra.',
            '¡Éramos campeones!',
        ],
        preguntas: [
            { tipo: 'elegir', p: '¿Cómo se llamaba nuestro equipo?', ops: ['Los Leones', 'Los Tigres', 'Los Lobos'], ok: 0 },
            { tipo: 'decir', p: '¿Quién era la capitana?', claves: ['irene'], r: 'Irene.' },
            { tipo: 'elegir', p: '¿Cómo empató Irene?', ops: ['De cabeza', 'De penalti', 'Con la mano'], ok: 0 },
        ]
    },
];
// FIN CUENTOS

/* ---------- Funciones puras (sin DOM; se prueban en test/lectura.test.mjs) ---------- */
const LEC_UMBRAL_BIEN = 0.8;      // parecido ≥ 0.8 → bien
const LEC_UMBRAL_DUDAS = 0.5;     // 0.5–0.8 → con dudas; < 0.5 → no se entendió
const LEC_PAUSA_LARGA_MS = 3000;  // silencio entre dos palabras seguidas que cuenta como pausa larga
const LEC_OBJETIVO_PPM = [20, 40, 60, 80]; // orientativo por nivel (palabras correctas por minuto)
const LEC_RELLENOS = new Set(['eh', 'ehh', 'em', 'emm', 'mm', 'mmm', 'um', 'uh', 'ah', 'hm', 'hmm']);
const LEC_UNIDADES = ['cero', 'uno', 'dos', 'tres', 'cuatro', 'cinco', 'seis', 'siete', 'ocho', 'nueve', 'diez',
    'once', 'doce', 'trece', 'catorce', 'quince', 'dieciseis', 'diecisiete', 'dieciocho', 'diecinueve', 'veinte',
    'veintiuno', 'veintidos', 'veintitres', 'veinticuatro', 'veinticinco', 'veintiseis', 'veintisiete', 'veintiocho', 'veintinueve'];
const LEC_DECENAS = { 3: 'treinta', 4: 'cuarenta', 5: 'cincuenta', 6: 'sesenta', 7: 'setenta', 8: 'ochenta', 9: 'noventa' };

// El reconocedor a veces escribe "7" en vez de "siete": lo pasamos a palabras (como en el texto)
function lecNumero(n) {
    if (n < 30) return LEC_UNIDADES[n];
    if (n < 100) return LEC_DECENAS[Math.floor(n / 10)] + (n % 10 ? ' y ' + LEC_UNIDADES[n % 10] : '');
    if (n === 100) return 'cien';
    return String(n);
}
function lecNorm(s) {
    return String(s == null ? '' : s).toLowerCase()
        .replace(/\d+/g, m => ' ' + lecNumero(parseInt(m, 10)) + ' ')
        .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9\s]/g, ' ').replace(/\s+/g, ' ').trim();
}
function lecPalabras(s) { return lecNorm(s).split(' ').filter(w => w && !LEC_RELLENOS.has(w)); }
function lecLev(a, b) {
    if (a === b) return 0;
    if (!a.length) return b.length;
    if (!b.length) return a.length;
    let prev = new Array(b.length + 1), cur = new Array(b.length + 1);
    for (let j = 0; j <= b.length; j++) prev[j] = j;
    for (let i = 1; i <= a.length; i++) {
        cur[0] = i;
        for (let j = 1; j <= b.length; j++) cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
        [prev, cur] = [cur, prev];
    }
    return prev[b.length];
}
function lecSim(a, b) { if (a === b) return 1; const m = Math.max(a.length, b.length); return m ? 1 - lecLev(a, b) / m : 1; }
function lecCosteSub(s) {
    if (s >= LEC_UMBRAL_BIEN) return (1 - s) * 0.5;               // 0 … 0.1
    if (s >= LEC_UMBRAL_DUDAS) return 0.3 + (LEC_UMBRAL_BIEN - s); // 0.3 … 0.6
    return 1.1;                                                     // palabra distinta (más barato que saltar + insertar, y que dos extras)
}
const LEC_COSTE_SALTO = 1, LEC_COSTE_EXTRA = 0.6;
function lecEstadoDe(s) { return s >= LEC_UMBRAL_BIEN ? 'b' : s >= LEC_UMBRAL_DUDAS ? 'd' : 'm'; }

// Alinea las palabras del texto (ref) con lo reconocido (hyp). Programación dinámica tipo Needleman-Wunsch:
// acierto/sustitución, palabra saltada, palabra de más (repeticiones, autocorrecciones…), y unir/partir
// palabras ("en cima" ↔ "encima"). Devuelve un estado por palabra del texto:
//   b = bien · d = con dudas · m = no se entendió (dijo otra cosa) · s = saltada · n = no leída (después de donde paró)
function lecAlinear(ref, hyp) {
    const n = ref.length, m = hyp.length;
    const D = [], P = [];
    for (let i = 0; i <= n; i++) { D.push(new Float64Array(m + 1)); P.push(new Uint8Array(m + 1)); }
    for (let i = 1; i <= n; i++) { D[i][0] = i * LEC_COSTE_SALTO; P[i][0] = 2; }
    for (let j = 1; j <= m; j++) { D[0][j] = j * LEC_COSTE_EXTRA; P[0][j] = 3; }
    const S = [];
    for (let i = 0; i < n; i++) { const fila = new Float64Array(m); for (let j = 0; j < m; j++) fila[j] = lecSim(ref[i], hyp[j]); S.push(fila); }
    const SM = {}; // similitudes de unir/partir (solo las que valen)
    for (let i = 1; i <= n; i++) {
        for (let j = 1; j <= m; j++) {
            let best = D[i - 1][j - 1] + lecCosteSub(S[i - 1][j - 1]), p = 1;
            const del = D[i - 1][j] + LEC_COSTE_SALTO; if (del < best) { best = del; p = 2; }
            const ins = D[i][j - 1] + LEC_COSTE_EXTRA; if (ins < best) { best = ins; p = 3; }
            if (i >= 2) {
                const r2 = ref[i - 2] + ref[i - 1], h = hyp[j - 1];
                if (Math.abs(r2.length - h.length) <= 2) {
                    const s = lecSim(r2, h);
                    if (s >= LEC_UMBRAL_BIEN) { const c = D[i - 2][j - 1] + lecCosteSub(s) + 0.05; if (c < best) { best = c; p = 4; SM[i + ',' + j] = s; } }
                }
            }
            if (j >= 2) {
                const r = ref[i - 1], h2 = hyp[j - 2] + hyp[j - 1];
                if (Math.abs(r.length - h2.length) <= 2) {
                    const s = lecSim(r, h2);
                    if (s >= LEC_UMBRAL_BIEN) { const c = D[i - 1][j - 2] + lecCosteSub(s) + 0.05; if (c < best) { best = c; p = 5; SM['p' + i + ',' + j] = s; } }
                }
            }
            D[i][j] = best; P[i][j] = p;
        }
    }
    // Reconstrucción
    // El final del texto que no se ha leído no penaliza (se marca "no leída"): empezamos en la mejor fila
    let iFin = 0;
    for (let k = 1; k <= n; k++) if (D[k][m] < D[iFin][m] - 1e-9) iFin = k;
    const ops = [];
    let i = iFin, j = m;
    while (i > 0 || j > 0) {
        const p = P[i][j];
        if (p === 1) { ops.push({ op: 'par', i: [i - 1], j: [j - 1], s: S[i - 1][j - 1] }); i--; j--; }
        else if (p === 2) { ops.push({ op: 'salto', i: [i - 1], j: [] }); i--; }
        else if (p === 3) { ops.push({ op: 'extra', i: [], j: [j - 1] }); j--; }
        else if (p === 4) { ops.push({ op: 'par', i: [i - 2, i - 1], j: [j - 1], s: SM[i + ',' + j] }); i -= 2; j--; }
        else { ops.push({ op: 'par', i: [i - 1], j: [j - 2, j - 1], s: SM['p' + i + ',' + j] }); i--; j -= 2; }
    }
    ops.reverse();
    const estados = new Array(n).fill('s'), sims = new Array(n).fill(0), hypDe = new Array(n).fill(-1);
    ops.forEach(o => { if (o.op === 'par') o.i.forEach(k => { estados[k] = lecEstadoDe(o.s); sims[k] = o.s; hypDe[k] = o.j[o.j.length - 1]; }); });
    // Hasta dónde ha leído: la última palabra reconocida bien o con dudas; lo de después es "no leída"
    let ultimo = -1;
    for (let k = n - 1; k >= 0; k--) if (estados[k] === 'b' || estados[k] === 'd') { ultimo = k; break; }
    for (let k = ultimo + 1; k < n; k++) { estados[k] = 'n'; sims[k] = 0; hypDe[k] = -1; }
    // Palabras de más: repeticiones (vuelve a leer lo mismo) y autocorrecciones (dice algo parecido y lo corrige)
    let repeticiones = 0, autoc = 0, extras = 0;
    const corregida = new Array(n).fill(false);
    const parecida = (a, b) => lecSim(a, b) >= LEC_UMBRAL_BIEN;
    const intento = (w, r) => r && (lecSim(w, r) >= 0.34 || (w.length >= 2 && r.startsWith(w)));
    let consumidas = 0;
    for (let q = 0; q < ops.length; q++) {
        const o = ops[q];
        if (o.op !== 'extra') { consumidas += o.i.length; continue; }
        const run = [];
        while (q < ops.length && ops[q].op === 'extra') { run.push(hyp[ops[q].j[0]]); q++; }
        q--;
        const p = consumidas, L = run.length;
        if (p > ultimo + 1) continue; // ruido después de terminar
        const atras = ref.slice(Math.max(0, p - L), p), delante = ref.slice(p, p + L);
        const igual = seg => seg.length === L && seg.every((w, k) => parecida(run[k], w));
        if (igual(atras) || igual(delante)) { repeticiones++; continue; }
        const sig = ops[q + 1];
        const ultimoRun = run[L - 1];
        const casiDelante = delante.length === L && delante.every((w, k) => k === L - 1 ? intento(run[k], w) : parecida(run[k], w));
        if (p < n && sig && sig.op === 'par' && sig.i[0] === p && sig.s >= LEC_UMBRAL_BIEN && L <= 4 && (casiDelante || intento(ultimoRun, ref[p]))) {
            autoc++; corregida[p] = true; continue;
        }
        extras += L;
    }
    return { estados, sims, hypDe, ultimo, repeticiones, autoc, extras, corregida };
}

// Palabras correctas por minuto
function lecPCPM(correctas, ms) { return ms > 0 ? Math.min(400, Math.round(correctas * 60000 / ms)) : 0; }

// Estrellas (0-3): leer casi todo y casi todo bien = 3
function lecEstrellas(prec, compl, correctas) {
    if (!correctas) return 0;
    if (compl >= 90 && prec >= 90) return 3;
    if (compl >= 60 && prec >= 70) return 2;
    return 1;
}

// Métricas de una lectura. estados: los de lecAlinear (o los que marca el adulto).
// o.ms: duración (si no, se calcula con o.tiempos = instante en que se reconoció cada palabra)
function lecMetricas(estados, o = {}) {
    const n = estados.length;
    let ultimo = -1;
    for (let k = n - 1; k >= 0; k--) if (estados[k] !== 'n') { ultimo = k; break; }
    const leidas = ultimo + 1;
    let correctas = 0;
    for (let k = 0; k <= ultimo; k++) if (estados[k] === 'b' || estados[k] === 'd') correctas++;
    const prec = leidas ? Math.round(correctas / leidas * 100) : 0;
    const compl = n ? Math.round(leidas / n * 100) : 0;
    let ms = o.ms, pausas = null;
    if (o.tiempos) {
        const tt = [];
        for (let k = 0; k <= ultimo; k++) if (o.tiempos[k] != null && (estados[k] === 'b' || estados[k] === 'd')) tt.push(o.tiempos[k]);
        if (ms == null && tt.length) {
            const primero = Math.min(...tt), fin = Math.max(...tt);
            // inicio: cuando el navegador detectó voz (si es coherente) o ~0,6 s antes de la primera palabra
            const inicio = o.inicio && o.inicio <= primero && primero - o.inicio < 3000 ? o.inicio : primero - 600;
            ms = Math.max(1000, fin - inicio);
        }
        pausas = 0;
        for (let k = 1; k < tt.length; k++) if (tt[k] - tt[k - 1] > LEC_PAUSA_LARGA_MS) pausas++;
    }
    let pron = null;
    if (o.sims) {
        let suma = 0, c = 0;
        for (let k = 0; k <= ultimo; k++) if (estados[k] === 'b' || estados[k] === 'd' || estados[k] === 'm') { suma += o.sims[k]; c++; }
        pron = c ? Math.round(suma / c * 100) : 0;
    }
    const ppm = lecPCPM(correctas, ms || 0);
    return {
        n, leidas, correctas, prec, compl, ppm, ms: ms || 0, pausas, pron,
        autoc: o.autoc == null ? null : o.autoc, repeticiones: o.repeticiones == null ? null : o.repeticiones,
        est: lecEstrellas(prec, compl, correctas)
    };
}

// Palabras del texto (para pintar y para alinear). Los signos sueltos («, —, ¡…) se pegan a la palabra vecina.
function lecTokens(cuento) {
    const ref = [], disp = [], frase = [];
    let prefijo = '';
    cuento.texto.forEach((f, fi) => {
        f.split(/\s+/).filter(Boolean).forEach(trozo => {
            const ws = lecPalabras(trozo);
            if (!ws.length) {
                if (ref.length && frase[frase.length - 1] === fi && !/^[«¿¡(]/.test(trozo)) disp[disp.length - 1] += ' ' + trozo;
                else prefijo += trozo + ' ';
                return;
            }
            ref.push(ws.join('')); disp.push(prefijo + trozo); frase.push(fi); prefijo = '';
        });
    });
    return { ref, disp, frase };
}

// ¿La respuesta hablada contiene alguna palabra clave?
function lecRespuestaOk(alternativas, claves) {
    return (alternativas || []).some(a => {
        const ws = lecPalabras(a);
        return claves.some(c => { const cw = lecNorm(c); return ws.some(w => lecSim(w, cw) >= LEC_UMBRAL_BIEN); });
    });
}
function lecContarPalabras(c) { return lecTokens(c).ref.length; }

/* =====================================================================
   Datos de las lecturas (este dispositivo) y lo que se sincroniza
   ===================================================================== */
const LECTURA_KEY = 'ligaHablaLectura';
function lecturaVacia() { return { version: 1, lecturas: [], guardarAudio: false }; }
function cargarLecturas() {
    try {
        const d = JSON.parse(localStorage.getItem(LECTURA_KEY));
        if (d && Array.isArray(d.lecturas)) return Object.assign(lecturaVacia(), d);
    } catch (e) { }
    return lecturaVacia();
}
let lecturaData = typeof localStorage !== 'undefined' ? cargarLecturas() : lecturaVacia();
function guardarLecturas() {
    if (lecturaData.lecturas.length > 300) lecturaData.lecturas = lecturaData.lecturas.slice(-300);
    try { localStorage.setItem(LECTURA_KEY, JSON.stringify(lecturaData)); } catch (e) { console.warn('No se pudo guardar la lectura', e); }
    if (typeof programarSync === 'function') programarSync();
}
// Al servidor SOLO van puntuaciones (lista blanca también en el servidor): nunca lo oído ni el audio
const LEC_CAMPOS_SERVIDOR = ['id', 't', 'cuento', 'nivel', 'metodo', 'prec', 'ppm', 'compl', 'est', 'pausas', 'autoc', 'pron', 'comp', 'compN', 'dur', 'n', 'esc', 'e'];
function lecturaParaServidor(r) { const o = {}; LEC_CAMPOS_SERVIDOR.forEach(k => { if (r[k] !== undefined) o[k] = r[k]; }); return o; }
function lecturaParaExportar() {
    return lecturaData.lecturas.map(r => Object.assign(lecturaParaServidor(r), { titulo: (lecCuento(r.cuento) || {}).titulo || r.cuento, fecha: new Date(r.t).toISOString(), grabacion: !!r.audioId }));
}

/* ---------- Cuentos: desbloqueo y recomendación ---------- */
function lecCuento(id) { return CUENTOS.find(c => c.id === id) || null; }
function lecFoto(c) { const v = typeof visualVocab !== 'undefined' ? visualVocab.find(x => x.es === c.foto) : null; return v ? v.img : ''; }
function lecMejores(lecturas) {
    const m = {};
    (lecturas || []).forEach(r => { m[r.cuento] = Math.max(m[r.cuento] || 0, r.est || 0); });
    return m;
}
function lecDesbloqueado(c, nivel, mejores, profe) {
    if (profe || c.nivel <= nivel) return true;
    const i = CUENTOS.indexOf(c);
    return i > 0 && (mejores[CUENTOS[i - 1].id] || 0) >= 2; // el cuento anterior con ⭐⭐ o más
}
function lecRecomendado(nivel, mejores, temaCuento, profe) {
    const abiertos = CUENTOS.filter(c => lecDesbloqueado(c, nivel, mejores, profe) && (mejores[c.id] || 0) < 2);
    const pref = [
        c => c.nivel === nivel && c.tema === temaCuento,
        c => c.nivel === nivel,
        c => c.tema === temaCuento && c.nivel > nivel,
        c => c.nivel > nivel,
        () => true,
    ];
    for (const f of pref) { const r = abiertos.find(f); if (r) return r; }
    return CUENTOS.find(c => c.nivel === nivel) || CUENTOS[0];
}
function lecEsProfe() { return typeof rolActual !== 'undefined' && rolActual === 'profe'; }
function lecNivel() { return typeof gameState !== 'undefined' ? Math.max(0, Math.min(3, +gameState.level || 0)) : 1; }
function lecTemaClave() { return typeof gameState !== 'undefined' && typeof temaClave === 'function' ? temaClave(gameState) : 'mezcla'; }

/* =====================================================================
   Interfaz
   ===================================================================== */
let lecVista = 'lista', lecCuentoId = null, lecSesion = null, lecAdulto = null, lecRes = null;
let lecEscuchaTurno = 0, lecEscuchando = false, lecEscuchoAntes = false, lecPregSR = null;

function lecEsc(s) { return typeof esc === 'function' ? esc(s) : String(s); }
function lecEstrellasHTML(n, tam = '') { return `<span class="${tam}" aria-label="${n} de 3 estrellas">${'⭐'.repeat(n)}<span class="opacity-30">${'⭐'.repeat(3 - n)}</span></span>`; }
const LEC_NIVEL_NOMBRE = ['Nivel 0 · Primeros pasos', 'Nivel 1', 'Nivel 2', 'Nivel 3'];
const LEC_AVISO = 'Las puntuaciones son aproximadas: el reconocimiento de voz del navegador no siempre entiende bien a los niños (ni los acentos). Sirven para ver cómo avanza, no como nota.';

function lecturaOcupada() { return lecVista !== 'lista' || !!lecSesion || !!lecAdulto; }

function renderLectura() {
    const app = typeof document !== 'undefined' && document.getElementById('lectura-app');
    if (!app) return;
    if (lecVista === 'leer' && lecCuento(lecCuentoId)) app.innerHTML = lecVistaLeer();
    else if (lecVista === 'resultado' && lecRes) { app.innerHTML = lecVistaResultado(); lecPintarPregunta(); }
    else { lecVista = 'lista'; app.innerHTML = lecVistaLista(); }
}

function lecVistaLista() {
    const nivel = lecNivel(), profe = lecEsProfe(), mejores = lecMejores(lecturaData.lecturas);
    const tc = lecTemaClave(), rec = lecRecomendado(nivel, mejores, tc, profe);
    const t = typeof TEMAS !== 'undefined' ? TEMAS[tc] : null;
    const tarjeta = (c) => {
        const abierto = lecDesbloqueado(c, nivel, mejores, profe), est = mejores[c.id] || 0, palabras = lecContarPalabras(c);
        const tTema = typeof TEMAS !== 'undefined' && TEMAS[c.tema] ? TEMAS[c.tema].emoji : '';
        const ant = CUENTOS[CUENTOS.indexOf(c) - 1];
        return `<button type="button" ${abierto ? `onclick="lecAbrir('${c.id}')"` : 'disabled'} data-cuento="${c.id}"
            class="lec-tarjeta text-left bg-stadium-950 border ${c.id === rec.id ? 'border-pitch-500 ring-2 ring-pitch-500/40' : 'border-slate-800'} rounded-2xl overflow-hidden ${abierto ? 'hover:border-pitch-500' : 'opacity-60 cursor-not-allowed'} transition">
            <div class="relative h-28 bg-stadium-800">
                <img src="${lecFoto(c)}" alt="" class="w-full h-28 object-cover" loading="lazy">
                ${c.id === rec.id ? '<span class="absolute top-2 left-2 bg-pitch-600 text-white text-[10px] font-bold px-2 py-0.5 rounded-full">⭐ Recomendado</span>' : ''}
                ${tTema ? `<span class="absolute top-2 right-2 bg-stadium-950/80 text-sm px-1.5 rounded-full" title="Tema">${tTema}</span>` : ''}
                ${abierto ? '' : '<span class="absolute inset-0 flex items-center justify-center text-4xl bg-stadium-950/50">🔒</span>'}
            </div>
            <div class="p-3">
                <div class="font-bold text-white text-sm leading-tight">${lecEsc(c.titulo)}</div>
                <div class="text-[11px] text-slate-400 mt-0.5">${palabras} palabras · ${lecEstrellasHTML(est)}</div>
                ${abierto ? '' : `<div class="text-[10px] text-amber-300 mt-1">Consigue ⭐⭐ en «${lecEsc(ant ? ant.titulo : '')}» para abrirlo</div>`}
            </div></button>`;
    };
    const grupos = [0, 1, 2, 3].map(n => `
        <div class="mb-5">
            <h4 class="text-sm font-bold text-slate-200 mb-2">${LEC_NIVEL_NOMBRE[n]}${n === nivel ? ' <span class="text-[10px] bg-pitch-600 text-white px-2 py-0.5 rounded-full align-middle">tu nivel</span>' : ''}</h4>
            <div class="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">${CUENTOS.filter(c => c.nivel === n).map(tarjeta).join('')}</div>
        </div>`).join('');
    return `
        <div class="flex flex-wrap items-center justify-between gap-2 mb-3">
            <h3 class="font-game text-lg text-white">📖 Leo en voz alta</h3>
            <span class="text-xs text-slate-400">${lecturaData.lecturas.length} lecturas en total</span>
        </div>
        <div class="bg-gradient-to-r from-pitch-900 to-stadium-900 border border-pitch-600/40 rounded-2xl p-4 mb-5 flex flex-col sm:flex-row gap-4 items-center">
            <img src="${lecFoto(rec)}" alt="" class="w-24 h-24 rounded-2xl object-cover">
            <div class="flex-1 text-center sm:text-left">
                <div class="text-xs text-pitch-500 font-bold">${t ? t.mascota + ' ' : ''}Te recomiendo leer</div>
                <div class="font-game text-xl text-white">${lecEsc(rec.titulo)}</div>
                <div class="text-xs text-slate-300">${LEC_NIVEL_NOMBRE[rec.nivel]} · ${lecContarPalabras(rec)} palabras</div>
            </div>
            <button id="lec-recomendado" onclick="lecAbrir('${rec.id}')" class="bg-pitch-600 hover:bg-pitch-500 text-white font-bold px-6 py-3 rounded-xl">¡A leer!</button>
        </div>
        ${grupos}
        <p class="text-[11px] text-slate-400 mt-2">ℹ️ ${LEC_AVISO} Lo que se oye y las grabaciones se quedan en este dispositivo; con clave solo se guardan las puntuaciones.</p>`;
}

function lecAbrir(id) {
    const c = lecCuento(id);
    if (!c) return;
    lecGuardarPendiente();
    lecCuentoId = id; lecVista = 'leer'; lecEscuchoAntes = false; lecAdulto = null; lecRes = null;
    renderLectura();
    const app = document.getElementById('lectura-app'); if (app && app.scrollIntoView) app.scrollIntoView({ block: 'start', behavior: 'smooth' });
}
function lecVolverLista() { lecSalir(); renderLectura(); }

function lecTextoHTML(tk, clases) {
    let html = '', fAct = -1;
    tk.disp.forEach((w, k) => {
        if (tk.frase[k] !== fAct) { if (fAct >= 0) html += '</span> '; fAct = tk.frase[k]; html += `<span class="lec-frase" data-f="${fAct}">`; }
        html += `<span class="lec-w ${clases ? clases[k] || '' : ''}" data-i="${k}">${lecEsc(w)}</span> `;
    });
    return html + '</span>';
}
function lecPuedeEscuchar() { return !!(typeof SpeechRec !== 'undefined' && SpeechRec) && !(typeof hablaData !== 'undefined' && hablaData.soloManual); }

function lecVistaLeer() {
    const c = lecCuento(lecCuentoId), tk = lecTokens(c), sr = lecPuedeEscuchar();
    const grabar = typeof puedeGrabar !== 'undefined' && puedeGrabar;
    return `
        <div class="flex items-center justify-between gap-2 mb-3">
            <button onclick="lecVolverLista()" class="text-sm text-slate-300 hover:text-white">← Cuentos</button>
            <span class="text-[11px] text-slate-400">${LEC_NIVEL_NOMBRE[c.nivel]} · ${tk.ref.length} palabras</span>
        </div>
        <div class="flex items-center gap-3 mb-3">
            <img src="${lecFoto(c)}" alt="" class="w-16 h-16 rounded-xl object-cover">
            <h3 class="font-game text-xl sm:text-2xl text-white" id="lec-titulo">${lecEsc(c.titulo)}</h3>
        </div>
        <div id="lec-botones" class="flex flex-wrap gap-2 mb-3">
            <button id="lec-escuchar" onclick="lecEscuchar()" class="bg-sky-600 hover:bg-sky-500 text-white font-bold px-4 py-2.5 rounded-xl text-sm">🎧 Escuchar el cuento</button>
            ${sr ? `<button id="lec-empezar" onclick="lecEmpezar()" class="bg-pitch-600 hover:bg-pitch-500 text-white font-bold px-5 py-2.5 rounded-xl text-sm">🎙️ Empezar a leer</button>` : ''}
            <button id="lec-adulto-btn" onclick="lecModoAdulto()" class="bg-stadium-800 hover:bg-slate-700 border border-slate-700 text-white font-bold px-4 py-2.5 rounded-xl text-sm">👩‍🏫 Lo valora un adulto</button>
        </div>
        ${grabar ? `<label class="flex items-center gap-2 text-xs text-slate-300 mb-2"><input id="lec-guardar-audio" type="checkbox" ${lecturaData.guardarAudio ? 'checked' : ''} onchange="lecturaData.guardarAudio = this.checked; guardarLecturas();"> 🎙️ Guardar mi lectura en este dispositivo (para comparar la primera y la última; no sale de aquí)</label>` : ''}
        <p id="lec-estado" class="text-sm text-amber-200 min-h-[1.5rem] mb-2">${sr ? 'Escucha el cuento si quieres (es opcional) y pulsa «Empezar a leer». Lee en voz alta, despacio y claro.' : 'Este navegador no puede escuchar la lectura. Un adulto puede marcar las palabras («Lo valora un adulto»).'}</p>
        <div id="lec-adulto-panel" class="hidden"></div>
        <div id="lec-texto" class="lec-texto bg-stadium-950 border border-slate-800 rounded-2xl p-4 sm:p-6 text-white">${lecTextoHTML(tk)}</div>`;
}
function lecEstado(t) { const e = document.getElementById('lec-estado'); if (e) e.textContent = t; }
function lecMarcarFrase(f) { document.querySelectorAll('#lec-texto .lec-frase').forEach(el => el.classList.toggle('lec-frase-activa', +el.dataset.f === f)); }

/* ---------- Escuchar el cuento (voz grabada, frase a frase) ---------- */
async function lecEscuchar() {
    if (lecEscuchando) { lecPararEscucha(); return; }
    if (lecSesion) return;
    const c = lecCuento(lecCuentoId); if (!c) return;
    const turno = ++lecEscuchaTurno;
    lecEscuchando = true; lecEscuchoAntes = true;
    const b = document.getElementById('lec-escuchar'); if (b) b.textContent = '⏹ Parar';
    await decir(c.titulo);
    for (let f = 0; f < c.texto.length; f++) {
        if (turno !== lecEscuchaTurno) return;
        lecMarcarFrase(f);
        await decir(c.texto[f]);
    }
    if (turno === lecEscuchaTurno) lecFinEscucha();
}
function lecFinEscucha() {
    lecEscuchando = false; lecMarcarFrase(-1);
    const b = document.getElementById('lec-escuchar'); if (b) b.textContent = '🎧 Escuchar el cuento';
}
function lecPararEscucha() {
    if (!lecEscuchando) return;
    lecEscuchaTurno++;
    if (typeof pararVoz === 'function') pararVoz();
    lecFinEscucha();
}

/* ---------- Grabación opcional (solo en este dispositivo) ---------- */
async function lecGrabarInicio(s) {
    if (!lecturaData.guardarAudio || typeof puedeGrabar === 'undefined' || !puedeGrabar) return;
    if (s.conSR && typeof hablaData !== 'undefined' && hablaData.sinGrabarConReconocimiento) return;
    try {
        s.stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        s.mime = elegirMime();
        s.rec = s.mime ? new MediaRecorder(s.stream, { mimeType: s.mime }) : new MediaRecorder(s.stream);
        s.chunks = [];
        s.rec.ondataavailable = e => { if (e.data && e.data.size) s.chunks.push(e.data); };
        s.rec.start();
    } catch (e) {
        console.warn('No se pudo grabar la lectura', e);
        if (s.stream) s.stream.getTracks().forEach(t => t.stop());
        s.rec = null; s.stream = null;
    }
}
function lecGrabarFin(s) {
    return new Promise(res => {
        const acabar = () => {
            if (s.stream) s.stream.getTracks().forEach(t => t.stop());
            res(s.chunks && s.chunks.length ? new Blob(s.chunks, { type: (s.rec && s.rec.mimeType) || s.mime || 'audio/webm' }) : null);
        };
        if (!s.rec || s.rec.state === 'inactive') return acabar();
        s.rec.onstop = acabar;
        try { s.rec.stop(); } catch (_) { acabar(); }
        setTimeout(acabar, 2500);
    });
}

/* ---------- Lectura con reconocimiento de voz (continuo, con resultados provisionales) ---------- */
async function lecEmpezar() {
    if (lecSesion) { lecTerminar(); return; }
    if (!lecPuedeEscuchar()) return;
    lecPararEscucha();
    if (typeof pararVoz === 'function') pararVoz();
    const c = lecCuento(lecCuentoId), tk = lecTokens(c);
    const s = {
        c, tk, conSR: true, previo: '', actual: '', interino: '', hyp: [], al: null, inicio: null,
        t0: Date.now(), ultimaVoz: Date.now(), tiempos: new Array(tk.ref.length).fill(null),
        sr: null, rec: null, stream: null, chunks: [], mime: '', error: null, fatal: false,
        activo: true, terminando: false, cancelado: false, reinicios: 0, alParar: null
    };
    lecSesion = s;
    const b = document.getElementById('lec-empezar'); if (b) { b.textContent = '⏹ He terminado'; b.classList.add('bg-rose-600'); }
    ['lec-escuchar', 'lec-adulto-btn'].forEach(id => { const x = document.getElementById(id); if (x) x.disabled = true; });
    lecEstado('🎙️ Preparando el micrófono…');
    await lecGrabarInicio(s);
    if (s.cancelado) return;
    lecArrancarSR(s);
    lecEstado('👂 Te escucho… ¡lee en voz alta!');
    lecPintarVivo(s);
    s.vigia = setInterval(() => {
        const ahora = Date.now();
        if (ahora - s.ultimaVoz > 12000 || ahora - s.t0 > 300000) lecTerminar();
    }, 1000);
}
function lecArrancarSR(s) {
    try {
        const r = new SpeechRec();
        r.lang = 'es-ES'; r.continuous = true; r.interimResults = true; r.maxAlternatives = 1;
        r.onspeechstart = () => { if (!s.inicio) s.inicio = Date.now(); };
        r.onresult = e => {
            if (lecSesion !== s) return;
            let fin = '', inter = '';
            for (let i = 0; i < e.results.length; i++) {
                const res = e.results[i];
                if (res[0] && res[0].transcript) { if (res.isFinal) fin += ' ' + res[0].transcript; else inter += ' ' + res[0].transcript; }
            }
            s.actual = fin; s.interino = inter;
            lecActualizar(s);
        };
        r.onerror = e => {
            const err = e.error || 'error';
            if (err === 'no-speech' || err === 'aborted') return;
            s.error = err; s.fatal = true;
        };
        r.onend = () => {
            if (s.activo && !s.fatal && s.reinicios < 40 && lecSesion === s) {
                // El navegador corta cada cierto tiempo: seguimos escuchando sin perder lo leído
                s.previo += ' ' + s.actual + ' ' + s.interino; s.actual = ''; s.interino = ''; s.reinicios++;
                lecArrancarSR(s);
                return;
            }
            s.sr = null;
            if (s.alParar) s.alParar();
            else if (s.activo) lecTerminar();
        };
        s.sr = r;
        r.start();
    } catch (e) {
        console.warn('No se pudo iniciar el reconocimiento', e);
        s.error = 'start'; s.fatal = true; s.sr = null;
        lecTerminar();
    }
}
function lecActualizar(s) {
    s.hyp = lecPalabras(s.previo + ' ' + s.actual + ' ' + s.interino);
    if (!s.inicio && s.hyp.length) s.inicio = Date.now() - 600;
    s.al = lecAlinear(s.tk.ref, s.hyp);
    const ahora = Date.now();
    s.al.estados.forEach((st, k) => { if ((st === 'b' || st === 'd') && s.tiempos[k] == null) s.tiempos[k] = ahora; });
    s.ultimaVoz = ahora;
    lecPintarVivo(s);
    clearTimeout(s.finTimer);
    if (s.al.ultimo === s.tk.ref.length - 1) s.finTimer = setTimeout(() => { if (lecSesion === s) lecTerminar(); }, 1500);
}
function lecPintarVivo(s) {
    const est = s.al ? s.al.estados : [], ult = s.al ? s.al.ultimo : -1;
    document.querySelectorAll('#lec-texto .lec-w').forEach(el => {
        const k = +el.dataset.i, st = est[k];
        el.className = 'lec-w' + (k <= ult && st ? ' lec-' + st : '') + (k === ult + 1 ? ' lec-actual' : '');
    });
    const act = document.querySelector('#lec-texto .lec-actual');
    if (act) { lecMarcarFrase(+act.parentElement.dataset.f); if (act.scrollIntoView && s.al) act.scrollIntoView({ block: 'nearest' }); }
}
async function lecTerminar() {
    const s = lecSesion;
    if (!s || s.terminando) return;
    s.terminando = true; s.activo = false;
    clearInterval(s.vigia); clearTimeout(s.finTimer);
    lecEstado('⏳ Un momento…');
    if (s.sr) await new Promise(res => { s.alParar = res; try { s.sr.stop(); } catch (_) { res(); } setTimeout(res, 2000); });
    const blob = await lecGrabarFin(s);
    if (lecSesion === s) lecSesion = null;
    if (s.cancelado) return;
    if (!s.hyp.length) { lecErrorSesion(s); return; }
    const al = s.al;
    const met = lecMetricas(al.estados, { tiempos: s.tiempos, inicio: s.inicio, sims: al.sims, autoc: al.autoc, repeticiones: al.repeticiones });
    lecMostrarResultado({ c: s.c, tk: s.tk, estados: al.estados, met, metodo: 'auto', oido: s.hyp.join(' '), blob });
}
function lecErrorSesion(s) {
    renderLectura();
    const err = s.error;
    if (err === 'audio-capture' && s.rec !== null && typeof hablaData !== 'undefined') {
        hablaData.sinGrabarConReconocimiento = true; guardarHabla();
        lecEstado('🔄 En este dispositivo no se puede grabar y escuchar a la vez. Pulsa otra vez «Empezar a leer» (no se guardará la grabación).');
    } else if (err === 'not-allowed' || err === 'service-not-allowed') {
        lecEstado('🔒 Necesito permiso para usar el micrófono. Pulsa el candado de la barra de direcciones y permite el micrófono.');
    } else if (err === 'network') {
        lecEstado('📶 Para entender la lectura hace falta internet. Comprueba la conexión o que un adulto la valore («Lo valora un adulto»).');
    } else if (err === 'language-not-supported') {
        lecEstado('Este navegador no reconoce castellano. Un adulto puede valorar la lectura («Lo valora un adulto»).');
    } else {
        lecEstado('🤔 No te he oído. Acércate al micrófono, pulsa «Empezar a leer» y lee en voz alta.');
    }
}
function lecCancelarSesion() {
    const s = lecSesion;
    if (!s) return;
    s.cancelado = true; s.activo = false;
    clearInterval(s.vigia); clearTimeout(s.finTimer);
    if (s.sr) { try { s.sr.abort(); } catch (_) { } }
    if (s.rec && s.rec.state !== 'inactive') { try { s.rec.stop(); } catch (_) { } }
    if (s.stream) s.stream.getTracks().forEach(t => t.stop());
    lecSesion = null;
}

/* ---------- Valoración por un adulto (sin reconocimiento): toca las palabras mal leídas ---------- */
const LEC_CICLO_ADULTO = { b: 'm', m: 's', s: 'd', d: 'b' };
function lecModoAdulto() {
    if (lecSesion) return;
    lecPararEscucha();
    const c = lecCuento(lecCuentoId), tk = lecTokens(c);
    lecAdulto = { c, tk, estados: new Array(tk.ref.length).fill('b'), hasta: tk.ref.length - 1, inicio: null, ms: null, marcarHasta: false, chunks: [], rec: null, stream: null, conSR: false };
    const p = document.getElementById('lec-adulto-panel');
    p.classList.remove('hidden');
    p.innerHTML = `<div class="bg-stadium-800 border border-amber-500/40 rounded-2xl p-3 mb-3 text-xs text-slate-200 space-y-2">
        <div class="font-bold text-amber-300 text-sm">👩‍🏫 Lo valora un adulto</div>
        <ol class="list-decimal ml-4 space-y-0.5">
            <li>Pulsa <strong>⏱ Empieza</strong> cuando el niño empiece a leer.</li>
            <li>Toca las palabras que lea mal. Cada toque cambia: <span class="lec-m px-1 rounded">mal</span> → <span class="lec-s">saltada</span> → <span class="lec-d">con dudas</span> → <span class="lec-b">bien</span>.</li>
            <li>Si no termina, pulsa <strong>📍 Hasta aquí</strong> y toca la última palabra que leyó.</li>
            <li>Pulsa <strong>⏹ Terminado</strong>.</li>
        </ol>
        <div class="flex flex-wrap gap-2 items-center">
            <button id="lec-ad-crono" onclick="lecAdultoCrono()" class="bg-pitch-600 hover:bg-pitch-500 text-white font-bold px-3 py-2 rounded-xl">⏱ Empieza</button>
            <span id="lec-ad-tiempo" class="font-game text-lg text-white w-16">0:00</span>
            <button id="lec-ad-hasta" onclick="lecAdultoHasta()" class="bg-stadium-900 border border-slate-600 text-white font-bold px-3 py-2 rounded-xl">📍 Hasta aquí</button>
            <button id="lec-ad-fin" onclick="lecAdultoFin()" class="bg-amber-500 text-stadium-950 font-bold px-3 py-2 rounded-xl">⏹ Terminado</button>
            <button onclick="lecAdultoSalir()" class="text-slate-400 underline">Cancelar</button>
        </div></div>`;
    const tx = document.getElementById('lec-texto');
    tx.classList.add('lec-adulto');
    tx.onclick = e => { const w = e.target.closest('.lec-w'); if (w && lecAdulto) lecAdultoToque(+w.dataset.i); };
    lecAdultoPintar();
    lecEstado('Modo adulto: el niño lee el texto en voz alta y el adulto marca.');
}
function lecAdultoPintar() {
    const a = lecAdulto; if (!a) return;
    document.querySelectorAll('#lec-texto .lec-w').forEach(el => {
        const k = +el.dataset.i;
        el.className = 'lec-w ' + (k > a.hasta ? 'lec-n' : (a.estados[k] === 'b' ? '' : 'lec-' + a.estados[k]));
    });
}
function lecAdultoToque(k) {
    const a = lecAdulto;
    if (a.marcarHasta) { a.hasta = k; a.marcarHasta = false; document.getElementById('lec-ad-hasta').classList.remove('ring-2', 'ring-amber-400'); }
    else if (k <= a.hasta) a.estados[k] = LEC_CICLO_ADULTO[a.estados[k]];
    lecAdultoPintar();
}
function lecAdultoHasta() { const a = lecAdulto; if (!a) return; a.marcarHasta = !a.marcarHasta; document.getElementById('lec-ad-hasta').classList.toggle('ring-2', a.marcarHasta); document.getElementById('lec-ad-hasta').classList.toggle('ring-amber-400', a.marcarHasta); }
async function lecAdultoCrono() {
    const a = lecAdulto; if (!a) return;
    if (a.inicio && a.ms == null) { a.ms = Date.now() - a.inicio; clearInterval(a.reloj); document.getElementById('lec-ad-crono').textContent = '⏱ Parado'; lecGrabarFin(a).then(b => { a.blob = b; }); return; }
    if (a.inicio) return;
    a.inicio = Date.now();
    document.getElementById('lec-ad-crono').textContent = '⏱ Parar';
    a.reloj = setInterval(() => {
        const el = document.getElementById('lec-ad-tiempo'); if (!el || !lecAdulto) return clearInterval(a.reloj);
        const sg = Math.floor((Date.now() - a.inicio) / 1000); el.textContent = Math.floor(sg / 60) + ':' + String(sg % 60).padStart(2, '0');
    }, 500);
    await lecGrabarInicio(a);
}
async function lecAdultoFin() {
    const a = lecAdulto; if (!a) return;
    if (!a.inicio) { lecEstado('⏱ Primero pulsa «Empieza» cuando el niño empiece a leer (así se calculan las palabras por minuto).'); return; }
    if (a.ms == null) a.ms = Date.now() - a.inicio;
    clearInterval(a.reloj);
    const blob = a.blob !== undefined ? a.blob : await lecGrabarFin(a);
    const estados = a.estados.map((e, k) => k > a.hasta ? 'n' : e);
    const met = lecMetricas(estados, { ms: Math.max(1000, a.ms) });
    lecAdulto = null;
    lecMostrarResultado({ c: a.c, tk: a.tk, estados, met, metodo: 'adulto', oido: '', blob });
}
function lecAdultoSalir() {
    const a = lecAdulto; if (!a) return;
    clearInterval(a.reloj);
    if (a.rec && a.rec.state !== 'inactive') { try { a.rec.stop(); } catch (_) { } }
    if (a.stream) a.stream.getTracks().forEach(t => t.stop());
    lecAdulto = null; renderLectura();
}

/* ---------- Resultado ---------- */
function lecMostrarResultado(o) {
    const id = Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
    lecRes = Object.assign(o, { id, t: Date.now(), esc: lecEscuchoAntes, guardado: false, audioId: null, preg: { i: 0, aciertos: 0, hechas: 0, orden: null, respondida: false } });
    if (o.blob) {
        const audioId = 'lec-' + id;
        o.blob.arrayBuffer().then(buf => audioPut({ id: audioId, word: 'cuento:' + o.c.id, t: lecRes.t, modo: 'lectura', type: o.blob.type, data: buf }))
            .then(() => { if (lecRes && lecRes.id === id) lecRes.audioId = audioId; else { const r = lecturaData.lecturas.find(x => x.id === id); if (r) { r.audioId = audioId; guardarLecturas(); } } return podarGrabaciones(); })
            .catch(e => console.warn('No se pudo guardar la grabación de la lectura', e));
    }
    lecVista = 'resultado';
    renderLectura();
    const est = o.met.est;
    const t = typeof temaActual === 'function' ? temaActual() : null;
    if (est >= 2) decir([t ? temaCelebracion() : FRASES_VOZ.muyBien, FRASES_VOZ.buenaLectura]);
    else decir(FRASES_VOZ.sigueAsi);
}
function lecMensaje(est) {
    return est >= 3 ? '¡Qué bien has leído!' : est === 2 ? '¡Muy bien! Cada vez lees mejor.' : est === 1 ? '¡Sigue practicando, lo haces cada vez mejor!' : '¡Vamos a intentarlo otra vez!';
}
function lecPalabrasPracticar(tk, estados) {
    const vistas = new Set(), r = [];
    estados.forEach((e, k) => { if ((e === 'm' || e === 's' || e === 'd') && !vistas.has(tk.ref[k])) { vistas.add(tk.ref[k]); r.push(tk.disp[k].replace(/[^\p{L}\p{N}]/gu, '')); } });
    return r;
}
function lecVistaResultado() {
    const r = lecRes, m = r.met, t = typeof temaActual === 'function' ? temaActual() : { mascota: '🌟' };
    const clases = r.estados.map(e => 'lec-' + e);
    const objetivo = LEC_OBJETIVO_PPM[r.c.nivel];
    const practicar = lecPalabrasPracticar(r.tk, r.estados);
    const fila = (a, b) => `<tr><td class="pr-3 py-0.5 text-slate-400">${a}</td><td class="text-white">${b}</td></tr>`;
    const nulo = v => v == null ? '—' : v;
    return `
        <div class="flex items-center justify-between gap-2 mb-3">
            <button onclick="lecVolverLista()" class="text-sm text-slate-300 hover:text-white">← Cuentos</button>
            <span class="text-[11px] text-slate-400">${lecEsc(r.c.titulo)}</span>
        </div>
        <div id="lec-resultado" class="text-center mb-4">
            <div class="text-5xl mb-1" aria-hidden="true">${t.mascota}</div>
            <div class="text-4xl mb-1">${lecEstrellasHTML(m.est)}</div>
            <div class="font-game text-2xl text-white">${lecMensaje(m.est)}</div>
        </div>
        <div class="grid grid-cols-3 gap-2 sm:gap-3 mb-4 text-center">
            <div class="bg-stadium-950 border border-slate-800 rounded-2xl p-3"><div class="text-2xl font-game text-emerald-300" id="lec-res-prec">${m.prec}%</div><div class="text-[11px] text-slate-400">🎯 palabras bien leídas</div></div>
            <div class="bg-stadium-950 border border-slate-800 rounded-2xl p-3"><div class="text-2xl font-game text-sky-300" id="lec-res-ppm">${m.ppm}</div><div class="text-[11px] text-slate-400">⚡ palabras por minuto</div></div>
            <div class="bg-stadium-950 border border-slate-800 rounded-2xl p-3"><div class="text-2xl font-game text-amber-300">${m.compl}%</div><div class="text-[11px] text-slate-400">📏 del cuento leído</div></div>
        </div>
        <div class="lec-texto bg-stadium-950 border border-slate-800 rounded-2xl p-4 sm:p-6 text-white mb-2" id="lec-texto-res">${lecTextoHTML(r.tk, clases)}</div>
        <div class="flex flex-wrap gap-3 text-[11px] text-slate-300 mb-4" id="lec-leyenda">
            <span><span class="lec-b font-bold">verde</span> = bien</span>
            <span><span class="lec-d font-bold">amarillo</span> = con dudas</span>
            <span><span class="lec-m font-bold px-1 rounded">rojo</span> = no se entendió</span>
            <span><span class="lec-s">tachado</span> = saltada</span>
            <span><span class="lec-n">gris</span> = sin leer</span>
        </div>
        <div class="flex flex-wrap gap-2 justify-center mb-5">
            ${r.blob ? '<button onclick="lecOirMiLectura()" class="bg-sky-600 hover:bg-sky-500 text-white font-bold px-4 py-2 rounded-xl text-sm">▶️ Escuchar mi lectura</button>' : ''}
            <button onclick="lecOtraVez()" class="bg-stadium-800 hover:bg-slate-700 border border-slate-700 text-white font-bold px-4 py-2 rounded-xl text-sm">🔁 Leer otra vez</button>
        </div>
        <div id="lec-preguntas" class="bg-stadium-950 border border-pitch-600/40 rounded-2xl p-4 mb-4"></div>
        <details id="lec-profe" class="bg-stadium-950 border border-slate-800 rounded-2xl p-4 text-sm">
            <summary class="cursor-pointer font-bold text-white">👩‍🏫 Para el profe: números de esta lectura</summary>
            <table class="mt-3 text-xs"><tbody>
                ${fila('Método', r.metodo === 'adulto' ? 'Valorada por un adulto' : 'Reconocimiento de voz del navegador')}
                ${fila('Precisión', `${m.prec}% (${m.correctas} de ${m.leidas} palabras leídas)`)}
                ${fila('Palabras correctas por minuto (PCPM)', `${m.ppm} <span class="text-slate-500">(orientativo para su nivel: ~${objetivo})</span>`)}
                ${fila('Completado', `${m.compl}% (${m.leidas} de ${m.n} palabras)`)}
                ${fila('Pausas largas (&gt; 3 s)', nulo(m.pausas))}
                ${fila('Autocorrecciones', nulo(m.autoc))}
                ${fila('Repeticiones', nulo(m.repeticiones))}
                ${fila('Indicador de pronunciación', m.pron == null ? '—' : m.pron + ' / 100')}
                ${fila('Duración', Math.round(m.ms / 1000) + ' s')}
                ${fila('Escuchó el cuento antes', r.esc ? 'Sí' : 'No')}
            </tbody></table>
            <div class="mt-3 text-xs"><span class="text-slate-400">Palabras para practicar:</span> ${practicar.length ? practicar.map(w => `<span class="inline-block bg-rose-950/60 border border-rose-700/50 text-rose-200 px-2 py-0.5 rounded-lg mr-1 mb-1">${lecEsc(w)}</span>`).join('') : '<span class="text-emerald-300">¡ninguna!</span>'}</div>
            ${r.oido ? `<div class="mt-2 text-xs text-slate-400">Lo que entendió el navegador (solo se ve aquí, no se guarda en el servidor): «${lecEsc(r.oido)}»</div>` : ''}
            <p class="mt-3 text-[11px] text-slate-400">Cómo se calcula: cada palabra oída se compara con la del texto (alineación con tolerancia a pequeñas diferencias). «Bien» = se parece ≥ 80 %; «con dudas» = 50-80 %; «no se entendió» = menos; «saltada» = no se oyó pero se siguió leyendo. PCPM = palabras bien o con dudas × 60 / segundos leyendo. La pronunciación es el parecido medio entre lo oído y lo escrito: depende mucho del micrófono y del navegador. ${LEC_AVISO}</p>
        </details>`;
}
function lecOirMiLectura() { if (lecRes && lecRes.blob) reproducirBlob(lecRes.blob); }
function lecOtraVez() { const id = lecRes ? lecRes.c.id : lecCuentoId; lecGuardarPendiente(); lecAbrir(id); }

/* ---------- Preguntas de comprensión (tocar o decir) ---------- */
function lecPintarPregunta() {
    const r = lecRes, box = document.getElementById('lec-preguntas');
    if (!r || !box) return;
    const p = r.preg, qs = r.c.preguntas;
    if (r.guardado || p.i >= qs.length) {
        const sig = lecSiguienteCuento(r.c);
        box.innerHTML = `<div class="text-center">
            ${p.hechas ? `<div class="font-game text-lg text-white mb-1">🧠 Has acertado ${p.aciertos} de ${p.hechas} preguntas</div>` : ''}
            <div class="text-amber-300 text-sm mb-3" id="lec-xp">${r.xp ? `+${r.xp} XP` : ''}</div>
            <div class="flex flex-wrap gap-2 justify-center">
                ${sig ? `<button id="lec-siguiente" onclick="lecAbrir('${sig.id}')" class="bg-pitch-600 hover:bg-pitch-500 text-white font-bold px-5 py-2.5 rounded-xl">➡️ Siguiente cuento: ${lecEsc(sig.titulo)}</button>` : ''}
                <button onclick="lecVolverLista()" class="bg-stadium-800 hover:bg-slate-700 border border-slate-700 text-white font-bold px-4 py-2.5 rounded-xl">📚 Todos los cuentos</button>
            </div></div>`;
        return;
    }
    const q = qs[p.i];
    let cuerpo = '';
    if (q.tipo === 'elegir') {
        if (!p.orden) p.orden = (typeof shuffle === 'function' ? shuffle : a => a)(q.ops.map((_, k) => k));
        cuerpo = `<div class="grid grid-cols-1 sm:grid-cols-3 gap-2">${p.orden.map(k => `<button onclick="lecResponder(${k === q.ok}, this)" class="lec-op bg-stadium-800 hover:bg-pitch-700 text-white font-bold p-3 rounded-xl border border-slate-700">${lecEsc(q.ops[k])}</button>`).join('')}</div>`;
    } else {
        const sr = lecPuedeEscuchar() && lecRes.metodo !== 'adulto';
        cuerpo = `<div class="flex flex-wrap gap-2 justify-center">
            ${sr ? '<button id="lec-responder" onclick="lecResponderVoz()" class="bg-rose-600 hover:bg-rose-500 text-white font-bold px-5 py-3 rounded-xl">🎙️ Responder</button>' : ''}
            <button onclick="lecResponder(true)" class="bg-emerald-700 hover:bg-emerald-600 text-white text-xs font-bold px-3 py-2 rounded-xl">✅ Lo ha dicho bien (adulto)</button>
            <button onclick="lecResponder(false)" class="bg-stadium-800 border border-slate-700 text-white text-xs font-bold px-3 py-2 rounded-xl">❌ No lo sabe (adulto)</button>
        </div><div id="lec-oido" class="text-xs text-slate-300 mt-2 text-center"></div>`;
    }
    box.innerHTML = `
        <div class="flex justify-between items-center mb-2"><span class="text-xs text-slate-400">Pregunta ${p.i + 1} de ${qs.length}</span>
            <button onclick="lecSaltarPreguntas()" class="text-xs text-slate-400 underline">Saltar preguntas</button></div>
        <div class="flex items-center gap-2 mb-3"><button onclick="lecPreguntar()" class="bg-pitch-600 text-white w-9 h-9 rounded-xl shrink-0" aria-label="Escuchar la pregunta">🔊</button>
            <div class="font-bold text-white text-lg" id="lec-pregunta">${lecEsc(q.p)}</div></div>
        ${cuerpo}
        <div id="lec-preg-fb" class="mt-3 text-center text-sm min-h-[1.25rem]"></div>`;
    p.respondida = false;
}
function lecPreguntar() { const r = lecRes; if (r && !r.guardado && r.c.preguntas[r.preg.i]) decir(r.c.preguntas[r.preg.i].p); }
function lecResponderVoz() {
    if (lecPregSR || !lecRes) return;
    const q = lecRes.c.preguntas[lecRes.preg.i];
    if (typeof pararVoz === 'function') pararVoz();
    const b = document.getElementById('lec-responder'); if (b) { b.textContent = '👂 Te escucho…'; b.disabled = true; }
    const alts = [];
    let err = null;
    try {
        const r = new SpeechRec();
        r.lang = 'es-ES'; r.continuous = false; r.interimResults = false; r.maxAlternatives = 5;
        r.onresult = e => { for (let i = 0; i < e.results.length; i++) for (let j = 0; j < e.results[i].length; j++) if (e.results[i][j].transcript) alts.push(e.results[i][j].transcript.trim()); };
        r.onerror = e => { err = e.error || 'error'; };
        r.onend = () => {
            lecPregSR = null;
            if (!lecRes || lecRes.c.preguntas[lecRes.preg.i] !== q) return;
            const oido = document.getElementById('lec-oido');
            if (!alts.length) {
                if (b) { b.textContent = '🎙️ Responder'; b.disabled = false; }
                if (oido) oido.textContent = err === 'not-allowed' ? '🔒 Necesito permiso para usar el micrófono.' : '🤔 No te he oído. Pulsa «Responder» y di la respuesta.';
                return;
            }
            if (oido) oido.innerHTML = `He oído: «<strong class="text-white">${lecEsc(alts[0])}</strong>»`;
            lecResponder(lecRespuestaOk(alts, q.claves));
        };
        lecPregSR = r;
        r.start();
        setTimeout(() => { if (lecPregSR === r) { try { r.stop(); } catch (_) { } } }, 9000);
    } catch (e) { lecPregSR = null; if (b) { b.textContent = '🎙️ Responder'; b.disabled = false; } }
}
function lecResponder(ok, btn) {
    const r = lecRes; if (!r || r.preg.respondida) return;
    const p = r.preg, q = r.c.preguntas[p.i];
    p.respondida = true; p.hechas++; if (ok) p.aciertos++;
    document.querySelectorAll('#lec-preguntas button').forEach(b => { if (!b.textContent.includes('Saltar')) b.disabled = true; });
    const respuesta = q.tipo === 'elegir' ? q.ops[q.ok] : q.r;
    if (btn) btn.classList.add(ok ? 'correct' : 'wrong');
    const fb = document.getElementById('lec-preg-fb');
    if (ok) { fb.innerHTML = '<span class="text-emerald-400 font-bold">✅ ¡Correcto!</span>'; decir(FRASES_VOZ.correcto); }
    else { fb.innerHTML = `<span class="text-amber-300">La respuesta es: <strong>${lecEsc(respuesta)}</strong></span>`; decir([FRASES_VOZ.respuestaEs, respuesta]); }
    const id = r.id;
    setTimeout(() => {
        if (!lecRes || lecRes.id !== id) return;
        p.i++;
        if (p.i >= r.c.preguntas.length) lecGuardarRegistro(Math.round(p.aciertos / p.hechas * 100));
        lecPintarPregunta();
        lecPreguntar();
    }, ok ? 1600 : 2600);
}
function lecSaltarPreguntas() {
    const r = lecRes; if (!r || r.guardado) return;
    if (lecPregSR) { try { lecPregSR.abort(); } catch (_) { } lecPregSR = null; }
    lecGuardarRegistro(r.preg.hechas ? Math.round(r.preg.aciertos / r.preg.hechas * 100) : null);
    lecPintarPregunta();
}
function lecSiguienteCuento(c) {
    const mejores = lecMejores(lecturaData.lecturas), nivel = lecNivel(), profe = lecEsProfe();
    const rec = lecRecomendado(nivel, mejores, lecTemaClave(), profe);
    if (rec && rec.id !== c.id) return rec;
    const i = CUENTOS.indexOf(c), sig = CUENTOS[i + 1];
    return sig && lecDesbloqueado(sig, nivel, mejores, profe) ? sig : null;
}

/* ---------- Guardar la lectura (cuando acaban las preguntas, se saltan o se sale) ---------- */
function lecXP(est, comp, repetidaHoy) {
    if (repetidaHoy) return est;
    return est * 5 + (comp != null && comp >= 50 ? 5 : 0);
}
function lecGuardarRegistro(comp) {
    const r = lecRes;
    if (!r || r.guardado) return;
    r.guardado = true;
    const m = r.met;
    const hoy = typeof claveDia === 'function' ? claveDia(r.t) : '';
    const repetidaHoy = lecturaData.lecturas.some(x => x.cuento === r.c.id && typeof claveDia === 'function' && claveDia(x.t) === hoy);
    const reg = {
        id: r.id, t: r.t, cuento: r.c.id, nivel: r.c.nivel, metodo: r.metodo,
        prec: m.prec, ppm: m.ppm, compl: m.compl, est: m.est, pausas: m.pausas, autoc: m.autoc, pron: m.pron,
        comp: comp == null ? null : comp, compN: r.preg.hechas, dur: Math.min(1800, Math.round(m.ms / 1000)), n: m.n,
        esc: !!r.esc, e: r.estados.join(''),
        audioId: r.audioId || null, oido: (r.oido || '').slice(0, 2000) // solo en este dispositivo
    };
    lecturaData.lecturas.push(reg);
    guardarLecturas();
    r.xp = m.correctas ? lecXP(m.est, comp, repetidaHoy) : 0;
    if (r.xp && typeof addXP === 'function') addXP(r.xp);
}
function lecGuardarPendiente() { if (lecRes && !lecRes.guardado) lecGuardarRegistro(lecRes.preg.hechas ? Math.round(lecRes.preg.aciertos / lecRes.preg.hechas * 100) : null); }
function lecSalir() {
    lecCancelarSesion();
    lecPararEscucha();
    if (lecAdulto) { clearInterval(lecAdulto.reloj); if (lecAdulto.stream) lecAdulto.stream.getTracks().forEach(t => t.stop()); lecAdulto = null; }
    if (lecPregSR) { try { lecPregSR.abort(); } catch (_) { } lecPregSR = null; }
    lecGuardarPendiente();
    lecRes = null; lecVista = 'lista';
}
if (typeof window !== 'undefined') window.addEventListener('pagehide', lecGuardarPendiente);

/* =====================================================================
   Mi progreso: lectura en voz alta
   ===================================================================== */
function lecGrafico(vals, o) {
    const W = 320, H = 120, P = 22, n = vals.length;
    if (!n) return '';
    const max = Math.max(o.max || 0, ...vals, o.objetivo || 0, 1);
    const x = i => n === 1 ? W / 2 : P + i * (W - 2 * P) / (n - 1), y = v => H - P - v / max * (H - 2 * P);
    const pts = vals.map((v, i) => `${x(i).toFixed(1)},${y(v).toFixed(1)}`).join(' ');
    return `<svg viewBox="0 0 ${W} ${H}" class="w-full h-32" role="img" aria-label="${o.etiqueta}">
        <line x1="${P}" y1="${H - P}" x2="${W - P}" y2="${H - P}" stroke="#334155"/>
        ${o.objetivo ? `<line x1="${P}" y1="${y(o.objetivo)}" x2="${W - P}" y2="${y(o.objetivo)}" stroke="#fbbf24" stroke-dasharray="4 4" opacity=".7"/><text x="${W - P}" y="${y(o.objetivo) - 3}" fill="#fbbf24" font-size="9" text-anchor="end">objetivo ~${o.objetivo}</text>` : ''}
        <text x="2" y="${y(max) + 3}" fill="#64748b" font-size="9">${max}</text><text x="2" y="${H - P + 3}" fill="#64748b" font-size="9">0</text>
        <polyline points="${pts}" fill="none" stroke="${o.color}" stroke-width="2.5" stroke-linejoin="round"/>
        ${vals.map((v, i) => `<circle cx="${x(i).toFixed(1)}" cy="${y(v).toFixed(1)}" r="3" fill="${o.color}"><title>${v}</title></circle>`).join('')}
    </svg>`;
}
function lecMedia(a) { return a.length ? Math.round(a.reduce((s, v) => s + v, 0) / a.length) : 0; }
function renderProgresoLectura() {
    const box = typeof document !== 'undefined' && document.getElementById('prog-lectura');
    if (!box) return;
    const L = lecturaData.lecturas.slice().sort((a, b) => a.t - b.t);
    const cab = '<h4 class="font-bold text-sm text-white mb-2">📖 Leo en voz alta</h4>';
    if (!L.length) { box.innerHTML = cab + '<p class="text-xs text-slate-400">Todavía no hay lecturas. Ve a «📖 Leo en voz alta» y lee un cuento.</p>'; return; }
    const ult = L.slice(-30), prim5 = L.slice(0, 5), ult5 = L.slice(-5);
    const objetivo = LEC_OBJETIVO_PPM[lecNivel()];
    // Palabras para practicar: las que más fallan en las últimas 20 lecturas
    const fallos = {};
    L.slice(-20).forEach(r => {
        const c = lecCuento(r.cuento); if (!c || !r.e) return;
        const tk = lecTokens(c);
        [...r.e].forEach((e, k) => { if ((e === 'm' || e === 's') && tk.disp[k]) { const w = tk.disp[k].replace(/[^\p{L}\p{N}]/gu, '').toLowerCase(); fallos[w] = (fallos[w] || 0) + 1; } });
    });
    const practicar = Object.entries(fallos).sort((a, b) => b[1] - a[1]).slice(0, 12);
    // Primera y última lectura de cada cuento
    const porCuento = {};
    L.forEach(r => { (porCuento[r.cuento] = porCuento[r.cuento] || []).push(r); });
    const comparar = Object.entries(porCuento).filter(([, l]) => l.length >= 2).map(([id, l]) => {
        const a = l[0], b = l[l.length - 1], c = lecCuento(id);
        const play = r => r.audioId ? `<button onclick="lecReproducir('${r.audioId}')" class="ml-1 text-sky-300" aria-label="Escuchar">▶️</button>` : '';
        return `<tr class="border-t border-slate-800"><td class="py-1 pr-2 text-white">${lecEsc(c ? c.titulo : id)}</td>
            <td class="pr-2">${a.ppm} PCPM · ${a.prec}%${play(a)}</td><td class="pr-2">${b.ppm} PCPM · ${b.prec}%${play(b)}</td>
            <td class="${b.ppm >= a.ppm ? 'text-emerald-300' : 'text-rose-300'}">${b.ppm >= a.ppm ? '+' : ''}${b.ppm - a.ppm}</td></tr>`;
    }).join('');
    const tile = (v, t) => `<div class="bg-stadium-900 border border-slate-800 rounded-xl p-2 text-center"><div class="font-game text-lg text-white">${v}</div><div class="text-[10px] text-slate-400">${t}</div></div>`;
    box.innerHTML = cab + `
        <div class="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-3" id="prog-lectura-resumen">
            ${tile(L.length, 'lecturas')}${tile(Object.keys(porCuento).length, 'cuentos distintos')}
            ${tile(lecMedia(ult5.map(r => r.ppm)), 'PCPM (media últimas 5)')}${tile(lecMedia(ult5.map(r => r.prec)) + '%', 'precisión (últimas 5)')}
        </div>
        ${L.length >= 6 ? `<p class="text-xs mb-3 ${lecMedia(ult5.map(r => r.ppm)) >= lecMedia(prim5.map(r => r.ppm)) ? 'text-emerald-300' : 'text-amber-300'}">Primeras 5 lecturas: ${lecMedia(prim5.map(r => r.ppm))} PCPM → últimas 5: ${lecMedia(ult5.map(r => r.ppm))} PCPM.</p>` : ''}
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
            <div><div class="text-xs text-slate-300 mb-1">⚡ Palabras correctas por minuto</div>${lecGrafico(ult.map(r => r.ppm), { color: '#38bdf8', objetivo, etiqueta: 'Gráfico de palabras correctas por minuto' })}</div>
            <div><div class="text-xs text-slate-300 mb-1">🎯 Precisión (%)</div>${lecGrafico(ult.map(r => r.prec), { color: '#34d399', max: 100, etiqueta: 'Gráfico de precisión' })}</div>
        </div>
        <div class="text-xs mb-3"><span class="text-slate-400">Palabras para practicar:</span> ${practicar.length ? practicar.map(([w, n]) => `<span class="inline-block bg-rose-950/60 border border-rose-700/50 text-rose-200 px-2 py-0.5 rounded-lg mr-1 mb-1">${lecEsc(w)} <span class="opacity-60">×${n}</span></span>`).join('') : '<span class="text-emerald-300">ninguna destacada</span>'}</div>
        ${comparar ? `<div class="text-xs mb-3 overflow-x-auto"><div class="text-slate-300 mb-1">Primera lectura frente a la última</div><table class="w-full text-slate-300"><thead><tr class="text-slate-500"><th class="text-left">Cuento</th><th class="text-left">Primera</th><th class="text-left">Última</th><th class="text-left">PCPM</th></tr></thead><tbody>${comparar}</tbody></table></div>` : ''}
        <div class="text-xs overflow-x-auto mb-2"><div class="text-slate-300 mb-1">Últimas lecturas</div><table class="w-full text-slate-300" id="prog-lectura-tabla"><thead><tr class="text-slate-500"><th class="text-left">Fecha</th><th class="text-left">Cuento</th><th>⭐</th><th>Precisión</th><th>PCPM</th><th>Leído</th><th>Comprensión</th></tr></thead><tbody>
            ${L.slice(-8).reverse().map(r => `<tr class="border-t border-slate-800"><td class="py-1 pr-2 whitespace-nowrap">${typeof fmtFecha === 'function' ? fmtFecha(r.t) : ''}</td><td class="pr-2">${lecEsc((lecCuento(r.cuento) || {}).titulo || r.cuento)}${r.metodo === 'adulto' ? ' 👩‍🏫' : ''}</td><td class="text-center">${r.est}</td><td class="text-center">${r.prec}%</td><td class="text-center">${r.ppm}</td><td class="text-center">${r.compl}%</td><td class="text-center">${r.comp == null ? '—' : r.comp + '%'}</td></tr>`).join('')}
        </tbody></table></div>
        <div class="flex flex-wrap gap-2 items-center justify-between">
            <p class="text-[10px] text-slate-500 flex-1">PCPM = palabras leídas bien (o con dudas) por minuto. La línea amarilla es un objetivo orientativo para su nivel. ${LEC_AVISO}</p>
            <button onclick="lecExportarCSV()" class="bg-stadium-800 hover:bg-slate-700 border border-slate-700 text-white text-xs font-bold px-3 py-1.5 rounded-lg">⬇️ Lecturas (CSV)</button>
        </div>`;
}
async function lecReproducir(id) {
    try { const r = (await audioAll()).find(x => x.id === id); if (r) reproducirBlob(new Blob([r.data], { type: r.type })); } catch (e) { console.warn(e); }
}
function lecExportarCSV() {
    const cols = ['fecha', 'cuento', 'titulo', 'nivel', 'metodo', 'estrellas', 'precision', 'pcpm', 'completado', 'pausas_largas', 'autocorrecciones', 'pronunciacion', 'comprension', 'preguntas', 'segundos', 'palabras', 'escucho_antes'];
    const q = v => { const s = v == null ? '' : String(v); return /[",;\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s; };
    const filas = lecturaData.lecturas.map(r => [new Date(r.t).toISOString(), r.cuento, (lecCuento(r.cuento) || {}).titulo || '', r.nivel, r.metodo, r.est, r.prec, r.ppm, r.compl, r.pausas, r.autoc, r.pron, r.comp, r.compN, r.dur, r.n, r.esc ? 'si' : 'no'].map(q).join(','));
    const nombre = (typeof gameState !== 'undefined' && gameState.name || 'alumno').replace(/[^\p{L}\p{N}]+/gu, '-');
    descargar(`alto-y-claro-lecturas-${nombre}-${new Date().toISOString().slice(0, 10)}.csv`, '\ufeff' + [cols.join(','), ...filas].join('\n'), 'text/csv;charset=utf-8');
}
if (typeof renderProgresoHabla === 'function') {
    const _renderProgresoHablaSinLectura = renderProgresoHabla;
    renderProgresoHabla = function () { const r = _renderProgresoHablaSinLectura.apply(this, arguments); try { renderProgresoLectura(); } catch (e) { console.error(e); } return r; };
}

if (typeof module !== 'undefined' && module.exports) module.exports = {
    CUENTOS, lecNorm, lecPalabras, lecSim, lecAlinear, lecMetricas, lecPCPM, lecEstrellas, lecTokens, lecRespuestaOk,
    lecContarPalabras, lecDesbloqueado, lecRecomendado, lecMejores, lecturaParaServidor, lecXP, LEC_OBJETIVO_PPM
};
