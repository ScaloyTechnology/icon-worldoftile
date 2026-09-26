-- Remove legacy Product fields that belonged to the retired technical/category features.
ALTER TABLE "Product"
  DROP COLUMN IF EXISTS "applicationDescription",
  DROP COLUMN IF EXISTS "technicalDescription",
  DROP COLUMN IF EXISTS "technicalMediaId",
  DROP COLUMN IF EXISTS "categoryId";

-- Remove empty relationship and feature tables that have no active workflow.
DROP TABLE IF EXISTS "ApplicationCollection";
DROP TABLE IF EXISTS "CatalogueCollection";
DROP TABLE IF EXISTS "Certification";
DROP TABLE IF EXISTS "Location";
DROP TABLE IF EXISTS "ProductApplication";
DROP TABLE IF EXISTS "ProductDocument";
DROP TABLE IF EXISTS "ProductSpecification";
DROP TABLE IF EXISTS "SpecificationDefinition";
DROP TABLE IF EXISTS "VariantAttribute";
DROP TABLE IF EXISTS "ProjectCollection";
DROP TABLE IF EXISTS "ProjectProduct";
DROP TABLE IF EXISTS "ProductCategory";
