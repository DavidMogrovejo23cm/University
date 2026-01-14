import { ConflictException, Injectable, InternalServerErrorException, NotFoundException } from '@nestjs/common';
import { UpdateTeacherDto } from './dto/update-teacher.dto';
import { PrismaProfilesService } from 'src/prisma/prisma-profiles.service';
import { PaginationDto } from 'src/pagination/pagination.dto';

@Injectable()
export class TeacherService {
  constructor(private readonly prisma: PrismaProfilesService) { }

  private readonly teacherIncludes = {
    speciality: true,
    career: true,
    subjects: true
  }

  async findAll(findWithPagination: PaginationDto) {
    const { page = 1, limit = 10 } = findWithPagination;
    const skip = (page - 1) * limit;

    try {
      const [data, total] = await Promise.all([
        this.prisma.userReference.findMany({
          where: { roleId: 2 }, // 2 = TEACHER
          skip,
          take: limit,
          include: {
            teacherProfile: {
              include: {
                speciality: true,
                career: true,
                subjects: true
              }
            }
          }
        }),
        this.prisma.userReference.count({ where: { roleId: 2 } })
      ]);

      return {
        data,
        total,
        page,
        limit
      };

    } catch (error) {
      throw new InternalServerErrorException('Error fetching teachers');
    }
  }

  async findOne(id: number) {
    try {
      const user = await this.prisma.userReference.findUnique({
        where: { id },
        include: {
          teacherProfile: {
            include: {
              speciality: true,
              career: true,
              subjects: true
            }
          }
        }
      });

      if (!user || user.roleId !== 2) {
        throw new NotFoundException('Teacher not found');
      }

      return user;

    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new InternalServerErrorException('Error fetching teacher');
    }
  }

  async update(id: number, updateTeacherDto: UpdateTeacherDto) {
    try {
      const user = await this.prisma.userReference.findUnique({
        where: { id }
      });

      if (!user || user.roleId !== 2) {
        throw new NotFoundException(`Teacher with ID ${id} not found`);
      }

      if (updateTeacherDto.email) {
        const duplicateEmail = await this.prisma.userReference.findFirst({
          where: {
            email: updateTeacherDto.email,
            id: { not: id }
          }
        });

        if (duplicateEmail) {
          throw new ConflictException(`User with email ${updateTeacherDto.email} already exists`);
        }
      }

      const userUpdateData = {
        ...(updateTeacherDto.name && { name: updateTeacherDto.name }),
        ...(updateTeacherDto.email && { email: updateTeacherDto.email }),
      };

      const profileUpdateData = {
        ...(updateTeacherDto.specialityId && { specialityId: updateTeacherDto.specialityId }),
        ...(updateTeacherDto.careerId && { careerId: updateTeacherDto.careerId }),
      };
      const updatedUser = await this.prisma.userReference.update({
        where: { id },
        data: {
          ...userUpdateData,
          ...(Object.keys(profileUpdateData).length > 0 && {
            teacherProfile: {
              update: profileUpdateData
            }
          })
        },
        include: {
          teacherProfile: {
            include: {
              speciality: true,
              career: true,
              subjects: true
            }
          }
        }
      });

      return updatedUser;
    } catch (error) {
      if (error instanceof NotFoundException || error instanceof ConflictException) {
        throw error;
      }
      throw new InternalServerErrorException('Error updating teacher');
    }
  }

  async remove(id: number) {
    try {
      const user = await this.prisma.userReference.findUnique({
        where: { id }
      });

      if (!user || user.roleId !== 2) {
        throw new NotFoundException(`Teacher with ID ${id} not found`);
      }

      await this.prisma.userReference.delete({
        where: { id }
      });

      return { message: `Teacher with ID ${id} has been successfully removed` };
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new InternalServerErrorException('Error removing teacher');
    }
  }


  async findTeachersWithMultipleSubjects() {
    try {
      const teachers = await this.prisma.userReference.findMany({
        where: {
          roleId: 2, // TEACHER
          teacherProfile: {
            subjects: {}
          }
        },
        include: {
          teacherProfile: {
            include: {
              speciality: true,
              career: true,
              subjects: {
                include: {
                  subject: true
                }
              }
            }
          }
        }
      });

      const teachersWithMultipleSubjects = teachers.filter(
        teacher => teacher.teacherProfile && teacher.teacherProfile.subjects.length > 1
      );

      return teachersWithMultipleSubjects;
    } catch (error) {
      throw new InternalServerErrorException('Error fetching teachers with multiple subjects');
    }
  }


  async findTeachersWithLogicalFilters(filters: {
    specialityId?: number;
    careerId?: number;
    hasSubjects?: boolean;
    status?: string;
    excludeInactive?: boolean;
  }) {
    try {
      const { specialityId, careerId, hasSubjects, status = 'active', excludeInactive = true } = filters;

      const whereConditions: any = {
        roleId: 2, // TEACHER
        AND: []
      };

      if (excludeInactive) {
        whereConditions.AND.push({
          NOT: {
            status: 'inactive'
          }
        });
      } else if (status) {
        whereConditions.AND.push({
          status: status
        });
      }

      const teacherProfileConditions: any = {};

      if (specialityId) {
        teacherProfileConditions.specialityId = specialityId;
      }

      if (careerId) {
        teacherProfileConditions.careerId = careerId;
      }

      if (Object.keys(teacherProfileConditions).length > 0) {
        whereConditions.AND.push({
          teacherProfile: teacherProfileConditions
        });
      }

      const teachers = await this.prisma.userReference.findMany({
        where: whereConditions,
        include: {
          teacherProfile: {
            include: {
              speciality: true,
              career: true,
              subjects: {
                include: {
                  subject: true
                }
              }
            }
          }
        }
      });

      let filteredTeachers = teachers;
      if (hasSubjects !== undefined) {
        if (hasSubjects) {
          filteredTeachers = teachers.filter(
            teacher => teacher.teacherProfile && teacher.teacherProfile.subjects.length > 0
          );
        } else {
          filteredTeachers = teachers.filter(
            teacher => !teacher.teacherProfile || teacher.teacherProfile.subjects.length === 0
          );
        }
      }

      return filteredTeachers;
    } catch (error) {
      throw new InternalServerErrorException('Error fetching teachers with logical filters');
    }
  }
}
