FROM node:20-alpine

ENV NODE_ENV=production
WORKDIR /app

# Install backend dependencies first for better layer caching
COPY Backend/package.json Backend/package-lock.json Backend/
RUN cd Backend && npm ci --omit=dev && npm cache clean --force

# The backend serves the frontend from ../Frontend
COPY Backend/ Backend/
COPY Frontend/ Frontend/

USER node
WORKDIR /app/Backend
EXPOSE 5000

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD node -e "fetch('http://localhost:' + (process.env.PORT || 5000) + '/health').then(r => process.exit(r.ok ? 0 : 1)).catch(() => process.exit(1))"

CMD ["node", "server.js"]
