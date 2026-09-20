import { z } from "zod";

export const googleAuthSchema = z.object({
  body: z.object({
    idToken: z.string().min(1, "Google ID Token is required"),
  }),
});
