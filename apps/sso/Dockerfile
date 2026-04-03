FROM node:20-alpine AS base
WORKDIR /app
RUN corepack enable

FROM base AS deps
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml tsconfig.base.json tsconfig.json ./
COPY apps/sso/package.json apps/sso/package.json
RUN pnpm install --frozen-lockfile

FROM deps AS build
COPY apps/sso apps/sso
RUN pnpm --filter @tecopos/sso build

FROM node:20-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=development
COPY --from=deps /app/node_modules /app/node_modules
COPY --from=deps /app/apps/sso/node_modules /app/apps/sso/node_modules
COPY --from=build /app/apps/sso/dist /app/apps/sso/dist
COPY apps/sso/package.json /app/apps/sso/package.json
EXPOSE 3001
CMD ["node", "apps/sso/dist/main.js"]
