import { keepPreviousData, queryOptions } from "@tanstack/react-query";

import { api } from "@acme/frontend/shared/config/api";

export const usersMeQueryOptions = queryOptions({
  queryKey: ["users", "me"],
  queryFn: async () => (await api.users.me.get()).data,
  placeholderData: keepPreviousData,
  refetchOnWindowFocus: false,
  staleTime: Infinity,
});
