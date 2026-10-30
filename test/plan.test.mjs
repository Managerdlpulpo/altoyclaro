// Pruebas del sorteo de preguntas del test de nivel (sin navegador): bancos, semilla, no repetir,
// fotos que existen, y que todas las variantes puntúan igual. Uso: node test/plan.test.mjs
import fs from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';

const raiz = new URL('..', import.meta.url).pathname;
const html = fs.readFileSync(raiz + 'index.html', 'utf8');
const vv = html.match(/const visualVocab = (\[[\s\S]*?\n\s*\]);/);
const ctx = { console, crypto: globalThis.crypto };
vm.createContext(ctx);
vm.runInContext('var visualVocab = ' + vv[1] + ';', ctx);
vm.runInContext(fs.readFileSync(raiz + 'test-nivel.js', 'utf8') + '\n;Object.assign(globalThis, { FRASES_TEST, TN_VOC_BANCO, TN_COMP_BANCO, TN_CONV_BANCO, TN_DIALOGOS, TN_N, tnPlanTest, tnConvDelPlan, tnVistosRecientes, maxConversacion, calcularResultadoTest, tnNombreItem, tnGrupo });', ctx);
const T = ctx;
let ok = 0;
const prueba = (n, f) => { try { f(); ok++; console.log('  ✔ ' + n); } catch (e) { console.log('  ✘ ' + n + '\n    ' + e.message); process.exitCode = 1; } };
const fotos = new Set(T.visualVocab.map(v => v.es));
const catDe = es => T.visualVocab.find(v => v.es === es).cat;
const eq = (a, b, m) => assert.equal(JSON.stringify(a), JSON.stringify(b), m); // objetos de otro contexto (vm)
const ID_SERVIDOR = /^[a-z][0-9]{1,3}$/;
const SEMILLAS = Array.from({ length: 3000 }, (_, i) => (i * 2654435761) >>> 0);

