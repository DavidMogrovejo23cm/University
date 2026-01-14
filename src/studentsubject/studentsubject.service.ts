import { ConflictException, Injectable, InternalServerErrorException, NotFoundException } from '@nestjs/common';
import { CreateStudentsubjectDto } from './dto/create-studentsubject.dto';
import { UpdateStudentsubjectDto } from './dto/update-studentsubject.dto';
import { PrismaProfilesService } from 'src/prisma/prisma-profiles.service';
import { PaginationDto } from 'src/pagination/pagination.dto';

@Injectable()
export class StudentsubjectService {
  constructor(private readonly prisma: PrismaProfilesService) { }

  private readonly studentSubjectIncludes = {
    studentProfile: {
      include: {
        user: true,
        career: true
      }
    },
    subject: {
      include: {
        career: true,
        subjectAssignments: {
          include: {
            teacherProfile: true
          }
        }
      }
    }
  }

  async create(createStudentsubjectDto: CreateStudentsubjectDto) {
    try {
      const existingEnrollment = await this.prisma.studentSubject.findFirst({
        where: {
          studentProfileId: createStudentsubjectDto.studentProfileId,
          subjectId: createStudentsubjectDto.subjectId
        }
      });

      if (existingEnrollment) {
        throw new ConflictException('Student is already enrolled in this subject');
      }

      const studentSubject = await this.prisma.studentSubject.create({
        data: createStudentsubjectDto,
        include: this.studentSubjectIncludes
      });

      return studentSubject;

    } catch (error) {
      if (error instanceof ConflictException) {
        throw error;
      }

      throw new InternalServerErrorException('Error enrolling student in subject');
    }
  }

  async findAll(findWithPagination: PaginationDto) {
    const { page = 1, limit = 10 } = findWithPagination;
    const skip = (page - 1) * limit;

    try {
      const [data, total] = await Promise.all([
        this.prisma.studentSubject.findMany({
          skip,
          take: limit,
          include: this.studentSubjectIncludes
        }),
        this.prisma.studentSubject.count()
      ]);

      return {
        data,
        total,
        page,
        limit
      };

    } catch (error) {
      throw new InternalServerErrorException('Error fetching student enrollments');
    }
  }

  async findOne(id: number) {
    try {
      const studentSubject = await this.prisma.studentSubject.findUnique({
        where: { id },
        include: this.studentSubjectIncludes
      });

      if (!studentSubject) {
        throw new NotFoundException('Student enrollment not found');
      }

      return studentSubject;

    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new InternalServerErrorException('Error fetching student enrollment');
    }
  }

  async update(id: number, updateStudentsubjectDto: UpdateStudentsubjectDto) {
    try {
      const existingStudentSubject = await this.prisma.studentSubject.findUnique({
        where: { id }
      });

      if (!existingStudentSubject) {
        throw new NotFoundException(`Student Subject relationship with ID ${id} not found`);
      }

      if (updateStudentsubjectDto.studentProfileId || updateStudentsubjectDto.subjectId) {
        const duplicateEnrollment = await this.prisma.studentSubject.findFirst({
          where: {
            studentProfileId: updateStudentsubjectDto.studentProfileId,
            subjectId: updateStudentsubjectDto.subjectId,
            id: { not: id }
          }
        });

        if (duplicateEnrollment) {
          throw new ConflictException(`This student is already enrolled in this subject`);
        }
      }

      const updatedStudentSubject = await this.prisma.studentSubject.update({
        where: { id },
        data: updateStudentsubjectDto,
        include: this.studentSubjectIncludes
      });

      return updatedStudentSubject;
    } catch (error) {
      if (error instanceof NotFoundException || error instanceof ConflictException) {
        throw error;
      }
      throw new InternalServerErrorException('Error updating student subject relationship');
    }
  }

  async remove(id: number) {
    try {
      const existingStudentSubject = await this.prisma.studentSubject.findUnique({
        where: { id }
      });

      if (!existingStudentSubject) {
        throw new NotFoundException(`Student Subject relationship with ID ${id} not found`);
      }

      await this.prisma.studentSubject.delete({
        where: { id }
      });

      return { message: `Student Subject relationship with ID ${id} has been successfully removed` };
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new InternalServerErrorException('Error removing student subject relationship');
    }
  }

