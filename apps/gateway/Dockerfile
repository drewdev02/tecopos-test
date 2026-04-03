FROM node:20-alpine AS base
WORKDIR /app
RUN corepack enable

FROM base AS deps
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml tsconfig.base.json tsconfig.json ./
COPY apps/gateway/package.json apps/gateway/package.json
RUN pnpm install --frozen-lockfile

FROM deps AS build
COPY apps/gateway apps/gateway
RUN pnpm --filter @tecopos/gateway build

FROM node:20-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=development
COPY --from=deps /app/node_modules /app/node_modules
COPY --from=deps /app/apps/gateway/node_modules /app/apps/gateway/node_modules
COPY --from=build /app/apps/gateway/dist /app/apps/gateway/dist
COPY apps/gateway/package.json /app/apps/gateway/package.json
EXPOSE 3000
CMD ["node", "apps/gateway/dist/main.js"]
