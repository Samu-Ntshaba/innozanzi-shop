# User invitations and RFQ operations

Administrators with `users.manage` can invite users from `/admin/access-control`. The invitation assigns one database role, account type, organisation and department. Only a Super Administrator can grant the Super Administrator role. Invited accounts cannot use the application until they sign in with the emailed temporary password and replace it. Temporary passwords expire after 48 hours by default (`USER_INVITATION_EXPIRY_HOURS`, maximum 168).

RFQ and tender work is available at `/admin/rfqs`. Access is controlled by the `rfq.*` permissions and scoped to the signed-in user's company unless the user is a Super Administrator. The workflow records every state change and approval decision.

AI analysis is advisory. Staff paste source text or import readable website content, run analysis, review the structured output and explicitly confirm it. The system does not create confirmed requirements or pricing lines without that human action. Configure `OPENAI_API_KEY` and optionally `OPENAI_MODEL`.

Pricing uses fixed-point Decimal arithmetic. Markup and margin are distinct calculations, cost and selling totals are stored separately, and only users with financial permissions can enter or review pricing. Each approval submission creates an immutable pricing snapshot and a pending approval record.

Before deployment, run:

```sh
npx prisma migrate deploy
npx prisma db seed
npm test
npm run build
```

Keep `DATABASE_URL`, mail credentials and `OPENAI_API_KEY` in Railway variables. Never expose them to the browser.
