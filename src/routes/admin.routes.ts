import { Router } from "express";
import { AuthMiddleware } from "@/middlewares/auth-middleware";
import { AdminMiddleware } from "@/middlewares/admin-middleware";
import { AdminController } from "@/controllers/admin.controller";
import { validateSchema } from "@/middlewares/validate-schema";
import {
  createSemesterRuleSchema,
  updateSemesterRuleSchema,
  createProgramMappingSchema,
  updateProgramMappingSchema,
} from "@/schema/admin";

const router = Router();
const auth = new AuthMiddleware();
const adminAuth = new AdminMiddleware();
const controller = new AdminController();

// All admin routes require both auth + admin role
router.use(auth.execute, adminAuth.execute);

// ── Analytics ─────────────────────────────────────────────────────────────────
router.get("/analytics", controller.getAnalytics);

// ── Semester Rules ─────────────────────────────────────────────────────────────
router.get("/semester-rules", controller.listSemesterRules);
router.post("/semester-rules", validateSchema(createSemesterRuleSchema), controller.createSemesterRule);
router.put("/semester-rules/:id", validateSchema(updateSemesterRuleSchema), controller.updateSemesterRule);
router.delete("/semester-rules/:id", controller.deleteSemesterRule);

// ── Program Mappings ──────────────────────────────────────────────────────────
router.get("/program-mappings", controller.listProgramMappings);
router.post("/program-mappings", validateSchema(createProgramMappingSchema), controller.createProgramMapping);
router.put("/program-mappings/:id", validateSchema(updateProgramMappingSchema), controller.updateProgramMapping);
router.delete("/program-mappings/:id", controller.deleteProgramMapping);

export default router;
