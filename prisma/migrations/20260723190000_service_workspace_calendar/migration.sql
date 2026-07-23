CREATE TYPE "ServiceTaskStatus" AS ENUM ('OPEN', 'IN_PROGRESS', 'BLOCKED', 'COMPLETED', 'CANCELLED');

ALTER TABLE "HelpDeskTicket"
  ADD COLUMN "customerId" UUID,
  ADD COLUMN "assignedToId" UUID,
  ADD COLUMN "dueAt" TIMESTAMP(3);

UPDATE "HelpDeskTicket" AS ticket
SET "customerId" = "User"."id"
FROM "User"
WHERE lower(ticket."email") = lower("User"."email");

CREATE TABLE "ServiceTask" (
  "id" UUID NOT NULL,
  "ticketId" UUID,
  "title" TEXT NOT NULL,
  "description" TEXT,
  "status" "ServiceTaskStatus" NOT NULL DEFAULT 'OPEN',
  "priority" TEXT NOT NULL DEFAULT 'NORMAL',
  "dueAt" TIMESTAMP(3),
  "assignedToId" UUID,
  "createdById" UUID NOT NULL,
  "completedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "ServiceTask_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "HelpDeskActivity" (
  "id" UUID NOT NULL,
  "ticketId" UUID NOT NULL,
  "actorId" UUID,
  "type" TEXT NOT NULL,
  "message" TEXT NOT NULL,
  "isInternal" BOOLEAN NOT NULL DEFAULT false,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "HelpDeskActivity_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "HelpDeskTicket_customerId_createdAt_idx" ON "HelpDeskTicket"("customerId", "createdAt");
CREATE INDEX "HelpDeskTicket_assignedToId_status_dueAt_idx" ON "HelpDeskTicket"("assignedToId", "status", "dueAt");
CREATE INDEX "ServiceTask_status_dueAt_idx" ON "ServiceTask"("status", "dueAt");
CREATE INDEX "ServiceTask_assignedToId_status_dueAt_idx" ON "ServiceTask"("assignedToId", "status", "dueAt");
CREATE INDEX "ServiceTask_ticketId_createdAt_idx" ON "ServiceTask"("ticketId", "createdAt");
CREATE INDEX "HelpDeskActivity_ticketId_createdAt_idx" ON "HelpDeskActivity"("ticketId", "createdAt");

ALTER TABLE "HelpDeskTicket" ADD CONSTRAINT "HelpDeskTicket_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "HelpDeskTicket" ADD CONSTRAINT "HelpDeskTicket_assignedToId_fkey" FOREIGN KEY ("assignedToId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "ServiceTask" ADD CONSTRAINT "ServiceTask_ticketId_fkey" FOREIGN KEY ("ticketId") REFERENCES "HelpDeskTicket"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ServiceTask" ADD CONSTRAINT "ServiceTask_assignedToId_fkey" FOREIGN KEY ("assignedToId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "ServiceTask" ADD CONSTRAINT "ServiceTask_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "HelpDeskActivity" ADD CONSTRAINT "HelpDeskActivity_ticketId_fkey" FOREIGN KEY ("ticketId") REFERENCES "HelpDeskTicket"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "HelpDeskActivity" ADD CONSTRAINT "HelpDeskActivity_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
