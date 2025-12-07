import { useQuery } from "@tanstack/react-query";
import { AtSignIcon, HashIcon, LogInIcon, LogOutIcon } from "lucide-react";
import { useEffect, useState } from "react";

import { Button } from "@acme/frontend/shared/ui/button";
import {
  Item,
  ItemContent,
  ItemDescription,
  ItemMedia,
  ItemTitle,
} from "@acme/frontend/shared/ui/item";
import { ThemeToggler } from "@acme/frontend/shared/ui/theme-toggler";
import {
  TimeWheelPicker,
  type TimeWheelPickerValue,
} from "@acme/frontend/shared/ui/time-wheel-picker";

import { useLoginMutation } from "../lib/use-login-mutation";
import { useLogoutMutation } from "../lib/use-logout-mutation";
import { usersMeQueryOptions } from "../lib/users-me-query-options";

export function HomePage() {
  const { data } = useQuery(usersMeQueryOptions);
  const loginMutation = useLoginMutation();
  const logoutMutation = useLogoutMutation();

  const [startTime, setStartTime] = useState<TimeWheelPickerValue | null>(null);
  const [endTime, setEndTime] = useState<TimeWheelPickerValue | null>(null);

  useEffect(() => {
    console.log(startTime, endTime);
  }, [startTime, endTime]);

  return (
    <div className="m-8 flex flex-col gap-4">
      <ThemeToggler />

      <div className="flex gap-4">
        <TimeWheelPicker className="grow" onValueChange={setStartTime} />
        <TimeWheelPicker className="grow" onValueChange={setEndTime} />
      </div>

      {!data && (
        <Button
          type="button"
          size="lg"
          variant="default"
          onClick={() => loginMutation.mutate()}
          disabled={loginMutation.isPending}
        >
          <LogInIcon />
          Login as "username"
        </Button>
      )}

      {!!data && (
        <div className="space-y-4">
          <Item variant="muted" className="border-border">
            <ItemMedia>
              <AtSignIcon />
            </ItemMedia>
            <ItemContent>
              <ItemTitle>Username</ItemTitle>
              <ItemDescription>{data?.username}</ItemDescription>
            </ItemContent>
          </Item>

          <Item variant="muted" className="border-border">
            <ItemMedia>
              <HashIcon />
            </ItemMedia>
            <ItemContent>
              <ItemTitle>ID</ItemTitle>
              <ItemDescription>{data?.id}</ItemDescription>
            </ItemContent>
          </Item>

          <Button
            type="button"
            size="lg"
            variant="destructive"
            className="w-full"
            onClick={() => logoutMutation.mutate()}
            disabled={logoutMutation.isPending}
          >
            <LogOutIcon />
            Logout
          </Button>
        </div>
      )}
    </div>
  );
}
