import { IsOptional, IsString, MaxLength } from 'class-validator';

export class CancelParkingRecordDto {
  @IsOptional()
  @IsString()
  @MaxLength(280)
  reason?: string;
}
