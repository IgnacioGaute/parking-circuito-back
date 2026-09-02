import {
  ArrayNotEmpty,
  IsArray,
  IsBoolean,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
} from 'class-validator';
import { FieldType } from '../enums/field-type.enum';

export class CreateFieldDefinitionDto {
  @IsString()
  @Matches(/^[a-z][a-z0-9_]*$/, {
    message:
      'key debe ser minúscula, empezar con letra y usar solo letras, números o guión bajo',
  })
  key!: string;

  @IsString()
  @IsNotEmpty()
  label!: string;

  @IsEnum(FieldType)
  type!: FieldType;

  @IsOptional()
  @IsBoolean()
  required?: boolean;

  @IsOptional()
  @IsArray()
  @ArrayNotEmpty()
  @IsString({ each: true })
  options?: string[];

  @IsOptional()
  @IsInt()
  sortOrder?: number;
}
