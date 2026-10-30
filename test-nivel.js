/* Me gusta hablar Alto y claro · Test de nivel adaptativo (comprensión + vocabulario + conversación)
   - Corto (5-8 min como mucho) y se adapta: si el niño falla lo fácil, se salta lo difícil y termina antes.
   - Tres partes: Comprensión (oye y toca la foto), Vocabulario (di qué es) y Conversación
     (preguntas habladas con dificultad creciente y una mini-conversación: frutería, panadería, parque o cocina).
   - Las preguntas se sortean de unos bancos en cada test (ver tnPlanTest): no se pueden aprender de memoria.
   - Puntuación sencilla y explicable (ver puntuarConversacion y calcularResultadoTest).
   - Privacidad: no se pregunta nada personal (nombre, edad, dirección, colegio). No se graba audio.
     Se guardan puntuaciones, resultado por pregunta, la semilla del sorteo y los ids de las preguntas
     (gameState.pruebas, se sincroniza con clave).
     Lo que dijo el niño en las respuestas libres se queda SOLO en este dispositivo (ligaHablaTestTextos)
     y nunca se envía al servidor.
   - Sin reconocimiento de voz (o si el adulto lo prefiere): el adulto valora cada respuesta con 3 botones.
   Depende de index.html (gameState, visualVocab, LEVELS, saveState, updateHUD, renderAll, shuffle),
   voz.js (decir, pararVoz, FRASES_VOZ) y hablar.js (SpeechRec, evaluarPalabra, normTexto, esc, hablaData). */

