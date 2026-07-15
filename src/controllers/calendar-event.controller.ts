import { Request, Response } from "express";
import { CalendarEventRepository } from "@/repositories/calendar-event.repository";

export class CalendarEventController {
  private calendarEventRepository: CalendarEventRepository;

  constructor() {
    this.calendarEventRepository = new CalendarEventRepository();
  }

  public getAll = async (req: Request, res: Response) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const userId = (req as any).user?.sub;
    
    // Optional date-range filters: ?startDate=ISO&endDate=ISO
    const startDate = req.query.startDate ? new Date(req.query.startDate as string) : undefined;
    const endDate = req.query.endDate ? new Date(req.query.endDate as string) : undefined;

    try {
      const events = await this.calendarEventRepository.findAllByUserId(userId, startDate, endDate);
      return res.status(200).json({ code: 200, status: "success", data: events });
    } catch (error: any) {
      return res.status(500).json({ code: 500, status: "error", message: error.message });
    }
  };

  public create = async (req: Request, res: Response) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const userId = (req as any).user?.sub;
    const { title, description, startDate, endDate, allDay, location, color, subjectId } = req.body;
    try {
      const event = await this.calendarEventRepository.create(userId, {
        title,
        description,
        startDate,
        endDate,
        allDay,
        location,
        color,
        subjectId,
      });
      return res.status(201).json({ code: 201, status: "success", data: event });
    } catch (error: any) {
      return res.status(500).json({ code: 500, status: "error", message: error.message });
    }
  };

  public update = async (req: Request, res: Response) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const userId = (req as any).user?.sub;
    const id = req.params.id as string;
    const { title, description, startDate, endDate, allDay, location, color, subjectId } = req.body;
    try {
      const event = await this.calendarEventRepository.update(id, userId, {
        title,
        description,
        startDate,
        endDate,
        allDay,
        location,
        color,
        subjectId,
      });
      return res.status(200).json({ code: 200, status: "success", data: event });
    } catch (error: any) {
      if (error.code === "P2025") {
        return res.status(404).json({ code: 404, status: "error", message: "Event not found" });
      }
      return res.status(500).json({ code: 500, status: "error", message: error.message });
    }
  };

  public delete = async (req: Request, res: Response) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const userId = (req as any).user?.sub;
    const id = req.params.id as string;
    try {
      await this.calendarEventRepository.delete(id, userId);
      return res.status(200).json({ code: 200, status: "success", message: "Event deleted successfully" });
    } catch (error: any) {
      if (error.code === "P2025") {
        return res.status(404).json({ code: 404, status: "error", message: "Event not found" });
      }
      return res.status(500).json({ code: 500, status: "error", message: error.message });
    }
  };
}
