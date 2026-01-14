import { Controller, Get, Patch, Param, Delete, Query, Body } from '@nestjs/common';
import { TeacherService } from './teacher.service';
import { UpdateTeacherDto } from './dto/update-teacher.dto';
import { PaginationDto } from 'src/pagination/pagination.dto';
import { ApiTags, ApiOperation } from '@nestjs/swagger';

@ApiTags('Teachers')
@Controller('teacher')
export class TeacherController {
  constructor(private readonly teacherService: TeacherService) { }

  @ApiOperation({ summary: 'Get all teachers' })
  @Get()
  findAll(@Query() findWithPagination: PaginationDto) {
    return this.teacherService.findAll(findWithPagination);
  }

  @ApiOperation({ summary: 'Get a teacher by ID' })
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.teacherService.findOne(+id);
  }

  @ApiOperation({ summary: 'Update a teacher profile' })
  @Patch(':id')
  update(@Param('id') id: string, @Body() updateTeacherDto: UpdateTeacherDto) {
    return this.teacherService.update(+id, updateTeacherDto);
  }

  @ApiOperation({ summary: 'Delete a teacher' })
  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.teacherService.remove(+id);
  }


  @ApiOperation({ summary: 'Get teachers teaching more than one subject' })
  @Get('queries/multiple-subjects')
  findTeachersWithMultipleSubjects() {
    return this.teacherService.findTeachersWithMultipleSubjects();
  }

  @ApiOperation({ summary: 'Search teachers with logical filters (AND/OR/NOT)' })
  @Get('queries/with-filters')
  findTeachersWithLogicalFilters(
    @Query('specialityId') specialityId?: string,
    @Query('careerId') careerId?: string,
    @Query('hasSubjects') hasSubjects?: string,
    @Query('status') status?: string,
    @Query('excludeInactive') excludeInactive?: string
  ) {
    return this.teacherService.findTeachersWithLogicalFilters({
      specialityId: specialityId ? +specialityId : undefined,
      careerId: careerId ? +careerId : undefined,
      hasSubjects: hasSubjects === 'true' ? true : hasSubjects === 'false' ? false : undefined,
      status,
      excludeInactive: excludeInactive === 'false' ? false : true
    });
  }
}
