import { IsOptional, IsInt, Min } from 'class-validator';
import { Type } from 'class-transformer';

export class StockThresholdDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  umbral?: number = 10; 
}