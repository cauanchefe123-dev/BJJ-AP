import {
  Controller,
  Get,
  Post,
  Body,
  Put,
  Param,
  Delete,
  ParseIntPipe,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { AcademiesService } from './academies.service.ts';
import { Prisma, Academy } from '@prisma/client';

@Controller('api/v2/academies')
export class AcademiesController {
  constructor(private readonly academiesService: AcademiesService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async create(@Body() createAcademyDto: Prisma.AcademyCreateInput): Promise<Academy> {
    return this.academiesService.create(createAcademyDto);
  }

  @Get()
  async findAll(): Promise<Academy[]> {
    return this.academiesService.findAll();
  }

  @Get(':id')
  async findOne(@Param('id', ParseIntPipe) id: number): Promise<Academy> {
    return this.academiesService.findOne(id);
  }

  @Put(':id')
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateAcademyDto: Prisma.AcademyUpdateInput,
  ): Promise<Academy> {
    return this.academiesService.update(id, updateAcademyDto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(@Param('id', ParseIntPipe) id: number): Promise<void> {
    await this.academiesService.remove(id);
  }
}
