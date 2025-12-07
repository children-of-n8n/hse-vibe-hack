import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { Navigate } from "react-router";

import type { AdventureWithMedia } from "@acme/backend/controllers/contracts/adventure.schemas";

import { usersMeQueryOptions } from "@acme/frontend/entities/user";
import { api } from "@acme/frontend/shared/config/api";
import { Spinner } from "@acme/frontend/shared/ui/spinner.tsx";
import { ThemeToggler } from "@acme/frontend/shared/ui/theme-toggler";
import { AdventureList } from "@acme/frontend/widgets/adventure-list/ui/adventure-list";
import { CurrentUserMenu } from "@acme/frontend/widgets/current-user-menu";

import { BackToTopButton } from "./back-to-top-button";

export function HomePage() {
  const { data: currentUser, isLoading } = useQuery(usersMeQueryOptions);
  const { data: adventures, isLoading: isAdventuresLoading } = useQuery<
    AdventureWithMedia[]
  >({
    queryKey: ["adventures"],
    queryFn: async () => {
      return (await api.adventures.upcoming.get()).data?.adventures ?? [];
    },
    placeholderData: keepPreviousData,
    refetchOnWindowFocus: false,
    staleTime: Infinity,
  });

  if (isLoading) {
    return null;
  }

  if (!currentUser) {
    return <Navigate to="/login" replace />;
  }

  return (
    <div className="min-h-dvh">
      <div className="fixed top-4 right-4 left-4 z-50 flex justify-between">
        <ThemeToggler />
        <CurrentUserMenu currentUser={currentUser} />
      </div>

      {isAdventuresLoading ? (
        <Spinner
          className={
            "-translate-x-1/2 -translate-y-1/2 absolute top-1/2 left-1/2 size-20 text-primary"
          }
        />
      ) : (
        <AdventureList
          adventures={adventures}
          currentUserId={currentUser.id}
          onAdd={() => {}}
        />
      )}

      <BackToTopButton />
    </div>
  );
}
