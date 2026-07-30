import { IsEnum, IsNotEmpty, IsString, Length } from 'class-validator';
import { Role } from '../../common/enums/role.enum';

export class CreateOperatorDto {
  @IsString()
  @IsNotEmpty()
  name!: string;

  @IsString()
  @Length(4, 4)
  pin!: string;

  @IsEnum(Role)
  role!: Role;
}
