import { Injectable } from '@nestjs/common';
import { CreateCycleDto } from './dto/create-cycle.dto';
import { UpdateCycleDto } from './dto/update-cycle.dto';
import { PrismaAcademicService } from 'src/prisma/prisma-academic.service';
import { PaginationDto } from 'src/pagination/pagination.dto';

@Injectable()
export class CycleService {
  constructor(private prisma: PrismaAcademicService) {}

  private readonly includes = { _count: { select: { subjects: true } } };

  async create(createCycleDto: CreateCycleDto) {
    if (createCycleDto.isActive) {
      await this.prisma.cycle.updateMany({
        where: { isActive: true },
        data: { isActive: false },
      });
    }
    return this.prisma.cycle.create({
      data: {
        ...createCycleDto,
        startDate: new Date(createCycleDto.startDate),
        endDate: new Date(createCycleDto.endDate),
      },
    });
  }

  async findAll({ page = 1, limit = 10 }: PaginationDto) {
    const skip = (page - 1) * limit;
    const [cycles, total] = await Promise.all([
      this.prisma.cycle.findMany({
        skip,
        take: limit,
        orderBy: [{ year: 'desc' }, { period: 'desc' }],
        include: this.includes,
      }),
      this.prisma.cycle.count(),
    ]);
    return {
      data: cycles,
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
    };
  }

  async findOne(id: number) {
    return await this.prisma.cycle.findUnique({
      where: { id },
      include: { subjects: { include: { career: true } } }
    });
  }

  async findActive() {
    return await this.prisma.cycle.findFirst({
      where: { isActive: true },
      include: this.includes,
    });
  }

  async update(id: number, updateCycleDto: UpdateCycleDto) {
    if (updateCycleDto.isActive) {
      await this.prisma.cycle.updateMany({
        where: { isActive: true, NOT: { id } },
        data: { isActive: false }
      });
    }
    return await this.prisma.cycle.update({
      where: { id },
      data: {
        ...updateCycleDto,
        ...(updateCycleDto.startDate && {
          startDate: new Date(updateCycleDto.startDate),
        }),
        ...(updateCycleDto.endDate && {
          endDate: new Date(updateCycleDto.endDate),
        }),
      },
    });
  }

  async remove(id: number) {
    await this.prisma.cycle.delete({ where: { id } });
    return { message: `Ciclo con ID ${id} eliminado correctamente` };
  }
}
