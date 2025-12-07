import { useQuery } from "@tanstack/react-query";
import { Navigate } from "react-router";

import { usersMeQueryOptions } from "@acme/frontend/entities/user";
import { Button } from "@acme/frontend/shared/ui/button";
import { ThemeToggler } from "@acme/frontend/shared/ui/theme-toggler";
import { CurrentUserMenu } from "@acme/frontend/widgets/current-user-menu";

export function HomePage() {
  const { data: currentUser, isLoading } = useQuery(usersMeQueryOptions);

  if (isLoading) {
    return null;
  }

  if (currentUser === null) {
    return <Navigate to="/login" replace />;
  }

  return (
    <div className="flex flex-col gap-4 p-4">
      <div className="flex justify-between">
        <ThemeToggler />

        {currentUser && <CurrentUserMenu currentUser={currentUser} />}
      </div>

      {currentUser && <Button>Взять приключение</Button>}
    </div>
  );
}
