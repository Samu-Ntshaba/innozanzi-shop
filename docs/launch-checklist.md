# Production launch checklist — 23 July 2026

## Verified in code/audit

- [x] Prisma schema validates; all five migrations are applied to the configured Railway database.
- [x] Lint, strict TypeScript, unit tests and production build pass.
- [x] Production dependency audit reports zero known vulnerabilities after compatible overrides.
- [x] Protected customer/admin/partner/document routes enforce server ownership or permissions.
- [x] Payment verification is duplicate-resistant and atomically reserves inventory/creates the order.
- [x] Fulfilment transitions are controlled; paid cancellation requires finance-confirmed refund and releases reservations.
- [x] Required email provider failures are fail-closed for submissions and durably retryable.
- [x] Production integrity counts show no known impossible user/inventory/payment/order/expiry states.
- [x] Secrets are not tracked; repository environment values are placeholders.

## Required external/operator confirmation

- [ ] Rotate every credential previously shared outside the password manager.
- [ ] Confirm Railway uses private `DATABASE_URL`; reserve `DATABASE_PUBLIC_URL` for maintenance.
- [ ] Verify `https://shop.innozanzi.co.za/api/health`, `/robots.txt` and `/sitemap.xml` after the final deployment.
- [ ] Schedule daily authenticated `POST /api/cron/expire-quotations` with `CRON_SECRET` and alert on failure.
- [ ] Complete a production-like smoke journey: register/verify, request quote, finalise, upload proof, finance verify, fulfil, deliver and complete.
- [ ] Verify Mailtrap Email Sending domain/DNS, a real external recipient, suppression/bounce logs, and `support@innozanzi.co.za` delivery.
- [ ] Verify Supabase private/public bucket policies and service-key rotation.
- [ ] Confirm Railway backup retention, restore access, log retention and incident-alert ownership.
- [ ] Configure/test Paystack and Yoco only if hosted payment routes will be enabled; EFT does not depend on them.
- [ ] Run keyboard, screen-reader, mobile and reduced-motion checks on identity, quotation, proof and admin fulfilment journeys.
- [ ] Record Lighthouse performance/accessibility baselines on homepage, shop, product and account pages.
