FROM node:20-alpine

WORKDIR /app

COPY package.json package-lock.json* ./
RUN npm ci || npm i

RUN npm i prom-client@14

COPY . .

ENV NODE_ENV=production
EXPOSE 4000
CMD ["npm", "run", "start"]
