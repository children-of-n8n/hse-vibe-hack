import { AdventureListPlaceholder } from "./adventure-list-placeholder";

export function AdventureList({ onAdd }: { onAdd: VoidFunction }) {
  return (
    <>
      <AdventureListPlaceholder onAdd={onAdd} />
      <AdventureListPlaceholder onAdd={onAdd} />
      <AdventureListPlaceholder onAdd={onAdd} />
    </>
  );
}
