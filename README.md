# PlasticosLC - Sistema de Facturación y Gestión Empresarial

Plataforma multi-tenant de facturación, inventario, contabilidad, tesorería y activos fijos, construida como monorepo:

- **`apps/web`** — Frontend en Next.js 16 (App Router, React 19, Tailwind, shadcn/ui).
- **`apps/api`** — Backend en Express + Prisma, arquitectura multi-tenant: cada empresa (tenant) vive en su propia base de datos física, provisionada dinámicamente.

## 🏗️ Arquitectura multi-tenant

Hay dos schemas de Prisma independientes en `apps/api/prisma/`:

- **`platform/`** — BD de control-plane compartida por toda la plataforma. Guarda el registro de empresas (`Company`, con su `dbName`) y las cuentas `SUPER_ADMIN`.
- **`tenant/`** — Plantilla que se migra a **una base de datos física por empresa**. No hay columna `companyId` en ningún modelo: el aislamiento entre empresas es la conexión misma a la BD. `apps/api/src/lib/db.js` crea (`CREATE DATABASE`) y migra la BD de cada empresa nueva usando una conexión con privilegios de administrador (`POSTGRES_ADMIN_URL`).

## 📋 Requisitos previos

- Node.js 20+
- [pnpm](https://pnpm.io/) (usado por `apps/web` y los scripts de la raíz) — versión fijada en `package.json` (`packageManager`)
- Docker (para levantar Postgres localmente; opcional si ya tienes uno propio)
- Git

## 🛠️ Instalación local

1. **Clonar el repositorio**
   ```bash
   git clone <repository-url>
   cd plasticoslc-invoicing-app
   ```

2. **Instalar dependencias del frontend (workspace pnpm)**
   ```bash
   pnpm install
   ```

3. **Instalar dependencias del backend** (usa npm, no forma parte del workspace de pnpm)
   ```bash
   cd apps/api
   npm install
   cd ../..
   ```

4. **Levantar Postgres local**
   ```bash
   docker compose up -d
   ```
   Esto crea la BD `plasticoslc` (usada para desarrollar el schema tenant) en `localhost:5433`.

5. **Configurar variables de entorno**
   ```bash
   cp apps/api/.env.example apps/api/.env
   cp apps/web/.env.example apps/web/.env.local
   ```
   Edita `apps/api/.env` con tus valores (ver detalle de cada variable en el propio `.env.example`). Genera un `JWT_SECRET` y un `ENCRYPTION_KEY` reales, no dejes los de ejemplo.

6. **Crear la base de datos de plataforma** (docker-compose solo crea `plasticoslc`, falta la de control-plane)
   ```bash
   docker exec -it plasticoslc-db psql -U plasticoslc -d plasticoslc -c "CREATE DATABASE plasticoslc_platform;"
   ```

7. **Generar clientes de Prisma y migrar ambos schemas**
   ```bash
   cd apps/api
   npm run db:generate
   npx prisma migrate deploy --schema=prisma/platform/schema.prisma
   npx prisma migrate deploy --schema=prisma/tenant/schema.prisma
   cd ../..
   ```

8. **(Opcional) Sembrar datos iniciales**
   ```bash
   cd apps/api
   npm run seed:platform
   npm run seed:tenant
   cd ../..
   ```

## 🏃 Ejecución en desarrollo

Desde la raíz, levanta ambos servicios a la vez:
```bash
pnpm dev
```
- Web: `http://localhost:3005` (o el puerto configurado)
- API: `http://localhost:4000` (según `PORT` en `apps/api/.env`)

O por separado: `pnpm dev:web` / `pnpm dev:api`.

## 🔐 Variables de entorno

- `apps/api/.env.example` — conexión a BD de plataforma y de tenant, credenciales de administrador de Postgres, `JWT_SECRET`, `ENCRYPTION_KEY`.
- `apps/web/.env.example` — `NEXT_PUBLIC_API_URL` y demás config pública (se "hornea" en el bundle del navegador en build time).

`apps/api/.env` nunca se sube a git. `apps/web/.env` sí, porque solo contiene valores públicos sin secretos.

## 📁 Estructura del proyecto

```
plasticoslc-invoicing-app/
├── apps/
│   ├── web/                      # Next.js App Router
│   │   ├── app/                  # Rutas: facturación, inventario, contabilidad, tesorería...
│   │   ├── components/
│   │   ├── Dockerfile
│   │   └── .env.example
│   └── api/                      # Express + Prisma
│       ├── src/
│       │   ├── modules/          # Un módulo por dominio (invoices, inventory, accounting...)
│       │   ├── jobs/             # Cron jobs (ej. facturación recurrente)
│       │   └── lib/db.js         # Provisioning dinámico de BD por tenant
│       ├── prisma/
│       │   ├── platform/schema.prisma
│       │   └── tenant/schema.prisma
│       ├── Dockerfile
│       └── .env.example
├── docker-compose.yml             # Postgres para desarrollo local
└── pnpm-workspace.yaml            # Solo incluye apps/web (apps/api se gestiona con npm)
```

## 🚀 Despliegue en producción (Hostinger + EasyPanel)

Ambas apps tienen su propio `Dockerfile`, ya probados end-to-end (build + arranque + creación dinámica de BD de tenant).

1. **Postgres**: crea un servicio Postgres en EasyPanel. Además de la BD que crea por defecto, crea manualmente la de plataforma:
   ```sql
   CREATE DATABASE plasticoslc_platform;
   ```

2. **API** (`apps/api`):
   - Build: Dockerfile, ruta `apps/api/Dockerfile`, contexto `apps/api`.
   - Variables de entorno: igual que `apps/api/.env.example`, apuntando a los hosts internos del Postgres de EasyPanel. Genera `JWT_SECRET` y `ENCRYPTION_KEY` nuevos para producción.
   - Puerto del contenedor: `3000`.
   - **Monta un volumen persistente en `/app/uploads`** (logos de empresa, avatares) para que no se pierdan en cada redeploy.
   - Tras el primer deploy, corre las migraciones desde la consola del contenedor:
     ```bash
     npx prisma migrate deploy --schema=prisma/platform/schema.prisma
     npx prisma migrate deploy --schema=prisma/tenant/schema.prisma
     ```
   - Verifica: `GET /api` debe responder `{"ok":true,...}`.

3. **Web** (`apps/web`):
   - Antes de construir, actualiza `apps/web/.env` con el `NEXT_PUBLIC_API_URL` real de tu API (se compila en el bundle, no es una variable de runtime).
   - Build: Dockerfile, ruta `apps/web/Dockerfile`, **contexto la raíz del repo** (necesita el workspace de pnpm completo, aunque solo compile `apps/web`).
   - Puerto del contenedor: `3005`.
   - Asigna dominio propio y activa SSL desde EasyPanel.

## 🐛 Troubleshooting

### Error: "useAuth outside AuthProvider"
Asegúrate de que el componente está dentro de `ClientProviders` en `apps/web/app/layout.tsx`.

### Error: "Module not found: framer-motion" o "lucide-react"
```bash
cd apps/web
pnpm install
```

### `npm install` falla en `apps/api` con "Cannot read properties of undefined (reading 'extraneous')"
El `package-lock.json` quedó corrupto (referencias a rutas de pnpm). Regenéralo:
```bash
cd apps/api
rm -rf node_modules package-lock.json
npm install
```

## 📝 Uso de la aplicación

### Crear una factura
1. Ir a "Facturación" → "Nueva factura"
2. Seleccionar cliente
3. Agregar productos
4. Agregar firma digital
5. Emitir

### Gestionar inventario
1. Ir a "Inventario" → "Catálogo"
2. Ver, editar o agregar productos y lotes

### Ver reportes
1. Ir a "Reportes" o "Contabilidad"
2. Seleccionar rango de fechas
3. Analizar gráficos y estadísticas

## 📄 Licencia

Este proyecto está bajo la licencia MIT.

---

**Estado**: En desarrollo activo ✅