console.log('Sorteo del test de nivel');
prueba('bancos: textos, fotos e ids válidos', () => {
    const todos = [...T.TN_COMP_BANCO, ...T.TN_VOC_BANCO, ...T.TN_CONV_BANCO, ...T.TN_DIALOGOS.flatMap(d => d.turnos)];
    const ids = todos.map(q => q.id);
    assert.equal(new Set(ids).size, ids.length, 'ids repetidos');
    ids.forEach(id => assert.match(id, ID_SERVIDOR));
    T.TN_COMP_BANCO.forEach(q => { assert.ok(q.texto, q.id); assert.ok(fotos.has(q.ok), q.ok); q.evitar.forEach(e => assert.ok(fotos.has(e), e)); });
    T.TN_VOC_BANCO.forEach(q => assert.ok(fotos.has(q.es), q.es));
    T.TN_CONV_BANCO.forEach(q => { assert.ok(q.texto, q.id); if (q.foto) assert.ok(fotos.has(q.foto), q.foto); assert.ok(q.claves.length > 5, q.id); });
    T.TN_DIALOGOS.forEach(d => { assert.ok(T.FRASES_TEST[d.intro] && fotos.has(d.foto)); d.turnos.forEach(t => assert.ok(T.FRASES_TEST[t.si] && T.FRASES_TEST[t.no] && (t.n > 1 || T.FRASES_TEST[t.pregunta]), t.id)); });
    // una frase por línea (el generador de audios toma el último literal de cada línea)
    const bloque = fs.readFileSync(raiz + 'test-nivel.js', 'utf8').match(/const FRASES_TEST = \{([\s\S]*?)\/\/ FIN FRASES_TEST/)[1];
    assert.equal(bloque.split('\n').filter(l => /^\s+\w+:/.test(l)).length, Object.keys(T.FRASES_TEST).length);
});
const tam = {
    'comprensión «Toca…»': [T.TN_COMP_BANCO.filter(q => q.tipo === 'toca').length, 2], 'comprensión «¿Para qué…?»': [T.TN_COMP_BANCO.filter(q => q.tipo === 'uso').length, 3],
    'vocabulario fácil': [T.TN_VOC_BANCO.filter(q => q.dif === 1).length, 3], 'vocabulario medio': [T.TN_VOC_BANCO.filter(q => q.dif === 2).length, 1], 'vocabulario difícil': [T.TN_VOC_BANCO.filter(q => q.dif === 3).length, 1],
    ...Object.fromEntries(['saludo', 'color', 'uso', 'gusto', 'describir', 'pasado', 'futuro'].map(t => ['conversación ' + t, [T.TN_CONV_BANCO.filter(q => q.tipo === t).length, 1]])),
    'mini-conversaciones': [T.TN_DIALOGOS.length, 1]
};
prueba('tamaño de los bancos ≥ 3 veces lo que sale en un test: ' + Object.entries(tam).map(([k, [n, u]]) => `${k} ${n}/${u}`).join(' · '), () => {
    Object.entries(tam).forEach(([k, [n, u]]) => assert.ok(n >= 3 * u, k));
});
prueba(`${SEMILLAS.length} semillas: planes correctos (5+5 preguntas, dificultad equilibrada, fotos de otras categorías)`, () => {
    for (const s of SEMILLAS) {
        const p = T.tnPlanTest(s, new Set(), T.visualVocab);
        assert.equal(p.comp.length, 5); assert.equal(p.voc.length, 5);
        eq(p.voc.map(q => q.dif).sort(), [1, 1, 1, 2, 3]); assert.equal(p.voc[4].dif, 3);
        eq(p.comp.map(q => q.tipo), ['toca', 'toca', 'uso', 'uso', 'uso']);
        const g = p.voc.map(q => T.tnGrupo(q.es)), gc = p.comp.map(q => T.tnGrupo(q.ok));
        assert.equal(new Set(g).size, 5); assert.equal(new Set(gc).size, 5);
        gc.forEach(x => assert.ok(!g.includes(x), 'comprensión y vocabulario con la misma palabra'));
        p.comp.forEach(q => {
            assert.equal(q.otras.length, 3); assert.equal(new Set(q.opciones).size, 4); assert.ok(q.opciones.includes(q.ok));
            const cats = [q.ok, ...q.otras].map(catDe); assert.equal(new Set(cats).size, 4, 'categorías distintas');
            q.otras.forEach(o => assert.ok(!q.evitar.includes(o) && T.tnGrupo(o) !== T.tnGrupo(q.ok)));
        });
        eq([1, 2, 3].map(n => p.conv[n].map(q => q.tipo).join()), ['saludo,color', 'uso,gusto', 'describir,pasado,futuro']);
        assert.equal(new Set(p.ids).size, p.ids.length); assert.equal(p.ids.length, 5 + 5 + 7 + 3);
    }
});
prueba('misma semilla → mismo test; semillas distintas → tests distintos', () => {
    const a = JSON.stringify(T.tnPlanTest(42, new Set(), T.visualVocab)), b = JSON.stringify(T.tnPlanTest(42, new Set(), T.visualVocab));
    assert.equal(a, b);
    const distintos = new Set(SEMILLAS.slice(0, 500).map(s => T.tnPlanTest(s, new Set(), T.visualVocab).ids.join()));
    assert.ok(distintos.size >= 495, `solo ${distintos.size} distintos`);
    // orden de las fotos de comprensión: la correcta no está siempre en el mismo sitio
    const pos = new Set(SEMILLAS.slice(0, 200).map(s => T.tnPlanTest(s, new Set(), T.visualVocab).comp[0].opciones.indexOf(T.tnPlanTest(s, new Set(), T.visualVocab).comp[0].ok)));
    assert.equal(pos.size, 4);
});
prueba('todas las preguntas de los bancos acaban saliendo', () => {
    const vistos = new Set();
    SEMILLAS.forEach(s => T.tnPlanTest(s, new Set(), T.visualVocab).ids.forEach(id => vistos.add(id)));
    const todos = [...T.TN_COMP_BANCO, ...T.TN_VOC_BANCO, ...T.TN_CONV_BANCO, ...T.TN_DIALOGOS.flatMap(d => d.turnos)].map(q => q.id);
    eq(todos.filter(id => !vistos.has(id)), []);
});
prueba('no repite preguntas de los 2 últimos tests (3 tests seguidos sin ninguna pregunta repetida)', () => {
    for (const s of SEMILLAS.slice(0, 1000)) {
        const pruebas = [];
        for (let k = 0; k < 3; k++) {
            const vistos = T.tnVistosRecientes(pruebas);
            const p = T.tnPlanTest((s + k * 7919) >>> 0, vistos, T.visualVocab);
            const rep = p.ids.filter(id => vistos.has(id));
            eq(rep, [], `semilla ${s}, test ${k + 1}: repite ${rep}`);
            pruebas.push({ ids: p.ids, items: [] });
        }
    }
    // el cuarto test puede volver a usar lo del primero (solo se evitan los 2 últimos)
    const v = T.tnVistosRecientes([{ ids: ['v01'] }, { ids: ['v02'] }, { ids: ['v03'] }]);
    assert.ok(!v.has('v01') && v.has('v02') && v.has('v03'));
    // tests antiguos (sin ids) también cuentan por sus items
    assert.ok(T.tnVistosRecientes([{ items: [{ id: 'k1' }] }]).has('k1'));
});
prueba('todas las variantes valen lo mismo (puntuación comparable)', () => {
    const maxs = new Set(), maxsA = new Set();
    for (const s of SEMILLAS) {
        const p = T.tnPlanTest(s, new Set(), T.visualVocab), conv = T.tnConvDelPlan(p);
        maxs.add(conv.reduce((x, q) => x + T.maxConversacion(q, false), 0) + '|' + [1, 2, 3, 4].map(n => conv.filter(q => q.nivel === n).reduce((x, q) => x + T.maxConversacion(q, false), 0)).join());
        maxsA.add(conv.reduce((x, q) => x + T.maxConversacion(q, true), 0));
        const r = T.calcularResultadoTest([], false, p); assert.equal(r.total, 0);
    }
    assert.equal(maxs.size, 1, [...maxs].join(' / ')); assert.equal(maxsA.size, 1);
    console.log('    máximo de Conversación por test: ' + [...maxs][0] + ' (con adulto ' + [...maxsA][0] + ')');
});
prueba('nombres para el profe: preguntas nuevas y de tests antiguos', () => {
    assert.equal(T.tnNombreItem('k1'), 'Toca el perro.'); assert.equal(T.tnNombreItem('c6'), '¿Qué hiciste ayer?'); assert.equal(T.tnNombreItem('d2'), 'Frutería: ¿Cuántas quieres?');
    assert.equal(T.tnNombreItem('v28'), 'Decir: las gafas'); assert.equal(T.tnNombreItem('k35'), '¿Qué tiene pedales y dos ruedas?');
    assert.equal(T.tnNombreItem('d22'), 'Panadería · turno 2/3'); assert.match(T.tnNombreItem('c43'), /caballo/);
});
console.log(`\n${ok} pruebas superadas${process.exitCode ? ' (HAY FALLOS)' : ''}`);
