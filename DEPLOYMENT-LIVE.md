# DocFlow AI — Live Render + Neon deployment

Live preview: https://docflow-ai-live.onrender.com
Interactive, browser-only demo: https://docflow-ai-live.onrender.com/demo

## Provisioned infrastructure (26 Nov 2026)

- Render web service: `docflow-ai-live` (Frankfurt, Free)
- Render Key Value: `docflow-ai-queue` (Frankfurt, Free)
- Neon project: `DocFlow AI Production` (Frankfurt)
- Neon branch: `main`, database: `docflow`
- Neon Storage private bucket: `docflow-private`
- Prisma migrations have been applied to the Neon database.

## Enable authenticated workspaces and file processing

The service currently has no `DATABASE_URL` or S3 storage credentials. These secrets **must be copied by the account owner directly into Render**; never put them into source control.

1. In Neon Console, open **DocFlow AI Production > Connect**. Copy the **pooled PostgreSQL** connection string for database `docflow`.
2. In Render > docflow-ai-live > Environment, add `DATABASE_URL` using that string.
3. In Neon Console > DocFlow AI Production > Connect > Storage (S3 client), reveal the credential for bucket `docflow-private`. Copy `AWS_ACCESS_KEY_ID` to Render as `S3_ACCESS_KEY_ID` and `AWS_SECRET_ACCESS_KEY` as `S3_SECRET_ACCESS_KEY`.
4. Render is already configured with `S3_ENDPOINT`, `S3_REGION`, `S3_BUCKET`, `S3_PATH_STYLE=true`, `REDIS_URL`, `BETTER_AUTH_SECRET`, `BETTER_AUTH_URL`, and the three dedicated Gemini keys.
5. Allow the resulting Render deploy to complete. Verify `/api/health` returns `{"status":"ok"}` and register a test account.
6. Test one synthetic invoice upload and watch for `NEEDS_REVIEW`. Approve it and export CSV/XLSX.
7. If the worker reports connection failures, check the internal Redis connection string in Render and correct `REDIS_URL`.

The `npm start` script runs the Next.js server and starts the document worker when the required environment variables exist. Set `DOCFLOW_WEB_ONLY=true` to disable embedded worker when deploying a separate production worker.

## Commercial launch limitations

This deployment is a **free-plan preview**, not production-ready for paid customers. Render's free web services can sleep, the free Key Value instance is not persistent, and running a worker on a web instance is an MVP convenience. For commercial operation, move to paid always-on web + dedicated worker + durable queue, add monitoring, backups and uptime checks, verify billing/email providers, and test isolation and failure recovery.

Rotate Gemini credentials that were shared in conversation before inviting actual customers. Validate all three keys against the official Gemini API; no successful live AI extraction is implied by their configuration.

Never put secret credential values into Git, issues, docs, or public support requests.
