-- AlterTable
ALTER TABLE "Collection" ADD COLUMN     "coverMediaId" TEXT,
ADD COLUMN     "heroMediaId" TEXT,
ADD COLUMN     "homepageOrder" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "isFeatured" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "Product" ADD COLUMN     "homepageHeroEligible" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "isFeatured" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "previewMediaId" TEXT,
ADD COLUMN     "primaryTextureId" TEXT;

-- CreateIndex
CREATE INDEX "Collection_state_isFeatured_homepageOrder_idx" ON "Collection"("state", "isFeatured", "homepageOrder");

-- CreateIndex
CREATE INDEX "Collection_coverMediaId_idx" ON "Collection"("coverMediaId");

-- CreateIndex
CREATE INDEX "Collection_heroMediaId_idx" ON "Collection"("heroMediaId");

-- CreateIndex
CREATE INDEX "Product_state_homepageHeroEligible_isFeatured_sortOrder_idx" ON "Product"("state", "homepageHeroEligible", "isFeatured", "sortOrder");

-- CreateIndex
CREATE INDEX "Product_primaryTextureId_idx" ON "Product"("primaryTextureId");

-- CreateIndex
CREATE INDEX "Product_previewMediaId_idx" ON "Product"("previewMediaId");

-- AddForeignKey
ALTER TABLE "Product" ADD CONSTRAINT "Product_primaryTextureId_fkey" FOREIGN KEY ("primaryTextureId") REFERENCES "MediaAsset"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Product" ADD CONSTRAINT "Product_previewMediaId_fkey" FOREIGN KEY ("previewMediaId") REFERENCES "MediaAsset"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Collection" ADD CONSTRAINT "Collection_coverMediaId_fkey" FOREIGN KEY ("coverMediaId") REFERENCES "MediaAsset"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Collection" ADD CONSTRAINT "Collection_heroMediaId_fkey" FOREIGN KEY ("heroMediaId") REFERENCES "MediaAsset"("id") ON DELETE SET NULL ON UPDATE CASCADE;
