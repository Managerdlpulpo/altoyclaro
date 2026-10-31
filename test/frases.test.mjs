// Pruebas de «Frases cotidianas» (datos y puntuación) y de las pegatinas (criterios). Ejecutar: node test/frases.test.mjs
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import { evaluarPegatinas, rachaMaxima, diaMadrid, PEGATINAS_IDS, CATEGORIAS_VOCAB } from '../api/_lib/pegatinas.js';

// frases.js usa las funciones de alineación de lectura.js: se cargan juntos, como en la página
const sb = { module: { exports: {} }, console };
vm.createContext(sb);
const leer = f => fs.readFileSync(new URL('../' + f, import.meta.url), 'utf8');
vm.runInContext(leer('lectura.js'), sb);
sb.module = { exports: {} };
vm.runInContext(leer('frases.js'), sb);
const F = sb.module.exports;
const sbP = { module: { exports: {} }, console };
vm.createContext(sbP);
vm.runInContext(leer('pegatinas.js'), sbP);
const P = sbP.module.exports;

let ok = 0;
function prueba(nombre, fn) {
    try { fn(); ok++; console.log('  ✔ ' + nombre); }
    catch (e) { process.exitCode = 1; console.log('  ✘ ' + nombre + '\n', e); }
}
const plano = a => JSON.parse(JSON.stringify(a));
const SITS = F.FR_SITUACIONES.map(s => s.id);

console.log('Frases cotidianas y pegatinas');
prueba('datos: 6 situaciones, ~50 frases, ids únicos y con formato del servidor', () => {
    assert.equal(SITS.length, 6);
    assert.ok(F.FRASES.length >= 45, 'frases: ' + F.FRASES.length);
    assert.ok(F.FR_DIRIAS.length >= 15); assert.ok(F.FR_DIALOGOS.length >= 6);
    const ids = [...F.FRASES, ...F.FR_DIRIAS, ...F.FR_DIALOGOS].map(x => x.id);
    assert.equal(new Set(ids).size, ids.length);
    ids.forEach(id => assert.match(id, /^[fqd][0-9]{2}$/));
    [...F.FRASES, ...F.FR_DIRIAS, ...F.FR_DIALOGOS].forEach(x => assert.ok(SITS.includes(x.sit), x.id));
    SITS.forEach(s => assert.ok(F.FRASES.filter(f => f.sit === s).length >= 5, s));
    F.FR_DIALOGOS.forEach(d => assert.ok(d.turnos.length >= 3 && d.turnos.every(t => t.app && t.nino && t.claves.length), d.id));
});
prueba('«Escucha y repite»: frase exacta 100, a medias baja, sin tildes ni signos da igual', () => {
    assert.equal(F.frPuntuar(['puedo ir al bano'], '¿Puedo ir al baño?').score, 100);
    assert.equal(F.frPuntuar(['Buenos dias profe'], 'Buenos días, profe.').score, 100);
    assert.ok(F.frPuntuar(['puedo ir'], '¿Puedo ir al baño?').score <= 50);
    assert.equal(F.frPuntuar([''], 'Hola').score, 0);
    // la mejor de las alternativas del reconocimiento
    assert.equal(F.frPuntuar(['me dejas un lapicero', 'me dejas un lápiz'], '¿Me dejas un lápiz?').score, 100);
    assert.ok(F.frPuntuar(['me dejas un lápiz rojo grande y bonito'], '¿Me dejas un lápiz?').score < 100, 'palabras de más restan');
    assert.equal(F.frResultado(85), 'perfecto'); assert.equal(F.frResultado(10), 'otra');
});
prueba('«¿Qué dirías si…?»: la respuesta modelo siempre vale y una frase sin relación no', () => {
    F.FR_DIRIAS.forEach(q => {
        assert.ok(F.frDiriasOk([q.r], q.claves), q.id + ': ' + q.r);
        assert.ok(!F.frDiriasOk(['me gusta el chocolate'], q.claves), q.id + ' falso positivo');
        assert.ok(!F.frDiriasOk([''], q.claves));
    });
    const banio = F.FR_DIRIAS.find(q => /baño/.test(q.r));
    if (banio) assert.ok(F.frDiriasOk(['profe puedo ir al servicio'], banio.claves) || F.frDiriasOk(['puedo ir al baño'], banio.claves));
});
prueba('diálogos: la respuesta del niño de ejemplo vale en cada turno, una sin relación no', () => {
    F.FR_DIALOGOS.forEach(d => d.turnos.forEach((t, i) => {
        assert.ok(F.frTurnoOk([t.nino], t), `${d.id} turno ${i}`);
        assert.ok(!F.frTurnoOk(['el perro es azul'], t), `${d.id} turno ${i} falso positivo`);
    }));
});
prueba('progreso por situación y lo que se envía al servidor (sin lo oído)', () => {
    const regs = [{ fid: 'f01', sit: 'llegar', act: 'repetir', ok: true }, { fid: 'f02', sit: 'llegar', act: 'repetir', ok: false }];
    const p = plano(F.frProgresoSit(regs, 'llegar'));
    assert.equal(p.frases.ok, 1); assert.ok(p.pct > 0 && p.pct < 100);
    const s = plano(F.frParaServidor({ id: 'fr-1', t: 5, fid: 'f01', sit: 'llegar', act: 'repetir', score: 90, ok: true, oido: 'hola', metodo: 'auto' }));
    assert.deepEqual(Object.keys(s).sort(), ['act', 'fid', 'id', 'metodo', 'ok', 'score', 'sit', 't']);
    assert.ok(!JSON.stringify(s).includes('hola'));
});

