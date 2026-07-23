# Next operational priorities

The core quotation-to-delivery tracker, department-routed ticketing centre and
shared operational calendar are now implemented. The next highest-value
production increments are:

1. Support attachments with private, permission-checked storage.
2. SLA policies by ticket priority, automated overdue escalation and queue
   response-time reporting.
3. Inbound email ingestion so replies to support email append to the existing
   ticket instead of creating a separate conversation.
4. Courier-provider integrations for automatic tracking events, while keeping
   the current manual status control as a fallback.
5. Delivery confirmation evidence: recipient name, timestamp, signature/photo
   and exception handling.
6. Calendar week/day views, staff assignment filters and optional iCalendar
   export.
7. An in-application notification centre for staff assignments, overdue work
   and approvals in addition to email.

These are additive improvements. They must preserve ownership checks, private
internal notes, fail-closed required email behaviour, audited transitions and
the existing deterministic financial workflow.
