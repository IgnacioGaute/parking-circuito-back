import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  InternalServerErrorException,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { IsNull, Not, Repository } from 'typeorm';
import { AuthenticatedOperator } from '../auth/strategies/jwt.strategy';
import { Role } from '../common/enums/role.enum';
import { FieldDefinition } from '../field-definitions/entities/field-definition.entity';
import { FieldDefinitionsService } from '../field-definitions/field-definitions.service';
import { FieldType } from '../field-definitions/enums/field-type.enum';
import { Operator } from '../operators/entities/operator.entity';
import { OperatorsService } from '../operators/operators.service';
import { CancelParkingRecordDto } from './dto/cancel-parking-record.dto';
import { CreateParkingRecordDto } from './dto/create-parking-record.dto';
import { QueryHistoryDto } from './dto/query-history.dto';
import { UpdateParkingRecordDto } from './dto/update-parking-record.dto';
import { ParkingRecord } from './entities/parking-record.entity';
import { FrequentPlate } from './interfaces/frequent-plate.interface';

interface FrequentPlateRow {
  id: string;
  placa: string;
  tipo: FrequentPlate['tipo'];
  entradaTime: Date;
  extraFields: Record<string, unknown> | null;
  visitCount: string;
}

@Injectable()
export class ParkingRecordsService {
  private readonly logger = new Logger(ParkingRecordsService.name);

  constructor(
    @InjectRepository(ParkingRecord)
    private readonly parkingRecordsRepository: Repository<ParkingRecord>,
    private readonly fieldDefinitionsService: FieldDefinitionsService,
    private readonly operatorsService: OperatorsService,
  ) {}

  // El JWT sigue siendo válido aunque el operador haya cerrado turno (o se lo
  // hayan cerrado desde otro dispositivo) — sin este chequeo, un token viejo
  // podría seguir registrando movimientos a nombre de alguien que ya no está
  // en turno.
  private async assertOnDuty(operatorId: string): Promise<void> {
    const operator = await this.operatorsService.findOne(operatorId);
    if (!operator.onDuty) {
      throw new ForbiddenException(
        'Tu turno está cerrado. Iniciá turno de nuevo para registrar movimientos.',
      );
    }
  }

  // Un registro todavía abierto (sin salida) lo puede corregir cualquier
  // operador en turno — los errores de tipeo son comunes y hay que poder
  // arreglarlos ya mismo. Uno ya cerrado es más delicado (puede afectar
  // reportes ya generados), así que queda reservado a un admin.
  private assertCanMutate(
    record: ParkingRecord,
    operator: AuthenticatedOperator,
  ): void {
    if (record.salidaTime && operator.role !== Role.ADMIN) {
      throw new ForbiddenException(
        'Este registro ya está cerrado — solo un administrador puede modificarlo.',
      );
    }
  }

  async createEntrada(
    dto: CreateParkingRecordDto,
    operator: AuthenticatedOperator,
  ): Promise<ParkingRecord> {
    try {
      await this.assertOnDuty(operator.id);
      const placa = dto.placa.trim().toUpperCase();

      const alreadyInside = await this.parkingRecordsRepository.findOne({
        where: { placa, salidaTime: IsNull(), cancelled: false },
      });
      if (alreadyInside) {
        throw new BadRequestException(
          `La patente ${placa} ya tiene una entrada registrada sin salida`,
        );
      }

      const fieldDefinitions = await this.fieldDefinitionsService.findActive();
      const extraFields = this.validateExtraFields(
        fieldDefinitions,
        dto.extraFields,
      );

      const record = this.parkingRecordsRepository.create({
        placa,
        tipo: dto.tipo,
        fotoUrl: dto.fotoUrl ?? null,
        extraFields,
        markedFrequent: dto.markedFrequent ?? false,
        entradaTime: new Date(),
        salidaTime: null,
        operadorEntrada: { id: operator.id } as Operator,
      });
      return await this.parkingRecordsRepository.save(record);
    } catch (error) {
      if (
        error instanceof BadRequestException ||
        error instanceof ForbiddenException
      ) {
        throw error;
      }
      this.logger.error(
        `Error al registrar entrada de ${dto.placa}`,
        this.stack(error),
      );
      throw new InternalServerErrorException('No se pudo registrar la entrada');
    }
  }

