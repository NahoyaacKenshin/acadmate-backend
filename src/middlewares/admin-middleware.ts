/*
  Admin Middleware

  Extends the standard auth check by additionally requiring `role === "ADMIN"`.
  Chain AFTER AuthMiddleware:  router.use(auth.execute, adminAuth.execute, ...)
*/

import { NextFunction, Request, Response } from "express";
import { JwtPayload } from "@/lib/jwt";

type AuthenticatedRequest = Request & { user?: JwtPayload };

export class AdminMiddleware {
  public execute = (req: Request, res: Response, next: NextFunction): void => {
    const authReq = req as AuthenticatedRequest;

    if (!authReq.user) {
      res.status(401).json({ code: 401, status: "error", message: "Authentication required" });
      return;
    }

    if (authReq.user.role !== "ADMIN") {
      res.status(403).json({ code: 403, status: "error", message: "Admin access required" });
      return;
    }

    next();
  };
}
