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
    <form onSubmit={submit} className="w-full space-y-6">
      <div className="space-y-2">
        <h1 className="font-semibold text-3xl tracking-tight">Вход</h1>
        <p className="text-muted-foreground text-sm">Войдите в свой аккаунт</p>
      </div>

      <div className="space-y-4">
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
      </div>

      <Button type="submit" className="w-full" disabled={isPending} size="lg">
        {isPending ? (
          <>
            <Spinner className="mr-2 h-4 w-4" />
            Вход…
          </>
        ) : (
          <>Войти</>
        )}
      </Button>
    </form>
  );
}
