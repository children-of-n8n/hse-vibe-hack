import { ChevronDown, LogOutIcon } from "lucide-react";

import type { toUserResponse } from "@acme/backend/controllers/user.controller";

import { UserAvatar } from "@acme/frontend/entities/user";
import { useLogoutMutation } from "@acme/frontend/features/logout";
import { Button } from "@acme/frontend/shared/ui/button";
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "@acme/frontend/shared/ui/drawer";
import {
  Item,
  ItemContent,
  ItemDescription,
  ItemMedia,
  ItemTitle,
} from "@acme/frontend/shared/ui/item";

export function CurrentUserMenu({
  currentUser,
}: {
  currentUser: ReturnType<typeof toUserResponse>;
}) {
  const logoutMutation = useLogoutMutation();

  return (
    <Drawer>
      <DrawerTrigger asChild>
        <Button variant="outline" className="rounded-full px-2!">
          <UserAvatar username={currentUser.username} className="size-6" />
          <span>{currentUser.username}</span>
          <ChevronDown />
        </Button>
      </DrawerTrigger>
      <DrawerContent>
        <DrawerHeader className="sr-only">
          <DrawerTitle>{currentUser.username}</DrawerTitle>
          <DrawerDescription>{currentUser.username}</DrawerDescription>
        </DrawerHeader>
        <div className="flex flex-col gap-4 p-4">
          <Item variant="muted" className="border-border">
            <ItemMedia>
              <UserAvatar username={currentUser.username} className="size-10" />
            </ItemMedia>
            <ItemContent>
              <ItemTitle>{currentUser.username}</ItemTitle>
              <ItemDescription>3 приключения</ItemDescription>
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
            Выйти из аккаунта
          </Button>
        </div>
      </DrawerContent>{" "}
    </Drawer>
  );
}
