import type { AdventureWithMedia } from "@acme/backend/controllers/contracts/adventure.schemas";

import { AdventureCard } from "./adventure-card";
import { AdventureListPlaceholder } from "./adventure-list-placeholder";

export function AdventureList({
  onAdd,
  adventures,
}: {
  onAdd: VoidFunction;
  adventures?: AdventureWithMedia[];
}) {
  return (
    <>
      <AdventureListPlaceholder onAdd={onAdd} />
      {adventures?.map((adventure) => (
        <AdventureCard isOwn key={adventure.id} adventure={adventure} />
      ))}
    </>
  );
}
