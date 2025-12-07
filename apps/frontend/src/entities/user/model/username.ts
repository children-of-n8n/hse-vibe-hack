import { z } from "zod";

export const userUsernameSchema = z
  .string()
  .nonempty("Введите имя пользователя")
  .min(8, "Имя пользователя должно содержать не менее 8 символов")
  .max(32, "Имя пользователя должно содержать не более 32 символов");
