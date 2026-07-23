# Isolated production Test Mode

Test Mode uses the same application build and UI as production but runs as a
second deployment with a separate disposable PostgreSQL database. This is an
intentional safety boundary: no dynamic flag or query filter can accidentally
mix test customers with live customers.

## Deployment configuration

Create a second Railway application service from the same repository and give
it a separate PostgreSQL service and hostname, for example
`https://test.shop.innozanzi.co.za`.

On the live deployment set:

```text
TEST_MODE_URL=https://test.shop.innozanzi.co.za
```

On the isolated test deployment set:

```text
TEST_MODE_ENVIRONMENT=true
TEST_MODE_DELETION_GUARD=INNOZANZI_DISPOSABLE_TEST_DATABASE
LIVE_DATABASE_URL=<the live database URL, used only for a non-equality guard>
DATABASE_URL=<the separate test database URL>
NEXT_PUBLIC_SITE_URL=https://test.shop.innozanzi.co.za
```

Use Mailtrap Sandbox or dedicated non-customer recipient controls on the test
deployment. Never configure real customer mailing lists there.

Apply migrations and bootstrap a super administrator on the isolated database.
Do not run the Test Mode deletion guard on the live service.

## Operating procedure

1. A super administrator opens Admin → Test Mode on the live service.
2. The control links to the isolated deployment.
3. Select **Generate complete test dataset**. The progress indicator runs
   through cleanup, catalogue, customer, commercial and operations phases.
4. Browse the test storefront or sign in as:
   `test.customer@innozanzi.local` / `TestMode!2026`.
5. All registrations and operations performed on that deployment remain in the
   separate database automatically.
6. Select **Clear test data** to remove business/test records while preserving
   staff access, roles, permissions, departments and system settings.

Cleanup requires all of the following:

- the authenticated user is a super administrator;
- `TEST_MODE_ENVIRONMENT=true`;
- the deletion guard matches the exact expected phrase;
- `DATABASE_URL` exists;
- when supplied, `LIVE_DATABASE_URL` differs from `DATABASE_URL`.

The Test Mode deployment emits a persistent amber banner and uses `noindex,
nofollow` metadata.
