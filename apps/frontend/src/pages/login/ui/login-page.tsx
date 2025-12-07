import { useQuery } from "@tanstack/react-query";
import { Link, Navigate } from "react-router";

import { usersMeQueryOptions } from "@acme/frontend/entities/user";
import { LoginForm } from "@acme/frontend/features/login";
import { Button } from "@acme/frontend/shared/ui/button";

export function LoginPage() {
  const { data: currentUser, isLoading } = useQuery(usersMeQueryOptions);

  if (isLoading) {
    return null;
  }

  if (currentUser !== null) {
    return <Navigate to="/" replace />;
  }

  return (
    <div className="flex min-h-screen w-full items-center justify-center px-4 py-12">
      <div className="w-full max-w-sm">
        <div className="mb-12 text-center">
          <h1 className="text font-bold text-5xl text-primary">
            Friendventures
          </h1>
        </div>
        <LoginForm />

        <div className="mt-6 text-center">
          <p className="text-muted-foreground text-sm">
            Нет аккаунта?{" "}
            <Button asChild variant="link" className="h-auto p-0">
              <Link to="/register">Создайте здесь</Link>
            </Button>
          </p>
        </div>
      </div>
    </div>
  );
}
