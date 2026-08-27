import { UserRepository } from "@/repositories/user.repository";
import { TokenRepository } from "@/repositories/token.repository";
import { hashPassword } from "@/utils/password";

export async function ResetPasswordService(token: string, password: string) {
  const userRepository = new UserRepository();
  const tokenRepository = new TokenRepository();

  try {
    // Check token in DB
    const record = await tokenRepository.findActivePasswordResetToken(token);
    if (!record) {
      return { code: 404, status: "error", message: "Invalid or expired password reset token" };
    }

    // Check if token has expired
    if (record.expiresAt.getTime() < Date.now()) {
      await tokenRepository.revokeToken(record.id);
      return { code: 410, status: "error", message: "Password reset token has expired" };
    }

    // Check if user exists
    const user = await userRepository.findById(record.userId);
    if (!user) {
      await tokenRepository.revokeToken(record.id);
      return { code: 404, status: "error", message: "User not found for this token" };
    }

    // Hash the new password and update user record
    const hashedPassword = hashPassword(password);
    await userRepository.updatePassword(user.id, hashedPassword);

    // Consume the token so it cannot be reused
    await tokenRepository.consumeToken(record.id);

    return {
      code: 200,
      status: "success",
      message: "Password reset successfully. You can now log in with your new password.",
    };
  } catch (error) {
    console.error("ResetPasswordService error", error);
    return { code: 500, status: "error", message: "Unable to reset password" };
  }
}
