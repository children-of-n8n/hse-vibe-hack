import type {
  ControllerFieldState,
  ControllerRenderProps,
  FieldValues,
  Path,
} from "react-hook-form";

import { Field, FieldError, FieldLabel } from "@acme/frontend/shared/ui/field";
import { Input } from "@acme/frontend/shared/ui/input";

export function UserUsernameField<T extends FieldValues>({
  field,
  fieldState,
}: {
  field: ControllerRenderProps<T, Path<T>>;
  fieldState: ControllerFieldState;
}) {
  return (
    <Field data-invalid={fieldState.invalid}>
      <FieldLabel htmlFor="username">Имя пользователя</FieldLabel>
      <Input
        {...field}
        id="username"
        placeholder="Введите имя пользователя…"
        aria-invalid={fieldState.invalid}
      />
      {fieldState.error && <FieldError errors={[fieldState.error]} />}
    </Field>
  );
}
