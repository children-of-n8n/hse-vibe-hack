import { useQuery } from "@tanstack/react-query";
import { Link, Navigate } from "react-router";

import { usersMeQueryOptions } from "@acme/frontend/entities/user";
import { RegisterForm } from "@acme/frontend/features/register";
import { Button } from "@acme/frontend/shared/ui/button";

import { useRegisterMutation } from "../lib/use-register-mutation";

export function RegisterPage() {
  const { mutateAsync } = useRegisterMutation();
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
        <RegisterForm onSubmit={mutateAsync} />
        <Button asChild className="mt-2 w-full">
          <Link to="/login">К форме входа</Link>
        </Button>
      </div>
    </div>
  );
}
