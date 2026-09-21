# Railway email automation

Create a second Railway service from the same GitHub repository using
`railway.payment-email-cron.json` and share the application's variables with it.

- Start command: `npm run automation:emails`
- Cron schedule: `*/10 * * * *`
- Required variables: `DATABASE_URL`, `NEXT_PUBLIC_SITE_URL`, `CRON_SECRET`, the
  active Mailtrap delivery credentials, `MAIL_FROM_EMAIL`, `MAIL_FROM_NAME`, and
  `SUPPORT_EMAIL`

The command first runs authenticated hosted-payment reconciliation, then retries
durable paid-order communication and up to 50 failed transactional emails. It
exits after completion, as required by Railway Cron Jobs. Each email is attempted
at most five times. Railway evaluates the schedule in UTC.
