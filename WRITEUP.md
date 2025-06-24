# Development Writeup

## Architecture

The project uses NestJS to expose a REST API with a `Transaction` entity stored in PostgreSQL through Prisma. A custom `AuthMiddleware` simulates Clerk authentication by extracting a user ID from the `Authorization` header and attaching it to the Prisma client for scoping queries.

`TransactionsService` provides business logic and aggregates summaries. Prisma models enforce data consistency and provide type safety.

## Quality Approach

Jest with Supertest drives automated E2E tests. Linting and TypeScript type checking run in CI to catch common issues. The CI workflow installs dependencies, runs linters, type checking and tests, failing on any error.

## Challenges & Assumptions

Real Clerk integration and Docker-based deployment are omitted for brevity. The middleware expects a header `Bearer <userId>` to simulate authenticated sessions. Database migrations and environment configuration are left to the user.

## Tools Used

- **NestJS** for the web framework
- **Prisma** ORM for PostgreSQL
- **Jest** and **Supertest** for testing
- **GitHub Actions** for CI
- **VSCode** with AI assistance for scaffolding code

## Future Work

With more time, full Clerk authentication, thorough unit tests, Docker Compose for local development, and production-ready error handling would be added.
