-- Approved library assets are being retired. Keep catalog records, but detach
-- their old media and unpublish entries that can no longer be displayed.
BEGIN;

UPDATE "Product"
SET "state" = CASE WHEN "state" = 'PUBLISHED' THEN 'DRAFT'::"PublishState" ELSE "state" END,
    "publishedAt" = NULL, "isFeatured" = FALSE, "homepageHeroEligible" = FALSE
WHERE "previewMediaId" IN (SELECT "id" FROM "MediaAsset" WHERE "approved" = TRUE)
   OR "primaryTextureId" IN (SELECT "id" FROM "MediaAsset" WHERE "approved" = TRUE)
   OR EXISTS (
     SELECT 1 FROM "ProductImage" AS image
     WHERE image."productId" = "Product"."id"
       AND image."mediaId" IN (SELECT "id" FROM "MediaAsset" WHERE "approved" = TRUE)
   );

UPDATE "Project"
SET "state" = CASE WHEN "state" = 'PUBLISHED' THEN 'DRAFT'::"PublishState" ELSE "state" END, "publishedAt" = NULL
WHERE EXISTS (
  SELECT 1 FROM "ProjectImage" AS image
  WHERE image."projectId" = "Project"."id"
    AND image."mediaId" IN (SELECT "id" FROM "MediaAsset" WHERE "approved" = TRUE)
);

UPDATE "Catalogue"
SET "state" = CASE WHEN "state" = 'PUBLISHED' THEN 'DRAFT'::"PublishState" ELSE "state" END, "publishedAt" = NULL
WHERE "coverId" IN (SELECT "id" FROM "MediaAsset" WHERE "approved" = TRUE)
   OR "pdfId" IN (SELECT "id" FROM "MediaAsset" WHERE "approved" = TRUE);

-- Catalogue media references use RESTRICT rather than SET NULL.
UPDATE "Catalogue" SET "coverId" = NULL
WHERE "coverId" IN (SELECT "id" FROM "MediaAsset" WHERE "approved" = TRUE);
UPDATE "Catalogue" SET "pdfId" = NULL
WHERE "pdfId" IN (SELECT "id" FROM "MediaAsset" WHERE "approved" = TRUE);

UPDATE "Collection"
SET "isFeatured" = FALSE
WHERE "coverMediaId" IN (SELECT "id" FROM "MediaAsset" WHERE "approved" = TRUE)
   OR "heroMediaId" IN (SELECT "id" FROM "MediaAsset" WHERE "approved" = TRUE);

UPDATE "SeoMetadata"
SET "socialImageKey" = NULL
WHERE "socialImageKey" IN (SELECT "storageKey" FROM "MediaAsset" WHERE "approved" = TRUE);

CREATE FUNCTION pg_temp.clear_approved_media_refs(document jsonb, media_ids text[])
RETURNS jsonb
LANGUAGE plpgsql
IMMUTABLE
AS $$
BEGIN
  RETURN CASE jsonb_typeof(document)
    WHEN 'string' THEN CASE WHEN document #>> '{}' = ANY(media_ids) THEN '""'::jsonb ELSE document END
    WHEN 'array' THEN (
      SELECT COALESCE(jsonb_agg(pg_temp.clear_approved_media_refs(item.value, media_ids) ORDER BY item.ordinality), '[]'::jsonb)
      FROM jsonb_array_elements(document) WITH ORDINALITY AS item(value, ordinality)
    )
    WHEN 'object' THEN (
      SELECT COALESCE(jsonb_object_agg(item.key, pg_temp.clear_approved_media_refs(item.value, media_ids)), '{}'::jsonb)
      FROM jsonb_each(document) AS item(key, value)
    )
    ELSE document
  END;
END;
$$;

UPDATE "SiteContent"
SET "payload" = pg_temp.clear_approved_media_refs(
  "payload",
  ARRAY(SELECT "id" FROM "MediaAsset" WHERE "approved" = TRUE)
);

DELETE FROM "ProductImage"
WHERE "mediaId" IN (SELECT "id" FROM "MediaAsset" WHERE "approved" = TRUE);

DELETE FROM "ProjectImage"
WHERE "mediaId" IN (SELECT "id" FROM "MediaAsset" WHERE "approved" = TRUE);

DELETE FROM "MediaAsset" WHERE "approved" = TRUE;

DROP FUNCTION pg_temp.clear_approved_media_refs(jsonb, text[]);
COMMIT;
