import { Injectable } from '@nestjs/common';
import { UpdateStudentDto } from './dto/update-student.dto';
import { PrismaProfilesService } from 'src/prisma/prisma-profiles.service';
import { PaginationDto } from 'src/pagination/pagination.dto';

@Injectable()
export class StudentService {
  constructor(private readonly prisma: PrismaProfilesService) {}

  private readonly includes = {
    studentProfile: {
      include: {
        career: true,
        studentSubjects: { include: { subject: true } },
      },
    },
  };

  async findAll({ page = 1, limit = 10 }: PaginationDto) {
    const skip = (page - 1) * limit;
    const [data, total] = await Promise.all([
      this.prisma.userReference.findMany({
        where: { roleId: 3 },
        skip,
        take: limit,
        include: this.includes,
      }),
      this.prisma.userReference.count({ where: { roleId: 3 } }),
    ]);
    return { data, total, page, limit };
  }

  async findOne(id: number) {
    return await this.prisma.userReference.findUnique({
      where: { id },
      include: this.includes
    });
  }

  async update(id: number, updateStudentDto: UpdateStudentDto) {
    return await this.prisma.userReference.update({
      where: { id },
      data: {
        ...(updateStudentDto.name && { name: updateStudentDto.name }),
        ...(updateStudentDto.email && { email: updateStudentDto.email }),
        ...(updateStudentDto.status && { status: updateStudentDto.status }),
        ...((updateStudentDto.careerId || updateStudentDto.currentCicle) && {
          studentProfile: {
            update: {
              ...(updateStudentDto.careerId && {
                careerId: updateStudentDto.careerId,
              }),
              ...(updateStudentDto.currentCicle && {
                currentCicle: updateStudentDto.currentCicle,
              }),
            },
          },
        }),
      },
      include: this.includes,
    });
  }

  async remove(id: number) {
    await this.prisma.userReference.delete({ where: { id } });
    return { message: `Student with ID ${id} has been successfully removed` };
  }
}
