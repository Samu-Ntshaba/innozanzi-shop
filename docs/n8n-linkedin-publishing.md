# n8n LinkedIn publishing

The recommended workflow prepares one factual product post on weekdays and
requires human approval before LinkedIn publishing. LinkedIn credentials never
enter the shop application.

## Shop configuration

Set `N8N_LINKEDIN_WEBHOOK_SECRET` to a long random value in Railway and use the
same value in n8n's HTTP Header Auth credential. The integration endpoint is:

- `GET /api/integrations/n8n/linkedin` — returns one active, in-stock product,
  its public image/link and a prepared caption.
- `POST /api/integrations/n8n/linkedin` — records `PUBLISHED`, `REJECTED` or
  `FAILED`, including the LinkedIn post ID and URL when available.

Both operations require `Authorization: Bearer <secret>`. Supplier cost and RRP
are never returned. Products published during the previous 90 days are excluded.

## n8n workflow

Import `n8n/innozanzi-linkedin-approval.json`, then configure:

1. An HTTP Header Auth credential containing the shared bearer token.
2. The Innozanzi shop base URL.
3. An email credential and approval recipient.
4. A LinkedIn developer application connected to the Innozanzi company page.
5. LinkedIn OAuth with `w_organization_social` and the company organization URN.

Keep the workflow inactive until the GET request, approval email and a private
test post have all succeeded. Use LinkedIn's current Posts API version header.
The workflow must not publish when approval is absent, expired or rejected.

## Recommended schedule

Start at 08:00 Africa/Johannesburg, Monday to Friday. Review results after four
weeks before increasing frequency. Three daily posts should only be enabled when
three genuinely different content streams exist and repetition checks remain in
place.
