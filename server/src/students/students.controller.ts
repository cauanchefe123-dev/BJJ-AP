import {
  Controller,
  Get,
  Post,
  Body,
  Put,
  Param,
  Delete,
  Query,
  ParseIntPipe,
  HttpCode,
  HttpStatus,
  NotFoundException,
} from '@nestjs/common';
import { StudentsService } from './students.service.ts';
import { Prisma, Student, Belt } from '@prisma/client';

@Controller('api/v2/students')
export class StudentsController {
  constructor(private readonly studentsService: StudentsService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async create(@Body() createStudentDto: Prisma.StudentCreateInput): Promise<Student> {
    return this.studentsService.create(createStudentDto);
  }

  @Get()
  async findAll(@Query('academyId') academyId?: string): Promise<Student[]> {
    const parsedId = academyId ? parseInt(academyId, 10) : undefined;
    return this.studentsService.findAll(parsedId);
  }

  @Get(':id')
  async findOne(@Param('id', ParseIntPipe) id: number): Promise<Student> {
    return this.studentsService.findOne(id);
  }

  @Get('by-reg/:regNumber')
  async findByRegistration(@Param('regNumber') regNumber: string): Promise<Student> {
    const student = await this.studentsService.findByRegistrationNumber(regNumber);
    if (!student) {
      throw new NotFoundException(`Aluno com matrícula "${regNumber}" não encontrado.`);
    }
    return student;
  }

  @Put(':id')
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateStudentDto: Prisma.StudentUpdateInput,
  ): Promise<Student> {
    return this.studentsService.update(id, updateStudentDto);
  }

  @Post(':id/graduate')
  async graduate(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: { belt: Belt; stripes: number },
  ): Promise<Student> {
    return this.studentsService.graduate(id, body.belt, body.stripes);
  }

  @Post(':id/checkin')
  async addAttendance(@Param('id', ParseIntPipe) id: number): Promise<Student> {
    return this.studentsService.addAttendance(id);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(@Param('id', ParseIntPipe) id: number): Promise<void> {
    await this.studentsService.remove(id);
  }
}
