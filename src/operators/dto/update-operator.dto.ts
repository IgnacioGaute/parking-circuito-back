import { IsEnum, IsOptional, IsString, Length } from 'class-validator';
import { Role } from '../../common/enums/role.enum';

export class UpdateOperatorDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  @Length(4, 4)
  pin?: string;

  @IsOptional()
  @IsEnum(Role)
  role?: Role;
}
