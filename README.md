# TECOPOS Monorepo (Banking MVP)

Initial bootstrap for the `tecopos-banking-mvp` change using a pnpm workspace and three NestJS services.

## Public deployment

> Replace these placeholders with your real deployed URLs before final delivery.

- Gateway API (public): `https://<your-gateway-domain>`
- Swagger (public): `https://<your-gateway-domain>/api/docs`

## System diagram (high level)

```text
Client / Bank Consumer
        |
        v
  [Gateway :3000]
   - JWT validation
   - Global rate limit
   - Internal HMAC signing
      |                         
      +-------> [SSO :3001] -----> [Postgres SSO]
      |           - register/login
      |
      +-------> [Bank :3002] ----> [Postgres Bank]
                  - accounts/transactions (MockAPI proxy)
                  - webhook CRUD
                  - verifies gateway signed headers
```

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

## Security: Gateway → Bank trust boundary

- Bank endpoints under `/accounts*` and `/webhooks*` trust identity **only** when internal headers are signed by Gateway.
- Gateway forwards `X-User-Id` together with:
  - `X-Internal-Timestamp` (unix epoch seconds)
  - `X-Internal-Signature` (HMAC-SHA256 over `userId:method:path:timestamp`)
- Shared secret: `INTERNAL_SIGNATURE_SECRET`.
- Bank rejects missing/invalid/expired signatures with `401`.
- Timestamp freshness window is configurable via `INTERNAL_SIGNATURE_MAX_SKEW_SECONDS` (recommended `60-120`).

## Environment variables (canonical contract)

Canonical names are shared and consistent across services where applicable.

### Shared secrets

- `JWT_SECRET` (Gateway + SSO): shared HS256 JWT secret.
- `INTERNAL_SIGNATURE_SECRET` (Gateway + Bank): shared HMAC secret for internal trust headers.
- `INTERNAL_SIGNATURE_MAX_SKEW_SECONDS` (Gateway + Bank): accepted timestamp skew window.

### Gateway

- `GATEWAY_PORT` (default `3000`)
- `SSO_SERVICE_URL` (required)
- `BANK_SERVICE_URL` (required)
- `GATEWAY_RATE_LIMIT_TTL_MS` (default `60000`)
- `GATEWAY_RATE_LIMIT_LIMIT` (default `100`)

### SSO

- `SSO_PORT` (default `3001`)
- `SSO_DATABASE_URL` (required, postgres URI)
- `SSO_BCRYPT_ROUNDS` (default `10`, safe range `10-14`)
- `SSO_AUTH_RATE_LIMIT_TTL_MS` (default `60000`)
- `SSO_AUTH_RATE_LIMIT_LIMIT` (default `5`)

### Bank Accounts

- `BANK_PORT` (default `3002`)
- `BANK_DATABASE_URL` (required, postgres URI)
- `MOCKAPI_BASE_URL` (required)
- `BANK_UPSTREAM_MODE` (`memory` | `hybrid` | `mockapi`, default `memory` in docker-compose for local demo)
- `MOCKAPI_TIMEOUT_MS` (default `2000`, range `500-30000`)
- `BANK_UPSTREAM_MODE` (default `hybrid`): `mockapi` (strict upstream), `hybrid` (MockAPI + in-memory fallback), `memory` (in-memory only for local demo)

### Legacy aliases (backward compatibility)

The following are still accepted and normalized at startup, but should be migrated:

- `SSO_JWT_SECRET` → `JWT_SECRET`
- `BANK_MOCKAPI_BASE_URL` → `MOCKAPI_BASE_URL`
- `GATEWAY_SSO_URL` → `SSO_SERVICE_URL`
- `GATEWAY_BANK_URL` → `BANK_SERVICE_URL`
- `GATEWAY_INTERNAL_HMAC_SECRET` / `BANK_INTERNAL_HMAC_SECRET` → `INTERNAL_SIGNATURE_SECRET`
- `BANK_INTERNAL_SIGNATURE_MAX_SKEW_SECONDS` → `INTERNAL_SIGNATURE_MAX_SKEW_SECONDS`

## Notes

- Copy `.env.example` to `.env` and adjust values per environment.
- Current state includes implemented MVP features for Gateway, SSO, and Bank services, plus unit tests.
