import { prisma } from "@/lib/prisma";
import { Modality, SetType } from "@/generated/prisma";

interface ClassScheduleData {
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  room?: string | null;
  modality?: Modality;
  setType?: SetType | null;
  subjectId?: string | null;
}

export class ClassScheduleRepository {
  async findAllByUserId(userId: string) {
    return prisma.classSchedule.findMany({
      where: { userId },
      include: { subject: true },
      orderBy: [{ dayOfWeek: "asc" }, { startTime: "asc" }],
    });
  }

  async findById(id: string, userId: string) {
    return prisma.classSchedule.findFirst({
      where: { id, userId },
      include: { subject: true },
    });
  }

  async create(userId: string, data: ClassScheduleData) {
    return prisma.classSchedule.create({
      data: {
        ...data,
        userId,
      },
      include: { subject: true },
    });
  }

  async update(id: string, userId: string, data: Partial<ClassScheduleData>) {
    return prisma.classSchedule.update({
      where: { id, userId },
      data,
      include: { subject: true },
    });
  }

  async delete(id: string, userId: string) {
    return prisma.classSchedule.delete({
      where: { id, userId },
    });
  }
}
