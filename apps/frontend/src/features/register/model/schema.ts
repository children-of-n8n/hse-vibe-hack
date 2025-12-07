import { z } from "zod";

import {
  userPasswordSchema,
  userUsernameSchema,
} from "@acme/frontend/entities/user";

export const registerFormSchema = z.object({
  username: userUsernameSchema,
  password: userPasswordSchema,
});

export type RegisterFormSchemaValues = z.infer<typeof registerFormSchema>;
