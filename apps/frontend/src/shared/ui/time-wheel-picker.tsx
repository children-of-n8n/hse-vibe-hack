import { WheelPicker, WheelPickerWrapper, type WheelPickerOption } from "@acme/frontend/shared/ui/wheel-picker";
import { useEffect, useState } from "react";

const createArray = (length: number, add = 0): WheelPickerOption<number>[] =>
  Array.from({ length }, (_, i) => {
    const value = i + add;
    return {
      label: value.toString().padStart(2, "0"),
      value: value,
    };
  });

const hourOptions = createArray(23, 1);
const minuteOptions = createArray(60);

export type TimeWheelPickerValue = {
  hour: number;
  minute: number;
};

export type TimeWheelPickerProps = React.ComponentProps<"div"> & {
  onValueChange?: (value: TimeWheelPickerValue) => void;
  defaultValue?: TimeWheelPickerValue;
};

export function TimeWheelPicker({ onValueChange, defaultValue, ...props }: TimeWheelPickerProps) {
  const now = new Date();
  const [value, setValue] = useState<TimeWheelPickerValue>(defaultValue ?? {
    hour: now.getHours(),
    minute: now.getMinutes(),
  });

  useEffect(() => {
    onValueChange?.(value)
  }, [value])

  return (
    <div {...props}>
      <WheelPickerWrapper>
        <WheelPicker options={hourOptions} value={value.hour} onValueChange={(hour) => setValue({ ...value, hour })}  infinite />
        <WheelPicker options={minuteOptions} value={value.minute} onValueChange={(minute) => setValue({ ...value, minute })} infinite />
      </WheelPickerWrapper>
    </div>
  );
}
