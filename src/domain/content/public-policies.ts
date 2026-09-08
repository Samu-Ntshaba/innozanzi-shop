export type PublicPolicy = {
  title: string;
  description: string;
  content: string;
};

export const publicPolicies: Record<string, PublicPolicy> = {
  cookies: {
    title: "Cookie Policy",
    description: "Essential storage, optional analytics and how to change your choice.",
    content: `Last updated: 8 September 2026

Essential storage
Our account session cookie lasts up to 30 days and supports authentication. Cart and workflow cookies keep requested shopping functions working. The innozanzi-ai cookie identifies anonymous AI usage for up to 180 days; separate server limits also protect against abuse. These cookies do not grant access to private accounts. The innozanzi-consent cookie remembers essential-only or analytics preferences for 180 days. The separate innozanzi-ad-consent cookie remembers advertising-measurement permission for 180 days. A local-storage copy may support preference updates; the expiring cookie is authoritative. Session storage remembers dismissed prompts for the browser session.

Optional storage
If you choose Allow analytics, Google Analytics uses cookies such as _ga and _ga_* (typically up to two years, depending on provider settings). The innozanzi-rec cookie lasts up to 180 days and connects optional browsing events for product recommendations. Events may be associated with your account when signed in. Transaction and security records needed to operate the service are separate from optional browsing analytics.

Google Ads measurement
If you separately allow Google Ads measurement, Google uses advertising cookies such as _gcl_* (typically up to 90 days, subject to provider settings) to measure advertising performance. We do not enable personalised advertising or send customer contact details through this tag. Analytics permission alone does not enable advertising measurement. Google may process measurement data outside South Africa.

Your control
Optional collection is off until you choose it. Cookie preferences are available on this Cookie Policy page to change your choice. Choosing Essential only disables future optional collection and browsing-history personalisation and clears accessible analytics and advertising cookies and our recommendation cookie. Browser settings can remove remaining cookies, including ones set on other domains. Existing provider records are not automatically erased by withdrawing consent; contact support@innozanzi.co.za for privacy requests.

Other providers
Payment, account-sign-in and other external services may set cookies on their own websites when you choose to use them. Their privacy notices apply to those services. Read our Privacy Policy for processing and cross-border information.`,
  },
  "ai-shopping": {
    title: "AI Shopping Assistance Policy",
    description: "How Innozanzi AI product recommendations work and what customers should verify before purchasing.",
    content: `Last updated: 8 September 2026

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
We limit prompts, use structured shopping intent where practical, and store operational usage data needed for rate limiting, security, cost monitoring and service improvement. We do not need to retain full prompt text for ordinary usage analytics. See our Privacy Policy for more information.

7. AI processing and human help
Shopping prompts and selected catalogue facts are sent to OpenAI to produce suggestions. Do not enter credentials, payment data, identity numbers or sensitive information. AI cannot access your password, payment details or private order records through this shopping feature, and cannot send a product enquiry without you submitting the enquiry form.
When you submit a product request, we send the form and displayed conversation to our support team through our email provider. Signed-in customers use their account contact details; guest details are unverified. Review the conversation before agreeing to share it. A product enquiry is not marketing consent, an order or a stock reservation. Conversation text remains in this page’s memory until you leave or refresh, unless you explicitly submit it with an enquiry.

8. Fair and secure use
Requests are limited to reduce automated abuse and cost. Attempts to override safeguards, extract confidential information, impersonate staff or request unlawful assistance may be rejected. Automated output is not an authoritative instruction to pay, disclose secrets or change banking details. Contact support@innozanzi.co.za to verify anything unexpected.`,
  },
  terms: {
    title: "Terms & Conditions",
    description: "The terms governing use of the Innozanzi online shop, purchases, payments, delivery and customer support.",
    content: `Last updated: 8 September 2026

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
Contact Innozanzi (Pty) Ltd at support@innozanzi.co.za or +27 71 238 4185, or use /contact. You can download your order documents from your account. Contact support if you need a copy or wish to raise a dispute. These terms do not prevent complaints to the National Consumer Commission or an applicable ombud.

14. Online cancellations and consumer remedies
Where section 44 of the Electronic Communications and Transactions Act applies, consumers may cancel a goods transaction without giving a reason within seven days after receipt; only the direct cost of returning the goods may be charged, and payments must be refunded within 30 days of cancellation. Statutory exceptions may apply, including genuinely personalised goods and certain opened software; choosing standard PC components does not automatically remove cancellation rights. Contact support to arrange a return.
Where sections 55 and 56 of the Consumer Protection Act apply and goods fail the applicable quality standards within six months after delivery, the consumer may direct repair, replacement or refund, without penalty and at the supplier’s risk and expense. Assessment establishes the facts; it does not replace a consumer’s statutory choice with a compulsory repair. Manufacturer terms do not reduce these rights.

15. AI and product enquiries
AI suggestions and product enquiries do not place orders, reserve stock or guarantee sourcing. We confirm availability, price and delivery separately. Do not use our systems to seek unlawful products, evade security, impersonate another person, or submit malicious or infringing content. We may restrict abusive use while preserving lawful consumer rights.`,
  },
  privacy: {
    title: "Privacy Policy",
    description: "How Innozanzi collects, uses, protects and manages personal information.",
    content: `Last updated: 8 September 2026

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
Essential cookies support login, security, carts and your saved cookie choice. Google Analytics and optional browsing-based recommendations require the analytics choice. Use Cookie preferences on /policies/cookies to accept, reject or withdraw that choice. Withdrawing stops future optional collection and use; it does not automatically erase previously collected records. You can request deletion where applicable. See /policies/cookies for the inventory and durations.

10. Your choices and rights
Subject to POPIA and lawful limitations, you may ask whether we hold your personal information, request access or correction, object to certain processing, withdraw consent where processing relies on consent, request deletion where retention is no longer lawful, or complain to the Information Regulator. We may need to verify your identity before fulfilling a request.

11. Marketing
You may unsubscribe from marketing messages using the link provided or an available account preference. Service, security, quotation and transaction messages are not marketing and may still be sent when necessary.

12. Children
Our services are intended for adults and organisations. We do not knowingly collect personal information from children without appropriate lawful authority.

13. Updates and enquiries
We may update this policy when our practices or legal obligations change. The current version and date will remain available here. Send privacy, access, correction, objection or deletion requests to support@innozanzi.co.za with the subject “Privacy request”, or use /contact. Do not email identity documents unless we arrange a secure verification method. The Information Regulator’s contact and complaint procedures are available at https://inforegulator.org.za/.

14. AI shopping and product requests
OpenAI processes shopping prompts and limited catalogue facts. We request that API responses are not stored as application response objects; this is not a promise that the provider keeps no security or abuse-monitoring records. Contact details entered in the product-request form are used for human follow-up and are not submitted to the shopping model. The conversation shown in that form is shared only when you agree and submit. Our email provider processes delivery, and the request and transcript are stored in the email outbox and staff mailbox for enquiry handling. Do not include third-party personal information or sensitive data. A product request does not subscribe you to marketing.

15. Google address search and advertising
When you type in delivery address search, the street search text and a temporary search-session identifier are sent through our server to Google Places API (New). We do not send your recipient name, phone or account ID to Places. Google returns address suggestions; after you select and submit one, we keep the delivery details for your order and, if you choose, your address book, together with a Google place identifier. We do not retain suggestion lists. Removing a saved address does not change order records retained for fulfilment and legal purposes. Google address suggestions reduce typing mistakes; they do not verify residence, identity or courier deliverability. Google Maps Platform terms (https://maps.google.com/help/terms_maps/) and Google privacy information (https://policies.google.com/privacy) apply to this service.
Google Ads measurement requires its own optional choice on /policies/cookies. We keep personalised advertising disabled and do not send names, email addresses or delivery addresses through this tag. Google may process service and measurement information internationally as explained in its privacy information.

16. Security and incident handling
Security records and request counters support abuse prevention independently of optional analytics consent. If personal information is compromised, we assess and respond and provide notifications required by POPIA. We review whether information is still required and handle lawful deletion requests across application records and service providers, subject to necessary legal retention.`,
  },
};
