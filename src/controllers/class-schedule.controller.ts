import { Request, Response } from "express";
import { ClassScheduleRepository } from "@/repositories/class-schedule.repository";

export class ClassScheduleController {
  private classScheduleRepository: ClassScheduleRepository;

  constructor() {
    this.classScheduleRepository = new ClassScheduleRepository();
  }

  public getAll = async (req: Request, res: Response) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const userId = (req as any).user?.sub;
    try {
      const schedules = await this.classScheduleRepository.findAllByUserId(userId);
      return res.status(200).json({ code: 200, status: "success", data: schedules });
    } catch (error: any) {
      return res.status(500).json({ code: 500, status: "error", message: error.message });
    }
  };

  public create = async (req: Request, res: Response) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const userId = (req as any).user?.sub;
    const { dayOfWeek, startTime, endTime, room, modality, setType, subjectId } = req.body;
    try {
      const schedule = await this.classScheduleRepository.create(userId, {
        dayOfWeek,
        startTime,
        endTime,
        room,
        modality,
        setType,
        subjectId,
      });
      return res.status(201).json({ code: 201, status: "success", data: schedule });
    } catch (error: any) {
      return res.status(500).json({ code: 500, status: "error", message: error.message });
    }
  };

  public update = async (req: Request, res: Response) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const userId = (req as any).user?.sub;
    const id = req.params.id as string;
    const { dayOfWeek, startTime, endTime, room, modality, setType, subjectId } = req.body;
    try {
      const schedule = await this.classScheduleRepository.update(id, userId, {
        dayOfWeek,
        startTime,
        endTime,
        room,
        modality,
        setType,
        subjectId,
      });
      return res.status(200).json({ code: 200, status: "success", data: schedule });
    } catch (error: any) {
      if (error.code === "P2025") {
        return res.status(404).json({ code: 404, status: "error", message: "Class schedule not found" });
      }
      return res.status(500).json({ code: 500, status: "error", message: error.message });
    }
  };

  public delete = async (req: Request, res: Response) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const userId = (req as any).user?.sub;
    const id = req.params.id as string;
    try {
      await this.classScheduleRepository.delete(id, userId);
      return res.status(200).json({ code: 200, status: "success", message: "Class schedule deleted successfully" });
    } catch (error: any) {
      if (error.code === "P2025") {
        return res.status(404).json({ code: 404, status: "error", message: "Class schedule not found" });
      }
      return res.status(500).json({ code: 500, status: "error", message: error.message });
    }
  };
}
