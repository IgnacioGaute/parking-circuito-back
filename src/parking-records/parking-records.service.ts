import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  InternalServerErrorException,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AuthenticatedOperator } from '../auth/strategies/jwt.strategy';
import { FieldDefinition } from '../field-definitions/entities/field-definition.entity';
import { FieldDefinitionsService } from '../field-definitions/field-definitions.service';
import { FieldType } from '../field-definitions/enums/field-type.enum';
import { Operator } from '../operators/entities/operator.entity';
import { OperatorsService } from '../operators/operators.service';
import { CreateParkingRecordDto } from './dto/create-parking-record.dto';
import { QueryHistoryDto } from './dto/query-history.dto';
import { ParkingRecord } from './entities/parking-record.entity';
import { FrequentPlate } from './interfaces/frequent-plate.interface';

interface FrequentPlateRow {
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

  async createEntrada(
    dto: CreateParkingRecordDto,
    operator: AuthenticatedOperator,
  ): Promise<ParkingRecord> {
    try {
      await this.assertOnDuty(operator.id);
      const fieldDefinitions = await this.fieldDefinitionsService.findActive();
      const extraFields = this.validateExtraFields(
        fieldDefinitions,
        dto.extraFields,
      );

      const record = this.parkingRecordsRepository.create({
        placa: dto.placa.trim().toUpperCase(),
        tipo: dto.tipo,
        fotoUrl: dto.fotoUrl ?? null,
        extraFields,
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
        .where('record.salidaTime IS NULL')
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
        .where('record.salidaTime IS NOT NULL')
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

  // Una patente es "frecuente" a partir de su segundo registro. Trae, por
  // patente, la cantidad total de visitas y los datos de la más reciente
  // (tipo/extraFields) para poder precargar el formulario de entrada.
  async findFrequent(): Promise<FrequentPlate[]> {
    try {
      const rows = await this.parkingRecordsRepository.query<
        FrequentPlateRow[]
      >(`
        SELECT placa, tipo, "entradaTime", "extraFields", "visitCount"
        FROM (
          SELECT DISTINCT ON (placa)
            placa,
            tipo,
            "entradaTime",
            "extraFields",
            COUNT(*) OVER (PARTITION BY placa) AS "visitCount"
          FROM parking_records
          ORDER BY placa, "entradaTime" DESC
        ) latest
        WHERE "visitCount" >= 2
        ORDER BY "visitCount" DESC, "entradaTime" DESC
      `);

      return rows.map((row) => ({
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

  private stack(error: unknown): string | undefined {
    return error instanceof Error ? error.stack : undefined;
  }
}
