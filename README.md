# ServiPlus — Reportes Operativos

Módulo de reportes operativos para la plataforma **ServiPlus S.A.**: generación de reportes financieros, caché distribuido, auditoría en Firebase/Firestore y UI analítica. Implementado con arquitectura de microservicios según el Documento de Arquitectura de Software (DAS) e ISO/IEC 25010.

[![License](https://img.shields.io/badge/license-UNLICENSED-lightgrey.svg)]()
[![Status](https://img.shields.io/badge/status-en%20desarrollo-blue.svg)]()
[![CI](https://github.com/ServiPlus-S-A/api-reportes/actions/workflows/ci.yml/badge.svg?branch=develop)]()
[![CD](https://github.com/ServiPlus-S-A/api-reportes/actions/workflows/cd.yml/badge.svg)]()
[![Coverage backend](https://img.shields.io/badge/coverage%20backend-reportes-ver%20CI-brightgreen.svg)]()

> Sustituye `OWNER/REPO` en los badges por la ruta real de tu repositorio en GitHub (por ejemplo `usuario/Desarrollo-II`).

## Descripción

ServiPlus Reportes permite a equipos operativos y analistas **generar reportes por periodo** (formato `YYYY-MM`), consolidar ingresos y egresos, consultar detalle tabular y dejar trazabilidad de auditoría. El backend aplica el patrón **Cache-Aside** con Redis y persiste eventos en **Firebase/Firestore**.

**Roles simulados en la UI (RBAC de demostración):**

- **Administrador:** flujo completo de generación de reportes.
- **Analista:** acceso permitido en el escenario de demo.
- **Usuario común:** escenario de restricción (mensajes 401/403 según integración externa de autenticación).

## Arquitectura

Monorepo con **backend-reportes** (NestJS) y **frontend** (Next.js). Redis como caché; Firebase para logs de auditoría.

```
Navegador
    ↓
Frontend (Next.js 14 + Tailwind)
    ↓  HTTP (NEXT_PUBLIC_API_URL)
Backend Reportes (NestJS)
    ↙        ↘
 Redis     Firebase / Firestore
 (caché)   (audit logs)
```

**Patrones y calidad:**

- Cache-Aside (Redis) para respuestas de reportes por `tipo` + `periodo`.
- Adaptador de fuente de datos (`FinanzasAdapter`) desacoplado del dominio.
- Validación global de DTOs (`class-validator`).
- Health check: `GET /health`.

## Stack tecnológico

### Backend (`backend-reportes`)

| Capa | Tecnología |
|---|---|
| Lenguaje | TypeScript 5.x |
| Framework API | NestJS 10 |
| Validación | class-validator + class-transformer |
| Caché | ioredis (Redis 7) |
| Auditoría | firebase-admin (Firestore) |
| HTTP cliente | Axios |
| Tests | Jest + Supertest (e2e) |

### Frontend (`frontend`)

| Capa | Tecnología |
|---|---|
| Framework | Next.js 14 (App Router) |
| UI | React 18 + Tailwind CSS 3 |
| HTTP | Axios |
| Validación cliente | Zod |
| Tests e2e | Playwright |

### Infraestructura

| Componente | Tecnología |
|---|---|
| Orquestación local | Docker Compose v2 |
| Caché | Redis 7.2 (Alpine) |
| CI | GitHub Actions (`ci.yml` en PR a `develop`) |
| CD | GitHub Actions (`cd.yml` en PR a `main` + GHCR + deploy SSH) |
| Producción | `docker-compose.prod.yml` + imágenes en `ghcr.io` |

## Requisitos previos

- Docker Desktop 4.20 o superior (o Docker Engine + Compose plugin).
- Git 2.40 o superior.
- Node.js 20 o superior (desarrollo local sin Docker).
- VS Code (recomendado).

## Inicio rápido

### 1. Clonar el repositorio

```bash
git clone https://github.com/OWNER/REPO.git
cd REPO
```

### 2. Configurar variables de entorno

Crea un archivo `.env` en la raíz del monorepo:

```env
# Puertos
GATEWAY_PORT=8080
BACKEND_PORT=3000
FRONTEND_PORT=3001

# Seguridad (entornos integrados con proxy/JWT externo)
JWT_SECRET=CHANGEME_min32chars

# Firebase — auditoría
FIREBASE_PROJECT_ID=CHANGEME

# Frontend — URL base del API que consumirá la UI
NEXT_PUBLIC_API_URL=http://localhost:3000
```

> Para desarrollo local **solo backend + frontend**, apuntar `NEXT_PUBLIC_API_URL` al puerto del backend (`http://localhost:3000`). Ajustar según tu proxy o BFF de autenticación en otros entornos.

### 3. Construir imágenes Docker (opcional)

```bash
docker build -t serviplus-backend-reportes -f backend-reportes/Dockerfile backend-reportes/
docker build -t serviplus-frontend -f frontend/Dockerfile frontend/
```

### 4. Levantar Redis y backend

```bash
docker compose up -d redis backend-reportes
```

### 5. Verificar que los servicios están activos

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

Asegúrate de que `NEXT_PUBLIC_API_URL` en `.env` sea alcanzable desde el navegador (IP/host público o `localhost` según el caso).

## Comandos útiles

```bash
# Logs
docker logs backend_reportes -f
docker logs redis_cache -f

# Reiniciar backend tras cambios
docker compose up -d --build backend-reportes

# Backend — tests unitarios con cobertura
cd backend-reportes
npm ci
npm run test

# Backend — tests e2e (Jest + Supertest)
npm run test:e2e

# Backend — lint y tipos
npm run lint
npx tsc --noEmit
npx prettier --check "src/**/*.ts" "test/**/*.ts"

# Frontend — lint, build y e2e
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
│   └── workflows/           # CI (PR → develop) y CD (PR → main)
├── backend-reportes/        # API NestJS — reportes, Redis, Firebase
│   ├── src/
│   │   ├── reportes/        # Controller, service, adapters, repos
│   │   └── health.controller.ts
│   └── test/                # e2e Jest (Supertest)
├── frontend/                # Next.js + Tailwind + Playwright
│   ├── src/app/
│   └── e2e/
├── docker-compose.yml       # Desarrollo local
├── docker-compose.prod.yml  # Producción (imágenes GHCR)
├── .env                     # Variables locales (no commitear)
└── README.md
```

## Flujo de trabajo (Git)

| Rama / evento | Pipeline | Qué valida |
|---|---|---|
| PR → `develop` | **CI** | Lint, Prettier, `tsc`, build, tests Jest (backend), Playwright (frontend), Docker build |
| PR → `main` | **CD** | Build/push imágenes a GHCR + deploy SSH (si hay secrets configurados) |

Resumen:

1. Trabajar en rama de feature (`feature/...`).
2. Abrir PR hacia **`develop`** → corre CI (solo jobs afectados por `paths-filter`).
3. Tras revisión, merge a `develop`.
4. Abrir PR **`develop` → `main`** → corre CD en cada actualización del PR.
5. Configurar secrets de deploy en GitHub (`DEPLOY_HOST`, `DEPLOY_SSH_KEY`, `GHCR_DEPLOY_TOKEN`, etc.) para despliegue en EC2 u otro VPS.

## CI/CD en GitHub

**Secrets recomendados (CD / deploy):**

| Secret | Uso |
|---|---|
| `DEPLOY_HOST` | IP o hostname del servidor |
| `DEPLOY_USER` | Usuario SSH (`ubuntu` en EC2) |
| `DEPLOY_SSH_KEY` | Clave privada `.pem` |
| `DEPLOY_PATH` | Ruta con `docker-compose.prod.yml` y `.env` |
| `GHCR_DEPLOY_TOKEN` | PAT con `read:packages` para `docker pull` |

Las variables de aplicación (`JWT_SECRET`, `FIREBASE_PROJECT_ID`, puertos) viven en el **`.env` del servidor**, no en GitHub Actions.

**Permisos:** Settings → Actions → Workflow permissions → *Read and write* (publicación en GHCR).

## Cobertura de tests

| Componente | Herramienta | Dónde ver el % |
|---|---|---|
| backend-reportes | Jest (`npm run test` → `--coverage`) | Salida de consola y job **Tests unitarios** en CI |
| backend-reportes e2e | Jest + Supertest | `npm run test:e2e` |
| frontend | Playwright (`npm run test:e2e`) | Reporte en CI; UI local con `npm run test:e2e:ui` |

La carpeta `coverage/` está en `.gitignore`: se genera en cada ejecución pero **no se versiona**. Para exigir un mínimo en CI, añade `coverageThreshold` en `backend-reportes/package.json`.

## Estado del proyecto

| Área | Estado | Notas |
|---|---|---|
| API reportes financieros | ✅ | `POST /reportes/generar`, adapter finanzas |
| Caché Redis (Cache-Aside) | ✅ | Degradación graceful si Redis no está disponible |
| Auditoría Firebase | ✅ | Repositorio Firestore |
| Health check | ✅ | `GET /health` |
| UI reportes + RBAC demo | ✅ | Next.js, validación periodo `YYYY-MM` |
| CI en `develop` | ✅ | Paths filter backend / frontend |
| CD en PR a `main` | ✅ | GHCR + deploy SSH opcional |
| Umbral de cobertura en CI | 🔜 | Opcional (`coverageThreshold`) |

## Créditos

- Proyecto académico / ServiPlus S.A. — Módulo de Reportes Operativos.
- Arquitectura alineada con DAS e ISO/IEC 25010.

## Licencia

Código privado — `UNLICENSED` (ver `package.json` en cada servicio).
