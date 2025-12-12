import { Injectable } from '@nestjs/common';
import { CreateSubjectDto } from './dto/create-subject.dto';
import { UpdateSubjectDto } from './dto/update-subject.dto';
import { PrismaAcademicService } from 'src/prisma/prisma-academic.service';
import { PaginationDto } from 'src/pagination/pagination.dto';

@Injectable()
export class SubjectService {
  constructor(private readonly prisma: PrismaAcademicService) {}

  private readonly includes = { career: true };

  async create(createSubjectDto: CreateSubjectDto) {
    return this.prisma.subject.create({
      data: createSubjectDto,
      include: this.includes,
    });
  }

  async findAll({ page = 1, limit = 10 }: PaginationDto) {
    const skip = (page - 1) * limit;
    const [data, total] = await Promise.all([
      this.prisma.subject.findMany({
        skip,
        take: limit,
        include: this.includes,
      }),
      this.prisma.subject.count(),
    ]);
    return { data, total, page, limit };
  }

  async findOne(id: number) {
    return await this.prisma.subject.findUnique({
      where: { id },
      include: this.includes
    });
  }

  async update(id: number, updateSubjectDto: UpdateSubjectDto) {
    return await this.prisma.subject.update({
      where: { id },
      data: updateSubjectDto,
      include: this.includes,
    });
  }

  async remove(id: number) {
    await this.prisma.subject.delete({ where: { id } });
    return { message: `Subject with ID ${id} has been successfully removed` };
  }
}
