# Transactions Backend

This project implements a secure REST API for recording and retrieving financial transactions. It is built with **NestJS** and **Prisma** on top of **PostgreSQL**, and authenticates users through **Clerk** to ensure that all data is scoped per authenticated user.

The repository assumes a **GitHub Flow** branching strategy:
- All development work is done in feature branches.
- Pull requests (PRs) target the `main` branch.
- Automated tests and lint checks run on every PR.
- When a PR is merged into `main`, the CI/CD pipeline automatically deploys the latest version to the production environment.
- During deployment, database **migrations are automatically applied** to keep the schema up to date with the application code.

This ensures that changes are tested, reviewed, deployed, and the database is migrated safely with minimal manual intervention.

## Production Deployment

The production instance is deployed at:

👉 [https://transactions-api-992313983967.us-central1.run.app/api/](https://transactions-api-992313983967.us-central1.run.app/api/)

> ⚠️ Note: The root path `/api/` does not expose a public index route.
> The available endpoints are under `/api/transactions` and require authentication.
> Example:
> - `POST /api/transactions` — Create a transaction
> - `GET /api/transactions` — List transactions for the authenticated user

You can test the API by calling these endpoints with a valid Clerk authentication token.

# Local Setup Guide

## Prerequisites

* Node.js v22
* Docker

---

## 1. Run the application locally

**1.1 Clone the repository and install dependencies**

```bash
git clone <YOUR_REPO_URL>
cd <YOUR_PROJECT_DIRECTORY>
npm install
```

**1.2 Start a PostgreSQL container**

```bash
docker run -d \
  --name <transactions-db-container-name> \
  -e POSTGRES_USER=<db_username> \
  -e POSTGRES_PASSWORD=<db_password> \
  -e POSTGRES_DB=<db_name> \
  -p <host_port>:5432 \
  postgres:17
```

*If port `<host_port>` is in use, replace `-p <host_port>:5432` with `-p <alternative_port>:5432`.*

**1.3 (Optional) Check the database logs**

```bash
docker logs <transactions-db-container-name>
```

**1.4 Create a `.env` file** in the project root containing:

```env
DATABASE_URL=postgresql://<db_username>:<db_password>@localhost:<host_port>/<db_name>
CLERK_SECRET_KEY=<your_clerk_secret_key>
TESTING_USER_ID=<clerk_testing_user_id>
```

**1.5 Generate the Prisma client & apply migrations**

```bash
npx prisma generate
npx prisma migrate dev --name init
```

> **Note:** Ensure no other Postgres instance is running on the same port.

**1.6 Start the API in development mode**

```bash
npm run start:dev
```

The API will be available at **[http://localhost:3000/api](http://localhost:3000/api)**.

---

## 2. Running Tests

**Unit tests**

```bash
npm run test:unit
```

**E2E tests**

```bash
npm run test:e2e
```

**All tests**

```bash
npm run test
```

---

## 3. Postman Collection

A file named `transactionsapi.postman_collection.json` is provided. To import and use:

1. Open Postman and click **Import**.
2. Select `transactionsapi.postman_collection.json`.
3. Create an environment with a `baseUrl` variable set to your instance (`http://localhost:3000/api` or deployed URL).
4. For each request, add an **Authorization** header with a valid Clerk JWT.


# One-page write-up

### Authentication

Authentication is handled using a **custom Passport strategy** and a dedicated NestJS **Auth Guard** that integrates with **Clerk**.

- **`ClerkStrategy`** (`clerk.strategy.ts`):
  - Uses `passport-custom` to implement a `'clerk'` strategy.
  - Extracts the `Authorization` header and verifies the JWT using Clerk’s `verifyToken` with your `CLERK_SECRET_KEY`.
  - If valid, retrieves the full user object from Clerk and attaches it to the request.
  - Throws an `UnauthorizedException` if the token is invalid or missing.

- **`ClerkAuthGuard`** (`clerk-auth.guard.ts`):
  - Extends NestJS’s `AuthGuard` for the `'clerk'` strategy.
  - Uses `Reflector` to check for a custom `@Public()` decorator — if present, the route is publicly accessible (e.g., `GET /api/health`).
  - Otherwise, enforces full Clerk authentication and injects the user into the request context.

This approach guarantees:
- All protected endpoints require a valid Clerk JWT.
- Public routes are explicit and isolated.
- Controllers and services remain simple, only requiring the verified `userId`.

**End-to-End Tests:**  
In the end-to-end (e2e) tests, the same Clerk token validation flow is used. Valid test tokens sessions are generated to simulate real authenticated requests, verifying that the system enforces user scoping correctly.

**Unit Tests:**
Authentication is not re-validated at the service layer in unit tests. Instead, each test explicitly passes a `userId` parameter to simulate a verified user context, as would be provided by the authentication guard in production.

## API Design

The Transactions API is designed following a clean layered architecture with strong security, validation, and clear separation of concerns.

### DTOs

- **`CreateTransactionDto`** and **`TransactionsQueryDto`** define strict contracts for incoming request payloads and query parameters.
- `class-validator` decorators ensure that every input (`amount`, `type`, `category`, `recipient`) is validated automatically before any business logic runs.

### Controller

- **`TransactionsController`** exposes three REST endpoints:
  - `POST /transactions` — Creates a new transaction for the authenticated user.
  - `GET /transactions` — Lists all transactions for the authenticated user, with optional filters.
  - `GET /transactions/summary` — Returns a grouped summary (totals by `category` and `type`).

- The controller uses `@UseGuards(ClerkAuthGuard)` to protect all routes by default.
- It extracts the authenticated `userId` from Clerk’s session claims and passes it to the service layer.
- Uses `ValidationPipe` to enforce DTO constraints at the request level.

### Service

- **`TransactionsService`** encapsulates all business logic and database operations.
- Prisma is used for safe, type-checked interactions with the PostgreSQL database.
- All methods explicitly require a `userId`, ensuring every query or mutation is scoped to the authenticated user.
- `summary` uses `groupBy` to calculate totals and transforms the raw Prisma result into a simple, client-friendly format.

**Benefits:**
- Strong separation of concerns with DTOs, controllers, services, guards, and strategy.
- Built-in multi-tenancy: every query is user-scoped by design.
- Easy to extend with more endpoints.
- Secure by default: Clerk JWTs verified for every request.

### Testing: Unit & End-to-End

This project uses a **dual testing strategy** to ensure both **isolated correctness** and **real-world behavior** are fully covered.

---

**Unit Tests**

- Unit tests for the `TransactionsService` verify that all business logic interacts with the database layer correctly.
- The `PrismaService` is fully mocked using Jest. This means tests do not touch the real database and run very fast.
- Each method (`create`, `findAll`, `summary`) is tested to ensure:
  - The `userId` is always included in every query (`where` clause) or creation (`data`), enforcing strict multi-tenancy.
  - Filters like `type` and `category` are applied correctly.
  - Prisma’s `groupBy` results are transformed as expected into a clean summary format.
- These tests guarantee that the **core logic behaves correctly**, even if Prisma or the HTTP layer changes.

---

**End-to-End (E2E) Tests**

- The E2E tests run the entire **NestJS application** with all modules, guards, and pipes exactly as in production.
- They use **`supertest`** to make real HTTP requests against the running server.
- A valid **Clerk JWT** is generated dynamically using `@clerk/backend` and injected as a `Bearer` token in the request. This means the real `ClerkAuthGuard` and `ClerkStrategy` logic run end-to-end.
- Tests cover:
  - **Auth failures:** requests without a token or with an invalid token are rejected with `401 Unauthorized`.
  - **Input validation:** invalid payloads (e.g., missing required fields, wrong types, negative amounts) return `400 Bad Request`.
  - **Persistence:** successful `POST /transactions` calls insert data into the real test database, which is verified afterwards with direct Prisma queries.
  - **Filtering:** `GET /transactions` with combinations of `type` and `category` confirms that only matching records are returned.
  - **Aggregation:** `GET /transactions/summary` checks that grouped sums for `send` and `receive` amounts per category are calculated correctly and match the raw data in the database.
- The database is cleaned before each relevant test to ensure **idempotent, repeatable results**.

---

**Benefits**

- **Isolated logic is covered:** unit tests ensure no regression in pure business rules.
- **Full flow is verified:** E2E tests validate the real behavior — from Clerk token auth to Prisma persistence.
- **Security is tested:** token-based scoping works exactly as intended.
- **Validation and error handling are tested:** no invalid data reaches the database layer.

---

## CI/CD Pipeline

This project uses a **full Continuous Integration and Continuous Deployment pipeline**, implemented with **GitHub Actions**, **Docker**, **Prisma Migrate**, and **Google Cloud Run**.

---

### Pull Request Checks (CI)

On every pull request to `main`:

- **A PostgreSQL 17 container** spins up inside the runner (`localhost:5432`).
- Prisma migrations are applied automatically (`prisma migrate deploy`) to ensure the schema is valid.
- The application builds, starts locally, and is probed with `/api/health` to confirm it is healthy.
- Lint and TypeChecks are executed.
- **Unit tests** run with a fully mocked Prisma client to verify core business logic, user scoping, and query correctness.
- **End-to-End (E2E) tests** run against the live local API:
  - A real test PostgreSQL database is used.
  - A valid Clerk JWT is generated dynamically using the `CLERK_SECRET_KEY` and `TESTING_USER_ID` secrets.
  - `supertest` hits the endpoints, verifying authentication, input validation, DB persistence, filtering, and grouped summaries.

If any check fails, the pull request cannot merge.

---

### Production Deployment (CD)

When changes are merged to `main`:

1. **Docker Build & Push**  
   - The project builds a Docker image tagged with the commit SHA.
   - The image is pushed to **Google Artifact Registry** inside the specified GCP project.

2. **Run Migrations with Cloud Run Jobs**  
   - A dedicated **Cloud Run Job** (`migrate-transactions`) runs `npx prisma migrate deploy` using the same image.
   - This ensures the production database schema is fully up to date before new containers go live.

3. **Deploy Cloud Run Service**  
   - The new image is deployed to the `transactions-api` Cloud Run service.
   - The `DATABASE_URL` secret is securely passed to the container at runtime.
   - Traffic is switched only when the migration job completes successfully.
   - The result of the deployment job is sent to a specific Slack channel.
---

### Google Cloud Structure

- **Artifact Registry** stores built Docker images securely.
- **Cloud Run Jobs** run migrations as a dedicated one-off task, separate from the app.
- **Cloud Run Service** serves the API container with auto-scaling and HTTPS.
- The `/api/health` endpoint is used by the pipeline and health checks to confirm the API is ready.

---

### Possible Next Steps

- Automate rollback if deploy or migration fails.
- Tag Docker images with friendly tags (`latest` or `prod`).
- Add pagination for `GET /transactions` to handle large datasets.
- Add API versioning (e.g., `/api/v1/transactions`).
