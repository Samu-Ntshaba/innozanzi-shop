# Universal business documents

The shared document centre governs formal records that currently exist in the platform: quotations, invoices, delivery notes, customer order confirmations, and RFQ/tender responses. Uploaded source files and delivery evidence retain their existing authorised private-download routes.

## Lifecycle

- A document descriptor reads the underlying record and produces a branded PDF, professional filename, known recipient, subject, message, status and immutable JSON snapshot.
- Draft artifacts may be refreshed until they are issued or successfully sent. Draft PDFs are visibly marked.
- Issued or sent artifacts are returned from `BusinessDocument.content`; they are never silently regenerated from changed record or branding data.
- Every download writes a focused audit event. Every email attempt creates a `DocumentDispatch`, including recipients, CC, message, attachment name, actor, result and failure reason.
- Resending uses the same stored artifact and creates another dispatch record. It never creates another commercial number.
- Production refuses to send any artifact marked as test data. A disposable Test Mode environment additionally requires `TEST_EMAIL_RECIPIENT`, and routes test mail only to that controlled inbox.

## Permissions

- `documents.download`
- `documents.send`
- `documents.history.view`
- `documents.resend`
- `documents.bulk.download`
- `documents.templates.manage`

Viewing a source record does not grant document download or sending rights. Super Administrators manage central company details from `/admin/documents`; all newly generated documents use those settings while historical issued files remain unchanged.

## Extending the registry

Add a type to `BusinessDocumentType`, implement its descriptor in `business-documents.ts`, and render `DocumentActions` on the appropriate record page. The shared download route, reviewed send screen, branded email, immutable storage, audit and history then apply without recreating module-specific infrastructure.

Bulk ZIPs and register CSVs should be added only to list views where a real operational use case and record-level permission filter are defined. The schema permissions are reserved; unrelated or unauthorised records must never be combined.
