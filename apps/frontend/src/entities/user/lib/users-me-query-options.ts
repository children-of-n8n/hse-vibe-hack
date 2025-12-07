import { queryOptions } from "@tanstack/react-query";

import { api } from "@acme/frontend/shared/config/api";

export const usersMeQueryOptions = queryOptions({
  queryKey: ["users", "me"],
  queryFn: async () => (await api.users.me.get()).data,
});
