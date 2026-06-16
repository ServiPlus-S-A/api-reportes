# Pull Request — ServiPlus Reportes Operativos

## Rama destino

<!-- Indica hacia qué rama va el PR y qué pipeline debe pasar. -->

- [ ] **`develop`** → dispara **CI** (lint, build, tests, Docker build)
- [ ] **`main`** → dispara **CD** (imágenes Docker Hub + deploy, si aplica)

## Historias de usuario cerradas

<!-- Una HU por línea. Ejemplo: HU-12: Generar reporte financiero por periodo -->

- HU-NN: [título]

## Descripción
    
<!-- Qué cambia, por qué, y qué servicios toca (backend-reportes / frontend). -->

## Ámbito del cambio

- [ ] `backend-reportes` (NestJS)
- [ ] `frontend` (Next.js)
- [ ] Infra / CI-CD (`.github/`, Docker Compose)
- [ ] Documentación (`README`, etc.)

## Tipo de cambio

- [ ] feat — Nueva funcionalidad
- [ ] fix — Corrección de bug
- [ ] docs — Solo documentación
- [ ] refactor — Refactor sin cambio funcional
- [ ] test — Añade o ajusta tests
- [ ] chore — Mantenimiento (deps, configs, CI/CD)

## Criterios de aceptación

<!-- Copia los CA de la HU y marca los cumplidos. -->

- [ ] CA-01: ...
- [ ] CA-02: ...
- [ ] CA-03: ...

## Calidad — backend (`backend-reportes`)

<!-- Marca solo si modificaste el backend. -->

- [ ] Tests unitarios (Jest) añadidos o actualizados para el código nuevo
- [ ] `npm run test` pasa y la cobertura se revisó en consola (`jest --coverage`)
- [ ] `npm run test:e2e` pasa (si toca rutas HTTP / bootstrap de la app)
- [ ] `npx eslint "{src,apps,libs,test}/**/*.ts" --fix` sin errores pendientes
- [ ] `npx prettier --check "src/**/*.ts" "test/**/*.ts"` pasa
- [ ] `npx tsc --noEmit` pasa
- [ ] `npm run build` (Nest) pasa

## Calidad — frontend (`frontend`)

<!-- Marca solo si modificaste el frontend. -->

- [ ] Tests e2e (Playwright) añadidos o actualizados si cambia flujo de UI
- [ ] `npm run lint` (`next lint`) pasa
- [ ] `npx tsc --noEmit` pasa
- [ ] `npm run build` pasa
- [ ] `npm run test:e2e` pasa (tras `npm run build` en CI o local)

## Validación funcional

- [ ] Probado localmente con Docker (`redis` + `backend-reportes`) o servicios en local
- [ ] `GET /health` responde `UP` (si toca backend)
- [ ] Flujo de generación de reporte verificado (`POST /reportes/generar` o UI)
- [ ] Variables de entorno documentadas o sin valores secretos en el diff

## Documentación

- [ ] `README.md` actualizado (instalación, puertos, CI/CD o comandos)
- [ ] Comentarios en código solo donde la lógica de negocio no sea obvia
- [ ] Sin `.env`, credenciales ni tokens en el commit

## Evidencia

<!-- Capturas de la UI, salida de tests, curl de endpoints, link al run de Actions. -->

```
<!-- Pega aquí logs relevantes o deja enlace al job de GitHub Actions -->
```

## Notas para el revisor

<!-- Decisiones de arquitectura (Cache-Aside, Firebase, adapters), deuda técnica, riesgos. -->
