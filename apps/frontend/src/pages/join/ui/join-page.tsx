import { useMutation, useQuery } from "@tanstack/react-query";
import { useEffect } from "react";
import { useNavigate, useParams } from "react-router";
import { toast } from "sonner";

import { usersMeQueryOptions } from "@acme/frontend/entities/user";
import { api } from "@acme/frontend/shared/config/api";

export function JoinPage() {
  const params = useParams<{ shareToken?: string }>();
  const {
    data: user,
    isLoading: isUserLoading,
    isError: isUserError,
  } = useQuery(usersMeQueryOptions);
  const navigate = useNavigate();

  const joinMutation = useMutation({
    mutationFn: async () => {
      if (!params.shareToken) {
        throw new Error("Отсутствует токен приглашения");
      }
      return await api.adventures.join({ token: params.shareToken }).post();
    },
    onSuccess: () => {
      toast.success("Вы присоединились к приключению!");
      navigate("/", { replace: true });
    },
    onError: (error) => {
      toast.error("Не удалось присоединиться к приключению", {
        description:
          error instanceof Error
            ? error.message
            : "Проверьте ссылку или попробуйте позже.",
      });
      navigate("/", { replace: true });
    },
  });

  useEffect(() => {
    // Ждём, пока загрузится информация о пользователе
    if (isUserLoading) return;

    // Если пользователь не авторизован — редирект на логин
    if (!user || isUserError) {
      navigate("/login", { replace: true });
      return;
    }

    // Если мутация уже выполняется или завершена — не запускаем повторно
    if (
      joinMutation.isPending ||
      joinMutation.isSuccess ||
      joinMutation.isError
    ) {
      return;
    }

    // Без токена — некуда присоединяться
    if (!params.shareToken) {
      toast.error("Недействительная ссылка");
      navigate("/", { replace: true });
      return;
    }

    // Запускаем мутацию только один раз
    joinMutation.mutate();
  }, [
    isUserLoading,
    user,
    isUserError,
    joinMutation,
    params.shareToken,
    navigate,
  ]);

  return null;
}
