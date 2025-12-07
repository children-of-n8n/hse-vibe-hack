import { zodResolver } from "@hookform/resolvers/zod";
import { useTransition } from "react";
import { Controller, useForm } from "react-hook-form";

import {
  UserPasswordField,
  UserUsernameField,
} from "@acme/frontend/entities/user";
import { Button } from "@acme/frontend/shared/ui/button";
import { Spinner } from "@acme/frontend/shared/ui/spinner";

import {
  type RegisterFormSchemaValues,
  registerFormSchema,
} from "../model/schema";

export function RegisterForm({
  onSubmit,
}: {
  onSubmit?: (values: RegisterFormSchemaValues) => void;
}) {
  const form = useForm<RegisterFormSchemaValues>({
    mode: "onChange",
    resolver: zodResolver(registerFormSchema),
    defaultValues: {
      username: "",
      password: "",
    },
  });

  const [submitting, startSubmitting] = useTransition();

  const submit = form.handleSubmit((values) => {
    startSubmitting(() => {
      onSubmit?.(values);
    });
  });

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

      <Button type="submit" className="w-full" disabled={submitting}>
        {submitting ? (
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
