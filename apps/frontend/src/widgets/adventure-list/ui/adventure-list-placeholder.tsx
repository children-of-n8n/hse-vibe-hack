import { ChevronDown, Plus } from "lucide-react";
import { Link } from "react-router";

import { Button } from "@acme/frontend/shared/ui/button";

export function AdventureListPlaceholder({ onAdd }: { onAdd: VoidFunction }) {
  return (
    <div className="relative flex h-screen w-full snap-start snap-always flex-col items-center justify-center">
      <div className="my-auto flex flex-col items-center justify-center">
        <div className="mb-8 flex h-32 w-32 animate-float items-center justify-center rounded-3xl border border-border/30 bg-secondary/50">
          <Plus className="size-12 text-muted-foreground" />
        </div>
        {/* Text */}
        <p className="mb-10 max-w-xs text-lg text-muted-foreground">
          У тебя пока нет приключений
        </p>
        {/* Add button */}
        <Button
          asChild
          size="lg"
          onClick={onAdd}
          className="flex animate-pulse-glow items-center gap-3 rounded-full p-6! text-lg"
        >
          <Link to="/create">
            <span>Взять приключение</span>
            <Plus className="size-8" />
          </Link>
        </Button>
      </div>

      <div className="mb-6 flex flex-col items-center gap-2 text-muted-foreground">
        <p>Приключения друзей</p>

        <ChevronDown className="size-5 animate-bounce" />
      </div>
    </div>
  );
}
