import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.ts';
import { Prisma, Academy } from '@prisma/client';

@Injectable()
export class AcademiesService {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: Prisma.AcademyCreateInput): Promise<Academy> {
    return this.prisma.academy.create({
      data,
    });
  }

  async findAll(): Promise<Academy[]> {
    return this.prisma.academy.findMany({
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: number): Promise<Academy> {
    const academy = await this.prisma.academy.findUnique({
      where: { id },
      include: {
        users: true,
        students: true,
      },
    });
    if (!academy) {
      throw new NotFoundException(`Academia com ID #${id} não encontrada.`);
    }
    return academy;
  }

  async update(id: number, data: Prisma.AcademyUpdateInput): Promise<Academy> {
    await this.findOne(id);
    return this.prisma.academy.update({
      where: { id },
      data,
    });
  }

  async remove(id: number): Promise<Academy> {
    await this.findOne(id);
    return this.prisma.academy.delete({
      where: { id },
    });
  }
}
