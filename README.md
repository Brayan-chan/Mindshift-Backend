# Mindshift Backend

API Node.js/Express para MindShift. Usa pnpm para dependencias, Prisma como ORM
y Supabase para Auth/PostgreSQL.

## Requisitos

- Node.js 20+
- pnpm
- Proyecto Supabase con Postgres habilitado

## Configuración

```bash
cp .env.example .env
pnpm install
pnpm prisma:generate
```

Completa `.env` con las URLs y llaves de Supabase. `DATABASE_URL` debe apuntar
al pooler o connection string recomendada para runtime; `DIRECT_URL` se usa para
migraciones directas.

## Comandos

```bash
pnpm dev
pnpm start
pnpm prisma:migrate
pnpm prisma:studio
pnpm test
```

## Endpoints iniciales

- `GET /api/health`
- `POST /api/v1/auth/register`
- `POST /api/v1/auth/login`
- `GET /api/v1/bootstrap`
