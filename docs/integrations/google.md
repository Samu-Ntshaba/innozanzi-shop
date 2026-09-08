# Google integrations

## Configuration

- `NEXT_PUBLIC_GOOGLE_ADS_ID=AW-18425004357` configures the supplied Google Ads base tag. One gtag loader serves GA and Ads. Do not paste another script into the header.
- `GOOGLE_MAPS_API_KEY=""` is the server-only placeholder in local `.env` and `.env.example`. Supply a Google Cloud API **key**, not a Map ID or OAuth client ID. Enable **Places API (New)** and billing in the same project. Also set this variable in Railway and redeploy. It must never have a `NEXT_PUBLIC_` prefix.
- Restrict the key to Places API (New). Where hosting provides fixed outbound IPs, restrict it to those server IPs; browser-referrer restrictions do not work for this server REST integration. Set Google Cloud quotas/budget alerts appropriate to the account. The application caps each user at 60 calls/minute, shared IP bucket at 300/minute and all users at 10,000/day. Budget alerts alone do not cap spend.
- The additive `20260908120000_address_places` migration adds the place identifier to saved addresses and an address snapshot to quotation payment submissions. `npm start` applies migrations before starting Next.js. No data backfill or destructive migration is required.

## Behaviour

Checkout remains usable with required manual South African delivery fields while the key is empty. With a key configured, new delivery addresses must be selected from Google results. Search is limited to South Africa, and complete street number/name, city, supported province and four-digit postal code are required. Places suggestions are not address-validation, identity verification, or a courier serviceability guarantee. If Google lacks a complete result, customers are directed to support; there is no silent verification bypass during an outage.

Requests require authentication, a same-origin JSON request, bounded fields and rate limits. The API key never reaches the browser. A 30-minute signed selection binds returned location fields to the current account. Unit, recipient and phone are supplied separately. Tokens are not stored. Google receives only search text, a temporary session token and place ID, not contact details or account IDs. Suggestion lists are transient; customer-confirmed street details are saved for delivery and a place ID is retained. Old manually saved addresses must be re-added via Google once enabled.

Customers can save up to 20 addresses, choose a default, remove old entries, or add replacement details at `/account/addresses`. Checkout reads saved addresses using both address ID and current user ID. Order addresses are independent snapshots, so removing a saved address does not alter historical orders. New checkout addresses are saved only when the customer selects the save checkbox (up to the account limit).

Accepted quotations also require a saved delivery address before online payment or proof submission. The proof keeps its own address snapshot for order creation. Older pending proofs without a snapshot must be returned for correction and resubmitted with an address before staff can approve them.

## Consent and Ads verification

The existing cookie-policy preferences page now offers a separate Google Ads measurement choice. There is no new global banner. Neither tag loads before an applicable opt-in; an existing analytics choice does not grant advertising consent. Personalised advertising remains denied. Essential only revokes both choices and removes accessible measurement cookies. Contact details, URL query strings, referrer and private path identifiers are excluded from explicit page payloads. Automatic enhanced measurement and user-provided-data settings in the Google dashboard must be reviewed independently; this code does not enable enhanced conversions.

The supplied ID is a **base tag**, not a purchase conversion action. Purchase conversion reporting requires the Google Ads conversion label and a separately implemented deduplicated successful-payment event. No conversion label or conversion claim has been invented.

After supplying a real key, check Google address suggestions and selection in an authenticated test account, save two addresses, select each at checkout, and confirm the Maps project sees successful requests. Use Tag Assistant after granting Ads measurement to verify destination `AW-18425004357`; check denied, analytics-only and Ads-only choices separately. Local tests use mocked provider responses and do not call paid Google APIs or place live orders.

References:
- https://developers.google.com/maps/documentation/places/web-service/place-autocomplete
- https://developers.google.com/maps/documentation/places/web-service/place-details
- https://developers.google.com/maps/documentation/places/web-service/policies
- https://developers.google.com/tag-platform/security/guides/consent
- https://developers.google.com/tag-platform/gtagjs/configure
