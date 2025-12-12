import { Module } from '@nestjs/common';
import { StudentsubjectService } from './studentsubject.service';
import { StudentsubjectController } from './studentsubject.controller';
import { PrismaModule } from 'src/prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [StudentsubjectController],
  providers: [StudentsubjectService]
})
export class StudentsubjectModule {}
