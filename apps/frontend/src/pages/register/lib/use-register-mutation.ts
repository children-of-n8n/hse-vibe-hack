import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router";

import { usersMeQueryOptions } from "@acme/frontend/entities/user";
import type { LoginFormSchemaValues } from "@acme/frontend/features/login";
import { api } from "@acme/frontend/shared/config/api";

export const useRegisterMutation = () => {
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  return useMutation({
    mutationFn: async (values: LoginFormSchemaValues) => {
      await api.auth.register.post(values);

      await queryClient.invalidateQueries({
        queryKey: usersMeQueryOptions.queryKey,
      });

      await navigate("/");
    },
  });
};
