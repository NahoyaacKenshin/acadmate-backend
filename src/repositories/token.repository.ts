import { prisma } from "@/lib/prisma";
import { TokenType } from "@/generated/prisma";
import type { Token } from "@/generated/prisma/client";

export class TokenRepository {
  async createEmailVerificationToken(params: { userId: string; token: string; expiresAt: Date }) {
    const { userId, token, expiresAt } = params;
    return prisma.token.create({
      data: {
        userId,
        token,
        expiresAt,
        type: TokenType.EMAIL_VERIFY,
      },
    });
  }

  async createPasswordResetToken(params: { userId: string; token: string; expiresAt: Date }) {
    const { userId, token, expiresAt } = params;
    return prisma.token.create({
      data: {
        userId,
        token,
        expiresAt,
        type: TokenType.PASSWORD_RESET,
      },
    });
  }

  async createRefreshToken(params: { userId: string; token: string; expiresAt: Date }) {
    const { userId, token, expiresAt } = params;
    return prisma.token.create({
      data: {
        userId,
        token,
        expiresAt,
        type: TokenType.REFRESH,
      },
    });
  }

  async findActiveRefreshToken(token: string): Promise<Token | null> {
    return prisma.token.findFirst({
      where: {
        token,
        type: TokenType.REFRESH,
        consumedAt: null,
        revokedAt: null,
      },
    });
  }

  async findActiveEmailVerificationToken(token: string): Promise<Token | null> {
    return prisma.token.findFirst({
      where: {
        token,
        type: TokenType.EMAIL_VERIFY,
        consumedAt: null,
        revokedAt: null,
      },
    });
  }

  async findActivePasswordResetToken(token: string): Promise<Token | null> {
    return prisma.token.findFirst({
      where: {
        token,
        type: TokenType.PASSWORD_RESET,
        consumedAt: null,
        revokedAt: null,
      },
    });
  }

  async findLatestEmailVerificationTokenByUser(userId: string): Promise<Token | null> {
    return prisma.token.findFirst({
      where: {
        userId,
        type: TokenType.EMAIL_VERIFY,
        consumedAt: null,
        revokedAt: null,
      },
      orderBy: { createdAt: "desc" },
    });
  }

  async findLatestPasswordResetTokenByUser(userId: string): Promise<Token | null> {
    return prisma.token.findFirst({
      where: {
        userId,
        type: TokenType.PASSWORD_RESET,
        consumedAt: null,
        revokedAt: null,
      },
      orderBy: { createdAt: "desc" },
    });
  }

  async consumeToken(id: string) {
    return prisma.token.update({
      where: { id },
      data: { consumedAt: new Date() },
    });
  }

  async revokeToken(id: string) {
    return prisma.token.update({
      where: { id },
      data: { revokedAt: new Date() },
    });
  }
}