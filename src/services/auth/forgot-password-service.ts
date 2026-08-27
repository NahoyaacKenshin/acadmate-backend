import crypto from "crypto";
import { UserRepository } from "@/repositories/user.repository";
import { TokenRepository } from "@/repositories/token.repository";
import { renderTemplate } from "@/utils/template";
import { sendEmail } from "@/services/mail/mailer";

export async function ForgotPasswordService(email: string) {
  const userRepository = new UserRepository();
  const tokenRepository = new TokenRepository();

  try {
    const user = await userRepository.findByEmail(email);

    // Generic response to prevent user email enumeration
    const successMessage = "If this email is registered, a password reset link has been sent.";

    if (!user) {
      return { code: 200, status: "success", message: successMessage };
    }

    // Revoke any previous active password reset tokens for this user
    const previousToken = await tokenRepository.findLatestPasswordResetTokenByUser(user.id);
    if (previousToken) {
      await tokenRepository.revokeToken(previousToken.id);
    }

    // Generate new password reset token (1 hour validity)
    const token = crypto.randomUUID();
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

    await tokenRepository.createPasswordResetToken({ userId: user.id, token, expiresAt });

    // Deep link URL for mobile app
    const resetPasswordURL = `acadmate://reset-password?token=${encodeURIComponent(token)}`;

    // Always log for dev convenience
    console.log(`\n[DEV FORGOT PASSWORD LINK] User ${email}:\n${resetPasswordURL}\n`);

    // Render HTML template
    const html = renderTemplate("reset-password.html", {
      name: user.name ?? "there",
      resetPasswordURL,
      expiresAt: expiresAt.toUTCString(),
    });

    // Send email (non-fatal if SMTP network drops)
    try {
      await sendEmail({
        to: user.email ?? email,
        subject: "Reset your AcadMate password",
        html,
      });
    } catch (mailError) {
      console.error("[ForgotPasswordService] Send email failed (non-fatal):", mailError);
    }

    return {
      code: 200,
      status: "success",
      message: successMessage,
    };
  } catch (error) {
    console.error("ForgotPasswordService error", error);
    return { code: 500, status: "error", message: "Unable to process password reset request" };
  }
}
