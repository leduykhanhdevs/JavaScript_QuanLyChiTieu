FROM node:22-bookworm-slim

ENV NODE_ENV=production
WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci --omit=dev

COPY --chown=node:node server ./server
COPY --chown=node:node public ./public

USER node
EXPOSE 3000

# Apply idempotent PostgreSQL migrations before each service rollout starts.
CMD ["sh", "-c", "npm run db:migrate && npm start"]
