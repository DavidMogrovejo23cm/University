import { Controller, Get, Patch, Param, Delete, Query, Body } from '@nestjs/common';
import { StudentService } from './student.service';
import { UpdateStudentDto } from './dto/update-student.dto';
import { PaginationDto } from 'src/pagination/pagination.dto';
import { ApiTags, ApiOperation } from '@nestjs/swagger';

@ApiTags('Students')
@Controller('student')
export class StudentController {
  constructor(private readonly studentService: StudentService) { }

  @ApiOperation({ summary: 'Get all students' })
  @Get()
  findAll(@Query() findWithPagination: PaginationDto) {
    return this.studentService.findAll(findWithPagination);
  }

  @ApiOperation({ summary: 'Get a student by ID' })
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.studentService.findOne(+id);
  }

  @ApiOperation({ summary: 'Update a student profile' })
  @Patch(':id')
  update(@Param('id') id: string, @Body() updateStudentDto: UpdateStudentDto) {
    return this.studentService.update(+id, updateStudentDto);
  }

  @ApiOperation({ summary: 'Delete a student' })
  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.studentService.remove(+id);
  }


  @ApiOperation({ summary: 'Get all active students with their career information' })
  @Get('queries/active-with-career')
  findActiveStudentsWithCareer() {
    return this.studentService.findActiveStudentsWithCareer();
  }

  @ApiOperation({ summary: 'Get student enrollments by academic period' })
  @Get(':id/enrollments/:cycleId')
  findStudentEnrollmentsByPeriod(
    @Param('id') id: string,
    @Param('cycleId') cycleId: string
  ) {
    return this.studentService.findStudentEnrollmentsByPeriod(+id, +cycleId);
  }

  @ApiOperation({ summary: 'Search students with logical filters (AND operations)' })
  @Get('queries/with-filters')
  findStudentsWithFilters(
    @Query('status') status?: string,
    @Query('careerId') careerId?: string,
    @Query('cycleId') cycleId?: string
  ) {
    return this.studentService.findStudentsWithFilters({
      status,
      careerId: careerId ? +careerId : undefined,
      cycleId: cycleId ? +cycleId : undefined
    });
  }

  @ApiOperation({ summary: 'Get student enrollment report (Native SQL)' })
  @Get('reports/enrollment-report')
  getStudentEnrollmentReport() {
    return this.studentService.getStudentEnrollmentReport();
  }
}
