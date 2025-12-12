import { Injectable } from '@nestjs/common';
import { CreateStudentsubjectDto } from './dto/create-studentsubject.dto';
import { UpdateStudentsubjectDto } from './dto/update-studentsubject.dto';
import { PrismaProfilesService } from 'src/prisma/prisma-profiles.service';
import { PaginationDto } from 'src/pagination/pagination.dto';

@Injectable()
export class StudentsubjectService {
  constructor(private readonly prisma: PrismaProfilesService) {}

  private readonly includes = {
    studentProfile: { include: { user: true, career: true } },
    subject: {
      include: {
        career: true,
        subjectAssignments: { include: { teacherProfile: true } },
      },
    },
  };

  async create(createStudentsubjectDto: CreateStudentsubjectDto) {
    return await this.prisma.studentSubject.create({
      data: createStudentsubjectDto,
      include: this.includes,
    });
  }

  async findAll({ page = 1, limit = 10 }: PaginationDto) {
    const skip = (page - 1) * limit;
    const [data, total] = await Promise.all([
      this.prisma.studentSubject.findMany({
        skip,
        take: limit,
        include: this.includes,
      }),
      this.prisma.studentSubject.count(),
    ]);
    return { data, total, page, limit };
  }

  async findOne(id: number) {
    return await this.prisma.studentSubject.findUnique({
      where: { id },
      include: this.includes
    });
  }

  async update(id: number, updateStudentsubjectDto: UpdateStudentsubjectDto) {
    return await this.prisma.studentSubject.update({
      where: { id },
      data: updateStudentsubjectDto,
      include: this.includes,
    });
  }

  async remove(id: number) {
    await this.prisma.studentSubject.delete({ where: { id } });
    return {
      message: `Student Subject relationship with ID ${id} has been successfully removed`,
    };
  }
}
