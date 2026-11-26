# DocFlow AI sales and demo kit

## Product description

DocFlow AI helps teams turn invoices, receipts, and purchase orders into reviewed, searchable records. Upload a batch, check the extracted fields against the source, then approve and export the records or explore spending by vendor and currency.

## Portfolio description

> I built DocFlow AI, a bilingual document intelligence SaaS for freelancers, accounting teams, and operations teams. The product connects private file uploads to background AI extraction, human review and approval, and exportable reporting. The project includes workspace permissions and usage limits, a Stripe billing integration, and a Render deployment Blueprint. The public demo lets you correct and approve a sample invoice without creating an account.

## Features to show

- Batch PDF and image uploads with real progress and persistent processing states
- Structured Gemini extraction, deterministic validation, and source-side review
- Searchable invoices, vendor views, and spending grouped by currency
- CSV, Excel, and printable reports
- Scoped workspaces, roles, invitations, audit events, and billing integration
- English and Arabic RTL layouts, plus light and dark themes

## Suggested screenshots

1. Desktop landing page with the product preview.
2. Demo overview with the activity and spending charts.
3. Split-pane sample invoice review before correction.
4. Approved invoice and updated spending.
5. Arabic demo on a phone, showing right-to-left navigation and review content.

## 75-second walkthrough

- **0–12 seconds** — Open the landing page and select **Explore Demo**. Mention that it uses sample data.
- **12–28 seconds** — Show the Overview and open the Northstar sample invoice.
- **28–48 seconds** — Compare the extracted and original totals, take the amount from the source, and approve.
- **48–66 seconds** — Return to analytics, show the updated total, then export the sample CSV.
- **66–75 seconds** — Switch to Arabic or dark mode. Close with the audience who benefits from the workflow.

## Setup

On a local instance, open `http://localhost:3000/demo`. Reset the demo before each walkthrough. To show real upload state transitions without provider charges, use the isolated local mock instructions in the README and upload a synthetic invoice. Set expectations clearly when the local worker returns fixture data. Use a staging workspace and a synthetic document when demonstrating live integrations.
