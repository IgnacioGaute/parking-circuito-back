import { IsOptional, IsString } from 'class-validator';

export class QueryInsideDto {
  @IsOptional()
  @IsString()
  placa?: string;
}
