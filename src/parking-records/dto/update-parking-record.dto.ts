import {
  IsEnum,
  IsNotEmpty,
  IsObject,
  IsOptional,
  IsString,
} from 'class-validator';
import { VehicleType } from '../enums/vehicle-type.enum';

export class UpdateParkingRecordDto {
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  placa?: string;

  @IsOptional()
  @IsEnum(VehicleType)
  tipo?: VehicleType;

  @IsOptional()
  @IsObject()
  extraFields?: Record<string, unknown>;
}
