# Verde Money Backend Exercise

This is a simplified NestJS service demonstrating a transactions API with mocked authentication.

## Setup

1. Install dependencies (requires internet access):
   ```bash
   npm ci
   ```
2. Set `DATABASE_URL` in your environment for PostgreSQL.
3. Run migrations:
   ```bash
   npx prisma migrate dev --name init
   ```
4. Start the server:
   ```bash
   npm run start
   ```

## Testing

Run automated tests using Jest:

```bash
npm test
```

GitHub Actions runs linting, type checking, and tests on each push.
