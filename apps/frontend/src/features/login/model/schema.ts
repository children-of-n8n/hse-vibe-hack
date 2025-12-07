import { z } from "zod";

import {
  userPasswordSchema,
  userUsernameSchema,
} from "@acme/frontend/entities/user";

export const loginFormSchema = z.object({
  username: userUsernameSchema,
  password: userPasswordSchema,
});

export type LoginFormSchemaValues = z.infer<typeof loginFormSchema>;
