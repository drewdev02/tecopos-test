# TECOPOS Monorepo (Banking MVP)

Initial bootstrap for the `tecopos-banking-mvp` change using a pnpm workspace and three NestJS services.

## Monorepo structure

```text
.
├── apps/
│   ├── gateway/
│   ├── sso/
│   └── bank-accounts/
├── libs/
├── package.json
├── pnpm-workspace.yaml
└── tsconfig.base.json
```

## Quick start

1. Install dependencies:

   ```bash
   pnpm install
   ```

2. Start all services in watch mode:

   ```bash
   pnpm dev
   ```

3. Build all services:

   ```bash
    pnpm build
    ```

### Docker Compose (local infra + apps)

1. Create local env file:

   ```bash
   cp .env.example .env
   ```

2. Validate compose configuration:

   ```bash
   docker compose config
   ```

3. Build and start all containers:

   ```bash
   docker compose up --build
   ```

4. Run in detached mode (optional):

   ```bash
   docker compose up -d --build
   ```

5. Stop and remove containers:

   ```bash
   docker compose down
   ```

6. Stop and remove containers + DB volumes (reset data):

   ```bash
   docker compose down -v
   ```

#### Compose services

- Gateway API: `http://localhost:3000`
- SSO API: `http://localhost:3001`
- Bank Accounts API: `http://localhost:3002`
- SSO Postgres container: `postgres-sso` (`localhost:5432`)
- Bank Postgres container: `postgres-bank` (`localhost:5433`)

> App containers run on an internal bridge network (`tecopos-internal`) and wait for their corresponding Postgres health checks before startup.

## Service health endpoints

- Gateway: `GET http://localhost:3000/health`
- SSO: `GET http://localhost:3001/health`
- Bank Accounts: `GET http://localhost:3002/health`

## Notes

- This is foundation scaffolding only (no auth/business/DB features yet).
- Copy `.env.example` to `.env` and adjust values per environment.
