FROM node:20-alpine AS base
WORKDIR /app
RUN corepack enable

FROM base AS deps
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml tsconfig.base.json tsconfig.json ./
COPY apps/bank-accounts/package.json apps/bank-accounts/package.json
RUN pnpm install --frozen-lockfile

FROM deps AS build
COPY apps/bank-accounts apps/bank-accounts
RUN pnpm --filter @tecopos/bank-accounts build

FROM node:20-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=development
COPY --from=deps /app/node_modules /app/node_modules
COPY --from=deps /app/apps/bank-accounts/node_modules /app/apps/bank-accounts/node_modules
COPY --from=build /app/apps/bank-accounts/dist /app/apps/bank-accounts/dist
COPY apps/bank-accounts/package.json /app/apps/bank-accounts/package.json
EXPOSE 3002
CMD ["node", "apps/bank-accounts/dist/main.js"]