  private validateExtraFields(
    fieldDefinitions: FieldDefinition[],
    extraFields?: Record<string, unknown>,
  ): Record<string, unknown> | null {
    const input = extraFields ?? {};
    const result: Record<string, unknown> = {};

    for (const field of fieldDefinitions) {
      // Only placa/tipo have a dedicated column on ParkingRecord (handled
      // directly in createEntrada) — every other field, including locked
      // "isSystem" ones like nombre/dni, is still stored in extraFields.
      if (field.key === 'placa' || field.key === 'tipo') continue;

      const value = input[field.key];
      const isEmpty = value === undefined || value === null || value === '';

      if (field.required && isEmpty) {
        throw new BadRequestException(
          `El campo "${field.label}" es obligatorio`,
        );
      }
      if (isEmpty) continue;

      if (!this.matchesType(field, value)) {
        throw new BadRequestException(
          `El campo "${field.label}" tiene un valor inválido`,
        );
      }
      result[field.key] = value;
    }

    return Object.keys(result).length > 0 ? result : null;
  }

  private matchesType(field: FieldDefinition, value: unknown): boolean {
    switch (field.type) {
      case FieldType.NUMBER:
        return typeof value === 'number' && !Number.isNaN(value);
      case FieldType.BOOLEAN:
        return typeof value === 'boolean';
      case FieldType.SELECT:
        return (
          typeof value === 'string' && (field.options ?? []).includes(value)
        );
      case FieldType.TEXT:
      default:
        return typeof value === 'string';
    }
  }

  async findInside(placa?: string): Promise<ParkingRecord[]> {
    try {
      const query = this.parkingRecordsRepository
        .createQueryBuilder('record')
        .leftJoinAndSelect('record.operadorEntrada', 'operadorEntrada')
        .leftJoinAndSelect('record.editedBy', 'editedBy')
        .where('record.salidaTime IS NULL')
        .andWhere('record.cancelled = false')
        .orderBy('record.entradaTime', 'DESC');

      if (placa) {
        query.andWhere('record.placa ILIKE :placa', { placa: `%${placa}%` });
      }

      return await query.getMany();
    } catch (error) {
      this.logger.error('Error al listar vehículos dentro', this.stack(error));
      throw new InternalServerErrorException(
        'No se pudieron obtener los vehículos dentro',
      );
    }
  }

  async findHistory(filters: QueryHistoryDto): Promise<ParkingRecord[]> {
    try {
      const query = this.parkingRecordsRepository
        .createQueryBuilder('record')
        .leftJoinAndSelect('record.operadorEntrada', 'operadorEntrada')
        .leftJoinAndSelect('record.operadorSalida', 'operadorSalida')
        .leftJoinAndSelect('record.editedBy', 'editedBy')
        .where('record.salidaTime IS NOT NULL')
        .andWhere('record.cancelled = false')
        .orderBy('record.salidaTime', 'DESC');

      if (filters.placa) {
        query.andWhere('record.placa ILIKE :placa', {
          placa: `%${filters.placa}%`,
        });
      }
      if (filters.tipo) {
        query.andWhere('record.tipo = :tipo', { tipo: filters.tipo });
      }

      return await query.getMany();
    } catch (error) {
      this.logger.error('Error al obtener el historial', this.stack(error));
      throw new InternalServerErrorException('No se pudo obtener el historial');
    }
  }

