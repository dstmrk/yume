# Yume in one container. Refer to paragraph 7 of `docs/architecture.md`.
#
# The image uses Debian slim, not Alpine. `better-sqlite3` is a native module,
# and it gives a compiled binary for glibc. With musl, the build must compile
# the module from the source code. That operation is slow on an arm64 device.
#
# Build the image for a home server with this command:
#   docker buildx build --platform linux/arm64 -t yume .
#
# The build needs BuildKit for the cache of npm. Docker 23 and after start
# BuildKit for each build.

FROM node:22-bookworm-slim AS deps
WORKDIR /app
COPY package.json package-lock.json ./
# Only the dependencies of production. The server reads the TypeScript files
# with `--experimental-strip-types`, thus the image needs no build of the
# server and no development tool.
#
# Do not add `--ignore-scripts` here. `better-sqlite3` reads its compiled
# binary in the script of the installation. Without that script, the module
# does not load and the server stops at the first request.
#
# The cache of npm stays between two builds on the same machine. A build on a
# Raspberry Pi is then more rapid.
RUN --mount=type=cache,target=/root/.npm npm ci --omit=dev --prefer-offline

FROM node:22-bookworm-slim AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN --mount=type=cache,target=/root/.npm npm ci --prefer-offline
COPY tsconfig.json vite.config.ts ./
COPY src ./src
# Vite writes the files of the client in `dist/`.
RUN npm run build

FROM node:22-bookworm-slim AS runtime
WORKDIR /app

ENV NODE_ENV=production
ENV DATABASE_URL=/data/yume.db
ENV PORT=3000

COPY --from=deps /app/node_modules ./node_modules
COPY --from=build /app/dist ./dist
COPY package.json ./
# The migrator reads `drizzle/meta/_journal.json` and the SQL files.
COPY drizzle ./drizzle
# The server only. The directory `src/client` is in `dist/` after the build.
COPY src/server ./src/server
COPY src/shared ./src/shared

# The database is on a mounted volume. The user `node` (1000) writes it.
#
# The CMD calls node, thus the image needs no npm at runtime. Without npm, the
# image holds no dependency of npm, and a scan of the vulnerabilities gives a
# smaller list. On Debian, npm is in `/usr/local`.
RUN mkdir -p /data && chown node:node /data && \
	rm -rf /usr/local/lib/node_modules/npm /usr/local/bin/npm /usr/local/bin/npx
USER node
EXPOSE 3000

# The route reads the database. Refer to `GET /api/health` in
# `src/server/app.ts`.
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
	CMD node -e "fetch('http://127.0.0.1:' + (process.env.PORT ?? 3000) + '/api/health').then((r) => process.exit(r.ok ? 0 : 1)).catch(() => process.exit(1))"

# The migrations, then the catalogue, then the server. The two scripts make no
# change on a second start. `exec` gives the signals of Docker to node, thus
# the container stops immediately.
CMD ["sh", "-c", "node --experimental-strip-types src/server/db/migrate.ts && node --experimental-strip-types src/server/db/seed/run.ts && exec node --experimental-strip-types src/server/index.ts"]
