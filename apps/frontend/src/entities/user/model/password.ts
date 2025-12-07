import { z } from "zod";

export const userPasswordSchema = z
  .string()
  .nonempty("Введите пароль")
  .min(8, "Пароль должен содержать не менее 8 символов")
  .max(32, "Пароль должен содержать не более 32 символов");