  // Una patente es "frecuente" a partir de su segundo registro, o desde la
  // primera si algún registro suyo se guardó con "markedFrequent" (el
  // operador la marcó a mano). Trae, por patente, la cantidad total de
  // visitas y los datos de la más reciente (tipo/extraFields) para poder
  // precargar el formulario de entrada.
  async findFrequent(): Promise<FrequentPlate[]> {
    try {
      const rows = await this.parkingRecordsRepository.query<
        FrequentPlateRow[]
      >(`
        SELECT id, placa, tipo, "entradaTime", "extraFields", "visitCount"
        FROM (
          SELECT DISTINCT ON (placa)
            id,
            placa,
            tipo,
            "entradaTime",
            "extraFields",
            COUNT(*) OVER (PARTITION BY placa) AS "visitCount",
            BOOL_OR("markedFrequent") OVER (PARTITION BY placa) AS "everMarked"
          FROM parking_records
          WHERE NOT cancelled
          ORDER BY placa, "entradaTime" DESC
        ) latest
        WHERE "visitCount" >= 2 OR "everMarked"
        ORDER BY "visitCount" DESC, "entradaTime" DESC
      `);

      return rows.map((row) => ({
        id: row.id,
        placa: row.placa,
        tipo: row.tipo,
        lastEntradaTime: row.entradaTime,
        extraFields: row.extraFields,
        visitCount: Number(row.visitCount),
      }));
    } catch (error) {
      this.logger.error(
        'Error al listar patentes frecuentes',
        this.stack(error),
      );
      throw new InternalServerErrorException(
        'No se pudieron obtener las patentes frecuentes',
      );
    }
  }

  async registerSalida(
    id: string,
    operator: AuthenticatedOperator,
  ): Promise<ParkingRecord> {
    try {
      await this.assertOnDuty(operator.id);
      const record = await this.parkingRecordsRepository.findOne({
        where: { id },
      });
      if (!record) {
        throw new NotFoundException(`Registro ${id} no encontrado`);
      }
      if (record.cancelled) {
        throw new BadRequestException(
          'No se puede registrar la salida de un registro cancelado',
        );
      }
      if (record.salidaTime) {
        throw new BadRequestException(
          'Este vehículo ya tiene una salida registrada',
        );
      }

      record.salidaTime = new Date();
      record.operadorSalida = { id: operator.id } as Operator;
      await this.parkingRecordsRepository.save(record);

      return await this.parkingRecordsRepository.findOneOrFail({
        where: { id },
      });
    } catch (error) {
      if (
        error instanceof NotFoundException ||
        error instanceof BadRequestException ||
        error instanceof ForbiddenException
      ) {
        throw error;
      }
      this.logger.error(
        `Error al registrar salida del registro ${id}`,
        this.stack(error),
      );
      throw new InternalServerErrorException('No se pudo registrar la salida');
    }
  }

  async updateRecord(
    id: string,
    dto: UpdateParkingRecordDto,
    operator: AuthenticatedOperator,
  ): Promise<ParkingRecord> {
    try {
      await this.assertOnDuty(operator.id);
      const record = await this.parkingRecordsRepository.findOne({
        where: { id },
      });
      if (!record) {
        throw new NotFoundException(`Registro ${id} no encontrado`);
      }
      if (record.cancelled) {
        throw new BadRequestException(
          'No se puede editar un registro cancelado',
        );
      }
      this.assertCanMutate(record, operator);

      if (dto.placa !== undefined) {
        const nextPlaca = dto.placa.trim().toUpperCase();
        if (nextPlaca !== record.placa && record.salidaTime === null) {
          const alreadyInside = await this.parkingRecordsRepository.findOne({
            where: {
              placa: nextPlaca,
              salidaTime: IsNull(),
              cancelled: false,
              id: Not(record.id),
            },
          });
          if (alreadyInside) {
            throw new BadRequestException(
              `La patente ${nextPlaca} ya tiene una entrada registrada sin salida`,
            );
          }
        }
        record.placa = nextPlaca;
      }

      if (dto.tipo !== undefined) {
        record.tipo = dto.tipo;
      }

      if (dto.extraFields !== undefined) {
        // Merge, not replace — correcting just the DNI shouldn't require
        // resending every other field or it'll trip "campo obligatorio".
        const merged = { ...(record.extraFields ?? {}), ...dto.extraFields };
        const fieldDefinitions =
          await this.fieldDefinitionsService.findActive();
        record.extraFields = this.validateExtraFields(fieldDefinitions, merged);
      }

      record.editedAt = new Date();
      record.editedBy = { id: operator.id } as Operator;

      await this.parkingRecordsRepository.save(record);
      return await this.parkingRecordsRepository.findOneOrFail({
        where: { id },
      });
    } catch (error) {
      if (
        error instanceof NotFoundException ||
        error instanceof BadRequestException ||
        error instanceof ForbiddenException
      ) {
        throw error;
      }
      this.logger.error(`Error al editar el registro ${id}`, this.stack(error));
      throw new InternalServerErrorException('No se pudo editar el registro');
    }
  }

