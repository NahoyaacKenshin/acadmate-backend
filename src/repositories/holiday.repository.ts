import { prisma } from "@/lib/prisma";

export class HolidayRepository {
  async findByYear(year: number) {
    const start = new Date(`${year}-01-01T00:00:00.000Z`);
    const end = new Date(`${year}-12-31T23:59:59.999Z`);

    return prisma.philippineHoliday.findMany({
      where: {
        date: {
          gte: start,
          lte: end,
        },
      },
      orderBy: { date: "asc" },
    });
  }
}
