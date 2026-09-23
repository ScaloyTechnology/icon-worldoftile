ALTER TABLE "Product"
ADD COLUMN "technicalDescription" TEXT,
ADD COLUMN "technicalMediaId" TEXT;

CREATE INDEX "Product_technicalMediaId_idx" ON "Product"("technicalMediaId");

ALTER TABLE "Product"
ADD CONSTRAINT "Product_technicalMediaId_fkey"
FOREIGN KEY ("technicalMediaId") REFERENCES "MediaAsset"("id")
ON DELETE SET NULL ON UPDATE CASCADE;
