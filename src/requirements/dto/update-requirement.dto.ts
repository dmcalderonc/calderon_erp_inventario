import { IsEnum } from 'class-validator';
import { RequirementStatus } from '../entities/requirement.entity';

export class UpdateRequirementDto {
  @IsEnum(RequirementStatus)
  estado: RequirementStatus;
}