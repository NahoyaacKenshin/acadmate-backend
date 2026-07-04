import { prisma } from "@/lib/prisma";

interface CalendarEventData {
  title: string;
  description?: string | null;
  startDate: string | Date;
  endDate?: string | Date | null;
  allDay?: boolean;
  location?: string | null;
  color?: string | null;
  subjectId?: string | null;
}

export class CalendarEventRepository {
  async findAllByUserId(userId: string, startRange?: Date, endRange?: Date) {
    return prisma.calendarEvent.findMany({
      where: {
        userId,
        ...(startRange || endRange
          ? {
              startDate: {
                ...(startRange ? { gte: startRange } : {}),
                ...(endRange ? { lte: endRange } : {}),
              },
            }
          : {}),
      },
      include: { subject: true },
      orderBy: { startDate: "asc" },
    });
  }

  async findById(id: string, userId: string) {
    return prisma.calendarEvent.findFirst({
      where: { id, userId },
      include: { subject: true },
    });
  }

  async create(userId: string, data: CalendarEventData) {
    return prisma.calendarEvent.create({
      data: {
        ...data,
        userId,
      },
      include: { subject: true },
    });
  }

  async update(id: string, userId: string, data: Partial<CalendarEventData>) {
    return prisma.calendarEvent.update({
      where: { id, userId },
      data,
      include: { subject: true },
    });
  }

  async delete(id: string, userId: string) {
    return prisma.calendarEvent.delete({
      where: { id, userId },
    });
  }
}
