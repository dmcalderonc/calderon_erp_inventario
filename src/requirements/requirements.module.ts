import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { RequirementsService } from './requirements.service';
import { RequirementsController } from './requirements.controller';
import { Requirement } from './entities/requirement.entity';
import { RequirementDetail } from './entities/requirement-detail.entity';
import { Inventario } from '../inventario/inventario.entity';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Requirement,
      RequirementDetail,
      Inventario,
    ]),
    AuthModule,
  ],
  controllers: [RequirementsController],
  providers: [RequirementsService],
  exports: [RequirementsService],
})
export class RequirementsModule {}