prueba('pegatinas: las mismas 19 en el navegador y en el servidor, con dibujo SVG redondo', () => {
    assert.deepEqual(plano(P.PEGATINAS.map(p => p.id)), PEGATINAS_IDS);
    assert.ok(PEGATINAS_IDS.length >= 15 && PEGATINAS_IDS.length <= 20);
    assert.deepEqual(plano(P.PEG_CATEGORIAS), CATEGORIAS_VOCAB);
    P.PEGATINAS.forEach(p => {
        const svg = P.pegSVG(p.id, 189);
        assert.match(svg, /^<svg[^>]+viewBox/); assert.match(svg, /<circle/); assert.ok(svg.includes('data-pegatina="' + p.id + '"'));
        assert.ok(p.nombre && p.como && typeof p.razon === 'function');
    });
    assert.match(P.pegSVG('hola', 80, { bloqueada: true }), /🔒|opacity/);
});
prueba('umbrales alcanzables con las frases que hay', () => {
    const n = { llegar: 3, companero: 4, profe: 4, patio: 10, gracias: 3, adios: 3 };
    for (const [s, k] of Object.entries(n)) assert.ok(F.FRASES.filter(f => f.sit === s).length >= k, s);
    assert.ok(F.FR_DIRIAS.length >= 10); assert.ok(F.FR_DIALOGOS.length >= 3);
});

const T0 = Date.UTC(2026, 9, 5, 9); // lunes 5-oct-2026, 11:00 en Madrid
const dia = 864e5;
const fr = (fid, sit, act = 'repetir', okk = true, t = T0) => ({ fid, sit, act, ok: okk, score: okk ? 90 : 30, t });
const ev = d => evaluarPegatinas(d);

