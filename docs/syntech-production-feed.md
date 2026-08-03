# Syntech production feed

Verified against both official JSON endpoints on 3 August 2026.

- Envelope: `syntechstock` with `count`, `currency`, and `products`.
- Full feed: 2,687 products and approximately 15 MB. It supplies names, HTML descriptions, images, category paths, dimensions, weight, attributes, warranty, EAN/model/manufacturer identifiers, stock by Cape Town/Johannesburg/Durban, cost and promotional metadata, shipment ETA, and `last_modified`.
- Update feed: approximately 648 KB. It currently lists 2,687 compact SKU records containing cost/promotion fields, branch stock, shipment ETA, and `last_modified`; it intentionally omits descriptive catalogue fields.

The application stores a refreshable supplier catalogue cache, not duplicate internal `Product` records. Supplier costs and RRP are retained for authorised administration and quotation decisions but are never returned by public catalogue queries. Images remain on Syntech's CDN. Full sync builds or recovers the cache and deactivates absent records. Incremental sync updates commercial and availability fields only, preserving the full-feed descriptive record.

Required deployment secrets are `SYNTECH_FULL_FEED_URL`, `SYNTECH_UPDATE_FEED_URL`, and `CRON_SECRET`. Schedule `POST /api/cron/supplier-sync` with `Authorization: Bearer <CRON_SECRET>` for routine incremental updates.
