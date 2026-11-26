# Deploy DocFlow AI on Render

The root Blueprint declares a paid Next.js web service, PostgreSQL, Redis-compatible Key Value, and a background worker in Oregon. Review service names, region and estimated monthly charges before applying. The public web service exposes `/api/health` and Next.js binds to Render’s `PORT`.

## 1. Prepare the infrastructure

1. Create a private S3-compatible bucket. Block public access. Grant the web service and worker only object read, write, and delete access to this bucket. Keep the bucket endpoint HTTPS. If bucket versioning is enabled, configure an expiration rule for noncurrent versions to match the retention policy.
2. Create separate Gemini credentials for extraction, validation, and insights. Restrict the keys to the Gemini API in Google Cloud. Keys for the same Google project may share quota. If a credential was pasted into a conversation, revoke it and create a replacement before use.
3. For payments, create Stripe recurring USD prices matching the plan configuration in `src/lib/plans.ts`. Activate the Stripe Customer Portal and configure its products, upgrades, downgrades, and cancellation behavior. Start in test mode.
4. For email-based signup verification and password recovery, verify a sender domain in Resend.

## 2. Validate and apply the Blueprint

```bash
npm ci
npm run build
render login
render blueprints validate render.yaml --workspace YOUR_WORKSPACE_ID
```

Commit and push `render.yaml` with the application. [Open the Render Blueprint wizard for DocFlow](https://dashboard.render.com/blueprint/new?repo=https://github.com/garaahmad/DocFlow). Select the intended Render workspace and source branch. In the initial setup, enter the requested Gemini credentials. Put the same extraction-purpose credential in the web and worker prompts.

Apply the Blueprint. In its `docflow-storage` environment group, add the settings below. Changes to the group redeploy both linked services. Set optional integrations on the **web service** and AI pricing settings on the service executing that AI purpose. Trigger a redeploy after configuration if one has not started.

| Configuration                                                                                   | Scope                | Required                                                                                                |
| ----------------------------------------------------------------------------------------------- | -------------------- | ------------------------------------------------------------------------------------------------------- |
| `DATABASE_URL`, `REDIS_URL`                                                                     | Web and worker       | Blueprint-managed connections                                                                           |
| `BETTER_AUTH_SECRET`                                                                            | Web                  | Blueprint-generated, keep stable across deployments                                                     |
| `BETTER_AUTH_URL`, `NEXT_PUBLIC_APP_URL`                                                        | Web                  | Set both to the canonical HTTPS origin for a custom domain. Render’s service URL supplies the fallback. |
| `S3_REGION`, `S3_BUCKET`, `S3_ACCESS_KEY_ID`, `S3_SECRET_ACCESS_KEY`                            | Shared storage group | Required to upload, preview, process, and delete                                                        |
| `S3_ENDPOINT`, `S3_PATH_STYLE`                                                                  | Shared storage group | Custom endpoint if needed, enable path style for providers that require it                              |
| `GEMINI_EXTRACTION_API_KEY`                                                                     | Web and worker       | Required for uploads and extraction                                                                     |
| `GEMINI_VALIDATION_API_KEY`                                                                     | Worker               | Required for Gemini-assisted validation on eligible plans. Deterministic validation runs independently. |
| `GEMINI_INSIGHTS_API_KEY`                                                                       | Web                  | Required for assistant and AI report summaries                                                          |
| `GEMINI_EXTRACTION_MODEL`, `GEMINI_VALIDATION_MODEL`, `GEMINI_INSIGHTS_MODEL`                   | Relevant service     | Optional model overrides. Defaults to `gemini-3.1-flash-lite`.                                          |
| `GEMINI_VALIDATE_ALL`                                                                           | Worker               | Optional. Defaults to validation only for flagged documents on eligible plans.                          |
| `GEMINI_<PURPOSE>_INPUT_USD_PER_MILLION`, `GEMINI_<PURPOSE>_OUTPUT_USD_PER_MILLION`             | Relevant service     | Optional estimates. Configure pricing for the selected model and update on model changes.               |
| `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `STRIPE_PRO_PRICE_ID`, `STRIPE_BUSINESS_PRICE_ID` | Web                  | Required together for billing                                                                           |
| `RESEND_API_KEY`, `EMAIL_FROM`                                                                  | Web                  | Required together for verification, recovery, and invitations by email                                  |
| `SUPPORT_EMAIL`, `PLATFORM_ADMIN_EMAILS`                                                        | Web                  | Optional support contact and comma-separated verified administrator addresses                           |

Configure a Stripe webhook at `https://YOUR-ORIGIN/api/stripe/webhook` for `customer.subscription.created`, `customer.subscription.updated`, and `customer.subscription.deleted`. Copy the signing secret into the web service. Never reuse a test webhook secret for live mode.

## 3. Migrate and verify

Render’s web pre-deploy command is `npm run db:migrate`. It applies committed changes using `prisma migrate deploy`. The worker can start independently; while the first migration is pending its reconciliation loop retries. For schema changes, test migrations against a staging copy and use backwards-compatible changes for rolling deploys. Production databases are empty on initial deployment. Use the public demo for walkthroughs.

Wait for deploys to show **Live**. Then run the following with your actual origin.

```bash
curl --fail --silent --show-error https://YOUR-ORIGIN/api/health
curl --fail --silent --show-error https://YOUR-ORIGIN/sitemap.xml
```

Register a test workspace, verify the confirmation email, upload a synthetic invoice, and watch the transition to Needs review. Check the private preview and download, correct and approve the extraction, and download both exports. Validate each Gemini purpose using its assigned credentials in the configured plan. Run Stripe test checkout, verify that a valid webhook updates billing, and confirm that the portal opens. Review application and worker logs for errors. Configure retention, monitoring, backups, restore exercises and provider agreements before accepting customer documents.

References: [Render Blueprint](https://render.com/docs/blueprint-spec), [workers](https://render.com/docs/background-workers), [Key Value](https://render.com/docs/key-value), [deploys](https://render.com/docs/deploys), [Gemini structured output](https://ai.google.dev/gemini-api/docs/structured-output), [Better Auth and Next.js](https://better-auth.com/docs/integrations/next).
