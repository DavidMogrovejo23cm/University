import { Injectable } from '@nestjs/common';
import { CreateCareerDto } from './dto/create-career.dto';
import { UpdateCareerDto } from './dto/update-career.dto';
import { PrismaAcademicService } from 'src/prisma/prisma-academic.service';
import { PaginationDto } from 'src/pagination/pagination.dto';

@Injectable()
export class CareerService {
  constructor(private readonly prisma: PrismaAcademicService) {}

  private readonly includes = { subjects: true };

  async create(createCareerDto: CreateCareerDto) {
    return await this.prisma.career.create({ data: createCareerDto });
  }

  async findAll({ page = 1, limit = 10 }: PaginationDto) {
    const skip = (page - 1) * limit;
    const [data, total] = await Promise.all([
      this.prisma.career.findMany({
        skip,
        take: limit,
        include: this.includes,
      }),
      this.prisma.career.count(),
    ]);
    return { data, total, page, limit };
  }

  async findOne(id: number) {
    return await this.prisma.career.findUnique({
      where: { id },
      include: this.includes
    });
  }

  async update(id: number, updateCareerDto: UpdateCareerDto) {
    return await this.prisma.career.update({
      where: { id },
      data: updateCareerDto,
      include: this.includes
    });
  }

  async remove(id: number) {
    await this.prisma.career.delete({ where: { id } });
    return { message: `Career with ID ${id} has been successfully removed` };
  }
}
