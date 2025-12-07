-- Move reactions from photo-level to adventure-level
ALTER TABLE "adventure_reactions"
  ADD COLUMN "adventure_id" uuid;

ALTER TABLE "adventure_reactions"
  DROP CONSTRAINT IF EXISTS "adventure_reactions_photo_id_adventure_photos_id_fk";

UPDATE "adventure_reactions" ar
SET "adventure_id" = ap."adventure_id"
FROM "adventure_photos" ap
WHERE ar."photo_id" = ap."id";

ALTER TABLE "adventure_reactions"
  ALTER COLUMN "adventure_id" SET NOT NULL;

ALTER TABLE "adventure_reactions"
  ADD CONSTRAINT "adventure_reactions_adventure_id_adventures_id_fk"
    FOREIGN KEY ("adventure_id") REFERENCES "public"."adventures"("id") ON DELETE cascade ON UPDATE no action;

ALTER TABLE "adventure_reactions"
  DROP COLUMN IF EXISTS "photo_id";
