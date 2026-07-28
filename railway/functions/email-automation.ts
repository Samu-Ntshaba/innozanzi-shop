import postgres from "postgres@3.4.7";

const databaseUrl = process.env.DATABASE_URL;
const mailtrapToken = process.env.MAILTRAP_API_TOKEN;
const batchSize = Math.min(Math.max(Number(process.env.EMAIL_AUTOMATION_BATCH_SIZE ?? 50), 1), 100);

if (!databaseUrl) throw new Error("DATABASE_URL is required.");
if (!mailtrapToken) throw new Error("MAILTRAP_API_TOKEN is required.");

const sql = postgres(databaseUrl, { max: 1, idle_timeout: 5, connect_timeout: 10 });

try {
  const rows = await sql`
    SELECT "id", "subject", "body", "data"
    FROM "Notification"
    WHERE "type" = 'EMAIL_OUTBOX'
      AND "status" = 'FAILED'
      AND COALESCE(("data"->>'retryAttempts')::int, 0) < 5
    ORDER BY "updatedAt" ASC
    LIMIT ${batchSize}
  `;
  let sent = 0;
  let failed = 0;
  for (const row of rows) {
    const data = row.data as Record<string, unknown>;
    const attempts = typeof data.retryAttempts === "number" ? data.retryAttempts : Number(data.retryAttempts ?? 0);
    if (typeof data.to !== "string" || typeof data.text !== "string" || typeof data.idempotencyKey !== "string") continue;
    try {
      const response = await fetch("https://send.api.mailtrap.io/api/send", {
        method: "POST",
        headers: { Authorization: `Bearer ${mailtrapToken}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          from: data.from ?? {
            email: process.env.MAIL_FROM_EMAIL ?? "support@innozanzi.co.za",
            name: process.env.MAIL_FROM_NAME ?? "Innozanzi Shop",
          },
          to: [{ email: data.to }],
          cc: Array.isArray(data.cc) ? data.cc.map((email) => ({ email })) : undefined,
          subject: row.subject ?? "Innozanzi notification",
          text: data.text,
          html: row.body,
          category: data.category ?? "transactional",
          custom_variables: { idempotency_key: data.idempotencyKey },
        }),
      });
      const result = await response.json() as { message_ids?: string[]; errors?: Array<{ message?: string }> };
      if (!response.ok) throw new Error(result.errors?.[0]?.message ?? `Mailtrap returned ${response.status}`);
      await sql`
        UPDATE "Notification"
        SET "status" = 'SENT', "sentAt" = CURRENT_TIMESTAMP, "error" = NULL,
            "updatedAt" = CURRENT_TIMESTAMP,
            "data" = ${sql.json({ ...data, retryAttempts: attempts + 1, lastRetryAt: new Date().toISOString(), messageId: result.message_ids?.[0], deliveryMode: "api" })}
        WHERE "id" = ${row.id}
      `;
      sent += 1;
    } catch (error) {
      await sql`
        UPDATE "Notification"
        SET "error" = ${error instanceof Error ? error.message.slice(0, 2000) : "Email retry failed"},
            "updatedAt" = CURRENT_TIMESTAMP,
            "data" = ${sql.json({ ...data, retryAttempts: attempts + 1, lastRetryAt: new Date().toISOString() })}
        WHERE "id" = ${row.id}
      `;
      failed += 1;
    }
  }
  console.log(JSON.stringify({ checked: rows.length, sent, failed }));
  if (failed) process.exitCode = 1;
} finally {
  await sql.end();
}
