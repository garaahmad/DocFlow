# Architecture

DocFlow is a Next.js App Router monolith with one separate worker process. Strict TypeScript, Zod and Prisma share the application’s domain rules. Styling uses CSS tokens and accessible native controls. Lucide and Recharts provide icons and charts. English and Arabic share routes and render with document-level direction. Some provider errors, extracted text, and workspace-entered content remain in their original language.

| Component              | Responsibilities                                                                                                                                        |
| ---------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Next.js web            | Marketing, local public demo, Better Auth sessions, workspace and document APIs, review UI, analytics, reports and Stripe                               |
| PostgreSQL             | Users, memberships, documents, processing states and leases, decimal financial values, audit events, revisions, plans’ usage counters and subscriptions |
| Valkey / BullMQ        | Background dispatch, retries, distributed worker concurrency, application request throttles                                                             |
| Background worker      | Claim documents, retrieve private objects, extract and validate, retry and reconcile, remove files marked for deletion                                  |
| Private object storage | Keep immutable uploaded binaries outside the web container filesystem                                                                                   |
| Gemini                 | Separate extraction, validation, and insights service clients                                                                                           |
| Stripe and Resend      | Optional checkout, subscription management, invoices, verification, invitations and recovery                                                            |

## Upload and review

The web API authenticates and authorizes each upload, enforces an operation rate limit, checks the payload size and format signature, computes a SHA-256 hash, and writes the file to a random key under the workspace prefix. A PostgreSQL transaction stores metadata, reserves a monthly quota unit and records the upload. The unique workspace/hash constraint resolves simultaneous duplicates. Storage and PostgreSQL do not share a transaction. The server removes the object after a confirmed database rollback. Operational maintenance should reconcile any aged object left behind after an indeterminate database failure.

The worker reconciles pending database rows into BullMQ jobs. A job is keyed by document and attempt. A timed claim and lease token prevent duplicate writes across retries and worker restarts. Processing failures expose a safe message and retry within bounded budgets. Cancellation invalidates the lease, so work already sent to Gemini can finish without updating a canceled document. A deletion mark makes the record inaccessible immediately. The worker retries deleting the object and then removes the record and attached revisions.

Successful extraction lands in Needs review. Saving and approving use optimistic version checks and write immutable revisions in the same transaction. Approval locks the approved record, while corrections and original extracted values remain viewable. Deterministic checks use decimal arithmetic, validated dates, and tenant-scoped duplicate comparisons.

## Data and financial safeguards

Stable tenant filters apply to each sensitive query. Selecting a workspace requires membership. Owner, admin, member and viewer capabilities are checked server-side. Platform administrators must hold a verified email on the explicit allowlist. They see aggregate operations and billing metrics. For document reads, authorization precedes issuance of a 90-second signed object URL. An issued signed URL can be used by anyone who possesses it during those 90 seconds. Session cookies are marked secure on HTTPS, and browser mutations require the configured origin.

Monetary values use decimal strings at API boundaries, PostgreSQL numeric columns, and exact decimal arithmetic for reconciliation. Aggregations use approved invoices and receipts, grouped by original currency. Charts convert aggregated values to numbers for rendering. Exports keep monetary values as exact strings and neutralize spreadsheet formula prefixes.

## Gemini services

The extraction service receives native PDF or image input and returns Zod-checked document fields with explicit nulls. The validation service adds optional contextual review findings on eligible plans when deterministic checks indicate risk. Validation never applies a correction. The insights service first classifies intent into a bounded query set. Server-side code performs tenant-scoped queries and renders the resulting facts directly. Gemini can supply a short explanatory note without numeric values. A free-form question can be unsupported, and human review remains necessary for extracted and AI-described content.

Each purpose uses its dedicated key and model. Calls have a transport timeout, capped retries and jitter. Usage records capture token counts and estimated cost when pricing variables are configured. Uploaded content is untrusted. Model output is validated before use. No model has SQL access, workspace selection capability, or write tools.

## Operational boundaries

The public demo reads static fixtures and changes its own browser state. It never creates a customer account or contacts Gemini. The optional local mock provider belongs on a separate development database and bucket and is disabled on Render. Activity logs retain action, actor identifier, timestamp and target identifier after document deletion. Set backup retention and deletion expectations before launch. Where provider retention or object versioning applies, purge schedules depend on those providers.

The Blueprint provisions infrastructure. Live credentials, a verified sender domain, private bucket settings, Stripe price and webhook configuration, and production policy review are operator responsibilities.
