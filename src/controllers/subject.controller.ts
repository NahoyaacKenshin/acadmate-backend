import { Request, Response } from "express";
import { SubjectRepository } from "@/repositories/subject.repository";

export class SubjectController {
  private subjectRepository: SubjectRepository;

  constructor() {
    this.subjectRepository = new SubjectRepository();
  }

  public getAll = async (req: Request, res: Response) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const userId = (req as any).user?.sub;
    try {
      const subjects = await this.subjectRepository.findAllByUserId(userId);
      return res.status(200).json({ code: 200, status: "success", data: subjects });
    } catch (error: any) {
      return res.status(500).json({ code: 500, status: "error", message: error.message });
    }
  };

  public create = async (req: Request, res: Response) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const userId = (req as any).user?.sub;
    const { name, color } = req.body;
    try {
      const subject = await this.subjectRepository.create(userId, { name, color });
      return res.status(201).json({ code: 201, status: "success", data: subject });
    } catch (error: any) {
      return res.status(500).json({ code: 500, status: "error", message: error.message });
    }
  };

  public update = async (req: Request, res: Response) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const userId = (req as any).user?.sub;
    const id = req.params.id as string;
    const { name, color } = req.body;
    try {
      const subject = await this.subjectRepository.update(id, userId, { name, color });
      return res.status(200).json({ code: 200, status: "success", data: subject });
    } catch (error: any) {
      if (error.code === 'P2025') {
        return res.status(404).json({ code: 404, status: "error", message: "Subject not found" });
      }
      return res.status(500).json({ code: 500, status: "error", message: error.message });
    }
  };

  public delete = async (req: Request, res: Response) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const userId = (req as any).user?.sub;
    const id = req.params.id as string;
    try {
      await this.subjectRepository.delete(id, userId);
      return res.status(200).json({ code: 200, status: "success", message: "Subject deleted successfully" });
    } catch (error: any) {
      if (error.code === 'P2025') {
        return res.status(404).json({ code: 404, status: "error", message: "Subject not found" });
      }
      return res.status(500).json({ code: 500, status: "error", message: error.message });
    }
  };
}
