import { Injectable } from '@nestjs/common';
import { UpdateTeacherDto } from './dto/update-teacher.dto';
import { PrismaProfilesService } from 'src/prisma/prisma-profiles.service';
import { PaginationDto } from 'src/pagination/pagination.dto';

@Injectable()
export class TeacherService {
  constructor(private readonly prisma: PrismaProfilesService) {}

  private readonly includes = {
    teacherProfile: {
      include: { speciality: true, career: true, subjects: true },
    },
  };

  async findAll({ page = 1, limit = 10 }: PaginationDto) {
    const skip = (page - 1) * limit;
    const [data, total] = await Promise.all([
      this.prisma.userReference.findMany({
        where: { roleId: 2 },
        skip,
        take: limit,
        include: this.includes,
      }),
      this.prisma.userReference.count({ where: { roleId: 2 } }),
    ]);
    return { data, total, page, limit };
  }

  async findOne(id: number) {
    return await this.prisma.userReference.findUnique({
      where: { id },
      include: this.includes
    });
  }

  async update(id: number, updateTeacherDto: UpdateTeacherDto) {
    return await this.prisma.userReference.update({
      where: { id },
      data: {
        ...(updateTeacherDto.name && { name: updateTeacherDto.name }),
        ...(updateTeacherDto.email && { email: updateTeacherDto.email }),
        ...((updateTeacherDto.specialityId || updateTeacherDto.careerId) && {
          teacherProfile: {
            update: {
              ...(updateTeacherDto.specialityId && {
                specialityId: updateTeacherDto.specialityId,
              }),
              ...(updateTeacherDto.careerId && {
                careerId: updateTeacherDto.careerId,
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
    return { message: `Teacher with ID ${id} has been successfully removed` };
  }
}
