import { LoginForm } from "@acme/frontend/features/login";

import { useLoginMutation } from "../lib/use-login-mutation";

export function LoginPage() {
  const { mutateAsync } = useLoginMutation();

  return <LoginForm onSubmit={mutateAsync} />;
}
