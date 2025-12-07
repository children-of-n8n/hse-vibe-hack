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
    <div className="min-h-screen">
      <div className="fixed top-4 right-4 left-4 z-10 flex justify-between">
        <ThemeToggler />
        <CurrentUserMenu currentUser={currentUser} />
      </div>

      <AdventureList onAdd={() => {}} />

      <BackToTopButton />
    </div>
  );
}
