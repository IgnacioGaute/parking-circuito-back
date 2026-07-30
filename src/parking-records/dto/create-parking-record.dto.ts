import { IsEnum, IsNotEmpty, IsObject, IsOptional, IsString } from 'class-validator';
import { VehicleType } from '../enums/vehicle-type.enum';

export class CreateParkingRecordDto {
  @IsString()
  @IsNotEmpty()
  placa!: string;

  @IsEnum(VehicleType)
  tipo!: VehicleType;

  @IsOptional()
  @IsString()
  fotoUrl?: string;

  @IsOptional()
  @IsObject()
  extraFields?: Record<string, unknown>;
}
