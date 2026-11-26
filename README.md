# DocFlow AI

**From Documents to Decisions.** DocFlow is a document intelligence workspace for uploading business files, extracting fields with Gemini, reviewing discrepancies, and turning approved records into searchable invoices and reports.

## Run locally

Requires Node 24, npm, and Docker Compose. The local infrastructure runs PostgreSQL, Valkey, and the RustFS S3-compatible server. The public landing page and `/demo` also work without those services.

```bash
npm ci
cp .env.example .env
# Generate a random secret and set BETTER_AUTH_SECRET in .env.
openssl rand -hex 32
docker compose up -d --wait
npm run db:generate
npm run db:migrate
npm run storage:init
```

For a deterministic end-to-end local walkthrough, set `DOCFLOW_MOCK_AI=true` in `.env`. For actual extraction, keep that flag off and configure Gemini credentials. Start the two processes in separate terminals.

```bash
npm run worker
npm run dev
```

Open <http://localhost:3000>. Register, finish onboarding, then upload an eligible file. The worker records extraction and validation findings. Correct the fields against the source, approve, and export results from Invoices or Reports.

To create a synthetic PDF and populate a local workspace after registering, run `npm run db:seed -- you@example.test`. The seed command is limited to the local mock setup and creates a separate sample workspace when needed. Switch to that workspace from the sidebar after signing in. The public `/demo` is entirely browser-local and sends no Gemini requests.

## Scripts

| Command                                                     | Purpose                                                             |
| ----------------------------------------------------------- | ------------------------------------------------------------------- |
| `npm run dev`                                               | Start Next.js using local configuration                             |
| `npm run worker`                                            | Run the independent document worker                                 |
| `npm run db:generate`                                       | Generate Prisma client                                              |
| `npm run db:migrate`                                        | Apply committed migrations                                          |
| `npm run storage:init`                                      | Create the private bucket on local RustFS                           |
| `npm run build && npm start`                                | Compile Prisma and Next.js, then run the production web server      |
| `npm run format:check && npm run lint && npm run typecheck` | Verify formatting, lint rules and types                             |
| `npm test`                                                  | Run service-level and pure-function tests                           |
| `DOCFLOW_INTEGRATION=true npm test`                         | Include PostgreSQL authorization and concurrent quota tests         |
| `npm run test:e2e`                                          | Run Chromium tests against the app and independently running worker |

For Playwright, run `npx playwright install chromium` once or set `DOCFLOW_CHROMIUM` to an existing Chromium executable. Start the local services, apply migrations and start the worker in mock mode before running the suite. Playwright creates unique local accounts and exercises actual PostgreSQL, object storage, and queue behavior. Run it with local test data only. `PLAYWRIGHT_BASE_URL` can point to an already running local instance. Tests use the mock extraction mode and do not contact Gemini, Stripe, or Resend.

## More

- [Render deployment](DEPLOYMENT.md)
- [Architecture and data lifecycle](ARCHITECTURE.md)
- [Sales and demo kit](DEMO.md)
