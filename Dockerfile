# syntax=docker/dockerfile:1.7

ARG NODE_VERSION=24-alpine
ARG PNPM_VERSION=10.28.1

FROM node:${NODE_VERSION} AS base
ENV PNPM_HOME=/pnpm
ENV PATH=$PNPM_HOME:$PATH
ARG PNPM_VERSION
RUN corepack enable && corepack prepare pnpm@${PNPM_VERSION} --activate
WORKDIR /app

FROM base AS deps
COPY package.json pnpm-lock.yaml ./
RUN --mount=type=cache,id=pnpm,target=/pnpm/store \
    pnpm install --frozen-lockfile

FROM base AS build
COPY --from=deps /app/node_modules ./node_modules
COPY . .
# Placeholders so SvelteKit's analyse step can import server modules that
# still read env at module-load time. See trace/tmp/todo.md C7 (lazy env reads):
# s3 is already lazy; db client and auth still need refactoring.
ENV DATABASE_URL=postgres://build:build@127.0.0.1:5432/build \
    ORIGIN=http://localhost:3000 \
    BETTER_AUTH_SECRET=build-placeholder-not-a-real-secret \
    TRACE_AUTH_SECRET=build-placeholder-not-a-real-secret
RUN pnpm build

FROM base AS prod-deps
COPY package.json pnpm-lock.yaml ./
RUN --mount=type=cache,id=pnpm,target=/pnpm/store \
    pnpm install --frozen-lockfile --prod

FROM node:${NODE_VERSION} AS runtime
ARG BUILD_DATE
ARG VCS_REF
ARG VERSION=0.0.0-dev

LABEL org.opencontainers.image.title="trace" \
      org.opencontainers.image.description="Self-hostable BDD test management. Write Gherkin, run scenarios, witness what your tests actually did." \
      org.opencontainers.image.url="https://github.com/Moq77111113/trace" \
      org.opencontainers.image.source="https://github.com/Moq77111113/trace" \
      org.opencontainers.image.documentation="https://moq77111113.github.io/trace.io" \
      org.opencontainers.image.licenses="MIT" \
      org.opencontainers.image.authors="Moq77111113" \
      org.opencontainers.image.vendor="Moq77111113" \
      org.opencontainers.image.created="${BUILD_DATE}" \
      org.opencontainers.image.revision="${VCS_REF}" \
      org.opencontainers.image.version="${VERSION}"

ENV NODE_ENV=production
ENV HOST=0.0.0.0
ENV PORT=3000
WORKDIR /app

RUN apk add --no-cache tini && \
    addgroup -S trace && adduser -S trace -G trace

COPY --from=prod-deps --chown=trace:trace /app/node_modules ./node_modules
COPY --from=build     --chown=trace:trace /app/build         ./build
COPY --from=build     --chown=trace:trace /app/drizzle       ./drizzle
COPY --from=build     --chown=trace:trace /app/package.json  ./package.json

USER trace
EXPOSE 3000

ENTRYPOINT ["/sbin/tini", "--"]
CMD ["node", "build/index.js"]
