FROM node:20-alpine AS dependencies
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production

FROM node:20-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV PORT=7000

RUN addgroup -g 1001 nodejs && \
    adduser -S -u 1001 nodejs -G nodejs

COPY --from=dependencies /app/node_modules ./node_modules
COPY package*.json ./
COPY src/ ./src/

USER nodejs

EXPOSE 7000

HEALTHCHECK --interval=30s --timeout=5s --start-period=5s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:7000/health || exit 1

CMD ["node", "src/server.js"]