  async cancelRecord(
    id: string,
    dto: CancelParkingRecordDto,
    operator: AuthenticatedOperator,
  ): Promise<ParkingRecord> {
    try {
      await this.assertOnDuty(operator.id);
      const record = await this.parkingRecordsRepository.findOne({
        where: { id },
      });
      if (!record) {
        throw new NotFoundException(`Registro ${id} no encontrado`);
      }
      if (record.cancelled) {
        throw new BadRequestException('Este registro ya está cancelado');
      }
      this.assertCanMutate(record, operator);

      record.cancelled = true;
      record.cancelledAt = new Date();
      record.cancelledBy = { id: operator.id } as Operator;
      record.cancelReason = dto.reason?.trim() || null;

      await this.parkingRecordsRepository.save(record);
      return await this.parkingRecordsRepository.findOneOrFail({
        where: { id },
      });
    } catch (error) {
      if (
        error instanceof NotFoundException ||
        error instanceof BadRequestException ||
        error instanceof ForbiddenException
      ) {
        throw error;
      }
      this.logger.error(
        `Error al cancelar el registro ${id}`,
        this.stack(error),
      );
      throw new InternalServerErrorException('No se pudo cancelar el registro');
    }
  }

  async reopenRecord(
    id: string,
    operator: AuthenticatedOperator,
  ): Promise<ParkingRecord> {
    try {
      await this.assertOnDuty(operator.id);
      const record = await this.parkingRecordsRepository.findOne({
        where: { id },
      });
      if (!record) {
        throw new NotFoundException(`Registro ${id} no encontrado`);
      }
      if (record.cancelled) {
        throw new BadRequestException(
          'No se puede reabrir un registro cancelado',
        );
      }
      if (!record.salidaTime) {
        throw new BadRequestException(
          'Este registro no tiene una salida registrada',
        );
      }
      // Siempre está cerrado en este punto, así que esto exige admin.
      this.assertCanMutate(record, operator);

      const alreadyInside = await this.parkingRecordsRepository.findOne({
        where: { placa: record.placa, salidaTime: IsNull(), cancelled: false },
      });
      if (alreadyInside) {
        throw new BadRequestException(
          `La patente ${record.placa} ya tiene una entrada registrada sin salida — no se puede reabrir`,
        );
      }

      record.salidaTime = null;
      record.operadorSalida = null;
      record.editedAt = new Date();
      record.editedBy = { id: operator.id } as Operator;

      await this.parkingRecordsRepository.save(record);
      return await this.parkingRecordsRepository.findOneOrFail({
        where: { id },
      });
    } catch (error) {
      if (
        error instanceof NotFoundException ||
        error instanceof BadRequestException ||
        error instanceof ForbiddenException
      ) {
        throw error;
      }
      this.logger.error(
        `Error al reabrir el registro ${id}`,
        this.stack(error),
      );
      throw new InternalServerErrorException('No se pudo reabrir el registro');
    }
  }

  private stack(error: unknown): string | undefined {
    return error instanceof Error ? error.stack : undefined;
  }
}
