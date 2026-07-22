# Production launch checklist

- [ ] Rotate every credential shared outside the password manager, including PostgreSQL.
- [ ] Confirm Railway uses the internal `DATABASE_URL` and the public URL only for maintenance.
- [ ] Run `npx prisma migrate deploy`, `npm test`, `npm run lint`, and `npm run build`.
- [ ] Confirm `/api/health`, `/robots.txt`, and `/sitemap.xml` return successfully.
- [ ] Verify sign-in, quotation-list submission, EFT proof upload, finance approval, fulfilment tracking, admin moderation, and CSV exports.
- [ ] Verify the full quotation-led flow: provisional PDF, final PDF, private proof upload, finance decision, stock reservation, order activation and customer tracking.
- [ ] Schedule the quotation expiry endpoint and verify expired final quotations reject proof upload.
- [ ] Configure Paystack/Yoco webhook secrets and test signed, duplicate, and invalid events.
- [ ] Confirm private uploads require ownership or an administrative permission.
- [ ] Verify backups, restore access, error alerts, domain TLS, email delivery, and DNS.
- [ ] Run keyboard, screen-reader, mobile, and reduced-motion checks on critical journeys.
- [ ] Record a Lighthouse baseline: performance >= 80 and accessibility >= 90 on key pages.
