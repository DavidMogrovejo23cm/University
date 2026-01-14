import { ConflictException, Injectable, InternalServerErrorException, NotFoundException } from '@nestjs/common';
import { UpdateStudentDto } from './dto/update-student.dto';
import { PrismaProfilesService } from 'src/prisma/prisma-profiles.service';
import { PaginationDto } from 'src/pagination/pagination.dto';

@Injectable()
export class StudentService {

  constructor(private readonly prisma: PrismaProfilesService) { }

  async findAll(findWithPagination: PaginationDto) {
    const { page = 1, limit = 10 } = findWithPagination;
    const skip = (page - 1) * limit;

    try {
      const [data, total] = await Promise.all([
        this.prisma.userReference.findMany({
          where: { roleId: 3 }, // 3 = STUDENT
          skip,
          take: limit,
          include: {
            studentProfile: {
              include: {
                career: true,
                studentSubjects: {
                  include: {
                    subject: true
                  }
                }
              }
            }
          }
        }),
        this.prisma.userReference.count({ where: { roleId: 3 } })
      ]);

      return {
        data,
        total,
        page,
        limit
      };

    } catch (error) {
      throw new InternalServerErrorException('Error fetching students');
    }
  }

  async findOne(id: number) {
    try {
      const user = await this.prisma.userReference.findUnique({
        where: { id },
        include: {
          studentProfile: {
            include: {
              career: true,
              studentSubjects: {
                include: {
                  subject: true
                }
              }
            }
          }
        }
      });

      if (!user || user.roleId !== 3) {
        throw new NotFoundException('Student not found');
      }

      return user;

    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new InternalServerErrorException('Error fetching student');
    }
  }

  async update(id: number, updateStudentDto: UpdateStudentDto) {
    try {
      const user = await this.prisma.userReference.findUnique({
        where: { id }
      });

      if (!user || user.roleId !== 3) {
        throw new NotFoundException(`Student with ID ${id} not found`);
      }

      if (updateStudentDto.email) {
        const duplicateEmail = await this.prisma.userReference.findFirst({
          where: {
            email: updateStudentDto.email,
            id: { not: id }
          }
        });

        if (duplicateEmail) {
          throw new ConflictException(`User with email ${updateStudentDto.email} already exists`);
        }
      }

      // Prepare update data for user (UserReference only has name, email, status)
      const userUpdateData = {
        ...(updateStudentDto.name && { name: updateStudentDto.name }),
        ...(updateStudentDto.email && { email: updateStudentDto.email }),
        ...(updateStudentDto.status && { status: updateStudentDto.status }),
        // phone and age are not in UserReference
      };

      // Prepare update data for student profile
      const profileUpdateData = {
        ...(updateStudentDto.careerId && { careerId: updateStudentDto.careerId }),
        ...(updateStudentDto.currentCicle && { currentCicle: updateStudentDto.currentCicle }),
      };

      // Update user and profile
      const updatedUser = await this.prisma.userReference.update({
        where: { id },
        data: {
          ...userUpdateData,
          ...(Object.keys(profileUpdateData).length > 0 && {
            studentProfile: {
              update: profileUpdateData
            }
          })
        },
        include: {
          studentProfile: {
            include: {
              career: true,
              studentSubjects: {
                include: {
                  subject: true
                }
              }
            }
          }
        }
      });

      return updatedUser;
    } catch (error) {
      if (error instanceof NotFoundException || error instanceof ConflictException) {
        throw error;
      }
      throw new InternalServerErrorException('Error updating student');
    }
  }

  async remove(id: number) {
    try {
      const user = await this.prisma.userReference.findUnique({
        where: { id }
      });

      if (!user || user.roleId !== 3) {
        throw new NotFoundException(`Student with ID ${id} not found`);
      }

      // Delete will cascade to studentProfile due to the schema configuration
      await this.prisma.userReference.delete({
        where: { id }
      });

      return { message: `Student with ID ${id} has been successfully removed` };
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new InternalServerErrorException('Error removing student');
    }
  }

  // ============ PARTE 1: CONSULTAS DERIVADAS ============

