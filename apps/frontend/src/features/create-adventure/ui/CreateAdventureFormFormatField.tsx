"use client";

import type {
  ControllerFieldState,
  ControllerRenderProps,
  FieldValues,
  Path,
} from "react-hook-form";

import {
  Field,
  FieldContent,
  FieldDescription,
  FieldLabel,
  FieldSet,
  FieldTitle,
} from "@acme/frontend/shared/ui/field";
import {
  RadioGroup,
  RadioGroupItem,
} from "@acme/frontend/shared/ui/radio-group";

export const ADVENTURE_FORMAT_OPTIONS = [
  {
    value: "online",
    label: "Онлайн",
    description: "Приключение проводится онлайн",
  },
  {
    value: "offline",
    label: "Оффлайн",
    description: "Приключение проводится офлайн",
  },
];

export function CreateAdventureFormFormatField<T extends FieldValues>({
  field: { onChange, ...field },
  fieldState,
}: {
  field: ControllerRenderProps<T, Path<T>>;
  fieldState: ControllerFieldState;
}) {
  return (
    <FieldSet>
      <FieldLabel htmlFor="compute-environment-p8w">
        Формат проведения
      </FieldLabel>

      <FieldDescription>
        Выберите формат проведения вашего приключения.
      </FieldDescription>

      <RadioGroup {...field} onValueChange={onChange}>
        {ADVENTURE_FORMAT_OPTIONS.map((option) => (
          <FieldLabel
            key={option.value}
            htmlFor={`event-form-format-${option.value}`}
          >
            <Field orientation="horizontal" data-invalid={fieldState.invalid}>
              <FieldContent>
                <FieldTitle>{option.label}</FieldTitle>
                <FieldDescription>{option.description}</FieldDescription>
              </FieldContent>
              <RadioGroupItem
                value={option.value}
                id={`event-form-format-${option.value}`}
              />
            </Field>
          </FieldLabel>
        ))}
      </RadioGroup>
    </FieldSet>
  );
}
