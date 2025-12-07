import { useQuery } from "@tanstack/react-query";
import { Navigate } from "react-router";

import { usersMeQueryOptions } from "@acme/frontend/entities/user";
import { ThemeToggler } from "@acme/frontend/shared/ui/theme-toggler";
import { AdventureList } from "@acme/frontend/widgets/adventure-list/ui/adventure-list";
import { CurrentUserMenu } from "@acme/frontend/widgets/current-user-menu";

import { BackToTopButton } from "./back-to-top-button";

export function HomePage() {
  const { data: currentUser, isLoading } = useQuery(usersMeQueryOptions);

  if (isLoading) {
    return null;
  }

  if (!currentUser) {
    return <Navigate to="/login" replace />;
  }

  return (
    <div className="relative flex min-h-dvh flex-col gap-4">
      <div className="absolute top-4 right-4 left-4 flex justify-between">
        <ThemeToggler />
        <CurrentUserMenu currentUser={currentUser} />
      </div>

      <AdventureList onAdd={() => {}} />

      <BackToTopButton />
    </div>
  );
}
