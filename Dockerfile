FROM node:22-alpine

WORKDIR /app

COPY package*.json ./

RUN npm ci --no-audit --no-fund

COPY . .

# Build argument para variável pública (será embutida no bundle do navegador)
ARG NEXT_PUBLIC_API_URL
ENV NEXT_PUBLIC_API_URL=${NEXT_PUBLIC_API_URL}

RUN npm run build

EXPOSE 3001

# Usar node diretamente em vez de npm para melhor handling de sinais
CMD ["node", "node_modules/vinext/dist/cli.js", "start", "-p", "3001"]
