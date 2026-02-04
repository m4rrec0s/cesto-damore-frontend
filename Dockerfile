FROM node:20-alpine

WORKDIR /app

COPY package*.json ./

RUN npm ci

COPY . .

# Build argument para variável de ambiente pública
ARG NEXT_PUBLIC_API_URL=https://api.cestodamore.com.br
ENV NEXT_PUBLIC_API_URL=${NEXT_PUBLIC_API_URL}

RUN npm run build

EXPOSE 3000

CMD ["npm", "start"]