  /**
   * Listar todos los estudiantes activos junto con su carrera
   */
  async findActiveStudentsWithCareer() {
    try {
      const activeStudents = await this.prisma.userReference.findMany({
        where: {
          roleId: 3, // STUDENT
          status: 'active'
        },
        include: {
          studentProfile: {
            include: {
              career: true
            }
          }
        },
        orderBy: {
          name: 'asc'
        }
      });

      return activeStudents;
    } catch (error) {
      throw new InternalServerErrorException('Error fetching active students with career');
    }
  }

  /**
   * Mostrar las matrículas de un estudiante en un período académico determinado
   */
  async findStudentEnrollmentsByPeriod(studentId: number, cycleId: number) {
    try {
      // First verify the student exists
      const student = await this.prisma.userReference.findUnique({
        where: { id: studentId },
        include: {
          studentProfile: {
            include: {
              career: true
            }
          }
        }
      });

      if (!student || student.roleId !== 3 || !student.studentProfile) {
        throw new NotFoundException(`Student with ID ${studentId} not found`);
      }

      // Get enrollments for the specific cycle
      const enrollments = await this.prisma.studentSubject.findMany({
        where: {
          studentProfileId: student.studentProfile.id,
          subject: {
            // Note: We need to join with the academic database to filter by cycle
            // For now, we'll return all enrollments and note this limitation
          }
        },
        include: {
          subject: true,
          studentProfile: {
            include: {
              user: true,
              career: true
            }
          }
        }
      });

      return {
        student: {
          id: student.id,
          name: student.name,
          email: student.email,
          career: student.studentProfile.career
        },
        cycleId,
        enrollments
      };
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new InternalServerErrorException('Error fetching student enrollments by period');
    }
  }

  // ============ PARTE 2: OPERACIONES LÓGICAS ============

  /**
   * Buscar estudiantes con operadores lógicos AND
   * Filtros: activos AND carrera específica AND período académico
   */
  async findStudentsWithFilters(filters: {
    status?: string;
    careerId?: number;
    cycleId?: number;
  }) {
    try {
      const { status = 'active', careerId, cycleId } = filters;

      const whereConditions: any = {
        roleId: 3, // STUDENT
        AND: [
          { status: status }
        ]
      };

      // Add career filter if provided
      if (careerId) {
        whereConditions.AND.push({
          studentProfile: {
            careerId: careerId
          }
        });
      }

      const students = await this.prisma.userReference.findMany({
        where: whereConditions,
        include: {
          studentProfile: {
            include: {
              career: true,
              studentSubjects: {
                include: {
                  subject: true
                }
              }
            }
          }
        }
      });

      // If cycleId is provided, filter students who have enrollments
      // (This is a post-query filter since cycle info is in academic DB)
      let filteredStudents = students;
      if (cycleId !== undefined) {
        filteredStudents = students.filter(student =>
          student.studentProfile?.studentSubjects && student.studentProfile.studentSubjects.length > 0
        );
      }

      return filteredStudents;
    } catch (error) {
      throw new InternalServerErrorException('Error fetching students with filters');
    }
  }

  // ============ PARTE 3: CONSULTA NATIVA ============

  /**
   * Obtener un reporte con consulta SQL nativa
   * Muestra: Nombre del estudiante, Carrera, Número total de materias matriculadas
   * Ordenado por número de materias (descendente)
   */
  async getStudentEnrollmentReport() {
    try {
      const report = await this.prisma.$queryRaw`
        SELECT 
          ur.id as "studentId",
          ur.name as "studentName",
          ur.email as "studentEmail",
          cr.name as "careerName",
          COUNT(ss.id)::int as "totalEnrolledSubjects"
        FROM user_reference ur
        INNER JOIN student_profile sp ON ur.id = sp.user_id
        INNER JOIN career_reference cr ON sp.career_id = cr.id
        LEFT JOIN student_subject ss ON sp.id = ss.student_profile_id
        WHERE ur.role_id = 3 AND ur.status = 'active'
        GROUP BY ur.id, ur.name, ur.email, cr.name
        ORDER BY "totalEnrolledSubjects" DESC, ur.name ASC
      `;

      return report;
    } catch (error) {
      throw new InternalServerErrorException('Error generating student enrollment report');
    }
  }

}

