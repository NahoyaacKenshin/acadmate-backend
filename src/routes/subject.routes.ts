import { Router } from "express";
import { SubjectController } from "@/controllers/subject.controller";
import { validateSchema } from "@/middlewares/validate-schema";
import { createSubjectSchema, updateSubjectSchema, subjectIdSchema } from "@/schema/subject";
import { AuthMiddleware } from "@/middlewares/auth-middleware";

const router = Router();
const subjectController = new SubjectController();
const authMiddleware = new AuthMiddleware();

// All subject routes require authentication
router.use(authMiddleware.execute);

router.get("/", subjectController.getAll);
router.post("/", validateSchema(createSubjectSchema), subjectController.create);
router.put("/:id", validateSchema(updateSubjectSchema), subjectController.update);
router.delete("/:id", validateSchema(subjectIdSchema), subjectController.delete);

export default router;
