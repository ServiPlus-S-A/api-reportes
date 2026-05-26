# ServiPlus - Reportes Operativos

Módulo de Reportes Operativos para la plataforma de ServiPlus S.A., implementado con arquitectura orientada a microservicios según las especificaciones del Documento de Arquitectura de Software (DAS) e ISO/IEC 25010.

## Estructura del Proyecto

- `api-gateway`: Enrutamiento, validación JWT, limitación de tasa (Rate Limiting) y control de acceso (RBAC).
- `backend-reportes`: API REST principal en NestJS. Integra base de datos Firebase/Firestore (Audit Logs) y caché Redis (Cache-Aside).
- `frontend`: Interfaz de usuario responsiva construida con Next.js y Tailwind CSS.

## Requisitos Previos

- Docker y Docker Compose
- Node.js (v18+)

## Comandos Rápidos

### Despliegue con Docker Compose
1. Clonar el repositorio y configurar variables de entorno:
   ```bash
   cp .env.example .env
   ```
2. Levantar la pila completa de microservicios:
   ```bash
   docker-compose up --build
   ```

### Pruebas de Calidad (Backend)
1. Instalar dependencias locales en el backend:
   ```bash
   cd backend-reportes
   npm install
   ```
2. Ejecutar tests unitarios:
   ```bash
   npm run test
   ```
3. Medir cobertura de código (mínimo 100% de cobertura objetivo):
   ```bash
   npm run test:cov
   ```
