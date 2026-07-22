# Production launch checklist

- [ ] Rotate every credential shared outside the password manager, including PostgreSQL.
- [ ] Confirm Railway uses the internal `DATABASE_URL` and the public URL only for maintenance.
- [ ] Run `npx prisma migrate deploy`, `npm test`, `npm run lint`, and `npm run build`.
- [ ] Confirm `/api/health`, `/robots.txt`, and `/sitemap.xml` return successfully.
- [ ] Verify sign-in, checkout, EFT proof upload, quotation, admin moderation, and CSV exports.
- [ ] Configure Paystack/Yoco webhook secrets and test signed, duplicate, and invalid events.
- [ ] Confirm private uploads require ownership or an administrative permission.
- [ ] Verify backups, restore access, error alerts, domain TLS, email delivery, and DNS.
- [ ] Run keyboard, screen-reader, mobile, and reduced-motion checks on critical journeys.
- [ ] Record a Lighthouse baseline: performance >= 80 and accessibility >= 90 on key pages.
