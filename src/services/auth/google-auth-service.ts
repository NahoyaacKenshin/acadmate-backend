import { OAuth2Client } from "google-auth-library";
import { prisma, withDbRetry } from "@/lib/prisma";
import { signAccessToken, signRefreshToken, TokenExpiry } from "@/lib/jwt";
import { TokenRepository } from "@/repositories/token.repository";
import { ENV } from "@/config/env";

const client = new OAuth2Client(ENV.GOOGLE_CLIENT_ID);

export async function GoogleAuthService(idToken: string) {
  const tokenRepository = new TokenRepository();

  try {
    // 1. Verify the Google ID token
    const ticket = await client.verifyIdToken({
      idToken,
      audience: ENV.GOOGLE_CLIENT_ID,
    });

    const payload = ticket.getPayload();
    if (!payload) {
      return { code: 401, status: "error", message: "Invalid Google token" };
    }

    const { sub: googleId, email, name, picture, email_verified } = payload;

    if (!email) {
      return { code: 400, status: "error", message: "Google account has no associated email address" };
    }

    // 2. Find or create user with retry resilience for serverless database cold-starts
    const user = await withDbRetry(async () => {
      let existingUser = await prisma.user.findFirst({
        where: {
          OR: [
            { googleId },
            { email },
          ],
        },
      });

      if (existingUser) {
        // User exists — link Google account if not already linked, and ensure email is verified
        return await prisma.user.update({
          where: { id: existingUser.id },
          data: {
            googleId: existingUser.googleId ?? googleId,
            emailVerified: existingUser.emailVerified ?? (email_verified ? new Date() : undefined),
            // Only update name/avatar if they were never set
            name: existingUser.name ?? (name ?? null),
            avatarUrl: existingUser.avatarUrl ?? (picture ?? null),
          },
        });
      }

      // New user — create account (no password required)
      return await prisma.user.create({
        data: {
          email,
          googleId,
          name: name ?? null,
          avatarUrl: picture ?? null,
          emailVerified: email_verified ? new Date() : null,
          hasCompletedOnboarding: false,
        },
      });
    });

    // 3. Issue Acadmate JWTs
    const accessToken = signAccessToken(user.id, TokenExpiry.ACCESS_TOKEN_EXPIRES);
    const refreshToken = signRefreshToken(user.id, TokenExpiry.REFRESH_TOKEN_EXPIRES);

    await withDbRetry(() =>
      tokenRepository.createRefreshToken({
        userId: user.id,
        token: refreshToken,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
      })
    );

    return {
      code: 200,
      status: "success",
      message: "Google sign-in successful",
      data: {
        tokens: {
          accessToken,
          refreshToken,
          expiresIn: TokenExpiry.ACCESS_TOKEN_EXPIRES,
          refreshExpiresIn: TokenExpiry.REFRESH_TOKEN_EXPIRES,
        },
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          avatarUrl: user.avatarUrl,
          studentSet: user.studentSet ?? null,
          hasCompletedOnboarding: user.hasCompletedOnboarding,
        },
      },
    };
  } catch (error) {
    console.error("GoogleAuthService Error:", error);

    // Distinguish between invalid token vs server error
    if (error instanceof Error && error.message.includes("Token used too late")) {
      return { code: 401, status: "error", message: "Google token has expired. Please sign in again." };
    }
    if (error instanceof Error && (error.message.includes("Invalid token") || error.message.includes("Wrong number of segments"))) {
      return { code: 401, status: "error", message: "Invalid Google token. Please sign in again." };
    }

    return { code: 500, status: "error", message: "Google sign-in failed. Please try again." };
  }
}
