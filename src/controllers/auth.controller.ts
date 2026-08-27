import { Request, Response } from "express";
import { 
  SignupUserService, 
  LoginCredentialsService, 
  VerifyEmailService, 
  RefreshTokenService, 
  ResendEmailVerificationService, 
  GetMeService,
  ForgotPasswordService,
  ResetPasswordService,
} from "@/services/auth";
import { TokenExpiry, toMilliseconds } from "@/lib/jwt";
import { ENV } from "@/config/env";
import { TokenRepository } from "@/repositories/token.repository";

export class AuthController {
  // Helper to set cookies
  private setAuthCookies(res: Response, tokens: { accessToken: string; refreshToken: string }) {
    const isProduction = ENV.NODE_ENV === "production";
    const domain = isProduction ? ".cloomero.cloud" : undefined;

    res.cookie("accessToken", tokens.accessToken, {
      httpOnly: true,
      secure: isProduction,
      sameSite: isProduction ? "none" : "lax",
      domain,
      maxAge: toMilliseconds(TokenExpiry.ACCESS_TOKEN_EXPIRES),
    });

    res.cookie("refreshToken", tokens.refreshToken, {
      httpOnly: true,
      secure: isProduction,
      sameSite: isProduction ? "none" : "lax",
      domain,
      maxAge: toMilliseconds(TokenExpiry.REFRESH_TOKEN_EXPIRES),
    });
  }

  // Credentials Signup
  public signup = async (req: Request, res: Response) => {
    const { name, email, password } = req.body ?? {};
    const result = await SignupUserService(name, email, password);
    return res.status(result.code).json(result);
  };

  // Email Verification
  public verifyEmail = async (req: Request, res: Response) => {
    const token = req.query.token as string;
    const result = await VerifyEmailService(token);
    return res.status(result.code).json(result);
  };
  
  // Handle Login Account
  public login = async (req: Request, res: Response) => {
    const { email, password } = req.body ?? {};
    const result = await LoginCredentialsService(email, password);
    
    if (result.code === 200 && result.data?.tokens) {
      this.setAuthCookies(res, result.data.tokens);
    }

    return res.status(result.code).json(result);
  };

  // Refresh Token Helps Generate another valid Access Token
  public refresh = async (req: Request, res: Response) => {
    const refreshToken = req.body?.refreshToken || req.cookies?.refreshToken;
    const result = await RefreshTokenService(refreshToken);

    if (result.code === 200 && result.data?.tokens) {
      this.setAuthCookies(res, result.data.tokens);
    }

    return res.status(result.code).json(result);
  };

  // Handle Logout
  public logout = async (req: Request, res: Response) => {
    const isProduction = ENV.NODE_ENV === "production";
    const domain = isProduction ? ".cloomero.cloud" : undefined;
    const refreshToken = req.body?.refreshToken || req.cookies?.refreshToken;

    if (refreshToken) {
      const tokenRepository = new TokenRepository();
      const dbToken = await tokenRepository.findActiveRefreshToken(refreshToken);

      if (dbToken) {
        await tokenRepository.revokeToken(dbToken.id);
      }
    }

    res.clearCookie("accessToken", { domain });
    res.clearCookie("refreshToken", { domain });
    return res.status(200).json({ code: 200, status: "success", message: "Logged out successfully" });
  };

  // Resend Email Verification
  public resendEmailVerification = async (req: Request, res: Response) => {
    const { email } = req.body ?? {};
    const result = await ResendEmailVerificationService(email);
    return res.status(result.code).json(result);
  };

  // Forgot Password Request
  public forgotPassword = async (req: Request, res: Response) => {
    const { email } = req.body ?? {};
    const result = await ForgotPasswordService(email);
    return res.status(result.code).json(result);
  };

  // Reset Password Execution
  public resetPassword = async (req: Request, res: Response) => {
    const { token, password } = req.body ?? {};
    const result = await ResetPasswordService(token, password);
    return res.status(result.code).json(result);
  };

  // Get Current User Session
  public me = async (req: Request, res: Response) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const userId = (req as any).user?.sub;
    const result = await GetMeService(userId);
    return res.status(result.code).json(result);
  };

  // Update Current User Profile (name, programName)
  public updateMe = async (req: Request, res: Response) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const userId = (req as any).user?.sub;
    if (!userId) {
      return res.status(401).json({ code: 401, status: "error", message: "Unauthorized" });
    }

    const { name, programName } = req.body ?? {};

    try {
      const updated = await (await import("@/lib/prisma")).prisma.user.update({
        where: { id: userId },
        data: {
          ...(name !== undefined ? { name: String(name).trim() } : {}),
          ...(programName !== undefined ? { programName: programName ? String(programName).trim() : null } : {}),
        },
        select: { id: true, name: true, email: true, role: true, emailVerified: true, programName: true },
      });
      return res.status(200).json({ code: 200, status: "success", data: { user: updated } });
    } catch (error) {
      console.error("updateMe Error", error);
      return res.status(500).json({ code: 500, status: "error", message: "Failed to update profile" });
    }
  };

  // Get PowerSync JWT Token
  public getPowerSyncToken = async (req: Request, res: Response) => {
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const userId = (req as any).user?.sub;
      if (!userId) {
        return res.status(401).json({ code: 401, status: "error", message: "Unauthorized" });
      }

      // We dynamically import here or use the function we added to jwt.ts
      const { signPowerSyncToken } = await import("@/lib/jwt");
      
      const token = signPowerSyncToken(userId);
      return res.status(200).json({ 
        token, 
        expiresAt: new Date(Date.now() + 15 * 60 * 1000).toISOString() 
      });
    } catch (error) {
      console.error("Error generating PowerSync token:", error);
      return res.status(500).json({ code: 500, status: "error", message: "Internal server error" });
    }
  };
}
