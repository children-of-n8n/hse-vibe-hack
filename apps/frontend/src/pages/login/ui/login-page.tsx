import { useQuery } from "@tanstack/react-query";
import { Link, Navigate } from "react-router";

import { usersMeQueryOptions } from "@acme/frontend/entities/user";
import { LoginForm } from "@acme/frontend/features/login";
import { Button } from "@acme/frontend/shared/ui/button";

import { useLoginMutation } from "../lib/use-login-mutation";

export function LoginPage() {
  const { mutateAsync } = useLoginMutation();
  const { data: currentUser, isLoading } = useQuery(usersMeQueryOptions);

  if (isLoading) {
    return null;
  }

  if (currentUser !== null) {
    return <Navigate to="/" replace />;
  }

  return (
    <div className="flex size-full min-h-dvh min-w-dvw max-w-md p-4">
      <div className="m-auto w-full max-w-md">
        <LoginForm
          onSubmit={async (values) => {
            await mutateAsync(values);
          }}
        />

        <Button asChild className="mt-2 w-full">
          <Link to="/register">Зарегистрироваться</Link>
        </Button>
      </div>
    </div>
  );
}
