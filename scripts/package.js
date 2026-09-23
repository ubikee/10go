import { execSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');

const NODE_VERSION = process.version; // e.g. v24.21.0

const TARGETS = {
  'darwin-arm64': { nodeArch: 'darwin-arm64', os: 'macos', label: 'macOS (Apple Silicon)' },
  'linux-arm64': { nodeArch: 'linux-arm64', os: 'linux', label: 'Raspberry Pi 400 (64-bit)' },
};

const target = process.argv[2] || 'darwin-arm64';

if (!TARGETS[target]) {
  console.error(`Target desconocido: ${target}. Disponibles: ${Object.keys(TARGETS).join(', ')}`);
  process.exit(1);
}

const { nodeArch, os, label } = TARGETS[target];

const releaseDir = path.join(root, 'release');
const staging = path.join(releaseDir, '10go');
const zipName = `10go-${NODE_VERSION}-${nodeArch}.zip`;
const zipPath = path.join(releaseDir, zipName);

function sh(cmd, opts = {}) {
  console.log(`\n$ ${cmd}`);
  execSync(cmd, { stdio: 'inherit', cwd: opts.cwd ?? root, ...opts });
}

function rm(dir) {
  fs.rmSync(dir, { recursive: true, force: true });
}

function cp(from, to) {
  fs.cpSync(from, to, { recursive: true });
}

function write(file, content, mode) {
  fs.writeFileSync(file, content);
  if (mode) fs.chmodSync(file, mode);
}

console.log('== 10go packaging ==');
console.log(`Target: ${target} (${label}) | Node: ${NODE_VERSION}`);

// 1. Frontend
if (!fs.existsSync(path.join(root, 'node_modules'))) {
  sh('npm ci');
}
sh('npm run build -w frontend');

// 2. Limpiar y crear staging
rm(staging);
fs.mkdirSync(path.join(staging, 'backend'), { recursive: true });
fs.mkdirSync(path.join(staging, 'frontend'), { recursive: true });
fs.mkdirSync(path.join(staging, 'runtime', 'node', 'bin'), { recursive: true });

// 3. Backend (código) + deps de producción
cp(path.join(root, 'backend', 'src'), path.join(staging, 'backend', 'src'));
cp(path.join(root, 'backend', 'package.json'), path.join(staging, 'backend', 'package.json'));
sh('npm install --omit=dev --no-audit --no-fund --no-package-lock', {
  cwd: path.join(staging, 'backend'),
});

// 4. Frontend compilado
cp(path.join(root, 'frontend', 'dist'), path.join(staging, 'frontend', 'dist'));

// 5. Node runtime
const nodeTarball = `node-${NODE_VERSION}-${nodeArch}.tar.gz`;
const nodeUrl = `https://nodejs.org/dist/${NODE_VERSION}/${nodeTarball}`;
const tarballPath = path.join(releaseDir, nodeTarball);

console.log(`\n$ curl -L ${nodeUrl} (descargando runtime…)`);
execSync(`curl -fSL "${nodeUrl}" -o "${tarballPath}"`, { stdio: 'inherit' });

const extractDir = path.join(releaseDir, 'node-extract');
rm(extractDir);
fs.mkdirSync(extractDir, { recursive: true });
execSync(`tar -xzf "${tarballPath}" -C "${extractDir}"`, { stdio: 'inherit' });

const extractedBin = path.join(extractDir, `node-${NODE_VERSION}-${nodeArch}`, 'bin', 'node');
const targetBin = path.join(staging, 'runtime', 'node', 'bin', 'node');
fs.copyFileSync(extractedBin, targetBin);
fs.chmodSync(targetBin, 0o755);

rm(extractDir);
fs.rmSync(tarballPath, { force: true });

// 5b. Datos de idioma del OCR (para funcionar offline)
const ocrDataDir = path.join(staging, 'runtime', 'ocr-data');
fs.mkdirSync(ocrDataDir, { recursive: true });
for (const lang of ['spa', 'eng']) {
  const ocrDataUrl = `https://cdn.jsdelivr.net/npm/@tesseract.js-data/${lang}/4.0.0/${lang}.traineddata.gz`;
  const ocrDataDest = path.join(ocrDataDir, `${lang}.traineddata.gz`);
  console.log(`\n$ curl -L ${ocrDataUrl}`);
  execSync(`curl -fSL "${ocrDataUrl}" -o "${ocrDataDest}"`, { stdio: 'inherit' });
}

// 6. Launchers según el sistema operativo
const macLauncher = `#!/bin/bash
set -e
DIR="$(cd "$(dirname "$0")" && pwd)"
PORT="\${PORT:-4000}"
export NODE_ENV=production
export PORT="$PORT"
export OCR_LANG_PATH="\${OCR_LANG_PATH:-$DIR/runtime/ocr-data}"
export OCR_CACHE_PATH="\${OCR_CACHE_PATH:-$DIR/runtime/ocr-cache}"
NODE="$DIR/runtime/node/bin/node"
SERVER="$DIR/backend/src/server.js"

echo "Arrancando 10go en http://localhost:$PORT ..."
"$NODE" "$SERVER" &
SERVER_PID=$!
sleep 1.5
open "http://localhost:$PORT"
echo "10go ejecutándose. Para detenerlo, cierra esta ventana o pulsa Ctrl+C."
wait "$SERVER_PID"
`;

const linuxLauncher = `#!/bin/bash
set -e
DIR="$(cd "$(dirname "$0")" && pwd)"
PORT="\${PORT:-4000}"
export NODE_ENV=production
export PORT="$PORT"
export OCR_LANG_PATH="\${OCR_LANG_PATH:-$DIR/runtime/ocr-data}"
export OCR_CACHE_PATH="\${OCR_CACHE_PATH:-$DIR/runtime/ocr-cache}"
NODE="$DIR/runtime/node/bin/node"
SERVER="$DIR/backend/src/server.js"

echo "Arrancando 10go en http://localhost:$PORT ..."
"$NODE" "$SERVER" &
SERVER_PID=$!
sleep 1.5

if command -v xdg-open >/dev/null 2>&1; then
  xdg-open "http://localhost:$PORT" >/dev/null 2>&1 || true
else
  echo "Abre tu navegador en: http://localhost:$PORT"
fi

echo "10go ejecutándose. Para detenerlo, pulsa Ctrl+C."
wait "$SERVER_PID"
`;

const macReadme = `10go — aplicacion autocontenida (sin instalar nada)
=========================================================

REQUISITOS
  - macOS con chip Apple Silicon (M1/M2/M3...). El runtime de Node va incluido.

PUESTA EN MARCHA
  1. Descomprime este ZIP en la carpeta que quieras.
  2. Haz doble clic en "10go.command" (o ejecuta ./start.sh en un terminal).
  3. Se abrirá el navegador en http://localhost:4000

DATOS
  Se guardan automáticamente en: backend/data/10go.sqlite
  Para empezar de cero, borra la carpeta "backend/data" y vuelve a arrancar.

CAMBIAR EL PUERTO
  PORT=8080 ./start.sh

ACTUALIZAR A UNA NUEVA VERSIÓN (sin perder datos)
  - El ZIP NO incluye tus datos: la base de datos vive en "backend/data"
    y se crea sola al arrancar. Sustituir los archivos de la app no la borra.
  - Opción recomendada (datos fuera de la app): arranca con
      DATA_DIR=/ruta/estable/10go-data ./start.sh
    Así puedes descomprimir cada release en una carpeta nueva apuntando
    siempre a la misma DATA_DIR, sin tocar los datos.
  - Opción simple (misma carpeta): descomprime el ZIP encima de la actual con
      unzip -o 10go-*.zip
    (no borra "backend/data" porque no viene en el ZIP).
  - Antes de actualizar, haz copia de seguridad de "backend/data" o de tu DATA_DIR.

SOLUCIÓN DE PROBLEMAS
  - Si macOS bloquea el arranque: haz clic derecho sobre "10go.command"
    y elige "Abrir" (o ejecuta: chmod +x 10go.command && ./10go.command).
  - Para detener la aplicación, cierra la ventana del terminal o pulsa Ctrl+C.
`;

const linuxReadme = `10go — aplicacion autocontenida (sin instalar nada)
=========================================================

REQUISITOS
  - Raspberry Pi 400 con Raspberry Pi OS de 64 bits (aarch64). El runtime de Node
    va incluido. Comprueba tu sistema con: uname -m  -> debe devolver "aarch64".
  - IMPORTANTE: Node.js ya no publica binarios oficiales para ARM de 32 bits,
    por lo que este paquete requiere el sistema de 64 bits.
  - Este paquete es para arquitectura: ${nodeArch}.

PUESTA EN MARCHA
  1. Copia este ZIP a la Raspberry Pi y descomprímelo en la carpeta que quieras.
     unzip 10go-*.zip
  2. Entra en la carpeta y ejecuta:
     ./start.sh
  3. Abre el navegador en http://localhost:4000 (o http://<ip-de-la-pi>:4000
     desde otro equipo de la misma red).

DATOS
  Se guardan automáticamente en: backend/data/10go.sqlite
  Para empezar de cero, borra la carpeta "backend/data" y vuelve a arrancar.

CAMBIAR EL PUERTO
  PORT=8080 ./start.sh

ACTUALIZAR A UNA NUEVA VERSIÓN (sin perder datos)
  - El ZIP NO incluye tus datos: la base de datos vive en "backend/data"
    y se crea sola al arrancar. Sustituir los archivos de la app no la borra.
  - Opción recomendada (datos fuera de la app): arranca con
      DATA_DIR=/ruta/estable/10go-data ./start.sh
    Así puedes descomprimir cada release en una carpeta nueva apuntando
    siempre a la misma DATA_DIR, sin tocar los datos.
  - Opción simple (misma carpeta): descomprime el ZIP encima de la actual con
      unzip -o 10go-*.zip
    (no borra "backend/data" porque no viene en el ZIP).
  - Antes de actualizar, haz copia de seguridad de "backend/data" o de tu DATA_DIR.

AUTOSTART (opcional, con systemd)
  Crea /etc/systemd/system/10go.service con:
    [Unit]
    Description=10go
    After=network.target
    [Service]
    WorkingDirectory=/home/pi/10go
    ExecStart=/home/pi/10go/runtime/node/bin/node backend/src/server.js
    Environment=NODE_ENV=production
    Environment=PORT=4000
    Environment=DATA_DIR=/home/pi/10go-data
    Restart=on-failure
    [Install]
    WantedBy=multi-user.target
  Luego: sudo systemctl enable --now 10go
  Con DATA_DIR fuera de la app, cada release es solo: parar el servicio,
  sustituir la carpeta /home/pi/10go y volver a arrancar. Tus datos quedan
  intactos en /home/pi/10go-data.

SOLUCIÓN DE PROBLEMAS
  - Si no es ejecutable: chmod +x start.sh
  - Para detener la aplicación, pulsa Ctrl+C.
`;

if (os === 'macos') {
  write(path.join(staging, '10go.command'), macLauncher, 0o755);
  write(path.join(staging, 'start.sh'), macLauncher, 0o755);
  write(path.join(staging, 'LEEME.txt'), macReadme);
} else {
  write(path.join(staging, 'start.sh'), linuxLauncher, 0o755);
  write(path.join(staging, 'LEEME.txt'), linuxReadme);
}

// 7. ZIP
rm(zipPath);
console.log(`\n$ zip -r ${zipName}`);
execSync(`zip -rq "${zipPath}" 10go`, { cwd: releaseDir, stdio: 'inherit' });

console.log('\n== Listo ==');
console.log(`Paquete: ${zipPath}`);
console.log(`Tamaño: ${(fs.statSync(zipPath).size / 1024 / 1024).toFixed(1)} MB`);
