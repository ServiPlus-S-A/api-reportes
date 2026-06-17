# ServiPlus - Reportes Operativos

Modulo de reportes operativos para la plataforma **ServiPlus S.A.**: generacion de reportes financieros, cache distribuido, auditoria en Firebase/Firestore y UI analitica. Implementado con arquitectura de microservicios segun el Documento de Arquitectura de Software (DAS) e ISO/IEC 25010.

[![License](https://img.shields.io/badge/license-UNLICENSED-lightgrey.svg)]()
[![Status](https://img.shields.io/badge/status-en%20desarrollo-blue.svg)]()
[![CI](https://github.com/ServiPlus-S-A/api-reportes/actions/workflows/ci.yml/badge.svg?branch=develop)]()
[![CD](https://github.com/ServiPlus-S-A/api-reportes/actions/workflows/cd.yml/badge.svg)]()
[![Coverage backend](https://img.shields.io/badge/coverage%20backend-reportes-ver%20CI-brightgreen.svg)]()

> Sustituye `OWNER/REPO` en los badges por la ruta real de tu repositorio en GitHub (por ejemplo `usuario/Desarrollo-II`).

## Descripcion

ServiPlus Reportes permite a equipos operativos y analistas **generar reportes por periodo** (formato `YYYY-MM`), consolidar ingresos y egresos, consultar detalle tabular y dejar trazabilidad de auditoria. El backend aplica el patron **Cache-Aside** con Redis y persiste eventos en **Firebase/Firestore**.

**Roles simulados en la UI (RBAC de demostracion):**

- **Administrador:** flujo completo de generacion de reportes.
- **Analista:** acceso permitido en el escenario de demo.
- **Usuario comun:** escenario de restriccion (mensajes 401/403 segun integracion externa de autenticacion).

## Arquitectura

Monorepo con **backend-reportes** (NestJS) y **frontend** (Next.js). Redis como cache; Firebase para logs de auditoria.

```
Navegador
    ↓
Frontend (Next.js 14 + Tailwind)
    ↓  HTTP (NEXT_PUBLIC_API_URL)
Backend Reportes (NestJS)
    ↙        ↘
 Redis     Firebase / Firestore
 (cache)   (audit logs)
```

**Patrones y calidad:**

- Cache-Aside (Redis) para respuestas de reportes por `tipo` + `periodo`.
- Adaptador de fuente de datos (`FinanzasAdapter`) desacoplado del dominio.
- Validacion global de DTOs (`class-validator`).
- Health check: `GET /health`.

## Stack tecnologico

### Backend (`backend-reportes`)

| Capa | Tecnologia |
|---|---|
| Lenguaje | TypeScript 5.x |
| Framework API | NestJS 10 |
| Validacion | class-validator + class-transformer |
| Cache | ioredis (Redis 7) |
| Auditoria | firebase-admin (Firestore) |
| HTTP cliente | Axios |
| Tests | Jest + Supertest (e2e) |

### Frontend (`frontend`)

| Capa | Tecnologia |
|---|---|
| Framework | Next.js 14 (App Router) |
| UI | React 18 + Tailwind CSS 3 |
| HTTP | Axios |
| Validacion cliente | Zod |
| Tests e2e | Playwright |

### Infraestructura

| Componente | Tecnologia |
|---|---|
| Orquestacion local | Docker Compose v2 |
| Cache | Redis 7.2 (Alpine) |
| CI | GitHub Actions (`ci.yml` en PR a `develop`) |
| CD | GitHub Actions (`cd.yml` en PR a `main` + Docker Hub + deploy SSH) |
| Produccion | `docker-compose.prod.yml` + imagenes en Docker Hub |

## Requisitos previos

- Docker Desktop 4.20 o superior (o Docker Engine + Compose plugin).
- Git 2.40 o superior.
- Node.js 20 o superior (desarrollo local sin Docker).
- VS Code (recomendado).

## Inicio rapido

### 1. Clonar el repositorio

```bash
git clone https://github.com/OWNER/REPO.git
cd REPO
```

### 2. Configurar variables de entorno

Crea un archivo `.env` en la raiz del monorepo:

```env
# Puertos
GATEWAY_PORT=8080
BACKEND_PORT=3000
FRONTEND_PORT=3001

# Seguridad (entornos integrados con proxy/JWT externo)
JWT_SECRET=CHANGEME_min32chars

# Firebase - auditoria
FIREBASE_PROJECT_ID=CHANGEME
FIREBASE_CLIENT_EMAIL=tu-service-account@tu-proyecto.iam.gserviceaccount.com
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nTU_CLAVE\n-----END PRIVATE KEY-----\n"

# Frontend - URL base del API que consumira la UI
NEXT_PUBLIC_API_URL=http://localhost:3000
```

> Si `FIREBASE_CLIENT_EMAIL` y `FIREBASE_PRIVATE_KEY` no estan presentes, el backend sigue funcionando en modo mock para auditoria y deja los logs en consola en vez de persistirlos en Firestore.

> Para desarrollo local **solo backend + frontend**, apuntar `NEXT_PUBLIC_API_URL` al puerto del backend (`http://localhost:3000`). Ajustar segun tu proxy o BFF de autenticacion en otros entornos.

### 3. Construir imagenes Docker (opcional)

```bash
docker build -t serviplus-backend-reportes -f backend-reportes/Dockerfile backend-reportes/
docker build -t serviplus-frontend -f frontend/Dockerfile frontend/
```

### 4. Levantar Redis y backend

```bash
docker compose up -d redis backend-reportes
```

### 5. Verificar que los servicios estan activos

```bash
docker compose ps
```

| Servicio | Puerto (por defecto) | Health |
|---|---|---|
| `redis_cache` | 6379 | `redis-cli ping` |
| `backend_reportes` | 3000 | `GET /health` |

### 6. Verificar endpoints de salud y reporte

```bash
curl http://localhost:3000/health

curl -X POST http://localhost:3000/reportes/generar \
  -H "Content-Type: application/json" \
  -H "x-user-id: Samuel" \
  -d "{\"periodo\":\"2026-05\",\"tipo\":\"finanzas\"}"
```

### 7. Levantar el frontend (desarrollo local)

```bash
cd frontend
npm install
set NEXT_PUBLIC_API_URL=http://localhost:3000   # Windows CMD
# export NEXT_PUBLIC_API_URL=http://localhost:3000   # Linux/macOS
npm run dev
```

Accede en: **http://localhost:3000** (puerto por defecto de Next.js en `dev`; en Docker usa `FRONTEND_PORT`, ej. **3001**).

### 8. Levantar el stack UI + backend con Docker

```bash
docker compose up -d redis backend-reportes frontend
```

**Acceso a la aplicación:**
- **Frontend (UI):** Abre **http://localhost:3001** (o el puerto que definas como `FRONTEND_PORT` en `.env`).
  > *Nota: Asegúrate de que en tu `docker-compose.yml`, el mapeo de puertos del frontend asocie el puerto del host al puerto 3000 interno del contenedor (ej: `"${FRONTEND_PORT}:3000"`)*.
- **Backend API Docs (Swagger):** Abre **http://localhost:3000/api/docs** para ver e interactuar con la documentación de la API.

** Nota sobre actualización de los contenedores:**
Al realizar cambios en el código base (como habilitar Swagger en `main.ts`), es **obligatorio** reconstruir la imagen del contenedor agregando la opción `--build`. Si omites esto, Docker levantará la versión anterior de tu código y obtendrás errores (como un `404 Not Found` en Swagger).

Comando correcto después de modificar el código:
```bash
docker compose up -d --build backend-reportes
```

Asegúrate de que `NEXT_PUBLIC_API_URL` en `.env` sea alcanzable desde el navegador (IP/host publico o `localhost` segun el caso).

## Comandos utiles

```bash
# Logs
docker logs backend_reportes -f
docker logs redis_cache -f

# Reiniciar backend tras cambios
docker compose up -d --build backend-reportes

# Backend - tests unitarios con cobertura
cd backend-reportes
npm ci
npm run test

# Backend - tests e2e (Jest + Supertest)
npm run test:e2e

# Backend - lint y tipos
npm run lint
npx tsc --noEmit
npx prettier --check "src/**/*.ts" "test/**/*.ts"

# Frontend - lint, build y e2e
cd frontend
npm ci
npm run lint
npm run build
npx playwright install chromium
npm run test:e2e
```

## Estructura del repositorio

```
.
├── .github/
│   └── workflows/           # CI (PR -> develop) y CD (PR -> main)
├── backend-reportes/        # API NestJS -> reportes, Redis, Firebase
│   ├── src/
│   │   ├── reportes/        # Controller, service, adapters, repos
│   │   └── health.controller.ts
│   └── test/                # e2e Jest (Supertest)
├── frontend/                # Next.js + Tailwind + Playwright
│   ├── src/app/
│   └── e2e/
├── docker-compose.yml       # Desarrollo local
├── docker-compose.prod.yml  # Produccion (imagenes Docker Hub)
├── .env                     # Variables locales (no commitear)
└── README.md
```

## Flujo de trabajo (Git)

| Rama / evento | Pipeline | Que valida |
|---|---|---|
| PR -> `develop` | **CI** | Lint, Prettier, `tsc`, build, tests Jest (backend), Playwright (frontend), Docker build |
| PR -> `main` | **CD** | Build/push imagenes a Docker Hub + deploy SSH (si hay secrets configurados) |

Resumen:

1. Trabajar en rama de feature (`feature/...`).
2. Abrir PR hacia **`develop`** -> corre CI (solo jobs afectados por `paths-filter`).
3. Tras revision, merge a `develop`.
4. Abrir PR **`develop` -> `main`** -> corre CD en cada actualizacion del PR.
5. Configurar secrets de CD en GitHub (Docker Hub + deploy SSH) para despliegue en EC2 u otro VPS.

## CI/CD en GitHub

### Docker Hub (imagenes del CD)

1. Crea cuenta en [Docker Hub](https://hub.docker.com/) (o usa una existente).
2. **Account Settings -> Security -> New Access Token** (permiso *Read & Write* para push desde Actions).
3. En el repo: **Settings -> Secrets and variables -> Actions** -> crea:

| Secret | Valor |
|---|---|
| `DOCKERHUB_USERNAME` | Tu usuario de Docker Hub (namespace), ej. `serviplus` |
| `DOCKERHUB_TOKEN` | El access token (no la contraseña de la cuenta) |

Las imagenes quedaran como:

- `TU_USUARIO/backend-reportes:<sha>`
- `TU_USUARIO/frontend:<sha>`
- `TU_USUARIO/api-gateway:<sha>`

Repositorios privados en Docker Hub requieren plan de pago; para pruebas usa repos **publicos** o un unico namespace con las tres imagenes.

### Secrets de deploy (servidor EC2/VPS)

| Secret | Uso |
|---|---|
| `DEPLOY_HOST` | IP o hostname del servidor |
| `DEPLOY_USER` | Usuario SSH (`ubuntu` en EC2) |
| `DEPLOY_SSH_KEY` | Clave privada `.pem` |
| `DEPLOY_PATH` | Ruta con `docker-compose.prod.yml` y `.env` |
| `DEPLOY_PORT` | Opcional (default 22) |

En el servidor, `docker compose` usa `IMAGE_REGISTRY` = tu `DOCKERHUB_USERNAME` y `IMAGE_TAG` = SHA del commit (el CD los exporta antes del `pull`).

Las variables de aplicacion (`JWT_SECRET`, `FIREBASE_PROJECT_ID`, `FIREBASE_CLIENT_EMAIL`, `FIREBASE_PRIVATE_KEY`, puertos) viven en el **`.env` del servidor**, no en GitHub Actions.

## Cobertura de tests

| Componente | Herramienta | Donde ver el % |
|---|---|---|
| backend-reportes | Jest (`npm run test` -> `--coverage`) | Salida de consola y job **Tests unitarios** en CI |
| backend-reportes e2e | Jest + Supertest | `npm run test:e2e` |
| frontend | Playwright (`npm run test:e2e`) | Reporte en CI; UI local con `npm run test:e2e:ui` |

La carpeta `coverage/` esta en `.gitignore`: se genera en cada ejecucion pero **no se versiona**. Para exigir un minimo en CI, añade `coverageThreshold` en `backend-reportes/package.json`.

## Estado del proyecto

| Area | Estado | Notas |
|---|---|---|
| API reportes financieros | ✅ | `POST /reportes/generar`, adapter finanzas |
| Cache Redis (Cache-Aside) | ✅ | Degradacion graceful si Redis no esta disponible |
| Auditoria Firebase | ✅ | Repositorio Firestore |
| Health check | ✅ | `GET /health` |
| UI reportes + RBAC demo | ✅ | Next.js, validacion periodo `YYYY-MM` |
| CI en `develop` | ✅ | Paths filter backend / frontend |
| CD en PR a `main` | ✅ | Docker Hub + deploy SSH opcional |
| Umbral de cobertura en CI | 🔜 | Opcional (`coverageThreshold`) |

## Creditos

- Proyecto academico / ServiPlus S.A. - Modulo de Reportes Operativos.
- Arquitectura alineada con DAS e ISO/IEC 25010.

## Licencia

Codigo privado - `UNLICENSED` (ver `package.json` en cada servicio).
