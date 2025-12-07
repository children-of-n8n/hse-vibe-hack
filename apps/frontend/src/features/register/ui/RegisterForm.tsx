import { zodResolver } from "@hookform/resolvers/zod";
import { Controller, useForm } from "react-hook-form";

import {
  UserPasswordField,
  UserUsernameField,
} from "@acme/frontend/entities/user";
import { Button } from "@acme/frontend/shared/ui/button";
import { Spinner } from "@acme/frontend/shared/ui/spinner";

import { useRegisterMutation } from "../lib/use-register-mutation";
import {
  type RegisterFormSchemaValues,
  registerFormSchema,
} from "../model/schema";

export function RegisterForm() {
  const form = useForm<RegisterFormSchemaValues>({
    mode: "onChange",
    resolver: zodResolver(registerFormSchema),
    defaultValues: {
      username: "",
      password: "",
    },
  });

  const { mutateAsync, isPending } = useRegisterMutation();

  const submit = form.handleSubmit(async (values) => await mutateAsync(values));

  return (
    <form onSubmit={submit} className="flex flex-col gap-4">
      <h1>Регистрация</h1>

      <Controller
        control={form.control}
        name="username"
        render={UserUsernameField}
      />
      <Controller
        control={form.control}
        name="password"
        render={UserPasswordField}
      />

      <Button type="submit" className="w-full" disabled={isPending}>
        {isPending ? (
          <>
            <Spinner />
            Регистрация…
          </>
        ) : (
          <>Зарегистрироваться</>
        )}
      </Button>
    </form>
  );
}
