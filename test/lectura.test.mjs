// Pruebas de «Leo en voz alta» (alineación y métricas) y del tema favorito. Ejecutar: node test/lectura.test.mjs
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

function cargar(archivo, extra = {}) {
    const sb = Object.assign({ module: { exports: {} }, console }, extra);
    vm.createContext(sb);
    vm.runInContext(fs.readFileSync(new URL('../' + archivo, import.meta.url), 'utf8'), sb);
    return sb.module.exports;
}
const L = cargar('lectura.js');
const T = cargar('temas.js');
let ok = 0;
function prueba(nombre, fn) {
    try { fn(); ok++; console.log('  ✔ ' + nombre); }
    catch (e) { process.exitCode = 1; console.log('  ✘ ' + nombre + '\n', e); }
}
const plano = a => JSON.parse(JSON.stringify(a)); // objetos del sandbox → objetos normales
const gato = L.CUENTOS.find(c => c.id === 'l0-gato');
const tk = L.lecTokens(gato);
const alinear = texto => L.lecAlinear(tk.ref, L.lecPalabras(texto));
const est = texto => alinear(texto).estados.join('');
const N = tk.ref.length;

prueba('lectura perfecta: todas las palabras bien', () => {
    const a = alinear(gato.texto.join(' '));
    assert.equal(a.estados.join(''), 'b'.repeat(N));
    assert.equal(a.extras + a.repeticiones + a.autoc, 0);
    const m = L.lecMetricas(a.estados, { ms: 60000, sims: a.sims });
    assert.equal(m.prec, 100); assert.equal(m.compl, 100); assert.equal(m.ppm, N); assert.equal(m.est, 3); assert.equal(m.pron, 100);
});
prueba('mayúsculas, tildes y la puntuación no cuentan como error', () => {
    assert.equal(est('BIGOTES ES UN GATO GRIS bigotes duerme en la cama de ana por la manana bigotes bebe leche y juega con una pelota ana quiere mucho a bigotes'), 'b'.repeat(N));
});
prueba('palabra saltada en medio → «s» y baja la precisión', () => {
    const e = est('Bigotes es un gato gris. Bigotes duerme en la de Ana. Por la mañana, Bigotes bebe leche y juega con una pelota. Ana quiere mucho a Bigotes.');
    assert.equal(e[9], 's'); assert.equal(e.replace(/b/g, '').length, 1);
    const m = L.lecMetricas([...e], {});
    assert.equal(m.prec, Math.round((N - 1) / N * 100)); assert.equal(m.compl, 100);
});
prueba('frase entera saltada → varias «s», el resto bien', () => {
    const e = est('Bigotes es un gato gris. Por la mañana, Bigotes bebe leche y juega con una pelota. Ana quiere mucho a Bigotes.');
    assert.equal(e.slice(5, 12), 'sssssss'); assert.equal(e.slice(12), 'b'.repeat(N - 12));
});
prueba('lee solo el principio → el resto es «sin leer» (no cuenta como error) y completado parcial', () => {
    const e = est('Bigotes es un gato gris. Bigotes duerme en la cama de Ana.');
    assert.equal(e, 'b'.repeat(12) + 'n'.repeat(N - 12));
    const m = L.lecMetricas([...e], { ms: 10000 });
    assert.equal(m.prec, 100); assert.equal(m.compl, Math.round(12 / N * 100)); assert.equal(m.leidas, 12); assert.equal(m.ppm, 72);
    assert.ok(m.est < 3);
});
prueba('palabras repetidas → se cuentan como repeticiones, no como errores', () => {
    const a = alinear('Bigotes es un gato gato gris. Bigotes duerme duerme en la cama de Ana.');
    assert.equal(a.estados.join(''), 'b'.repeat(12) + 'n'.repeat(N - 12));
    assert.equal(a.repeticiones, 2); assert.equal(a.extras, 0);
});
prueba('mal pronunciada: parecida → «con dudas»; muy distinta → «no se entendió»', () => {
    const e1 = est('Bigotes es un pato gris'); assert.equal(e1[3], 'd');
    const e2 = est('Bigotes es un helicóptero gris'); assert.equal(e2[3], 'm');
    const a = alinear('Bigotes es un helicóptero gris');
    const m = L.lecMetricas(a.estados, { sims: a.sims });
    assert.equal(m.correctas, 4); assert.equal(m.prec, 80); assert.ok(m.pron < 100);
});
prueba('autocorrección: «due… duerme» cuenta como autocorrección y la palabra queda bien', () => {
    const a = alinear('Bigotes es un gato gris. Bigotes due duerme en la cama de Ana.');
    assert.equal(a.autoc, 1); assert.equal(a.estados[6], 'b'); assert.ok(a.corregida[6]);
});
prueba('palabras de relleno (eh, mmm) no cuentan', () => {
    assert.deepEqual(plano(L.lecPalabras('eh Bigotes mmm es')), ['bigotes', 'es']);
    assert.equal(est('eh Bigotes es un mmm gato gris'), 'b'.repeat(5) + 'n'.repeat(N - 5));
});
prueba('palabras correctas por minuto (PCPM)', () => {
    assert.equal(L.lecPCPM(30, 60000), 30);
    assert.equal(L.lecPCPM(45, 30000), 90);
    assert.equal(L.lecPCPM(10, 0), 0);
    assert.equal(L.lecPCPM(1000, 1000), 400); // tope
    // con tiempos por palabra: desde que empieza a hablar hasta la última palabra; pausas > 3 s
    const estados = ['b', 'b', 'b', 'b'];
    const m = L.lecMetricas(estados, { tiempos: [10000, 11000, 16000, 17000], inicio: 9000 });
    assert.equal(m.ms, 8000); assert.equal(m.ppm, 30); assert.equal(m.pausas, 1);
    const m2 = L.lecMetricas(estados, { tiempos: [10000, 11000, 12000, 13000], inicio: 1000 }); // inicio incoherente → 0,6 s antes
    assert.equal(m2.ms, 3600);
});
prueba('estrellas', () => {
    assert.equal(L.lecEstrellas(95, 100, 20), 3); assert.equal(L.lecEstrellas(75, 70, 20), 2);
    assert.equal(L.lecEstrellas(40, 100, 5), 1); assert.equal(L.lecEstrellas(0, 0, 0), 0);
});
prueba('respuestas habladas: basta con la palabra clave (con tolerancia)', () => {
    assert.equal(L.lecRespuestaOk(['en la cama de Ana'], ['cama']), true);
    assert.equal(L.lecRespuestaOk(['en el sofá'], ['cama']), false);
    assert.equal(L.lecRespuestaOk(['eran 7'], ['siete']), true);
});
prueba('cuentos: 15-30, niveles 0-3, fotos existentes, temas válidos y longitud creciente', () => {
    const html = fs.readFileSync(new URL('../index.html', import.meta.url), 'utf8');
    const fotos = new Set([...html.matchAll(/es:\s*'([^']+)',\s*img:/g)].map(m => m[1]));
    assert.ok(fotos.size >= 30, 'vocabulario leído');
    assert.ok(L.CUENTOS.length >= 15 && L.CUENTOS.length <= 30, 'número de cuentos');
    const ids = new Set();
    const media = [0, 0, 0, 0], cuenta = [0, 0, 0, 0];
    for (const c of L.CUENTOS) {
        assert.match(c.id, /^[a-z0-9-]{1,30}$/); assert.ok(!ids.has(c.id), 'id repetido ' + c.id); ids.add(c.id);
        assert.ok([0, 1, 2, 3].includes(c.nivel));
        assert.ok(T.TEMAS[c.tema], 'tema ' + c.tema);
        assert.ok(fotos.has(c.foto), 'foto no existe: ' + c.foto);
        // Comprensión: 3 preguntas de elegir con 3 opciones; la explicación es una frase copiada del cuento
        // y la respuesta correcta sale en esa frase (así la respuesta está claramente en el texto)
        assert.equal(c.preguntas.length, 3, c.id);
        const textoN = L.lecPalabras(c.texto.join(' ')).join(' ');
        for (const q of c.preguntas) {
            assert.equal(q.tipo, 'elegir', c.id);
            assert.equal(q.ops.length, 3, c.id + ': ' + q.p);
            assert.equal(new Set(q.ops.map(L.lecNorm)).size, 3, 'opciones repetidas: ' + q.p);
            assert.ok(q.ops[q.ok] !== undefined && q.p.length < 90);
            assert.ok(typeof q.x === 'string' && q.x.length, 'falta explicación: ' + q.p);
            const xN = L.lecPalabras(q.x).join(' ');
            assert.ok(textoN.includes(xN), c.id + ': la explicación no está en el cuento: ' + q.x);
            // las palabras con contenido de la respuesta (más de 3 letras, o la única que haya) tienen que salir en la frase
            const todas = L.lecPalabras(q.ops[q.ok]), largas = todas.filter(w => w.length > 3);
            const okN = largas.length ? largas : todas;
            assert.ok(okN.every(w => L.lecPalabras(q.x).some(v => L.lecSim(v, w) >= 0.75)), c.id + ': la respuesta «' + q.ops[q.ok] + '» no sale en «' + q.x + '»');
        }
        const t = L.lecTokens(c);
        assert.equal(t.ref.length, t.disp.length);
        media[c.nivel] += t.ref.length; cuenta[c.nivel]++;
    }
    const m = media.map((s, i) => s / cuenta[i]);
    for (let i = 1; i < 4; i++) { assert.ok(cuenta[i] >= 3); assert.ok(m[i] > m[i - 1], 'más largos al subir de nivel'); }
});
prueba('desbloqueo y recomendación', () => {
    const c2 = L.CUENTOS.find(c => c.nivel === 2);
    assert.equal(L.lecDesbloqueado(c2, 1, {}, false), false);
    assert.equal(L.lecDesbloqueado(c2, 1, {}, true), true);
    const prev = L.CUENTOS[L.CUENTOS.indexOf(c2) - 1];
    assert.equal(L.lecDesbloqueado(c2, 1, { [prev.id]: 2 }, false), true);
    assert.equal(L.lecRecomendado(1, {}, 'transporte', false).id, 'l1-bici');
    assert.equal(L.lecRecomendado(0, {}, 'futbol', false).id, 'l0-balon');
    const hechos = Object.fromEntries(L.CUENTOS.filter(c => c.nivel === 0).map(c => [c.id, 3]));
    assert.equal(L.lecRecomendado(0, hechos, 'futbol', false).nivel, 1); // todos los del nivel con ⭐⭐⭐ → siguiente nivel
});
prueba('solo las puntuaciones van al servidor (sin lo oído ni el audio)', () => {
    const r = plano(L.lecturaParaServidor({ id: 'x', t: 1, cuento: 'l0-gato', prec: 90, oido: 'bigotes es', audioId: 'lec-1', s: 1, e: 'bb' }));
    assert.deepEqual(r, { id: 'x', t: 1, cuento: 'l0-gato', prec: 90, e: 'bb' });
});
prueba('palabras difíciles de una lectura: m/s/d, sin repetir y sin puntuación', () => {
    const e = [...'b'.repeat(N)]; e[1] = 'm'; e[2] = 'd'; e[3] = 's';
    const d = plano(L.lecPalabrasDificiles(tk, e));
    assert.deepEqual(d.map(x => x.k), [1, 2, 3]);
    assert.ok(d.every(x => /^[\p{L}\p{N}]+$/u.test(x.w)));
    assert.deepEqual(plano(L.lecPalabrasPracticar(tk, e)), d.map(x => x.w));
    assert.deepEqual(plano(L.lecPalabrasDificiles(tk, [...'b'.repeat(N)])), []);
});
prueba('palabras que me cuestan: se acumulan por lectura y salen ✅ si se practicaron bien después', () => {
    const e1 = [...'b'.repeat(N)]; e1[1] = 'm'; e1[3] = 's';
    const e2 = [...'b'.repeat(N)]; e2[1] = 'd';
    const lect = [
        { id: 'a', t: 100, cuento: 'l0-gato', e: e1.join('') },
        { id: 'b', t: 200, cuento: 'l0-gato', e: e2.join(''), pw: [1] },
        { id: 'c', t: 300, cuento: 'no-existe', e: 'mmm' },
        { id: 'd', t: 50, cuento: 'l0-gato' }
    ];
    const l = plano(L.lecPalabrasCuestan(lect));
    assert.equal(l.length, 2);
    const w1 = tk.ref[1], w3 = tk.ref[3];
    const p1 = l.find(x => x.ref === w1), p3 = l.find(x => x.ref === w3);
    assert.equal(p1.n, 2); assert.equal(p1.t, 200); assert.equal(p1.superada, true);
    assert.equal(p3.n, 1); assert.equal(p3.superada, false);
    assert.equal(l[0].ref, w3, 'las no superadas van primero');
    // Si vuelve a costarle después de practicarla, deja de estar ✅
    lect.push({ id: 'e', t: 400, cuento: 'l0-gato', e: e2.join('') });
    assert.equal(plano(L.lecPalabrasCuestan(lect)).find(x => x.ref === w1).superada, false);
    assert.deepEqual(plano(L.lecPalabrasCuestan([])), []);
});
prueba('practicar una palabra: vale si se parece lo bastante', () => {
    assert.equal(L.lecPalabraOk(['el gato', 'gatos'], 'gato'), true);
    assert.equal(L.lecPalabraOk(['perro'], 'gato'), false);
    assert.equal(L.lecPalabraOk([], 'gato'), false);
});
prueba('comprensión por cuento: última, mejor y veces', () => {
    const l = plano(L.lecComprensionPorCuento([
        { cuento: 'l0-gato', t: 1, comp: 33, compN: 3 }, { cuento: 'l0-gato', t: 5, comp: 67, compN: 3 },
        { cuento: 'l0-gato', t: 3, comp: 100, compN: 3 }, { cuento: 'l0-gato', t: 9, comp: null, compN: 0 },
        { cuento: 'l0-balon', t: 2, comp: 0, compN: 3 }, { cuento: 'x', t: 2, comp: 50, compN: 2 }
    ]));
    assert.equal(l.length, 2);
    const g = l.find(x => x.cuento === 'l0-gato');
    assert.equal(g.veces, 3); assert.equal(g.mejor, 100); assert.equal(g.ultima, 67); assert.equal(g.titulo, gato.titulo);
});
prueba('XP: 2 por acierto solo la primera vez que se contestan las preguntas (sin farmeo)', () => {
    assert.equal(L.lecXP(3, 3, false, false), 15 + 6);
    assert.equal(L.lecXP(3, 3, false, true), 15);
    assert.equal(L.lecXP(2, 0, false, false), 10);
    assert.equal(L.lecXP(2, 3, true, true), 2);
    const v = L.LEC_PREGUNTAS_VERSION;
    assert.equal(L.lecPreguntasHechas([{ id: 'a', cuento: 'l0-gato', qv: v, compN: 3 }], 'l0-gato', 'b'), true);
    assert.equal(L.lecPreguntasHechas([{ id: 'a', cuento: 'l0-gato', qv: v, compN: 3 }], 'l0-gato', 'a'), false);
    assert.equal(L.lecPreguntasHechas([{ id: 'a', cuento: 'l0-gato', qv: v, compN: 0 }], 'l0-gato', 'b'), false, 'si las saltó, no cuentan');
    assert.equal(L.lecPreguntasHechas([{ id: 'a', cuento: 'l0-gato', compN: 3 }], 'l0-gato', 'b'), false, 'las preguntas antiguas no cuentan');
    assert.equal(L.lecPreguntasHechas([{ id: 'a', cuento: 'l0-balon', qv: v, compN: 3 }], 'l0-gato', 'b'), false);
});
prueba('al servidor van también las palabras practicadas (pw) y la versión de preguntas (qv)', () => {
    const r = plano(L.lecturaParaServidor({ id: 'x', t: 1, cuento: 'l0-gato', e: 'mb', pw: [0], qv: 2, oido: 'gato', audioId: 'a' }));
    assert.deepEqual(r, { id: 'x', t: 1, cuento: 'l0-gato', e: 'mb', pw: [0], qv: 2 });
});
prueba('resumen del profe: palabras y comprensión, con texto escapado', () => {
    const h = L.lecResumenProfeHTML([{ cuento: 'l0-gato', t: 1, e: 'bm' + 'b'.repeat(N - 2), comp: 67, compN: 3 }]);
    assert.ok(h.includes('Palabras que le cuestan') && h.includes(tk.ref[1]) && h.includes('67%'));
    assert.ok(L.lecResumenProfeHTML([]).includes('Todavía no'));
});
prueba('tema: ordenConTema da prioridad al tema sin quitar los demás (y sin tema, todo igual)', () => {
    const lista = [];
    for (let i = 0; i < 10; i++) lista.push({ cat: 'Fútbol', i });
    for (let i = 0; i < 60; i++) lista.push({ cat: 'Otra', i });
    const r = plano(T.ordenConTema(lista, 'Fútbol'));
    assert.equal(r.length, 70);
    assert.equal(new Set(r.map(x => x.cat + x.i)).size, 70);
    const primeras = r.slice(0, 15).filter(x => x.cat === 'Fútbol').length;
    assert.equal(primeras, 5); // 1 de cada 3 frente a ~2 al azar
    assert.equal(r[0].cat, 'Fútbol');
    const sin = plano(T.ordenConTema(lista, null));
    assert.equal(sin.length, 70);
    assert.equal(T.temaClave({ tema: 'animales' }), 'animales');
    assert.equal(T.temaClave({ tema: 'hackeo' }), 'mezcla');
    assert.equal(T.temaClave(null), 'mezcla');
});
prueba('temas: cada categoría de tema existe en el vocabulario y las frases son cortas', () => {
    const html = fs.readFileSync(new URL('../index.html', import.meta.url), 'utf8');
    for (const [k, t] of Object.entries(T.TEMAS)) {
        if (t.cat) assert.ok(html.split(`cat: '${t.cat}'`).length - 1 >= 4, 'al menos 4 palabras con foto de ' + t.cat);
        assert.ok(t.frases.length >= 1 && t.frases.every(f => f.length < 60));
        assert.ok(L.CUENTOS.some(c => c.tema === k), 'hay cuentos de ' + k);
    }
});
console.log(`\n${ok} pruebas superadas${process.exitCode ? ' (HAY FALLOS)' : ''}`);
