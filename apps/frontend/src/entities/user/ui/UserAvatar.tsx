import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@acme/frontend/shared/ui/avatar";

export function UserAvatar({
  username,
  ...props
}: { username: string } & React.ComponentProps<typeof Avatar>) {
  return (
    <Avatar {...props}>
      <AvatarImage
        src={`https://avatar.vercel.sh/${username}`}
        alt={username}
      />
      <AvatarFallback>{username.slice(0, 2).toUpperCase()}</AvatarFallback>
    </Avatar>
  );
}
