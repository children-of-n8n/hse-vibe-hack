import { useMutation, useQueryClient } from "@tanstack/react-query";

import { usersMeQueryOptions } from "@acme/frontend/entities/user";
import { api } from "@acme/frontend/shared/config/api";

export const useLogoutMutation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      await api.auth.logout.post();

      await queryClient.invalidateQueries({
        queryKey: usersMeQueryOptions.queryKey,
      });
    },
  });
};
