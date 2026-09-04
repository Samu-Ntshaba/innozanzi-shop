export type PublicPolicy = {
  title: string;
  description: string;
  content: string;
};

export const publicPolicies: Record<string, PublicPolicy> = {
  "ai-shopping": {
    title: "AI Shopping Assistance Policy",
    description: "How Innozanzi AI product recommendations work and what customers should verify before purchasing.",
    content: `Last updated: 4 September 2026

1. Purpose
Innozanzi AI provides informational shopping assistance based on product information available in the Innozanzi Shop catalogue. It is designed to help customers find relevant products and possible PC configurations; it is not professional engineering or technical advice.

2. Product facts, pricing and stock
The platform confirms product identifiers, current selling prices and stock through the normal catalogue and checkout systems. Availability and pricing can change. Adding a recommendation to a cart does not reserve stock.

3. PC compatibility
Where supported, platform compatibility rules validate PC component combinations and override generated wording. Customers should still review the full manufacturer specifications, physical clearances, firmware support, power requirements and included accessories before purchase.

4. Limitations
AI may occasionally misunderstand a request or produce an incorrect recommendation. Recommendations use the information supplied to the system and may omit a requirement that is not present in the catalogue data. Final product specifications must be reviewed before purchase.

5. Purchases, returns and warranties
Normal Innozanzi Shop checkout, payment, returns and warranty terms apply to products selected with AI assistance. AI assistance does not create a separate guarantee or change a manufacturer warranty.

6. Information and retention
We limit prompts, use structured shopping intent where practical, and store operational usage data needed for rate limiting, security, cost monitoring and service improvement. We do not need to retain full prompt text for ordinary usage analytics. See our Privacy Policy for more information.`,
  },
  terms: {
    title: "Terms & Conditions",
    description: "The terms governing use of the Innozanzi online shop, purchases, payments, delivery and customer support.",
    content: `Last updated: 27 August 2026

1. About these terms
These terms apply when you use shop.innozanzi.co.za, create an account, buy a product, build a PC, or ask Innozanzi (Pty) Ltd (“Innozanzi”, “we”, “us” or “our”) for help. By placing an order, you agree to these terms. A separate written quotation or agreement applies only where you specifically request and accept one.

2. Website information
We take reasonable care to keep product descriptions, images and availability accurate. Images may be illustrative and colours may differ between displays. Website content does not constitute a binding offer and may be corrected or updated without notice.

3. Orders
Products shown on the website may be held by a distributor rather than at an Innozanzi location. Adding a product to your cart does not reserve it. After checkout, we verify payment, price and availability before fulfilment. We accept an order when payment is verified and fulfilment begins. If price or availability changed before acceptance, we will explain the options and may offer a revised price, suitable alternative, waiting period or refund. We will not substitute a product without your agreement.

4. Pricing and payment
The checkout shows the product price, VAT and delivery charges that apply to the order. Supplier prices and stock can change, and the website is refreshed regularly, but an obvious pricing error does not require us to supply at the incorrect price. Paystack processes online payments. For bank transfers, use only the details shown during checkout or on your order confirmation, and use the order number as reference. We will never notify you of changed banking details only by email; verify any requested change with us through an independently confirmed channel before paying.

5. Availability and substitutions
Stock remains subject to confirmation until the order is accepted. If an item becomes unavailable, we may propose a comparable alternative, revised lead time or refund. We will not substitute a product without your approval.

6. Delivery and collection
We use independent courier and delivery partners; Innozanzi does not represent that couriers are our employees. We remain your point of contact for the order. Delivery estimates are not guaranteed unless expressly agreed in writing. Unless another period is agreed, orders will be handled within the period required by applicable law. You must provide a complete delivery address and ensure an authorised person can receive the order. Please record visible damage or shortages on delivery and notify us as soon as reasonably possible.

7. Cancellations, returns and warranties
Cancellations and returns are handled under our Returns and Product Assistance Policy and applicable South African law. Manufacturer or supplier warranty terms may apply to particular products. Nothing in these terms limits a right or remedy that cannot lawfully be excluded.

8. Accounts and acceptable use
You are responsible for keeping your login details secure and for activity performed through your account. You may not misuse the website, interfere with its operation, attempt unauthorised access, upload harmful material or use its content unlawfully.

9. Intellectual property
The website, branding, layout and original content belong to Innozanzi or its licensors. You may use the website for legitimate personal or business procurement purposes, but may not reproduce or commercially exploit its content without permission.

10. Liability
To the extent permitted by law, neither party is liable for indirect or consequential loss that was not reasonably foreseeable. Our liability is not excluded where exclusion is prohibited by law, including liability arising from fraud, gross negligence or rights protected by applicable consumer legislation.

11. Privacy
We process personal information as described in our Privacy Policy and in accordance with applicable data-protection law.

12. Changes and governing law
We may update these terms prospectively by publishing a revised version and date. South African law governs these terms, and disputes are subject to the jurisdiction of the competent South African courts unless the parties agree to another lawful resolution process.

13. Contact
Questions about these terms may be submitted through the Help option on the website or the contact details shown on an official Innozanzi quotation or invoice.`,
  },
  privacy: {
    title: "Privacy Policy",
    description: "How Innozanzi collects, uses, protects and manages personal information.",
    content: `Last updated: 24 July 2026

1. Our commitment
Innozanzi (Pty) Ltd respects your privacy and processes personal information responsibly in accordance with the Protection of Personal Information Act, 2013 (“POPIA”) and other applicable South African law.

2. Information we collect
Depending on how you interact with us, we may collect your name, contact details, account credentials, company and VAT information, delivery and billing details, quotation and order history, support communications, uploaded documents, website activity, device information and security logs. Payment providers may process payment details; we do not intentionally store complete card details on our website.

3. How we collect information
We receive information directly from you when you register, request a quotation, place an order, contact support, subscribe to updates or submit documents. We may also receive information from authorised representatives, service providers, distributors, fraud-prevention services and normal website technologies such as cookies and server logs.

4. Why we use information
We use personal information to provide accounts and services; prepare and manage quotations, orders, delivery, returns and support; communicate service updates; verify identity and business details; prevent fraud and protect our systems; meet tax, accounting and legal duties; improve our website; and send marketing only where permitted. Where required, processing is based on consent, contract, legal obligation or a legitimate business purpose that does not unjustifiably infringe your rights.

5. Sharing information
We may share relevant information with distributors, couriers, installers, payment and hosting providers, professional advisers, communication providers and authorities where necessary to provide services or comply with law. Providers are expected to protect information and use it only for authorised purposes. We do not sell personal information.

6. Cross-border processing
Some service providers may process information outside South Africa. Where this occurs, we use reasonable contractual, technical and organisational safeguards and require an appropriate level of protection as contemplated by applicable law.

7. Retention
We keep information only as long as needed for the purpose collected, contractual and support requirements, dispute management, security and legal record-keeping. Information is securely deleted or de-identified when it is no longer required.

8. Security
We use reasonable administrative, technical and physical safeguards designed to prevent loss, misuse, unauthorised access or disclosure. No internet service can guarantee absolute security. Please protect your password and notify us promptly if you suspect unauthorised account activity.

9. Cookies and analytics
The website may use essential cookies for login, security, cart and preference functions, as well as limited analytics or performance technologies. Browser settings can restrict cookies, although essential website functions may then be unavailable.

10. Your choices and rights
Subject to POPIA and lawful limitations, you may ask whether we hold your personal information, request access or correction, object to certain processing, withdraw consent where processing relies on consent, request deletion where retention is no longer lawful, or complain to the Information Regulator. We may need to verify your identity before fulfilling a request.

11. Marketing
You may unsubscribe from marketing messages using the link provided or an available account preference. Service, security, quotation and transaction messages are not marketing and may still be sent when necessary.

12. Children
Our services are intended for adults and organisations. We do not knowingly collect personal information from children without appropriate lawful authority.

13. Updates and enquiries
We may update this policy when our practices or legal obligations change. The current version and date will remain available here. Privacy questions or requests may be submitted through the Help option on the website or the contact details shown on an official Innozanzi document. You may also contact South Africa’s Information Regulator if you believe your rights have not been appropriately addressed.`,
  },
};
