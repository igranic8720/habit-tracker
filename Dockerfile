# syntax=docker/dockerfile:1

# --- build the front end ---
FROM node:22-alpine AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
RUN npm run build

# --- runtime: just the built app + the dependency-free server ---
FROM node:22-alpine
ENV NODE_ENV=production \
    PORT=3000 \
    HABIT_DATA_DIR=/data
WORKDIR /app
COPY --from=build /app/dist ./dist
COPY package.json ./
COPY server ./server

# your habit files live here; mount a volume over it so they survive container updates
RUN mkdir /data && chown node:node /data
USER node
VOLUME /data
EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:'+process.env.PORT+'/healthz').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

CMD ["node", "server/index.js"]
