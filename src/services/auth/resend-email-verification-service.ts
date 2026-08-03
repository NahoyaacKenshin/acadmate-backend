import crypto from "crypto";
import { UserRepository } from "@/repositories/user.repository";
import { TokenRepository } from "@/repositories/token.repository";
import { renderTemplate } from "@/utils/template";
import { sendEmail } from "@/services/mail/mailer";

export async function ResendEmailVerificationService(email: string) {
  const userRepository = new UserRepository();
  const tokenRepository = new TokenRepository();

  try {
    // Check if User is found
    const user = await userRepository.findByEmail(email);
    if (!user) {
      return { code: 404, status: "error", message: "User not found" };
    }

    // Check if Email is verified already
    if (user.emailVerified) {
      return { code: 200, status: "success", message: "Email already verified" };
    }

    // Check the Previous Email Verification Token
    const previousToken = await tokenRepository.findLatestEmailVerificationTokenByUser(user.id);

    // If there's an existing unexpired valid token, revoke it and create a fresh one
    if (previousToken) {
      await tokenRepository.revokeToken(previousToken.id);
    }

    const token = crypto.randomUUID();
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);

    await tokenRepository.createEmailVerificationToken({ userId: user.id, token, expiresAt });

    const emailVerificationURL = `${process.env.BACKEND_URL}/api/auth/v1/verify-email?token=${encodeURIComponent(token)}`;

    console.log(`\n[DEV RESEND VERIFICATION LINK] User ${email}:\n${emailVerificationURL}\n`);

    const html = renderTemplate("verify-email.html", {
      name: user.name ?? "there",
      emailVerificationURL,
      expiresAt: expiresAt.toUTCString(),
    });

    try {
      await sendEmail({
        to: user.email ?? email,
        subject: "Verify your email address",
        html,
      });
    } catch (mailError) {
      console.error("[ResendEmailVerificationService] Send mail failed (non-fatal):", mailError);
    }

    return {
      code: 200,
      status: "success",
      message: "Verification email resent successfully",
    };
  } catch (error) {
    console.error("ResendEmailVerificationService error", error);
    return { code: 500, status: "error", message: "Unable to resend verification email" };
  }
}