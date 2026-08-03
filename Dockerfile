FROM node:22-alpine AS builder

WORKDIR /app

COPY package*.json ./

RUN npm ci --no-audit --no-fund

COPY . .

ARG NEXT_PUBLIC_API_URL
ENV NEXT_PUBLIC_API_URL=${NEXT_PUBLIC_API_URL}

RUN npm run build

RUN npm prune --omit=dev

# Stage final
FROM node:22-alpine

WORKDIR /app

COPY --from=builder /app/package*.json ./
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/public ./public

EXPOSE 3001

CMD ["node", "node_modules/vinext/dist/cli.js", "start", "-p", "3001"]