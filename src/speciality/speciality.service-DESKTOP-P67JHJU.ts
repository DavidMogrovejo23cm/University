import { Injectable } from '@nestjs/common';
import { CreateSpecialityDto } from './dto/create-speciality.dto';
import { UpdateSpecialityDto } from './dto/update-speciality.dto';
import { PrismaAcademicService } from 'src/prisma/prisma-academic.service';
import { PaginationDto } from 'src/pagination/pagination.dto';

@Injectable()
export class SpecialityService {
  constructor(private readonly prisma: PrismaAcademicService) {}

  async create(createSpecialityDto: CreateSpecialityDto) {
    return await this.prisma.speciality.create({ data: createSpecialityDto });
  }

  async findAll({ page = 1, limit = 10 }: PaginationDto) {
    const skip = (page - 1) * limit;
    const [data, total] = await Promise.all([
      this.prisma.speciality.findMany({ skip, take: limit }),
      this.prisma.speciality.count(),
    ]);
    return { data, total, page, limit };
  }

  async findOne(id: number) {
    return await this.prisma.speciality.findUnique({ where: { id } });
  }

  async update(id: number, updateSpecialityDto: UpdateSpecialityDto) {
    return await this.prisma.speciality.update({
      where: { id },
      data: updateSpecialityDto,
    });
  }

  async remove(id: number) {
    await this.prisma.speciality.delete({ where: { id } });
    return {
      message: `Speciality with ID ${id} has been successfully removed`,
    };
  }
}
