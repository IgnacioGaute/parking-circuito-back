import { IsString, IsUUID, Length } from 'class-validator';

export class LoginDto {
  @IsUUID()
  operatorId!: string;

  @IsString()
  @Length(4, 4)
  pin!: string;
}
