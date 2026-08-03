CREATE TABLE "SupplierCartItem" ("id" UUID NOT NULL,"cartId" UUID NOT NULL,"supplierId" UUID NOT NULL,"supplierProductId" TEXT NOT NULL,"supplierSku" TEXT NOT NULL,"quantity" INTEGER NOT NULL,"createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,"updatedAt" TIMESTAMP(3) NOT NULL,CONSTRAINT "SupplierCartItem_pkey" PRIMARY KEY ("id"));
CREATE UNIQUE INDEX "SupplierCartItem_cartId_supplierId_supplierProductId_key" ON "SupplierCartItem"("cartId","supplierId","supplierProductId");
CREATE INDEX "SupplierCartItem_supplierId_supplierProductId_idx" ON "SupplierCartItem"("supplierId","supplierProductId");
ALTER TABLE "SupplierCartItem" ADD CONSTRAINT "SupplierCartItem_cartId_fkey" FOREIGN KEY ("cartId") REFERENCES "Cart"("id") ON DELETE CASCADE ON UPDATE CASCADE;
