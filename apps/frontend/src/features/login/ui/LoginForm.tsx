import { zodResolver } from "@hookform/resolvers/zod";
import { Controller, useForm } from "react-hook-form";

import {
  UserPasswordField,
  UserUsernameField,
} from "@acme/frontend/entities/user";
import { Button } from "@acme/frontend/shared/ui/button";
import { Spinner } from "@acme/frontend/shared/ui/spinner";

import { useLoginMutation } from "../lib/use-login-mutation";
import { type LoginFormSchemaValues, loginFormSchema } from "../model/schema";

export function LoginForm() {
  const form = useForm<LoginFormSchemaValues>({
    mode: "onChange",
    resolver: zodResolver(loginFormSchema),
    defaultValues: {
      username: "",
      password: "",
    },
  });

  const { mutateAsync, isPending } = useLoginMutation();

  const submit = form.handleSubmit(async (values) => await mutateAsync(values));

  return (
    <form onSubmit={submit} className="flex flex-col gap-4">
      <h1>Вход</h1>

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
            Вход…
          </>
        ) : (
          <>Войти</>
        )}
      </Button>
    </form>
  );
}
