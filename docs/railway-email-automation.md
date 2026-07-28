# Railway email automation

Create a second Railway service from the same GitHub repository and share the
application's variables with it.

- Start command: `npm run automation:emails`
- Cron schedule: `*/10 * * * *`
- Required variables: `DATABASE_URL`, the active Mailtrap delivery credentials,
  `MAIL_FROM_EMAIL`, `MAIL_FROM_NAME`, and `SUPPORT_EMAIL`

The command retries up to 50 failed transactional emails per run and exits after
completion, as required by Railway Cron Jobs. Each message is attempted at most
five times. Railway evaluates the schedule in UTC.
