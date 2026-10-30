// Servidor local para probar en el navegador: sirve la web estática y /api con Postgres en memoria (PGlite).
// Uso: ALTOYCLARO_CLAVE=... ALTOYCLARO_SECRETO=... node test/servidor-local.mjs [puerto]
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { PGlite } from '@electric-sql/pglite';
import { manejar, acceso, sync, admin } from '../api/_lib/core.js';

const db = new PGlite();
globalThis.__aycQuery = async (t, p = []) => (await db.query(t, p)).rows;
const raiz = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const tipos = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css', '.png': 'image/png', '.json': 'application/json', '.mp3': 'audio/mpeg' };
const api = { '/api/acceso': acceso, '/api/sync': sync, '/api/admin': admin };
const puerto = Number(process.argv[2] || 8790);

http.createServer((req, res) => {
    const url = new URL(req.url, 'http://x');
    if (api[url.pathname]) return manejar(req, res, api[url.pathname]);
    let f = path.join(raiz, decodeURIComponent(url.pathname));
    if (!f.startsWith(raiz) || f.includes('node_modules')) { res.statusCode = 403; return res.end(); }
    if (fs.existsSync(f) && fs.statSync(f).isDirectory()) f = path.join(f, 'index.html');
    if (!fs.existsSync(f)) { res.statusCode = 404; return res.end('no encontrado'); }
    res.setHeader('Content-Type', tipos[path.extname(f)] || 'application/octet-stream');
    fs.createReadStream(f).pipe(res);
}).listen(puerto, () => console.log('Servidor local en http://localhost:' + puerto));
