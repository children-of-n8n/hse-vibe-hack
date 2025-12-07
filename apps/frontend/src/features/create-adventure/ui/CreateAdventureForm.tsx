import { zodResolver } from "@hookform/resolvers/zod";
import { useTransition } from "react";
import {
  Controller,
  type DefaultValues,
  type SubmitHandler,
  useForm,
} from "react-hook-form";
import { z } from "zod";

import { Button } from "@acme/frontend/shared/ui/button";
import { Card, CardContent, CardFooter } from "@acme/frontend/shared/ui/card";
import { FieldGroup } from "@acme/frontend/shared/ui/field";
import { Spinner } from "@acme/frontend/shared/ui/spinner";

import { CreateAdventureFormFormatField } from "./CreateAdventureFormFormatField";

export const createAdventureFormSchema = z.object({
  format: z.enum(["online", "offline"]),
});

export type CreateAdventureFormSchemaValues = z.infer<
  typeof createAdventureFormSchema
>;

export function CreateAdventureForm({
  defaultValues = {
    format: "offline",
  },
  onSubmit,
}: {
  defaultValues?: DefaultValues<CreateAdventureFormSchemaValues>;
  onSubmit?: SubmitHandler<CreateAdventureFormSchemaValues>;
}) {
  const form = useForm<CreateAdventureFormSchemaValues>({
    mode: "onChange",
    resolver: zodResolver(createAdventureFormSchema),
    defaultValues,
  });

  const [submitting, startSubmitting] = useTransition();

  const submit = form.handleSubmit((values) => {
    startSubmitting(() => {
      onSubmit?.(values);
    });
  });

  return (
    <form onSubmit={submit}>
      <Card>
        <CardContent>
          <FieldGroup>
            <Controller
              control={form.control}
              name="format"
              render={CreateAdventureFormFormatField}
            />
          </FieldGroup>
        </CardContent>
        <CardFooter>
          <Button type="submit" disabled={submitting}>
            {submitting ? (
              <>
                <Spinner />
                Создание…
              </>
            ) : (
              <>Создать</>
            )}
          </Button>
        </CardFooter>
      </Card>
    </form>
  );
}
