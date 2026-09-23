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
