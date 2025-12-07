-- Ensure only one reaction exists per adventure.
DELETE FROM "adventure_reactions" ar
WHERE ar.id NOT IN (
  SELECT DISTINCT ON ("adventure_id") ar2.id
  FROM "adventure_reactions" ar2
  ORDER BY ar2."adventure_id", ar2."created_at" DESC, ar2."id" DESC
);

CREATE UNIQUE INDEX IF NOT EXISTS "adventure_reactions_adventure_id_unique"
  ON "adventure_reactions" ("adventure_id");
