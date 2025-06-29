# Transactions Backend

This project implements a REST API for recording and retrieving financial transactions. It is built with **NestJS** and **Prisma** on top of PostgreSQL and authenticates users through **Clerk**.  
A running instance is available at **INSERT URL**.

## 1. Running the application locally

1. Clone this repository and enter the project directory.
2. Install dependencies:
   ```bash
   npm install
   ```
3. Create a `.env` file containing:
   ```bash
   DATABASE_URL=postgresql://USER:PASSWORD@localhost:5432/your_db
   CLERK_PUBLISHABLE_KEY=your_clerk_publishable_key
   CLERK_SECRET_KEY=your_clerk_secret_key
   PORT=3000 # optional
   ```
4. Generate Prisma client and apply migrations:
   ```bash
   npx prisma generate
   npx prisma migrate dev --name init
   ```
5. Start the API in development mode:
   ```bash
   npm run start:dev
   ```
   The API will be reachable at `http://localhost:3000/api`.

### Running tests

- Unit tests: `npm run test:unit`
- E2E tests: `npm run test:e2e` (requires test credentials; see `test/transactions.e2e-spec.ts`)

## 2. Postman collection

A `transactions.postman_collection.json` file is provided. To use it:

1. Open Postman and choose **Import**.
2. Select the `transactions.postman_collection.json` file.
3. Create an environment with a `baseUrl` variable pointing to your local instance (`http://localhost:3000/api`) or to the deployed URL.
4. Each request requires an `Authorization` header with a Clerk JWT. Tokens can be generated in Clerk's interface or via the E2E test script.

## 3. API design

- **NestJS** supplies a modular and scalable structure. Each domain (transactions, authentication and so on) lives in its own module.
- **Prisma** offers type-safe database access. The `PrismaService` centralizes the connection and can be reused by other services.
- Authentication relies on a custom **Passport** strategy validating Clerk JWTs. A global guard (`ClerkAuthGuard`) protects all routes except those annotated with `@Public`.
- Input validation uses `class-validator` and `class-transformer` in DTO classes.

**Advantages**

- Clearly structured, testable code.
- Type-safe and automatic validations.
- Clean integration with external providers such as Clerk.

**Possible improvements**

- Add pagination and advanced sorting to transaction queries.
- Support additional authentication strategies or providers.

## 4. Test design

- **Unit tests** (`transactions.service.spec.ts`) isolate the transactions service by mocking Prisma. This verifies logic without requiring a real database.
- **E2E tests** (`test/transactions.e2e-spec.ts`) start the full application against PostgreSQL and exercise the API as a client would. Valid JWTs are generated through the Clerk SDK.

**Advantages**

- Unit tests run quickly without external dependencies.
- E2E tests ensure all components (NestJS, Prisma, authentication) work together.

**Possible improvements**

- Execute E2E tests in containers to fully isolate dependencies.
- Use fixtures or factories to populate test data more conveniently.

## 5. Deployment and branching strategy

The project follows **GitHub Flow**:

1. Features are developed on branches derived from `main`.
2. Opening a Pull Request triggers the workflow [`ci.yml`](.github/workflows/ci.yml). It starts a PostgreSQL service in GitHub Actions, installs dependencies, compiles the project, runs migrations and executes the tests.
3. When a PR is approved and merged to `main`, the workflow [`deploy-on-main.yml`](.github/workflows/deploy-on-main.yml) does the following:
   - Authenticate with Google Cloud.
   - Build and push a Docker image to Artifact Registry.
   - Run migrations using a Cloud Run Job.
   - Deploy the new image to the Cloud Run service.

**Possible improvements**

- Introduce a staging environment to validate changes before production.
- Automate quality checks (lint and format) within the workflows.

## Additional notes

- The repository includes a multi-stage `Dockerfile` to produce a slim production image.
- Code formatting is enforced with Prettier and linting with ESLint.
