import { Request, Response } from "express";
import { HolidayRepository } from "@/repositories/holiday.repository";

const CACHE_MAX_AGE = 60 * 60 * 24; // 24 hours in seconds

export class HolidayController {
  private holidayRepository: HolidayRepository;

  constructor() {
    this.holidayRepository = new HolidayRepository();
  }

  /**
   * GET /api/holidays?year=2026
   * Returns Philippine holidays for the specified year (defaults to current year).
   * Responds with Cache-Control headers so clients and proxies can cache the result.
   */
  public getByYear = async (req: Request, res: Response) => {
    const rawYear = req.query.year as string | undefined;
    const year = rawYear ? parseInt(rawYear, 10) : new Date().getFullYear();

    if (isNaN(year) || year < 2000 || year > 2100) {
      return res.status(400).json({
        code: 400,
        status: "error",
        message: "Invalid year. Must be a number between 2000 and 2100.",
      });
    }

    try {
      const holidays = await this.holidayRepository.findByYear(year);
      
      // Cache for 24 hours — holiday data rarely changes
      res.set("Cache-Control", `public, max-age=${CACHE_MAX_AGE}`);
      
      return res.status(200).json({ code: 200, status: "success", data: holidays });
    } catch (error: any) {
      return res.status(500).json({ code: 500, status: "error", message: error.message });
    }
  };
}
