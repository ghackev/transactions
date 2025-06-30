# etapa de build
FROM node:22-alpine AS builder
WORKDIR /usr/src/app

# 1) Copiamos package.json y Prisma
COPY package*.json ./
COPY prisma ./prisma

# 2) Instalamos dependencias (incluyendo Prisma)
RUN npm install

# 3) Generamos cliente Prisma
RUN npx prisma generate

# 4) Copiamos resto de la app y compilamos
COPY . .
RUN npm run build


# etapa de runtime
FROM node:22-alpine
WORKDIR /app
ENV NODE_ENV=production

# 5) Copiamos build, deps y Prisma schema/migrations
COPY --from=builder /usr/src/app/dist ./dist
COPY --from=builder /usr/src/app/package*.json ./
COPY --from=builder /usr/src/app/prisma ./prisma

RUN npm install --omit=dev

# Prisma client nativo generado
COPY --from=builder /usr/src/app/node_modules/.prisma ./node_modules/.prisma

# 6) Arrancamos la app (o migramos si quieres)
CMD ["node", "dist/src/main.js"]
