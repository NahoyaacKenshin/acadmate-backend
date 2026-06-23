import { prisma } from "@/lib/prisma";

export class TaskRepository {
  async findAllByUserId(userId: string) {
    return prisma.task.findMany({
      where: { userId },
      include: { subject: true },
      orderBy: { createdAt: "desc" },
    });
  }

  async findById(id: string, userId: string) {
    return prisma.task.findFirst({
      where: { id, userId },
      include: { subject: true },
    });
  }

  async create(userId: string, data: { title: string; description?: string | null; dueDate?: string | Date | null; completed?: boolean; subjectId?: string | null }) {
    return prisma.task.create({
      data: {
        ...data,
        userId,
      },
      include: { subject: true },
    });
  }

  async update(id: string, userId: string, data: Partial<{ title: string; description: string | null; dueDate: string | Date | null; completed: boolean; subjectId: string | null }>) {
    return prisma.task.update({
      where: { id, userId },
      data,
      include: { subject: true },
    });
  }

  async delete(id: string, userId: string) {
    return prisma.task.delete({
      where: { id, userId },
    });
  }
}
