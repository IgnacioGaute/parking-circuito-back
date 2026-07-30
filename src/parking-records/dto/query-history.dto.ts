import { IsEnum, IsOptional, IsString } from 'class-validator';
import { VehicleType } from '../enums/vehicle-type.enum';

export class QueryHistoryDto {
  @IsOptional()
  @IsString()
  placa?: string;

  @IsOptional()
  @IsEnum(VehicleType)
  tipo?: VehicleType;
}
