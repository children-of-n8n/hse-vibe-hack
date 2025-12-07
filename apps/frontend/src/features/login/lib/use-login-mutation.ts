import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router";
import { toast } from "sonner";

import { usersMeQueryOptions } from "@acme/frontend/entities/user";
import type { LoginFormSchemaValues } from "@acme/frontend/features/login";
import { api } from "@acme/frontend/shared/config/api";

export const useLoginMutation = () => {
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  return useMutation({
    mutationKey: ["login"],
    mutationFn: async (values: LoginFormSchemaValues) => {
      const { error } = await api.auth.login.post(values);

      if (error) {
        if (error.status === 401) {
          toast.error("Неверный логин или пароль");
        }
      } else {
        await queryClient.invalidateQueries({
          queryKey: usersMeQueryOptions.queryKey,
        });

        await navigate("/");
      }
    },
  });
};
