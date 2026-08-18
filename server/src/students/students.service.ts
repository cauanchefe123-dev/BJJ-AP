import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.ts';
import { Prisma, Student, Belt } from '@prisma/client';

@Injectable()
export class StudentsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: Prisma.StudentCreateInput): Promise<Student> {
    return this.prisma.student.create({
      data,
    });
  }

  async findAll(academyId?: number): Promise<Student[]> {
    return this.prisma.student.findMany({
      where: academyId ? { academyId } : undefined,
      orderBy: { name: 'asc' },
      include: { academy: true },
    });
  }

  async findOne(id: number): Promise<Student> {
    const student = await this.prisma.student.findUnique({
      where: { id },
      include: { academy: true },
    });
    if (!student) {
      throw new NotFoundException(`Aluno com ID #${id} não encontrado.`);
    }
    return student;
  }

  async findByRegistrationNumber(registrationNumber: string): Promise<Student | null> {
    return this.prisma.student.findUnique({
      where: { registrationNumber },
      include: { academy: true },
    });
  }

  async update(id: number, data: Prisma.StudentUpdateInput): Promise<Student> {
    await this.findOne(id);
    return this.prisma.student.update({
      where: { id },
      data,
    });
  }

  async remove(id: number): Promise<Student> {
    await this.findOne(id);
    return this.prisma.student.delete({
      where: { id },
    });
  }

  async graduate(id: number, belt: Belt, stripes: number): Promise<Student> {
    await this.findOne(id);
    return this.prisma.student.update({
      where: { id },
      data: {
        belt,
        stripes,
        classesSinceLastGraduation: 0,
      },
    });
  }

  async addAttendance(id: number): Promise<Student> {
    const student = await this.findOne(id);
    return this.prisma.student.update({
      where: { id },
      data: {
        totalClassesAttended: student.totalClassesAttended + 1,
        classesSinceLastGraduation: student.classesSinceLastGraduation + 1,
      },
    });
  }
}
