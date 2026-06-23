import { prisma } from "@/lib/prisma";

export class SubjectRepository {
  async findAllByUserId(userId: string) {
    return prisma.subject.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
    });
  }

  async findById(id: string, userId: string) {
    return prisma.subject.findFirst({
      where: { id, userId },
    });
  }

  async create(userId: string, data: { name: string; color?: string }) {
    return prisma.subject.create({
      data: {
        ...data,
        userId,
      },
    });
  }

  async update(id: string, userId: string, data: { name?: string; color?: string }) {
    return prisma.subject.update({
      where: { id, userId },
      data,
    });
  }

  async delete(id: string, userId: string) {
    return prisma.subject.delete({
      where: { id, userId },
    });
  }
}
