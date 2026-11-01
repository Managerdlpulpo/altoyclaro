// Pruebas del juego de penalty (banco por nivel, bolsa sin repeticiones, opciones). Ejecutar: node test/penalty.test.mjs
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const leer = f => fs.readFileSync(new URL('../' + f, import.meta.url), 'utf8');
const cargar = (f, extra = {}) => { const sb = Object.assign({ module: { exports: {} }, console }, extra); vm.createContext(sb); vm.runInContext(leer(f), sb); return sb; };
const P = cargar('penalty.js').module.exports;
// ordenConTema (temas.js), tal cual: el tema favorito sale más a menudo sin quitar los demás
const tem = leer('temas.js');
const T = {}; vm.runInNewContext(tem.slice(tem.indexOf('function temaBarajar'), tem.indexOf('/* ---------- Aspecto')) + ';T.ordenConTema = ordenConTema;', { T, Math });
const FRASES = cargar('frases.js').module.exports.FRASES;
// Datos reales de la página: vocabulario (index.html) y frases de ejemplo (hablar.js)
const html = leer('index.html');
const vocab = vm.runInNewContext('(' + html.slice(html.indexOf('const visualVocab = [') + 'const visualVocab = '.length, html.indexOf('];', html.indexOf('const visualVocab = [')) + 1) + ')');
const hab = leer('hablar.js');
const ejemplos = vm.runInNewContext('(' + hab.slice(hab.indexOf('const ejemplosFrase = {') + 'const ejemplosFrase = '.length, hab.indexOf('};', hab.indexOf('const ejemplosFrase = {')) + 1) + ')');
const fuentes = { vocab, ejemplos, frases: FRASES };
const clave = t => String(t).normalize('NFC').trim().replace(/\s+/g, ' ').toLowerCase();
const grabadas = new Set(Object.keys(JSON.parse(leer('audio/manifest.json')).archivos).map(clave));
// Generador pseudoaleatorio con semilla (reproducible)
const rng = (s = 7) => () => ((s = (s * 1103515245 + 12345) % 2147483648) / 2147483648);

// Simula N preguntas seguidas como en la página (bolsa tras bolsa, con las recientes y la última)
function simular(banco, n, cat, rnd) {
    const out = []; let bolsa = [], i = 0;
    while (out.length < n) {
        if (i >= bolsa.length) { bolsa = P.penBolsa(banco, { cat, recientes: out.slice(-12).map(q => q.es), ultima: out.length ? out[out.length - 1].es : null, rnd, ordenar: T.ordenConTema }); i = 0; }
        out.push(bolsa[i++]);
    }
    return out;
}

let ok = 0;
function prueba(nombre, fn) {
    try { fn(); ok++; console.log('  ✔ ' + nombre); }
    catch (e) { process.exitCode = 1; console.log('  ✘ ' + nombre + '\n', e); }
}
console.log('Juego de penalty');
prueba('nivel 0: solo palabras del vocabulario (antes caía en las 2 frases del nivel 1)', () => {
    const b = P.penBanco(0, fuentes);
    assert.ok(b.length >= 30, 'banco nivel 0: ' + b.length);
    assert.ok(b.every(q => q.tipo === 'palabra'));
    assert.equal(b.filter(q => q.cat === 'Naturaleza').length, 4);
});
prueba('cada nivel tiene un banco grande y sin duplicados, todo con voz grabada', () => {
    for (const n of [0, 1, 2, 3]) {
        const b = P.penBanco(n, fuentes);
        assert.ok(b.length >= 30, `nivel ${n}: ${b.length}`);
        assert.equal(new Set(b.map(q => q.es.toLowerCase())).size, b.length, 'duplicados en nivel ' + n);
        const sin = b.filter(q => !grabadas.has(clave(q.es)));
        assert.equal(JSON.stringify(sin.map(q => q.es)), '[]', 'sin audio en nivel ' + n);
    }
    assert.ok(P.penBanco(3, fuentes).every(q => q.tipo === 'frase'));
    assert.equal(P.penNivel(undefined), 1); assert.equal(P.penNivel(9), 3); assert.equal(P.penNivel(-2), 0);
});
prueba('nivel 0 + Naturaleza: 1000 preguntas seguidas sin repetir nunca la anterior; 20 seguidas casi todas distintas', () => {
    const b = P.penBanco(0, fuentes), r = rng(3);
    const seq = simular(b, 1000, 'Naturaleza', r);
    for (let i = 1; i < seq.length; i++) assert.notEqual(seq[i].es, seq[i - 1].es, 'repetida en ' + i);
    for (let i = 0; i + 20 <= seq.length; i += 20) assert.ok(new Set(seq.slice(i, i + 20).map(q => q.es)).size >= 18, 'poca variedad en el bloque ' + i);
    // todas las palabras salen (el banco entero se recorre)
    assert.equal(new Set(seq.map(q => q.es)).size, b.length);
    // el tema favorito sale más a menudo al principio de cada bolsa que al azar (4 de 37 ≈ 11 %)
    const nat = seq.slice(0, 12).filter(q => q.cat === 'Naturaleza').length;
    assert.ok(nat >= 3, 'naturaleza en las 12 primeras: ' + nat);
});
prueba('bolsa: las recientes van al final y nunca empieza por la última', () => {
    const b = P.penBanco(2, fuentes), r = rng(11);
    const rec = b.slice(0, 5).map(q => q.es);
    for (let k = 0; k < 50; k++) {
        const bolsa = P.penBolsa(b, { recientes: rec, ultima: rec[4], rnd: r });
        assert.equal(bolsa.length, b.length);
        assert.ok(bolsa.slice(-5).every(q => rec.includes(q.es)));
        assert.notEqual(bolsa[0].es, rec[4]);
    }
    const dos = [{ es: 'a', tipo: 'palabra' }, { es: 'b', tipo: 'palabra' }];
    for (let k = 0; k < 20; k++) assert.equal(P.penBolsa(dos, { ultima: 'a', rnd: r })[0].es, 'b');
});
prueba('opciones: 3, sin repetir, con la correcta y del mismo tipo', () => {
    const r = rng(5);
    for (const n of [0, 1, 3]) {
        const b = P.penBanco(n, fuentes);
        for (const q of b) {
            const o = P.penOpciones(q, b, r);
            assert.equal(o.length, 3); assert.equal(new Set(o).size, 3); assert.ok(o.includes(q.es));
            const tipos = new Set(o.map(x => b.find(y => y.es === x).tipo));
            if (n !== 1) assert.equal(tipos.size, 1);
            else assert.ok(tipos.has(q.tipo) && tipos.size === 1);
        }
    }
});
console.log(`${ok} pruebas de penalty OK`);
