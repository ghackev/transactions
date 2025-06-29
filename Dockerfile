# etapa de build
FROM node:22-alpine AS builder
WORKDIR /usr/src/app

# 1) Copiamos sólo los package.json y el esquema de Prisma
COPY package*.json ./
COPY prisma/schema.prisma ./prisma/

# 2) Instalamos todas las deps (incluyendo Prisma)
RUN npm install

# 3) Generamos el cliente de Prisma
RUN npx prisma generate

# 4) Copiamos el resto del código y compilamos
COPY . .
RUN npm run build


# etapa de runtime
FROM node:22-alpine
WORKDIR /app
ENV NODE_ENV=production

# 5) Copiamos dist y deps de producción
COPY --from=builder /usr/src/app/dist ./dist
COPY --from=builder /usr/src/app/package*.json ./

RUN npm install

COPY --from=builder /usr/src/app/node_modules/.prisma/client ./node_modules/.prisma/client

# 6) Arrancamos la app
CMD ["node", "dist/main.js"]
