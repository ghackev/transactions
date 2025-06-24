# VerdeMoney

Este proyecto implementa una API de transacciones utilizando **NestJS** y **Prisma**.

## Requisitos previos

- Node.js 18 o superior
- Una base de datos PostgreSQL
- Variable de entorno `DATABASE_URL` apuntando a la base de datos

## Puesta en marcha

1. Instalar dependencias:
   ```bash
   npm install
   ```
2. Crear un archivo `.env` en la raíz (o exportar la variable en tu entorno) con la URL de la base de datos:
   ```env
   DATABASE_URL="postgresql://usuario:contraseña@localhost:5432/verdemoney"
   ```
3. Inicializar la base de datos con Prisma:
   ```bash
   npx prisma db push
   # o
   npx prisma migrate dev --name init
   ```
4. Compilar el proyecto TypeScript:
   ```bash
   npx tsc
   ```
5. Ejecutar el servidor:
   ```bash
   npm start
   # o en modo desarrollo
   npm run start:dev
   ```

El servidor quedará disponible en `http://localhost:3000`.

## Descripción de archivos y carpetas

- **package.json** y **package-lock.json**: Definen las dependencias y scripts del proyecto.
- **tsconfig.json**: Configuración del compilador TypeScript.
- **.gitignore**: Archivos y carpetas que Git debe ignorar.
- **prisma/schema.prisma**: Definición de la base de datos y del modelo `Transaction`.
- **src/main.ts**: Punto de entrada de la aplicación NestJS.
- **src/app.module.ts**: Módulo principal que agrupa los demás módulos.
- **src/auth/clerk.guard.ts**: Guard de autenticación basado en Clerk; extrae `userId` del token.
- **src/transactions/transactions.module.ts**: Módulo que encapsula la funcionalidad de transacciones.
- **src/transactions/transactions.controller.ts**: Controlador con las rutas REST para crear, listar y obtener el resumen de transacciones.
- **src/transactions/transactions.service.ts**: Servicio que realiza las operaciones de base de datos mediante Prisma.
- **src/transactions/transactions.dto.ts**: DTO que valida los datos de entrada al crear una transacción.
- **README.md**: Este documento.

Cada archivo se enfoca en mantener la separación de responsabilidades propia de una aplicación NestJS.
