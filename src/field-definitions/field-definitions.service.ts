import {
  BadRequestException,
  ConflictException,
  Injectable,
  InternalServerErrorException,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CreateFieldDefinitionDto } from './dto/create-field-definition.dto';
import { UpdateFieldDefinitionDto } from './dto/update-field-definition.dto';
import { FieldDefinition } from './entities/field-definition.entity';
import { FieldType } from './enums/field-type.enum';

@Injectable()
export class FieldDefinitionsService {
  private readonly logger = new Logger(FieldDefinitionsService.name);

  constructor(
    @InjectRepository(FieldDefinition)
    private readonly fieldDefinitionsRepository: Repository<FieldDefinition>,
  ) {}

  async findAll(): Promise<FieldDefinition[]> {
    try {
      return await this.fieldDefinitionsRepository.find({
        order: { sortOrder: 'ASC', createdAt: 'ASC' },
      });
    } catch (error) {
      this.logger.error('Error al listar campos dinámicos', this.stack(error));
      throw new InternalServerErrorException(
        'No se pudieron obtener los campos',
      );
    }
  }

  async findActive(): Promise<FieldDefinition[]> {
    try {
      return await this.fieldDefinitionsRepository.find({
        where: { active: true },
        order: { sortOrder: 'ASC', createdAt: 'ASC' },
      });
    } catch (error) {
      this.logger.error('Error al listar campos activos', this.stack(error));
      throw new InternalServerErrorException(
        'No se pudieron obtener los campos',
      );
    }
  }

  async create(dto: CreateFieldDefinitionDto): Promise<FieldDefinition> {
    this.assertValidOptions(dto.type, dto.options);
    try {
      // La key sigue ocupada por un campo eliminado (soft delete), que se
      // mantiene para no perder el label de registros históricos. Si el
      // admin vuelve a crear un campo con esa misma key, reactivamos esa
      // fila en vez de fallar por la constraint unique.
      const existing = await this.fieldDefinitionsRepository.findOne({
        where: { key: dto.key },
      });
      if (existing && !existing.active) {
        existing.label = dto.label;
        existing.type = dto.type;
        existing.required = dto.required ?? false;
        existing.options =
          dto.type === FieldType.SELECT ? (dto.options ?? null) : null;
        existing.sortOrder = dto.sortOrder ?? 0;
        existing.active = true;
        return await this.fieldDefinitionsRepository.save(existing);
      }

      const field = this.fieldDefinitionsRepository.create({
        key: dto.key,
        label: dto.label,
        type: dto.type,
        required: dto.required ?? false,
        options: dto.type === FieldType.SELECT ? (dto.options ?? null) : null,
        sortOrder: dto.sortOrder ?? 0,
        isSystem: false,
      });
      return await this.fieldDefinitionsRepository.save(field);
    } catch (error) {
      if (this.isUniqueViolation(error)) {
        throw new ConflictException(
          `Ya existe un campo con la key "${dto.key}"`,
        );
      }
      this.logger.error(`Error al crear campo ${dto.key}`, this.stack(error));
      throw new InternalServerErrorException('No se pudo crear el campo');
    }
  }

  async createSystemField(field: {
    key: string;
    label: string;
    type: FieldType;
    required: boolean;
    options?: string[] | null;
    sortOrder: number;
  }): Promise<FieldDefinition> {
    const entity = this.fieldDefinitionsRepository.create({
      ...field,
      options: field.options ?? null,
      isSystem: true,
    });
    return this.fieldDefinitionsRepository.save(entity);
  }

  async countSystemFields(): Promise<number> {
    return this.fieldDefinitionsRepository.count({ where: { isSystem: true } });
  }

  async update(
    id: string,
    dto: UpdateFieldDefinitionDto,
  ): Promise<FieldDefinition> {
    try {
      const field = await this.findOne(id);
      const nextType = dto.type ?? field.type;
      const nextOptions = dto.options ?? field.options ?? undefined;
      this.assertValidOptions(nextType, nextOptions ?? undefined);

      if (dto.label !== undefined) field.label = dto.label;
      if (dto.type !== undefined) field.type = dto.type;
      if (dto.required !== undefined) field.required = dto.required;
      if (dto.sortOrder !== undefined) field.sortOrder = dto.sortOrder;
      if (dto.active !== undefined) field.active = dto.active;
      if (dto.options !== undefined) field.options = dto.options;
      if (field.type !== FieldType.SELECT) field.options = null;

      return await this.fieldDefinitionsRepository.save(field);
    } catch (error) {
      if (
        error instanceof NotFoundException ||
        error instanceof BadRequestException
      ) {
        throw error;
      }
      this.logger.error(`Error al actualizar campo ${id}`, this.stack(error));
      throw new InternalServerErrorException('No se pudo actualizar el campo');
    }
  }

  async remove(id: string): Promise<void> {
    try {
      const field = await this.findOne(id);
      if (field.isSystem) {
        throw new BadRequestException(
          'No se puede eliminar un campo del sistema',
        );
      }
      // Soft delete: registros anteriores pueden tener datos guardados bajo
      // esta key en su extraFields. Si borráramos la fila, se pierde el
      // label/type necesario para mostrar esos datos históricos.
      field.active = false;
      await this.fieldDefinitionsRepository.save(field);
    } catch (error) {
      if (
        error instanceof NotFoundException ||
        error instanceof BadRequestException
      ) {
        throw error;
      }
      this.logger.error(`Error al eliminar campo ${id}`, this.stack(error));
      throw new InternalServerErrorException('No se pudo eliminar el campo');
    }
  }

  private async findOne(id: string): Promise<FieldDefinition> {
    const field = await this.fieldDefinitionsRepository.findOne({
      where: { id },
    });
    if (!field) {
      throw new NotFoundException(`Campo ${id} no encontrado`);
    }
    return field;
  }

  private assertValidOptions(type: FieldType, options?: string[]): void {
    if (type === FieldType.SELECT && (!options || options.length === 0)) {
      throw new BadRequestException(
        'Los campos de tipo "select" requieren al menos una opción',
      );
    }
  }

  private isUniqueViolation(error: unknown): boolean {
    return (
      typeof error === 'object' &&
      error !== null &&
      'code' in error &&
      (error as { code?: string }).code === '23505'
    );
  }

  private stack(error: unknown): string | undefined {
    return error instanceof Error ? error.stack : undefined;
  }
}
