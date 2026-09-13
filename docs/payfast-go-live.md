# PayFast live setup

PayFast appears first and is selected by default when configured. Checkout, accepted quotations and unpaid-order retries use the hosted PayFast payment page. Customers enter card details there; the shop does not collect them. Ozow remains available. Manual EFT is removed from new checkout, quotation and retry payment options; existing EFT orders retain their proof review flow.

## Account and Railway variables

1. In the live PayFast dashboard, open **Settings → Developer settings**. Create and save a Security Passphrase (up to 32 characters).
2. In the Railway web service, set:
   - `PAYFAST_ENABLED=true`
   - `PAYFAST_MERCHANT_ID`: the live account merchant ID
   - `PAYFAST_MERCHANT_KEY`: the live account merchant key
   - `PAYFAST_PASSPHRASE`: exactly the passphrase saved in PayFast
   - `PAYFAST_SANDBOX=false`
3. Deploy the code and variable changes.

The passphrase adds a secret salt to payment signatures. PayFast makes it optional for ordinary custom payments, but this integration requires it. Never put it in a public/NEXT_PUBLIC variable or commit it. Sandbox credentials and passphrases belong to a separate sandbox account; sandbox transactions do not move money. Production hides sandbox gateways unless explicitly running a test environment.

## Payment confirmation

The application supplies these URLs automatically:
- Notification (ITN): `https://shop.innozanzi.co.za/api/webhooks/payfast`
- Success/cancel return: payment-specific URLs under `/api/payments/return/`

The ITN endpoint must be publicly reachable without a login or infrastructure challenge. Returning to the store does not mark an order paid: the server checks the signature, merchant, PayFast server validation, reference, amount and currency first.

After deployment, complete a small live purchase and confirm the order becomes paid and the transaction appears in the merchant dashboard. Also cancel a checkout and confirm the unpaid order can be retried. Automated tests use mocked provider responses; they do not establish that live credentials or dashboard settings are correct.

Official references:
- https://support.payfast.help/portal/en/kb/articles/how-do-i-enable-a-passphrase-on-my-payfast-account-20-9-2022
- https://developers.payfast.co.za/documentation/

PayFast documents a R5 minimum for live payments. The application blocks smaller PayFast attempts before creating an order or redirecting, and explains the limit to the customer. Use at least R5 for a live test.