  // ============ PARTE 4: OPERACIÓN TRANSACCIONAL ============

  /**
   * Matricular estudiante con transacción ACID
   * 
   * Esta operación garantiza:
   * - ATOMICIDAD: Todas las operaciones se completan o ninguna
   * - CONSISTENCIA: Los datos quedan en estado válido
   * - AISLAMIENTO: Las operaciones concurrentes no interfieren
   * - DURABILIDAD: Los cambios persisten después del commit
   * 
   * Pasos:
   * 1. Verificar que el estudiante esté activo
   * 2. Verificar disponibilidad de cupos en la asignatura
   * 3. Registrar la matrícula
   * 4. Descontar el cupo disponible de la asignatura
   * 
   * Si alguna operación falla, toda la transacción se revierte
   */
  async enrollStudentWithTransaction(studentProfileId: number, subjectId: number) {
    try {
      // Usar transacción de Prisma para garantizar ACID
      const result = await this.prisma.$transaction(async (prisma) => {
        // PASO 1: Verificar que el estudiante esté activo
        const studentProfile = await prisma.studentProfile.findUnique({
          where: { id: studentProfileId },
          include: {
            user: true
          }
        });

        if (!studentProfile) {
          throw new NotFoundException(`Student profile with ID ${studentProfileId} not found`);
        }

        if (studentProfile.user.status !== 'active') {
          throw new ConflictException(`Student is not active. Current status: ${studentProfile.user.status}`);
        }

        // PASO 2: Verificar disponibilidad de cupos en la asignatura
        const subject = await prisma.subjectReference.findUnique({
          where: { id: subjectId }
        });

        if (!subject) {
          throw new NotFoundException(`Subject with ID ${subjectId} not found`);
        }

        if (subject.availableQuota <= 0) {
          throw new ConflictException(
            `No available quota for subject "${subject.name}". Current quota: ${subject.availableQuota}/${subject.maxQuota}`
          );
        }

        // Verificar si el estudiante ya está matriculado en esta materia
        const existingEnrollment = await prisma.studentSubject.findFirst({
          where: {
            studentProfileId: studentProfileId,
            subjectId: subjectId
          }
        });

        if (existingEnrollment) {
          throw new ConflictException('Student is already enrolled in this subject');
        }

        // PASO 3: Registrar la matrícula
        const enrollment = await prisma.studentSubject.create({
          data: {
            studentProfileId: studentProfileId,
            subjectId: subjectId,
            status: 'enrolled'
          },
          include: {
            studentProfile: {
              include: {
                user: true,
                career: true
              }
            },
            subject: true
          }
        });

        // PASO 4: Descontar el cupo disponible de la asignatura
        const updatedSubject = await prisma.subjectReference.update({
          where: { id: subjectId },
          data: {
            availableQuota: {
              decrement: 1
            }
          }
        });

        return {
          enrollment,
          updatedSubject,
          message: 'Student successfully enrolled. Quota updated.',
          quotaInfo: {
            previousQuota: subject.availableQuota,
            currentQuota: updatedSubject.availableQuota,
            maxQuota: updatedSubject.maxQuota
          }
        };
      }, {
        // Configuración de aislamiento para evitar race conditions
        isolationLevel: 'Serializable', // Máximo nivel de aislamiento
        maxWait: 5000, // Esperar máximo 5 segundos por el lock
        timeout: 10000, // Timeout de 10 segundos para la transacción
      });

      return result;

    } catch (error) {
      // Si es un error conocido, propagarlo
      if (error instanceof NotFoundException || error instanceof ConflictException) {
        throw error;
      }

      // Si es un error de Prisma relacionado con transacciones
      if (error.code === 'P2034') {
        throw new ConflictException('Transaction conflict: Another enrollment is in progress. Please try again.');
      }

      // Error genérico
      throw new InternalServerErrorException(
        `Error enrolling student: ${error.message || 'Unknown error'}`
      );
    }
  }
}
