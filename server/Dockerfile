# Multi-stage build: compile TypeScript in a full Node image, then run the
# compiled output with only production dependencies in the final image.

FROM node:22-bookworm-slim AS base
WORKDIR /app
# Prisma's query engine needs OpenSSL on the base image to detect at runtime.
RUN apt-get update && apt-get install -y --no-install-recommends openssl \
  && rm -rf /var/lib/apt/lists/*

# --- deps: install every dependency once, reused by both later stages ---
FROM base AS deps
COPY package.json package-lock.json ./
RUN npm ci

# --- build: generate the Prisma client and compile TypeScript to dist/ ---
FROM deps AS build
COPY . .
RUN npx prisma generate
RUN npm run build

# --- runtime: production-only node_modules + compiled output ---
FROM base AS runtime
ENV NODE_ENV=production
COPY package.json package-lock.json ./
RUN npm ci --omit=dev
COPY --from=build /app/dist ./dist
COPY --from=build /app/prisma ./prisma
COPY --from=build /app/node_modules/.prisma ./node_modules/.prisma
RUN mkdir -p uploads

EXPOSE 4000

# Apply any pending migrations, then start the API. Safe to run on every
# container start — `migrate deploy` is a no-op when the schema is current.
CMD ["sh", "-c", "npx prisma migrate deploy && node dist/server.js"]
