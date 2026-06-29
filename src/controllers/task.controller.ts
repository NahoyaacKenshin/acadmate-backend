import { Request, Response } from "express";
import { TaskRepository } from "@/repositories/task.repository";

export class TaskController {
  private taskRepository: TaskRepository;

  constructor() {
    this.taskRepository = new TaskRepository();
  }

  public getAll = async (req: Request, res: Response) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const userId = (req as any).user?.sub;
    try {
      const tasks = await this.taskRepository.findAllByUserId(userId);
      return res.status(200).json({ code: 200, status: "success", data: tasks });
    } catch (error: any) {
      return res.status(500).json({ code: 500, status: "error", message: error.message });
    }
  };

  public getStats = async (req: Request, res: Response) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const userId = (req as any).user?.sub;
    try {
      const stats = await this.taskRepository.getStats(userId);
      return res.status(200).json({ code: 200, status: "success", data: stats });
    } catch (error: any) {
      return res.status(500).json({ code: 500, status: "error", message: error.message });
    }
  };

  public create = async (req: Request, res: Response) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const userId = (req as any).user?.sub;
    const { title, description, dueDate, completed, subjectId } = req.body;
    try {
      if (subjectId) {
        const existingTask = await this.taskRepository.findByTitleAndSubject(userId, title, subjectId);
        if (existingTask) {
          return res.status(400).json({ code: 400, status: "error", message: "Task with same title already exists for this subject" });
        }
      }

      const task = await this.taskRepository.create(userId, { title, description, dueDate, completed, subjectId });
      return res.status(201).json({ code: 201, status: "success", data: task });
    } catch (error: any) {
      return res.status(500).json({ code: 500, status: "error", message: error.message });
    }
  };

  public update = async (req: Request, res: Response) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const userId = (req as any).user?.sub;
    const id = req.params.id as string;
    const { title, description, dueDate, completed, subjectId } = req.body;
    try {
      if (title && subjectId) {
        const existingTask = await this.taskRepository.findByTitleAndSubject(userId, title, subjectId);
        if (existingTask && existingTask.id !== id) {
          return res.status(400).json({ code: 400, status: "error", message: "Task with same title already exists for this subject" });
        }
      }

      const task = await this.taskRepository.update(id, userId, { title, description, dueDate, completed, subjectId });
      return res.status(200).json({ code: 200, status: "success", data: task });
    } catch (error: any) {
      if (error.code === 'P2025') {
        return res.status(404).json({ code: 404, status: "error", message: "Task not found" });
      }
      return res.status(500).json({ code: 500, status: "error", message: error.message });
    }
  };

  public delete = async (req: Request, res: Response) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const userId = (req as any).user?.sub;
    const id = req.params.id as string;
    try {
      await this.taskRepository.delete(id, userId);
      return res.status(200).json({ code: 200, status: "success", message: "Task deleted successfully" });
    } catch (error: any) {
      if (error.code === 'P2025') {
        return res.status(404).json({ code: 404, status: "error", message: "Task not found" });
      }
      return res.status(500).json({ code: 500, status: "error", message: error.message });
    }
  };
}
