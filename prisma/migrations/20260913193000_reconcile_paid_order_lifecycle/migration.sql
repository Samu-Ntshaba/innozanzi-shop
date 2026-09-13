UPDATE "Order" AS orders
SET
  "paymentStatus" = 'PAID',
  "status" = 'PAYMENT_VERIFIED',
  "placedAt" = COALESCE(orders."placedAt", paid."paidAt", CURRENT_TIMESTAMP),
  "updatedAt" = CURRENT_TIMESTAMP
FROM (
  SELECT "orderId", MAX("paidAt") AS "paidAt"
  FROM "Payment"
  WHERE "status" = 'PAID'
  GROUP BY "orderId"
) AS paid
WHERE orders.id = paid."orderId"
  AND orders."status" IN ('DRAFT', 'PENDING', 'AWAITING_PAYMENT', 'PAYMENT_UNDER_REVIEW', 'PAID');