prueba('criterios de frases: frases distintas bien por situación, diálogos y «dirías»', () => {
    let r = ev({ frases: [fr('f01', 'llegar'), fr('f02', 'llegar'), fr('f02', 'llegar')] });
    assert.equal(r.hola, undefined, 'repetir la misma no cuenta doble');
    r = ev({ frases: [fr('f01', 'llegar'), fr('f02', 'llegar'), fr('f03', 'llegar', 'repetir', false)] });
    assert.equal(r.hola, undefined, 'las que no salen bien no cuentan');
    r = ev({ frases: [fr('f01', 'llegar'), fr('f02', 'llegar'), fr('f03', 'llegar')] });
    assert.deepEqual(r.hola, [3]);
    r = ev({ frases: ['d01', 'd02', 'd03'].map(f => fr(f, 'llegar', 'dialogo')) });
    assert.deepEqual(r.dialogo, [3]);
    r = ev({ frases: Array.from({ length: 10 }, (_, i) => fr('q' + String(i + 1).padStart(2, '0'), 'llegar', 'dirias')) });
    assert.deepEqual(r.dirias, [10]);
    r = ev({ frases: Array.from({ length: 9 }, (_, i) => fr('q0' + (i + 1), 'llegar', 'dirias')) });
    assert.equal(r.dirias, undefined);
});
prueba('criterios de lectura: primera lectura, fluidez (de 32 a 48 ppm), precisión, comprensión, 10 lecturas', () => {
    const L = (cuento, ppm, extra = {}, t = T0) => ({ cuento, ppm, compl: 100, prec: 90, metodo: 'auto', nivel: 1, t, ...extra });
    let r = ev({ lecturas: [L('l1-a', 32, { compl: 60 })] });
    assert.equal(r.lector, undefined, 'lectura sin terminar no cuenta');
    r = ev({ lecturas: [L('l1-a', 32, { metodo: 'adulto' })] });
    assert.equal(r.lector, undefined, 'valorada por un adulto no cuenta para lectura automática');
    r = ev({ lecturas: [L('l1-a', 32), L('l1-a', 48, {}, T0 + dia)] });
    assert.deepEqual(r.lector, [32, 100]); assert.deepEqual(r.fluidez, [32, 48, 1]);
    r = ev({ lecturas: [L('l1-a', 32), L('l1-a', 36, {}, T0 + dia)] });
    assert.equal(r.fluidez, undefined, 'mejora pequeña (< 20 % o < 5 ppm) no cuenta');
    r = ev({ lecturas: [L('l1-a', 32), L('l1-b', 50, {}, T0 + dia)] });
    assert.equal(r.fluidez, undefined, 'tiene que ser el mismo cuento');
    r = ev({ lecturas: [1, 2, 3].map(i => L('l1-' + i, 40, { prec: 96 }, T0 + i)) });
    assert.deepEqual(r.precision, [3]);
    r = ev({ lecturas: [L('l1-a', 40, { comp: 100, compN: 2 })] });
    assert.deepEqual(r.comprension, [2]);
    r = ev({ lecturas: [L('l1-a', 40, { comp: 100, compN: 1 })] });
    assert.equal(r.comprension, undefined);
    r = ev({ lecturas: Array.from({ length: 10 }, (_, i) => L('l1-a', 40, {}, T0 + i)) });
    assert.deepEqual(r.lector10, [10]);
});
prueba('test de nivel repetido con subida', () => {
    assert.deepEqual(ev({ pruebas: [{ nivel: 1, t: 1 }, { nivel: 2, nivelAntes: 1, t: 2 }] }).nivel, [1, 2]);
    assert.equal(ev({ pruebas: [{ nivel: 1, nivelAntes: 1, t: 2 }] }).nivel, undefined);
    assert.equal(ev({ pruebas: [{ nivel: 1, nivelAntes: 2, t: 2 }] }).nivel, undefined);
});
prueba('rachas en días seguidos (hora de Madrid)', () => {
    assert.equal(rachaMaxima([T0, T0 + 3600e3, T0 + dia, T0 + 2 * dia]), 3);
    assert.equal(rachaMaxima([T0, T0 + 2 * dia]), 1);
    assert.equal(rachaMaxima([]), 0);
    // 23:30 en Madrid (21:30 UTC) y 00:30 del día siguiente (22:30 UTC) son días distintos
    assert.equal(diaMadrid(Date.UTC(2026, 9, 5, 21, 30)), '2026-10-05');
    assert.equal(diaMadrid(Date.UTC(2026, 9, 5, 22, 30)), '2026-10-06');
    let r = ev({ intentos: [{ t: T0, palabra: 'sol', score: 20 }], lecturas: [{ t: T0 + dia, cuento: 'x' }], frases: [fr('f01', 'llegar', 'repetir', false, T0 + 2 * dia)] });
    assert.deepEqual(r.racha3, [3]); assert.equal(r.racha7, undefined);
    r = ev({ intentos: Array.from({ length: 7 }, (_, i) => ({ t: T0 + i * dia, palabra: 'sol' })) });
    assert.deepEqual(r.racha7, [7]);
});
prueba('vocabulario: 5 palabras bien de una categoría, 25 distintas y 20 bien en Hablar', () => {
    const I = (palabra, categoria, extra = {}) => ({ palabra, categoria, resultado: 'perfecto', score: 100, t: T0, ...extra });
    const anim = ['perro', 'gato', 'vaca', 'pato', 'león'].map(p => I(p, 'Animales'));
    let r = ev({ intentos: anim });
    assert.deepEqual(r.vocab, [5, CATEGORIAS_VOCAB.indexOf('Animales')]);
    r = ev({ intentos: [...anim.slice(0, 4), I('león', 'Animales', { resultado: 'casi', score: 50 })] });
    assert.equal(r.vocab, undefined, 'las que no salen bien no cuentan');
    const muchas = Array.from({ length: 25 }, (_, i) => I('p' + i, 'Comida'));
    r = ev({ intentos: muchas });
    assert.deepEqual(r.palabras25, [25]); assert.deepEqual(r.hablar20, [25]);
    r = ev({ intentos: Array.from({ length: 20 }, () => I('sol', 'Naturaleza')) });
    assert.deepEqual(r.hablar20, [20]); assert.equal(r.palabras25, undefined);
});
prueba('motivo de cada pegatina: frase concreta con los números guardados', () => {
    const peg = id => P.PEGATINAS.find(p => p.id === id);
    assert.match(peg('fluidez').razon([32, 48, 1]), /32.*48 palabras por minuto/);
    assert.match(peg('vocab').razon([5, 0]), /Animales/);
    assert.match(peg('nivel').razon([1, 2]), /Nivel 1.*Nivel 2/);
    P.PEGATINAS.forEach(p => { const t = p.razon([3, 4, 1]); assert.ok(typeof t === 'string' && t.length > 10 && !/undefined|NaN/.test(t), p.id + ': ' + t); });
});
console.log(`\n${ok} pruebas superadas${process.exitCode ? ' (HAY FALLOS)' : ''}`);
