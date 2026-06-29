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
  async getStats(userId: string) {
    const totalTasks = await prisma.task.count({ where: { userId } });
    const completedTasks = await prisma.task.count({ where: { userId, completed: true } });
    const overdueTasks = await prisma.task.count({
      where: {
        userId,
        completed: false,
        dueDate: {
          lt: new Date(),
        },
      },
    });
    return { totalTasks, completedTasks, overdueTasks };
  }

  async findByTitleAndSubject(userId: string, title: string, subjectId: string) {
    return prisma.task.findFirst({
      where: {
        userId,
        title,
        subjectId,
      },
    });
  }
}
