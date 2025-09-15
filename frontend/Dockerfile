FROM node:20-alpine AS build

WORKDIR /app
COPY package.json package-lock.json* ./

RUN npm ci || npm i

COPY . .
RUN npm run build

FROM node:20-alpine
WORKDIR /app

RUN npm init -y && npm i express serve-static prom-client

COPY --from=build /app/dist ./dist

COPY server.js ./server.js

ENV PORT=5173
EXPOSE 5173

CMD ["node", "server.js"]