// Frases fijas del test. scripts/generar-audios.py lee este bloque para grabarlas (una frase por línea):
// si añades una, regenera los audios.
const FRASES_TEST = {
    intro: '¡Vamos a jugar un ratito! Escucha y responde. Si no sabes algo, no pasa nada.',
    introComp: 'Escucha y toca la foto correcta.',
    // Comprensión directa: «Toca el …» (palabras fáciles)
    k01: 'Toca el perro.',
    k02: 'Toca el gato.',
    k03: 'Toca la manzana.',
    k04: 'Toca la pelota.',
    k05: 'Toca la cama.',
    k06: 'Toca la mesa.',
    k07: 'Toca el coche.',
    k08: 'Toca el plátano.',
    k09: 'Toca la flor.',
    k10: 'Toca el pez.',
    k11: 'Toca la vaca.',
    k12: 'Toca el pan.',
    // Comprensión de para qué sirve / cómo es
    k21: '¿Dónde duermes por la noche?',
    k22: '¿Con qué te lavas los dientes?',
    k23: 'Toca lo que usamos para beber agua.',
    k24: '¿Dónde te sientas para comer?',
    k25: '¿Con qué te secas después de la ducha?',
    k26: '¿Qué te pones para ver mejor?',
    k27: '¿Con qué pintas en el cole?',
    k28: '¿Dónde llevas los libros al cole?',
    k29: '¿Qué animal vive en el agua?',
    k30: '¿Qué animal vuela?',
    k31: '¿Qué animal nos da la leche?',
    k32: '¿Qué va por las vías y lleva a mucha gente?',
    k33: '¿Qué fruta es amarilla y larga?',
    k34: '¿Qué compramos en la panadería?',
    k35: '¿Qué tiene pedales y dos ruedas?',
    k36: '¿Qué ponen las gallinas?',
    k37: '¿Con qué juegas al fútbol?',
    k38: '¿Qué te pones para vestirte?',
    k39: '¿Qué animal dice miau?',
    k40: '¿Qué animal dice guau?',
    k41: '¿Qué crece en el jardín y huele bien?',
    introVoc: 'Ahora dime qué es cada cosa.',
    queEs: '¿Qué es esto?',
    queEs2: '¿Cómo se llama esto?',
    queEs3: '¿Sabes qué es esto?',
    introConv: '¡Ahora vamos a hablar un poquito!',
    // Escalón 1: saludo y color
    c11: '¡Hola! ¿Qué tal estás?',
    c12: '¡Hola! ¿Cómo estás hoy?',
    c13: '¡Buenos días! ¿Qué tal te va?',
    c14: '¡Hola! ¿Cómo te sientes hoy?',
    c15: 'Mira esta camiseta. ¿De qué color es?',
    c16: 'Mira este coche. ¿De qué color es?',
    c17: 'Mira esta flor. ¿De qué color es?',
    c18: 'Mira esta toalla. ¿De qué color es?',
    c19: 'Mira esta mochila. ¿De qué color es?',
    // Escalón 2: para qué sirve y gustos
    c21: '¿Qué haces tú con una pelota?',
    c22: '¿Qué haces tú con una bicicleta?',
    c23: '¿Qué haces tú con los lápices?',
    c24: '¿Qué haces tú con una toalla?',
    c25: '¿Qué haces tú con un vaso?',
    c26: '¿Qué haces tú con un cepillo de dientes?',
    c27: '¿Qué te gusta comer?',
    c28: '¿A qué te gusta jugar?',
    c29: '¿Qué animal te gusta más?',
    c30: '¿Qué te gusta hacer en el parque?',
    c31: '¿Qué te gusta beber?',
    // Escalón 3: describir una foto, pasado y futuro
    c41: 'Mira esta foto. Cuéntame qué ves.',
    c42: '¡Mira qué foto! ¿Qué ves aquí?',
    c43: 'Mira bien la foto. Cuéntame qué hay.',
    c51: '¿Qué hiciste ayer?',
    c52: '¿Qué hiciste ayer por la tarde?',
    c53: '¿Qué hiciste el fin de semana pasado?',
    c54: '¿Qué comiste ayer?',
    c61: '¿Qué vas a hacer el fin de semana?',
    c62: '¿Qué vas a hacer mañana?',
    c63: '¿Qué vas a hacer esta tarde?',
    c64: '¿Qué vas a hacer en vacaciones?',
    // Escalón 4: mini-conversaciones (la respuesta depende de lo que diga el niño)
    introTienda: 'Ahora jugamos a la tienda. Yo soy la frutera.',
    d1: '¡Hola! Bienvenidos a la frutería. ¿Qué quieres comprar?',
    d1si: '¡Claro! ¿Cuántas quieres?',
    d1no: 'Tengo unas manzanas muy ricas. ¿Cuántas quieres?',
    d2si: '¡Perfecto! Son dos euros. ¿Quieres algo más?',
    d2no: 'Te pongo tres, ¿vale? Son dos euros. ¿Quieres algo más?',
    d3si: '¡Gracias a ti! ¡Hasta luego!',
    d3no: '¡Vale! Gracias por venir. ¡Hasta luego!',
    introPan: 'Ahora jugamos a la panadería. Yo soy el panadero.',
    pa1: '¡Buenos días! Bienvenido a la panadería. ¿Qué quieres comprar?',
    pa1si: '¡Muy bien! ¿Cuántos quieres?',
    pa1no: 'Tengo un pan muy rico. ¿Cuántos quieres?',
    pa2si: '¡Estupendo! Es un euro. ¿Quieres algo más?',
    pa2no: 'Te pongo dos, ¿vale? Es un euro. ¿Quieres algo más?',
    pa3si: '¡Gracias! ¡Que aproveche! ¡Adiós!',
    pa3no: '¡Vale! Gracias por venir. ¡Adiós!',
    introParque: 'Ahora jugamos en el parque. Yo soy un niño nuevo.',
    pq1: '¡Hola! ¿Quieres jugar conmigo? ¿A qué jugamos?',
    pq1si: '¡Qué divertido! ¿Cuántos niños jugamos?',
    pq1no: 'Podemos jugar a la pelota. ¿Cuántos niños jugamos?',
    pq2si: '¡Genial! Yo traigo la pelota. ¿Jugamos otra vez mañana?',
    pq2no: 'Vale, jugamos tres. ¿Jugamos otra vez mañana?',
    pq3si: '¡Qué bien! ¡Hasta mañana!',
    pq3no: '¡Vale! ¡Hasta otro día!',
    introCocina: 'Ahora jugamos a cocinar. Yo soy el cocinero.',
    co1: '¡Hola! Vamos a hacer la comida. ¿Qué cocinamos hoy?',
    co1si: '¡Qué rico! ¿Cuántos huevos ponemos?',
    co1no: 'Podemos hacer una tortilla. ¿Cuántos huevos ponemos?',
    co2si: '¡Muy bien! Ya está lista. ¿Quieres probarla?',
    co2no: 'Pongo tres, ¿vale? Ya está lista. ¿Quieres probarla?',
    co3si: '¡Qué bien! ¡Que aproveche!',
    co3no: '¡Vale! La guardamos para luego.',
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

/* ---------- Bancos de preguntas ----------
   Cada test sortea (con una semilla que se guarda) unas preguntas de cada banco, así el niño no puede
   aprenderse el test de memoria. Las variantes de un mismo tipo tienen la misma dificultad y la misma
   puntuación máxima, para que un test se pueda comparar con el siguiente. Se evitan las preguntas de
   los 2 últimos tests del niño (si quedan suficientes).
   Por test: Comprensión 2 «Toca el…» + 3 «¿Para qué sirve…?» · Vocabulario 3 fáciles + 1 media + 1 difícil
   · Conversación: escalón 1 (saludo + color), 2 (para qué sirve + gustos), 3 (describir + pasado + futuro)
   y 4 (una mini-conversación de 3 turnos). Los ids no cambian nunca: el historial los usa. */
const TN_N = { comp: 5, voc: 5 };
// Vocabulario. dif: 1 fácil, 2 media, 3 difícil. grupo: misma cosa con otro nombre (no salen juntas).
const TN_VOC_BANCO = [
    { id: 'v01', es: 'el perro', dif: 1, otrasValidas: ['el perrito'] },
    { id: 'v02', es: 'el gato', dif: 1, otrasValidas: ['el gatito'] },
    { id: 'v03', es: 'la manzana', dif: 1 },
    { id: 'v04', es: 'la pelota', dif: 1, otrasValidas: ['el balón'], grupo: 'pelota' },
    { id: 'v05', es: 'la cama', dif: 1 },
    { id: 'v06', es: 'la mesa', dif: 1 },
    { id: 'v07', es: 'el coche', dif: 1, otrasValidas: ['el carro'] },
    { id: 'v08', es: 'el plátano', dif: 1, otrasValidas: ['los plátanos', 'la banana'] },
    { id: 'v09', es: 'la flor', dif: 1, otrasValidas: ['la margarita'] },
    { id: 'v10', es: 'el pez', dif: 1, otrasValidas: ['el pececito', 'el pescado'] },
    { id: 'v11', es: 'la vaca', dif: 1 },
    { id: 'v12', es: 'el pan', dif: 1, otrasValidas: ['la barra de pan'] },
    { id: 'v13', es: 'la silla', dif: 2 },
    { id: 'v14', es: 'el vaso', dif: 2 },
    { id: 'v15', es: 'el plato', dif: 2 },
    { id: 'v16', es: 'la camiseta', dif: 2 },
    { id: 'v17', es: 'la naranja', dif: 2, otrasValidas: ['las naranjas'] },
    { id: 'v18', es: 'la fresa', dif: 2, otrasValidas: ['las fresas'] },
    { id: 'v19', es: 'el pájaro', dif: 2, otrasValidas: ['el pajarito'] },
    { id: 'v20', es: 'el caballo', dif: 2 },
    { id: 'v21', es: 'el árbol', dif: 2 },
    { id: 'v22', es: 'el tren', dif: 2 },
    { id: 'v23', es: 'la bicicleta', dif: 2, otrasValidas: ['la bici'] },
    { id: 'v24', es: 'los huevos', dif: 2, otrasValidas: ['el huevo'] },
    { id: 'v25', es: 'el cepillo de dientes', dif: 3 },
    { id: 'v26', es: 'la toalla', dif: 3 },
    { id: 'v27', es: 'la mochila', dif: 3 },
    { id: 'v28', es: 'las gafas', dif: 3 },
    { id: 'v29', es: 'los lápices', dif: 3, otrasValidas: ['el lápiz', 'las pinturas'] },
    { id: 'v30', es: 'el balón', dif: 3, otrasValidas: ['la pelota'], grupo: 'pelota' }
];
const TN_VOC_POR_TEST = { 1: 3, 2: 1, 3: 1 };
// Comprensión. tipo 'toca' (fácil, se nombra la cosa) o 'uso' (hay que entender para qué sirve).
// Las otras 3 fotos se sortean entre categorías distintas (evitar: fotos que podrían confundir).
const TN_COMP_BANCO = [
    ['k01', 'el perro'], ['k02', 'el gato'], ['k03', 'la manzana'], ['k04', 'la pelota'], ['k05', 'la cama'], ['k06', 'la mesa'],
    ['k07', 'el coche'], ['k08', 'el plátano'], ['k09', 'la flor'], ['k10', 'el pez'], ['k11', 'la vaca'], ['k12', 'el pan']
].map(([id, ok]) => ({ id, tipo: 'toca', texto: FRASES_TEST[id], ok, evitar: ok === 'la pelota' ? ['el balón'] : [] })).concat([
    ['k21', 'la cama'], ['k22', 'el cepillo de dientes'], ['k23', 'el vaso'], ['k24', 'la silla'], ['k25', 'la toalla'],
    ['k26', 'las gafas'], ['k27', 'los lápices'], ['k28', 'la mochila'], ['k29', 'el pez', ['el árbol']], ['k30', 'el pájaro'],
    ['k31', 'la vaca'], ['k32', 'el tren', ['el coche', 'la bicicleta']], ['k33', 'el plátano'], ['k34', 'el pan'],
    ['k35', 'la bicicleta', ['el coche', 'el tren']], ['k36', 'los huevos'], ['k37', 'el balón', ['la pelota']],
    ['k38', 'la camiseta', ['las gafas', 'la mochila']], ['k39', 'el gato'], ['k40', 'el perro'], ['k41', 'la flor', ['el árbol']]
].map(([id, ok, evitar]) => ({ id, tipo: 'uso', texto: FRASES_TEST[id], ok, evitar: evitar || [] })));
const TN_COMP_POR_TEST = { toca: 2, uso: 3 };

const COLORES = ['rojo', 'roja', 'azul', 'verde', 'amarillo', 'amarilla', 'blanco', 'blanca', 'negro', 'negra', 'gris', 'rosa', 'naranja', 'morado', 'morada', 'marron', 'lila', 'color', 'claro', 'oscuro'];
const COMIDAS = ['manzana', 'manzanas', 'pizza', 'pasta', 'macarrones', 'espaguetis', 'arroz', 'pollo', 'carne', 'pescado', 'fruta', 'frutas', 'platano', 'platanos', 'pan', 'leche', 'chocolate', 'helado', 'helados', 'patatas', 'sopa', 'huevo', 'huevos', 'galletas', 'queso', 'yogur', 'tortilla', 'hamburguesa', 'hamburguesas', 'naranja', 'naranjas', 'fresa', 'fresas', 'uva', 'uvas', 'sandia', 'melon', 'pera', 'peras', 'verdura', 'verduras', 'ensalada', 'lentejas', 'cuscus', 'dulces', 'caramelos', 'tarta', 'pastel', 'bocadillo', 'zumo', 'agua', 'tomate', 'tomates', 'paella', 'cereales', 'salchichas', 'croquetas', 'garbanzos', 'pescado'];
const NUMEROS = ['uno', 'una', 'dos', 'tres', 'cuatro', 'cinco', 'seis', 'siete', 'ocho', 'nueve', 'diez', 'doce', 'veinte', 'kilo', 'kilos', 'medio', 'muchas', 'muchos', 'pocas', 'pocos', 'todas', 'todos', 'bolsa'];
const JUEGOS = ['futbol', 'pelota', 'balon', 'escondite', 'pilla', 'pillar', 'correr', 'corro', 'saltar', 'salto', 'comba', 'munecas', 'muneca', 'coches', 'lego', 'puzle', 'puzzle', 'consola', 'videojuegos', 'tablet', 'columpio', 'columpios', 'tobogan', 'arena', 'bici', 'baloncesto', 'cartas', 'juego', 'jugar', 'juegos', 'pintar', 'dibujar', 'carreras', 'tenis', 'nadar', 'bailar', 'peluches', 'trenes', 'construcciones', 'parque', 'amigos', 'policias', 'ladrones', 'tula', 'rayuela', 'canicas', 'patinete', 'patines'];
const SALUDO = ['bien', 'mal', 'genial', 'contento', 'contenta', 'feliz', 'cansado', 'cansada', 'regular', 'gracias', 'triste', 'fenomenal', 'estupendo', 'estupenda', 'super', 'hola', 'tu', 'guay', 'perfecto', 'buenos', 'dias', 'muy', 'alegre', 'enfadado', 'enfadada', 'sueno', 'hambre'];
const DESCRIBIR = ['animal', 'ojos', 'orejas', 'pelo', 'cola', 'sentado', 'tumbado', 'de', 'pie', 'hierba', 'campo', 'suelo', 'casa', 'blanco', 'blanca', 'negro', 'negra', 'marron', 'rojo', 'roja', 'verde', 'azul', 'grande', 'pequeno', 'pequena', 'bonito', 'bonita', 'patas', 'nariz', 'mira', 'mirando', 'jugando', 'contento', 'arbol', 'arboles', 'cielo', 'montana', 'montanas', 'calle', 'agua', 'sol', 'nubes', 'prado', 'flores'];
const PASADO_CLAVES = ['ayer', 'parque', 'casa', 'colegio', 'cole', 'futbol', 'amigos', 'amiga', 'amigo', 'tele', 'television', 'abuela', 'abuelo', 'mama', 'papa', 'hermano', 'hermana', 'playa', 'piscina', 'deberes', 'clase', 'tienda', 'calle', 'bici', 'pelota', 'juegos', 'dibujo', 'cena', 'comida', 'nada', 'tarde', 'pueblo', 'cine', 'familia', 'campo', 'sabado', 'domingo'];
const FUTURO_CLAVES = ['sabado', 'domingo', 'manana', 'tarde', 'vacaciones', 'parque', 'playa', 'casa', 'abuela', 'abuelo', 'amigos', 'amiga', 'amigo', 'futbol', 'cine', 'piscina', 'montana', 'campo', 'pueblo', 'viaje', 'tienda', 'jugar', 'ver', 'tele', 'pasear', 'visitar', 'comer', 'dormir', 'descansar', 'merendar', 'deberes', 'cole', 'colegio', 'bici', 'familia', 'mama', 'papa', 'excursion', 'nada'];
const FIN_DIALOGO = ['no', 'si', 'gracias', 'nada', 'adios', 'vale', 'ya', 'todo', 'luego', 'tambien', 'mas', 'chao', 'claro', 'bueno', 'venga', 'quiero', 'manana', 'genial', 'rico', 'rica', 'mmm', 'hasta'].concat(COMIDAS);
const GUSTA = ['gusta', 'gustan', 'encanta', 'encantan', 'favorito', 'favorita', 'mas', 'mucho'];

// Conversación. tipo = qué se pregunta; todas las variantes de un tipo tienen los mismos criterios.
// nivel = escalón (1 fácil … 3 difícil). min = nº de palabras para "respuesta larga".
const TN_TIPOS_CONV = {
    saludo: { nivel: 1, min: 3 },
    color: { nivel: 1, min: 3 },
    uso: { nivel: 2, min: 3 },
    gusto: { nivel: 2, min: 3 },
    describir: { nivel: 3, min: 4, largo: 8, continuo: true },
    pasado: { nivel: 3, min: 3, tiempo: 'pasado', continuo: true },
    futuro: { nivel: 3, min: 3, tiempo: 'futuro', continuo: true }
};
const TN_CONV_POR_ESCALON = { 1: ['saludo', 'color'], 2: ['uso', 'gusto'], 3: ['describir', 'pasado', 'futuro'] };
const TN_CONV_BANCO = [
    ...['c11', 'c12', 'c13', 'c14'].map(id => ({ id, tipo: 'saludo', claves: SALUDO })),
    ...[['c15', 'la camiseta'], ['c16', 'el coche'], ['c17', 'la flor'], ['c18', 'la toalla'], ['c19', 'la mochila']].map(([id, foto]) => ({ id, tipo: 'color', foto, claves: COLORES })),
    { id: 'c21', tipo: 'uso', foto: 'la pelota', claves: ['juego', 'jugar', 'jugamos', 'chuto', 'chutar', 'tiro', 'tirar', 'lanzo', 'lanzar', 'paso', 'pasar', 'gol', 'goles', 'futbol', 'boto', 'botar', 'patada', 'pelota', 'balon', 'cojo', 'coger', 'atrapo', 'baloncesto', 'porteria', 'amigos', 'parque'] },
    { id: 'c22', tipo: 'uso', foto: 'la bicicleta', claves: ['monto', 'montar', 'pedaleo', 'pedalear', 'voy', 'ir', 'paseo', 'pasear', 'corro', 'correr', 'carreras', 'parque', 'calle', 'casco', 'ruedas', 'bici', 'rapido', 'ando', 'andar', 'juego', 'jugar', 'conduzco', 'amigos'] },
    { id: 'c23', tipo: 'uso', foto: 'los lápices', claves: ['dibujo', 'dibujar', 'pinto', 'pintar', 'escribo', 'escribir', 'coloreo', 'colorear', 'papel', 'cuaderno', 'colegio', 'cole', 'letras', 'colores', 'dibujos', 'hoja', 'clase'] },
    { id: 'c24', tipo: 'uso', foto: 'la toalla', claves: ['seco', 'secar', 'secarme', 'ducha', 'duchar', 'bano', 'banarme', 'piscina', 'playa', 'agua', 'manos', 'cara', 'cuerpo', 'pelo', 'mojado', 'mojada', 'limpio'] },
    { id: 'c25', tipo: 'uso', foto: 'el vaso', claves: ['bebo', 'beber', 'agua', 'leche', 'zumo', 'lleno', 'lleno', 'tomo', 'tomar', 'echo', 'echar', 'cocina', 'mesa', 'sed', 'batido', 'cacao'] },
    { id: 'c26', tipo: 'uso', foto: 'el cepillo de dientes', claves: ['lavo', 'lavar', 'lavarme', 'limpio', 'limpiar', 'dientes', 'boca', 'pasta', 'cepillo', 'cepillo', 'cepillar', 'cepillarme', 'bano', 'noche', 'manana', 'agua'] },
    { id: 'c27', tipo: 'gusto', claves: COMIDAS.concat(GUSTA, ['comer', 'como']) },
    { id: 'c28', tipo: 'gusto', claves: JUEGOS.concat(GUSTA) },
    { id: 'c29', tipo: 'gusto', claves: ['perro', 'perros', 'perrito', 'gato', 'gatos', 'gatito', 'caballo', 'caballos', 'vaca', 'vacas', 'pajaro', 'pajaros', 'pez', 'peces', 'leon', 'leones', 'tigre', 'tigres', 'elefante', 'elefantes', 'jirafa', 'jirafas', 'mono', 'monos', 'conejo', 'conejos', 'oso', 'osos', 'tortuga', 'tortugas', 'pato', 'patos', 'gallina', 'oveja', 'cerdo', 'delfin', 'delfines', 'tiburon', 'serpiente', 'raton', 'lobo', 'zorro', 'dinosaurio', 'dinosaurios', 'animal', 'animales', 'mariposa', 'pinguino', 'ballena', 'hamster', 'loro', 'cebra', 'koala', 'panda', 'burro', 'cabra', 'aguila', 'buho'].concat(GUSTA) },
    { id: 'c30', tipo: 'gusto', claves: JUEGOS.concat(GUSTA, ['subir', 'bajar', 'columpiarme', 'tirarme', 'merendar', 'pasear', 'banco', 'perro', 'flores', 'jugamos']) },
    { id: 'c31', tipo: 'gusto', claves: ['agua', 'leche', 'zumo', 'batido', 'colacao', 'cacao', 'chocolate', 'refresco', 'limonada', 'naranjada', 'te', 'infusion', 'beber', 'bebo', 'fresa', 'naranja', 'manzana', 'yogur', 'coca', 'cola', 'horchata', 'caliente', 'fria'].concat(GUSTA) },
    { id: 'c41', tipo: 'describir', foto: 'el perro', claves: DESCRIBIR.concat(['perro', 'perrito', 'lengua', 'collar']) },
    { id: 'c42', tipo: 'describir', foto: 'el gato', claves: DESCRIBIR.concat(['gato', 'gatito', 'bigotes']) },
    { id: 'c43', tipo: 'describir', foto: 'el caballo', claves: DESCRIBIR.concat(['caballo', 'crin', 'caminando', 'andando']) },
    { id: 'c44', tipo: 'describir', foto: 'la vaca', texto: 'c41', claves: DESCRIBIR.concat(['vaca', 'toro', 'leche', 'comiendo']) },
    { id: 'c45', tipo: 'describir', foto: 'el coche', texto: 'c42', claves: DESCRIBIR.concat(['coche', 'ruedas', 'puertas', 'carretera', 'aparcado', 'antiguo', 'viejo', 'pared']) },
    { id: 'c51', tipo: 'pasado', claves: PASADO_CLAVES },
    { id: 'c52', tipo: 'pasado', claves: PASADO_CLAVES },
    { id: 'c53', tipo: 'pasado', claves: PASADO_CLAVES },
    { id: 'c54', tipo: 'pasado', claves: PASADO_CLAVES.concat(COMIDAS) },
    ...['c61', 'c62', 'c63', 'c64'].map(id => ({ id, tipo: 'futuro', claves: FUTURO_CLAVES }))
].map(q => ({ ...TN_TIPOS_CONV[q.tipo], ...q, texto: FRASES_TEST[q.texto || q.id] }));
// Mini-conversaciones (escalón 4): 3 turnos. Lo que contesta la app depende de si la respuesta va al tema.
// Turno 2: un número (vale también en cifras). Turno 3: «no» es una respuesta válida.
const TN_DIALOGOS = [
    { id: 'frut', titulo: 'En la frutería', intro: 'introTienda', foto: 'la manzana', turnos: [
        { id: 'd11', pregunta: 'd1', si: 'd1si', no: 'd1no', claves: COMIDAS.concat(['quiero', 'quisiera', 'comprar', 'fruta', 'kilo', 'dame', 'pongame']) },
        { id: 'd12', si: 'd2si', no: 'd2no' }, { id: 'd13', si: 'd3si', no: 'd3no' }] },
    { id: 'pan', titulo: 'En la panadería', intro: 'introPan', foto: 'el pan', turnos: [
        { id: 'd21', pregunta: 'pa1', si: 'pa1si', no: 'pa1no', claves: ['pan', 'barra', 'barras', 'bollo', 'bollos', 'cruasan', 'croissant', 'magdalena', 'magdalenas', 'galletas', 'tarta', 'pastel', 'pasteles', 'donut', 'donuts', 'napolitana', 'bocadillo', 'quiero', 'quisiera', 'comprar', 'dame', 'pongame', 'chocolate'] },
        { id: 'd22', si: 'pa2si', no: 'pa2no' }, { id: 'd23', si: 'pa3si', no: 'pa3no' }] },
    { id: 'parque', titulo: 'En el parque', intro: 'introParque', foto: 'la pelota', turnos: [
        { id: 'd31', pregunta: 'pq1', si: 'pq1si', no: 'pq1no', claves: JUEGOS.concat(['si', 'vale', 'quiero', 'jugamos']) },
        { id: 'd32', si: 'pq2si', no: 'pq2no' }, { id: 'd33', si: 'pq3si', no: 'pq3no' }] },
    { id: 'cocina', titulo: 'En la cocina', intro: 'introCocina', foto: 'los huevos', turnos: [
        { id: 'd41', pregunta: 'co1', si: 'co1si', no: 'co1no', claves: COMIDAS.concat(['cocinar', 'cocinamos', 'hacer', 'hacemos', 'quiero', 'paella']) },
        { id: 'd42', si: 'co2si', no: 'co2no' }, { id: 'd43', si: 'co3si', no: 'co3no' }] }
].map(d => ({ ...d, turnos: d.turnos.map((t, i) => ({
    nivel: 4, min: 2, dialogo: true, ...t, n: i + 1, dlg: d.id,
    ...(i === 1 ? { claves: NUMEROS, digitos: true } : i === 2 ? { claves: FIN_DIALOGO, permiteNo: true } : {})
})) }));
// Para pasar al siguiente escalón de conversación hace falta este % en el anterior:
const TN_PASAR_ESCALON = { 1: 40, 2: 50, 3: 50 };
// Nombres de las preguntas de los tests antiguos (antes de los bancos), para el historial.
const TN_ITEMS_ANTIGUOS = {
    k1: 'Toca el perro.', k2: 'Toca la manzana.', k3: '¿Dónde duermes por la noche?', k4: '¿Con qué te lavas los dientes?', k5: 'Toca lo que usamos para beber agua.',
    v1: 'Decir: el gato', v2: 'Decir: la pelota', v3: 'Decir: la mesa', v4: 'Decir: la camiseta', v5: 'Decir: el cepillo de dientes',
    c1: '¡Hola! ¿Qué tal estás?', c2: 'Mira esta camiseta. ¿De qué color es?', c3: '¿Qué haces tú con una pelota?', c4: '¿Qué te gusta comer?',
    c5: 'Mira esta foto. Cuéntame qué ves.', c6: '¿Qué hiciste ayer?', c7: '¿Qué vas a hacer el fin de semana?',
    d1: 'Frutería: ¿Qué quieres comprar?', d2: 'Frutería: ¿Cuántas quieres?', d3: 'Frutería: ¿Quieres algo más?'
};
const TN_TIPO_ANTIGUO = { c6: 'pasado', c7: 'futuro', d1: 'dialogo', d2: 'dialogo', d3: 'dialogo' };

/* ---------- Sorteo de preguntas (con semilla) ---------- */
function tnAzar(semilla) { // mulberry32: mismo número → mismo test (para poder reproducirlo)
    let a = semilla >>> 0;
    return () => { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}
function tnBarajar(lista, azar) { const a = lista.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(azar() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; }
// Elige n de la lista: primero las que no se han visto en los últimos tests; si no hay bastantes, completa con las vistas.
function tnElegir(lista, n, azar, vistos, vale = () => true) {
    const ok = lista.filter(vale);
    const nuevos = tnBarajar(ok.filter(q => !vistos.has(q.id)), azar), viejos = tnBarajar(ok.filter(q => vistos.has(q.id)), azar);
    return nuevos.concat(viejos).slice(0, n);
}
// Preguntas que vio el niño en sus 2 últimos tests (solo ids; se guardan en gameState.pruebas).
function tnVistosRecientes(pruebas, n = 2) {
    const s = new Set();
    (pruebas || []).slice(-n).forEach(p => { (p.ids || []).concat((p.items || []).map(i => i.id)).forEach(id => s.add(id)); });
    return s;
}
function tnGrupo(es) { const v = TN_VOC_BANCO.find(q => q.es === es); return (v && v.grupo) || es; }
// Plan del test: qué preguntas salen y en qué orden. fotos = lista de { es, cat } (visualVocab).
function tnPlanTest(semilla, vistos, fotos) {
    const azar = tnAzar(semilla);
    const cat = es => (fotos.find(f => f.es === es) || {}).cat || '?';
    // Vocabulario: 3 fáciles, 1 media, 1 difícil (sin dos nombres de la misma cosa)
    let voc = [];
    for (const dif of [1, 2, 3]) voc = voc.concat(tnElegir(TN_VOC_BANCO.filter(q => q.dif === dif), TN_VOC_POR_TEST[dif], azar, vistos, q => !voc.some(x => tnGrupo(x.es) === tnGrupo(q.es))));
    voc = tnBarajar(voc.slice(0, 4), azar).concat(voc.slice(4)); // la difícil siempre al final
    const usadas = new Set(voc.map(q => tnGrupo(q.es)));
    // Comprensión: 2 «Toca…» y 3 «¿Para qué sirve…?», con cosas que no salen en Vocabulario
    let comp = [];
    for (const tipo of ['toca', 'uso']) {
        comp = comp.concat(tnElegir(TN_COMP_BANCO.filter(q => q.tipo === tipo), TN_COMP_POR_TEST[tipo], azar, vistos,
            q => !usadas.has(tnGrupo(q.ok)) && !comp.some(x => tnGrupo(x.ok) === tnGrupo(q.ok))));
    }
    comp = comp.map(q => {
        const evitar = new Set(q.evitar.map(tnGrupo).concat([tnGrupo(q.ok)]));
        const otras = [], cats = new Set([cat(q.ok)]);
        for (const f of tnBarajar(fotos, azar)) {
            if (otras.length >= 3) break;
            if (cats.has(f.cat) || evitar.has(tnGrupo(f.es))) continue;
            otras.push(f.es); cats.add(f.cat);
        }
        return { ...q, otras, opciones: tnBarajar([q.ok].concat(otras), azar) };
    });
    // Conversación: una de cada tipo; las de foto, mejor con fotos que no han salido
    const conv = {};
    for (const n of [1, 2, 3]) {
        conv[n] = TN_CONV_POR_ESCALON[n].map(tipo => {
            const delTipo = tnBarajar(TN_CONV_BANCO.filter(q => q.tipo === tipo), azar);
            const fotoNueva = q => !q.foto || !usadas.has(tnGrupo(q.foto));
            return delTipo.find(q => !vistos.has(q.id) && fotoNueva(q)) || delTipo.find(q => !vistos.has(q.id)) || delTipo.find(fotoNueva) || delTipo[0];
        });
        conv[n].forEach(q => { if (q.foto) usadas.add(tnGrupo(q.foto)); });
    }
    const dialogo = TN_DIALOGOS.filter(d => !d.turnos.some(t => vistos.has(t.id)));
    const dlg = tnBarajar(dialogo.length ? dialogo : TN_DIALOGOS, azar)[0];
    const vocTextos = ['queEs', 'queEs2', 'queEs3'];
    voc = voc.map(q => ({ ...q, pregunta: FRASES_TEST[vocTextos[Math.floor(azar() * vocTextos.length)]] }));
    const plan = { sem: semilla >>> 0, comp, voc, conv, dialogo: dlg };
    plan.ids = comp.map(q => q.id).concat(voc.map(q => q.id), [1, 2, 3].flatMap(n => conv[n].map(q => q.id)), dlg.turnos.map(t => t.id));
    return plan;
}
// Todas las preguntas de conversación del plan (para la puntuación: lo no preguntado cuenta 0 con su máximo).
function tnConvDelPlan(plan) { return [1, 2, 3].flatMap(n => plan.conv[n]).concat(plan.dialogo.turnos); }
function tnBuscarItem(id) {
    return TN_COMP_BANCO.find(q => q.id === id) || TN_VOC_BANCO.find(q => q.id === id) || TN_CONV_BANCO.find(q => q.id === id)
        || TN_DIALOGOS.flatMap(d => d.turnos).find(q => q.id === id) || null;
}

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
// de las preguntas del plan del test (lo que no se llegó a preguntar cuenta 0; todas las variantes valen lo mismo). Total = 30% Comprensión + 25% Vocabulario + 45% Conversación.
// Nivel: total >= 70 → 3, >= 45 → 2, >= 20 → 1, si no 0; el 3 exige Conversación >= 55% y el 2 >= 25%.
function calcularResultadoTest(items, adulto, plan) {
    const por = id => items.find(i => i.id === id);
    const suma = b => items.filter(i => i.b === b).reduce((s, i) => s + (i.p || 0), 0);
    const comp = Math.round(100 * suma('comp') / TN_N.comp);
    const voc = Math.round(100 * suma('voc') / TN_N.voc);
    let pc = 0, mc = 0;
    tnConvDelPlan(plan).forEach(q => { const r = por(q.id); pc += r ? r.p : 0; mc += r ? r.m : maxConversacion(q, adulto); });
    const conv = Math.round(100 * pc / mc);
    const P = TN_CFG.pesos;
    const total = Math.round((P.comp * comp + P.voc * voc + P.conv * conv) / (P.comp + P.voc + P.conv));
    let nivel = total >= 70 ? 3 : total >= 45 ? 2 : total >= 20 ? 1 : 0;
    if (nivel === 3 && conv < 55) nivel = 2;
    if (nivel === 2 && conv < 25) nivel = 1;
    return { comp, voc, conv, total, nivel };
}
function pctEscalon(items, n, plan) {
    let p = 0, m = 0;
    tnConvDelPlan(plan).filter(q => q.nivel === n).forEach(q => { const r = items.find(i => i.id === q.id); if (r) { p += r.p; m += r.m; } });
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

function tnNuevaSemilla() {
    if (typeof window !== 'undefined' && window.__tnSemilla != null) return Number(window.__tnSemilla) >>> 0; // pruebas
    try { return crypto.getRandomValues(new Uint32Array(1))[0]; } catch (e) { return Math.floor(Math.random() * 4294967296); }
}
function iniciarTestNivel({ repeticion = false, semilla = null } = {}) {
    if (tn && tn.esperando) { tn.parar = true; tnResponder({ parar: true }); }
    const adulto = !SpeechRec || !!(typeof hablaData !== 'undefined' && hablaData.soloManual);
    const sem = semilla != null ? Number(semilla) >>> 0 : tnNuevaSemilla();
    const plan = tnPlanTest(sem, tnVistosRecientes(gameState && gameState.pruebas), visualVocab);
    tn = {
        id: 't' + Date.now().toString(36), t0: Date.now(), repeticion, items: [], textos: {}, plan,
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
    const lista = tn.plan.comp;
    for (let i = 0; i < lista.length; i++) {
        if (tnParado() || tnTiempoAgotado()) return;
        const q = lista[i];
        tn.actual = q.id;
        const opciones = q.opciones;
        pintarPantalla({
            bloque: TN_BLOQUES.comp, paso: `${i + 1}/${lista.length}`, texto: q.texto, controles: `
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
    const lista = tn.plan.voc;
    for (let i = 0; i < lista.length; i++) {
        if (tnParado() || tnTiempoAgotado()) return;
        const q = lista[i];
        tn.actual = q.id;
        const r = await preguntaHablada({
            bloque: TN_BLOQUES.voc, paso: `${i + 1}/${lista.length}`, texto: q.pregunta, foto: q.es,
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
    let num = 0;
    for (const escalon of [1, 2, 3]) {
        for (const q of tn.plan.conv[escalon]) {
            if (tnParado() || tnTiempoAgotado()) return;
            await preguntaConversacion(q, q.texto, `${++num}`);
        }
        if (tnParado()) return;
        if (pctEscalon(tn.items, escalon, tn.plan) < TN_PASAR_ESCALON[escalon]) return; // no sube de dificultad
    }
    // 4) Mini-conversación (3 turnos; la app contesta según lo que diga el niño)
    if (tnParado() || tnTiempoAgotado()) return;
    const d = tn.plan.dialogo;
    await tnDecir(FRASES_TEST[d.intro], { titulo: d.titulo });
    let pregunta = FRASES_TEST[d.turnos[0].pregunta];
    for (const q of d.turnos) {
        if (tnParado() || tnTiempoAgotado()) return;
        const res = await preguntaConversacion({ ...q, foto: d.foto }, pregunta, `Turno ${q.n}/3`, { titulo: d.titulo, sinAnimo: true });
        if (!res) return;
        const sig = FRASES_TEST[res.relevante ? q.si : q.no];
        if (q.n === 3) { pintarPantalla({ bloque: d.titulo, texto: sig, foto: d.foto, controles: '' }); await decir(sig); }
        else pregunta = sig;
    }
}
async function preguntaConversacion(q, texto, paso, { titulo, sinAnimo } = {}) {
    tn.actual = q.id;
    const r = await preguntaHablada({
        bloque: titulo || TN_BLOQUES.conv, paso, texto, foto: q.foto || '',
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
    const res = calcularResultadoTest(tn.items, tn.adulto, tn.plan);
    const prueba = {
        id: tn.id, t: Date.now(), sem: tn.plan.sem, ids: tn.plan.ids, nivel: res.nivel, nivelAntes: tn.nivelAntes, total: res.total, comp: res.comp, voc: res.voc, conv: res.conv,
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
    if (TN_ITEMS_ANTIGUOS[id]) return TN_ITEMS_ANTIGUOS[id];
    const q = tnBuscarItem(id);
    if (!q) return id;
    if (q.es) return 'Decir: ' + q.es;
    if (q.dlg) { const d = TN_DIALOGOS.find(x => x.id === q.dlg); return `${d.titulo.replace(/^En (la |el )?/, '').replace(/^./, c => c.toUpperCase())} · turno ${q.n}/3`; }
    return q.texto + (q.foto && q.tipo !== 'color' ? ` (foto: ${q.foto})` : '');
}
function tnTipoItem(id) { if (TN_TIPO_ANTIGUO[id]) return TN_TIPO_ANTIGUO[id]; const q = tnBuscarItem(id); return q ? (q.dlg ? 'dialogo' : q.tipo) : ''; }
function queTrabajar(p) {
    const it = id => p.items.find(i => i.id === id);
    const conv = p.items.filter(i => i.b === 'conv' && i.r !== 'salto');
    const out = [];
    if (p.comp < 60) out.push('<b>Comprensión</b>: escuchar y señalar. Jugad a «Identificar fotos» y al «Diccionario visual» con el audio.');
    const idsVoc = (p.ids || []).filter(id => id[0] === 'v');
    const malVoc = (idsVoc.length ? idsVoc : p.items.filter(i => i.b === 'voc').map(i => i.id))
        .filter(id => { const r = it(id); return !r || r.p < 1; }).map(id => (tnBuscarItem(id) || {}).es || (TN_ITEMS_ANTIGUOS[id] || '').replace('Decir: ', '')).filter(Boolean);
    if (p.voc < 60) out.push(`<b>Vocabulario</b>: practicad «Di la palabra»${malVoc.length ? ' con: ' + malVoc.map(esc).join(', ') : ''}.`);
    const respondidas = conv.filter(i => i.p > 0);
    if (respondidas.length && respondidas.filter(i => i.c.includes('V')).length < respondidas.length / 2) out.push('<b>Frases completas</b>: responde con palabras sueltas. Usad «Dime una frase» y modelad frases con verbo («Yo como…», «El perro está…»).');
    if (!conv.length || conv.every(i => i.p === 0)) out.push('<b>Conversación</b>: todavía no responde a preguntas. Empezad con saludos y preguntas de sí/no, con gestos y fotos.');
    const c6 = p.items.find(i => tnTipoItem(i.id) === 'pasado'), c7 = p.items.find(i => tnTipoItem(i.id) === 'futuro');
    if (c6 && !c6.c.includes('T')) out.push('<b>Pasado</b>: preguntad «¿Qué hiciste…?» cada día y dad el modelo («Ayer jugué…, fui…»).');
    if (c7 && !c7.c.includes('T')) out.push('<b>Futuro</b>: practicad «Voy a + verbo» («Mañana voy a jugar…»).');
    if (!c6 && !c7 && p.conv >= 25) out.push('<b>Pasado y futuro</b>: aún no se ha llegado a estas preguntas; trabajad primero frases en presente.');
    const d = p.items.filter(i => tnTipoItem(i.id) === 'dialogo');
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
        <p class="text-[11px] text-slate-500">Cómo se calcula: las preguntas se sortean en cada test entre variantes de la misma dificultad. Comprensión = aciertos de 5 · Vocabulario = palabras dichas (casi = media) de 5 · Conversación = puntos por responder, varias palabras, frase con verbo, palabra relacionada, rapidez y (en las difíciles) pasado/futuro y descripción larga. Total = 30% + 25% + 45%. Nivel 3 ≥ 70, 2 ≥ 45, 1 ≥ 20.</p>
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
