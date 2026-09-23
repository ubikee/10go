# 10go

Aplicación web para la **gestión de contratos** de una familia u organización: alquileres
(como inquilino o casero), suministros de la vivienda (luz, agua, ADSL…), nóminas/trabajos,
seguros, suscripciones y préstamos. Permite monitorizar el **estado actual** y las
**previsiones a futuro** de ingresos y gastos.

## Stack

- **Frontend**: React + Vite, JavaScript (JSX), HTML/CSS puro (sin frameworks CSS).
- **Backend**: API REST con Node.js + Express.
- **Arquitectura**: DDD + hexagonal (dominio → aplicación → infraestructura).
- **Persistencia**: JSON en desarrollo, SQLite (via `node:sqlite`) en producción.

## Estructura

```
10go/
├── backend/
│   └── src/
│       ├── config/            # Configuración (moneda, puerto, persistencia)
│       ├── domain/            # Entidades, value objects, puertos (repos) y servicios de dominio
│       ├── application/       # Casos de uso / servicios de aplicación + composition root
│       ├── shared/            # Errores de dominio/aplicación
│       └── infrastructure/
│           ├── persistence/   # Adaptadores JSON y SQLite + factory
│           └── http/          # Express: app, rutas, middleware
└── frontend/
    └── src/
        ├── api/               # Cliente REST
        ├── components/        # Layout, Modal, formularios…
        ├── pages/             # Panel, Contratos, Viviendas, Miembros, Previsión
        ├── lib/               # Constantes, formato, contexto
        └── styles/            # CSS puro
```

## Puesta en marcha

```bash
npm install          # instala workspaces (backend + frontend)
npm run dev          # levanta API (4000) y frontend (5173) a la vez
```

O por separado:

```bash
npm run dev:server   # API en http://localhost:4000
npm run dev:client   # Vite en http://localhost:5173
```

## Configuración

Copia `backend/.env.example` a `backend/.env` (o exporta las variables). La **moneda** es un
parámetro de configuración global (`CURRENCY`, por defecto `EUR`).

| Variable | Descripción | Default |
| --- | --- | --- |
| `NODE_ENV` | `development` (JSON) o `production` (SQLite) | `development` |
| `PORT` | Puerto del API | `4000` |
| `CURRENCY` | Moneda por defecto | `EUR` |
| `FORCE_PERSISTENCE` | Forzar motor: `json` \| `sqlite` | según `NODE_ENV` |
| `DATABASE_PATH` | Ruta del fichero SQLite | `./data/10go.sqlite` |
| `DATA_DIR` | Carpeta de datos (permite sacarla fuera de la app) | `backend/data` |

## Empaquetado autocontenido

`npm run package:mac` y `npm run package:raspberrypi` generan un ZIP listo para ejecutar
sin instalar Node ni base de datos (incluye el runtime de Node y las dependencias).

### Releases sin pisar datos

El ZIP nunca incluye la base de datos. Para actualizar sin perder datos:

- **Recomendado**: arranca con `DATA_DIR=/ruta/estable/10go-data` (los datos quedan fuera
  de la app) y sustituye la carpeta de la app en cada release.
- **Mismo sitio**: `unzip -o 10go-*.zip` sobre la carpeta actual (no borra `backend/data`).
- Haz copia de seguridad de la carpeta de datos antes de actualizar.

## Movimientos (transactions) y OCR de facturas

Un **contrato** puede ser de importe `fijo` (recurrente) o `variable` (p. ej. un autónomo que cobra
facturas de forma irregular). Los **movimientos** (`Transaction`) registran el dinero real que entra
o sale ligado a un contrato: importe, fecha, nº de factura, contraparte (cliente/proveedor) y
documento opcional. Se pueden crear **manualmente** o **subiendo una factura** (PDF/imagen), en cuyo
caso el módulo OCR (opcional, configurable en la página **Configuración**) extrae el nº de factura y
el importe.

Los contratos de tipo **autónomo/freelance** permiten desglosar cada factura en **base imponible,
IVA e IRPF** (con porcentajes por defecto en el contrato). El resumen de **Impuestos** (página
`/taxes`) agrega por trimestre el IVA repercutido (a pagar) y el IRPF retenido, y los informes usan
la base (neto) excluyendo el IVA.

- **Motor OCR**: `local` (Tesseract.js, offline) o `cloud` (Google Vision, requiere API key).
- **Confirmación**: revisar y corregir antes de guardar, o guardar automáticamente.

Los documentos se guardan en `DATA_DIR/invoices/`. En el paquete autocontenido los datos de idioma
del OCR van incluidos (`runtime/ocr-data/`), así que funciona sin conexión.

### Endpoints de movimientos/OCR

| Método | Ruta | Descripción |
| --- | --- | --- |
| POST | `/api/ocr/extract` | Extrae nº factura e importe de un archivo (multipart) |
| POST | `/api/contracts/:id/transactions` | Crea un movimiento (JSON, manual) o sube factura (multipart, con OCR) |
| GET | `/api/contracts/:id/transactions` | Lista movimientos de un contrato |
| GET | `/api/contracts/:id/forecast` | Previsión de un único contrato |
| GET | `/api/transactions/:id/document` | Descarga el documento de un movimiento |
| DELETE | `/api/transactions/:id` | Elimina movimiento y su documento |
| GET/PUT | `/api/settings` | Configuración general (módulo OCR, motor, etc.) |

## API REST

| Método | Ruta | Descripción |
| --- | --- | --- |
| GET | `/api/config` | Configuración (moneda, entorno) |
| GET/POST/PUT/DELETE | `/api/members`, `/api/houses`, `/api/contracts` | CRUD de miembros, viviendas y contratos |
| GET | `/api/forecast?months=12` | Proyección mensual de ingresos/gastos |
| GET | `/api/dashboard` | Resumen del panel (estado actual y previsiones) |
| GET | `/health` | Estado del servicio |

## Notas de arquitectura

- El **dominio** no conoce Express ni SQLite: define entidades (`Contract`, `House`, `Member`),
  value objects (`Money`, `Recurrence`, `DateRange`) y puertos (interfaces de repositorio).
- La **aplicación** orquesta casos de uso inyectando repositorios.
- La **infraestructura** implementa los puertos (JSON en dev, SQLite en prod) y expone HTTP.
- La `ForecastService` (dominio) genera las ocurrencias de pago según la recurrencia
  (mensual, trimestral, anual, semanal, puntual) y agrupa por mes para las previsiones.
