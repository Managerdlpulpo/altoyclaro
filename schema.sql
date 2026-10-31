-- Me gusta hablar Alto y claro: esquema de base de datos (Postgres / Neon).
-- Las funciones /api lo crean solas la primera vez (CREATE ... IF NOT EXISTS);
-- este archivo es solo de referencia o para crearlo a mano.
-- No se guarda ningún audio: solo alias, claves cifradas (hash), perfil, lista de intentos en texto y puntuaciones de lectura.

CREATE TABLE IF NOT EXISTS ayc_ninos (
    id TEXT PRIMARY KEY,
    alias TEXT NOT NULL,
    codigo_hash TEXT UNIQUE,
    gen INTEGER NOT NULL DEFAULT 1,
    revocado BOOLEAN NOT NULL DEFAULT FALSE,
    creado BIGINT NOT NULL);

CREATE TABLE IF NOT EXISTS ayc_dispositivos (
    nino_id TEXT NOT NULL REFERENCES ayc_ninos(id) ON DELETE CASCADE,
    dispositivo_id TEXT NOT NULL,
    nombre TEXT,
    creado BIGINT NOT NULL,
    ultimo BIGINT NOT NULL,
    PRIMARY KEY (nino_id, dispositivo_id));

CREATE TABLE IF NOT EXISTS ayc_estado (
    nino_id TEXT PRIMARY KEY REFERENCES ayc_ninos(id) ON DELETE CASCADE,
    perfil JSONB,
    perfil_t BIGINT NOT NULL DEFAULT 0,
    borrado_t BIGINT NOT NULL DEFAULT 0);

CREATE TABLE IF NOT EXISTS ayc_intentos (
    nino_id TEXT NOT NULL REFERENCES ayc_ninos(id) ON DELETE CASCADE,
    id TEXT NOT NULL,
    t BIGINT NOT NULL,
    recibido BIGINT NOT NULL,
    datos JSONB NOT NULL,
    PRIMARY KEY (nino_id, id));

CREATE INDEX IF NOT EXISTS ayc_intentos_recibido ON ayc_intentos (nino_id, recibido);

-- Lecturas en voz alta: solo puntuaciones (precisión, palabras por minuto, pausas...). Nunca lo que se oyó ni audio.
CREATE TABLE IF NOT EXISTS ayc_lecturas (
    nino_id TEXT NOT NULL REFERENCES ayc_ninos(id) ON DELETE CASCADE,
    id TEXT NOT NULL,
    t BIGINT NOT NULL,
    recibido BIGINT NOT NULL,
    datos JSONB NOT NULL,
    PRIMARY KEY (nino_id, id));

CREATE INDEX IF NOT EXISTS ayc_lecturas_recibido ON ayc_lecturas (nino_id, recibido);

-- Frases cotidianas: solo qué frase y actividad, puntuación y si salió bien. Nunca lo que se oyó ni audio.
CREATE TABLE IF NOT EXISTS ayc_frases (
    nino_id TEXT NOT NULL REFERENCES ayc_ninos(id) ON DELETE CASCADE,
    id TEXT NOT NULL,
    t BIGINT NOT NULL,
    recibido BIGINT NOT NULL,
    datos JSONB NOT NULL,
    PRIMARY KEY (nino_id, id));

CREATE INDEX IF NOT EXISTS ayc_frases_recibido ON ayc_frases (nino_id, recibido);

-- Pegatinas conseguidas: id de pegatina, fecha, si el profe la entregó y los números del motivo (p. ej. [32, 48]).
CREATE TABLE IF NOT EXISTS ayc_pegatinas (
    nino_id TEXT NOT NULL REFERENCES ayc_ninos(id) ON DELETE CASCADE,
    pegatina TEXT NOT NULL,
    t BIGINT NOT NULL,
    entregada BOOLEAN NOT NULL DEFAULT FALSE,
    entregada_t BIGINT,
    nums JSONB,
    PRIMARY KEY (nino_id, pegatina));

CREATE TABLE IF NOT EXISTS ayc_limite (clave TEXT NOT NULL, t BIGINT NOT NULL);

CREATE INDEX IF NOT EXISTS ayc_limite_idx ON ayc_limite (clave, t);
