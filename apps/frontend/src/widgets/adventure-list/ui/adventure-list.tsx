import type { AdventureWithMedia } from "@acme/backend/controllers/contracts/adventure.schemas";

import { AdventureCard } from "./adventure-card";
import { AdventureListPlaceholder } from "./adventure-list-placeholder";

export function AdventureList({
  onAdd,
  currentUserId,
  adventures,
}: {
  onAdd: VoidFunction;
  currentUserId: string;
  adventures?: AdventureWithMedia[];
}) {
  return (
    <>
      <AdventureListPlaceholder onAdd={onAdd} />
      {adventures?.map((adventure) => (
        <AdventureCard
          isOwn={adventure.creator.id === currentUserId}
          key={adventure.id}
          adventure={adventure}
        />
      ))}
    </>
  );
}
