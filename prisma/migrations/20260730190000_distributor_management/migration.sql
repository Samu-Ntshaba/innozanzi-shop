ALTER TABLE "Supplier"
  ADD COLUMN "registrationNo" TEXT,
  ADD COLUMN "vatNo" TEXT,
  ADD COLUMN "accountsContact" TEXT,
  ADD COLUMN "accountsEmail" TEXT,
  ADD COLUMN "accountsPhone" TEXT,
  ADD COLUMN "physicalAddress" TEXT,
  ADD COLUMN "branchAddress" TEXT;

CREATE TABLE "SupplierDocument" (
  "id" UUID NOT NULL,
  "supplierId" UUID NOT NULL,
  "documentId" UUID NOT NULL,
  "type" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "expiryDate" TIMESTAMP(3),
  "notes" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "SupplierDocument_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "SupplierDocument_documentId_key" ON "SupplierDocument"("documentId");
CREATE INDEX "SupplierDocument_supplierId_createdAt_idx" ON "SupplierDocument"("supplierId","createdAt");
CREATE INDEX "SupplierDocument_type_expiryDate_idx" ON "SupplierDocument"("type","expiryDate");
ALTER TABLE "SupplierDocument" ADD CONSTRAINT "SupplierDocument_supplierId_fkey" FOREIGN KEY ("supplierId") REFERENCES "Supplier"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "SupplierDocument" ADD CONSTRAINT "SupplierDocument_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "UploadedDocument"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

INSERT INTO "Supplier" (
  "id","companyName","registrationNo","vatNo","contactPerson","email","phone",
  "accountsContact","accountsEmail","accountsPhone","paymentTerms","website",
  "physicalAddress","branchAddress","notes","isActive","createdAt","updatedAt"
)
VALUES (
  '86000000-0000-4000-8000-000000000001',
  'Syntech Distribution (Pty) Ltd',
  '2017/402129/07',
  '4950206773',
  'Syntech Sales',
  'info@syntech.co.za',
  '021 514 5300',
  'Bernadette Rose',
  'accounts@syntech.co.za',
  '+27 (0) 21 514 5306',
  'COD: cleared payment required before invoicing or stock release. EFT accepted for delivery orders; collection also supports qualifying cash/card payments subject to policy.',
  'https://www.syntech.co.za',
  'Unit 1, 4 Tanzanite Street, Montague Park, Cape Town, 7441',
  '5 Landmarks Avenue, Samrand Business Park, Kosmosdal Extension 12, Samrand, 0157',
  'Distributor details captured from the supplied COD Payment Policy. Johannesburg telephone: 011 053 1900. Confirmation of payment must be sent to accounts@syntech.co.za. Bank details remain in the private policy document and are intentionally not duplicated here.',
  true,
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP
)
ON CONFLICT ("id") DO UPDATE SET
  "companyName"=EXCLUDED."companyName",
  "registrationNo"=EXCLUDED."registrationNo",
  "vatNo"=EXCLUDED."vatNo",
  "contactPerson"=EXCLUDED."contactPerson",
  "email"=EXCLUDED."email",
  "phone"=EXCLUDED."phone",
  "accountsContact"=EXCLUDED."accountsContact",
  "accountsEmail"=EXCLUDED."accountsEmail",
  "accountsPhone"=EXCLUDED."accountsPhone",
  "paymentTerms"=EXCLUDED."paymentTerms",
  "website"=EXCLUDED."website",
  "physicalAddress"=EXCLUDED."physicalAddress",
  "branchAddress"=EXCLUDED."branchAddress",
  "notes"=EXCLUDED."notes",
  "isActive"=true,
  "deletedAt"=NULL,
  "updatedAt"=CURRENT_TIMESTAMP;
