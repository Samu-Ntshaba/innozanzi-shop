# n8n social publishing

The shop is the source of truth for eligible products, campaign focus and publication history. n8n owns schedules, optional AI rewriting, human approval and social-network credentials.

## API contract

Use `Authorization: Bearer <N8N_SOCIAL_WEBHOOK_SECRET>` on both operations:

- `GET /api/integrations/n8n/social?stream=EVERGREEN&channel=LINKEDIN&slot=2026-09-02-AM&format=SINGLE`
- `POST /api/integrations/n8n/social`

GET returns a stable `deliveryId`, verified public assets, campaign direction and a safe baseline caption. Supplier cost and internal stock quantities are never exposed. Retries with the same stream, channel and slot return the same delivery.

POST writes back `APPROVED`, `PUBLISHED`, `REJECTED` or `FAILED`, plus the exact caption and optional `externalId`, `externalUrl` or `error`. Published fingerprints and source products are excluded for 90 days.

## Two n8n workflows

Import `n8n/innonzanzi.json` for evergreen publishing. It runs at 09:00 and 15:00 Africa/Johannesburg on weekdays.

Duplicate it as `Innozanzi · Campaign focus`, choose a separate schedule, and change `stream=EVERGREEN` to `stream=CAMPAIGN`. A 404 means there is no active campaign and should be treated as a clean no-op.

Configure `INNOZANZI_SHOP_URL`, `LINKEDIN_APPROVAL_EMAIL`, `LINKEDIN_ORGANIZATION_URN` and `LINKEDIN_API_VERSION`, plus HTTP Header Auth, Gmail approval and LinkedIn OAuth credentials. Keep publishing disabled until the fetch, approval, image handling and a private LinkedIn test succeed.

## Content generation

The response includes a conservative baseline `caption`. n8n may rewrite it with its own OpenAI credential, but must use the API response as grounded context and must not invent prices, discounts, stock counts, delivery times, specifications, partnerships or performance claims. Send the exact final caption back in the result.

Start with one image per post. `format=CAROUSEL` already returns up to five products, but multi-image LinkedIn publishing requires registering and uploading every asset before creating the post.
