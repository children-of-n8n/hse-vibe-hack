import { RegisterForm } from "@acme/frontend/features/register";

import { useRegisterMutation } from "../lib/use-register-mutation";

export function RegisterPage() {
  const { mutateAsync } = useRegisterMutation();

  return <RegisterForm onSubmit={mutateAsync} />;
}
