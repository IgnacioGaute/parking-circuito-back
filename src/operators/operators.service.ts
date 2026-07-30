import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import * as bcrypt from 'bcrypt';
import { Repository } from 'typeorm';
import { Role } from '../common/enums/role.enum';
import { UpdateOperatorDto } from './dto/update-operator.dto';
import { Operator } from './entities/operator.entity';

@Injectable()
export class OperatorsService {
  private readonly logger = new Logger(OperatorsService.name);

  constructor(
    @InjectRepository(Operator)
    private readonly operatorsRepository: Repository<Operator>,
  ) {}

  async findAll(): Promise<Operator[]> {
    try {
      return await this.operatorsRepository.find({ order: { name: 'ASC' } });
    } catch (error) {
      this.logger.error('Error al listar operadores', this.stack(error));
      throw new InternalServerErrorException('No se pudieron obtener los operadores');
    }
  }

  async findOne(id: string): Promise<Operator> {
    try {
      const operator = await this.operatorsRepository.findOne({
        where: { id },
      });
      if (!operator) {
        throw new NotFoundException(`Operador ${id} no encontrado`);
      }
      return operator;
    } catch (error) {
      if (error instanceof NotFoundException) throw error;
      this.logger.error(`Error al buscar operador ${id}`, this.stack(error));
      throw new InternalServerErrorException('No se pudo obtener el operador');
    }
  }

  async findOneWithPin(id: string): Promise<Operator | null> {
    try {
      return await this.operatorsRepository
        .createQueryBuilder('operator')
        .addSelect('operator.pinHash')
        .where('operator.id = :id', { id })
        .getOne();
    } catch (error) {
      this.logger.error(
        `Error al buscar operador con PIN ${id}`,
        this.stack(error),
      );
      throw new InternalServerErrorException('No se pudo validar el operador');
    }
  }

  async validatePin(id: string, pin: string): Promise<Operator | null> {
    try {
      const operator = await this.findOneWithPin(id);
      if (!operator) return null;
      const isValid = await bcrypt.compare(pin, operator.pinHash);
      return isValid ? operator : null;
    } catch (error) {
      this.logger.error(`Error al validar PIN de ${id}`, this.stack(error));
      throw new InternalServerErrorException('No se pudo validar el PIN');
    }
  }

  async create(
    name: string,
    pin: string,
    role: Role = Role.USER,
  ): Promise<Operator> {
    try {
      const pinHash = await bcrypt.hash(pin, 10);
      const operator = this.operatorsRepository.create({ name, pinHash, role });
      return await this.operatorsRepository.save(operator);
    } catch (error) {
      this.logger.error(`Error al crear operador ${name}`, this.stack(error));
      throw new InternalServerErrorException('No se pudo crear el operador');
    }
  }

  async update(id: string, dto: UpdateOperatorDto): Promise<Operator> {
    try {
      const operator = await this.findOne(id);

      if (dto.role && dto.role !== Role.ADMIN && operator.role === Role.ADMIN) {
        await this.assertNotLastAdmin(id);
      }

      if (dto.name) operator.name = dto.name;
      if (dto.role) operator.role = dto.role;
      if (dto.pin) operator.pinHash = await bcrypt.hash(dto.pin, 10);

      return await this.operatorsRepository.save(operator);
    } catch (error) {
      if (error instanceof NotFoundException || error instanceof BadRequestException) {
        throw error;
      }
      this.logger.error(`Error al actualizar operador ${id}`, this.stack(error));
      throw new InternalServerErrorException('No se pudo actualizar el operador');
    }
  }

  async remove(id: string): Promise<void> {
    try {
      const operator = await this.findOne(id);
      if (operator.role === Role.ADMIN) {
        await this.assertNotLastAdmin(id);
      }
      await this.operatorsRepository.remove(operator);
    } catch (error) {
      if (error instanceof NotFoundException || error instanceof BadRequestException) {
        throw error;
      }
      this.logger.error(`Error al eliminar operador ${id}`, this.stack(error));
      throw new InternalServerErrorException('No se pudo eliminar el operador');
    }
  }

  async setOnDuty(id: string, onDuty: boolean): Promise<void> {
    try {
      await this.operatorsRepository.update(id, {
        onDuty,
        ...(onDuty ? { lastLoginAt: new Date() } : {}),
      });
    } catch (error) {
      this.logger.error(
        `Error al actualizar estado de turno de ${id}`,
        this.stack(error),
      );
      throw new InternalServerErrorException('No se pudo actualizar el estado de turno');
    }
  }

  async count(): Promise<number> {
    try {
      return await this.operatorsRepository.count();
    } catch (error) {
      this.logger.error('Error al contar operadores', this.stack(error));
      throw new InternalServerErrorException('No se pudo contar los operadores');
    }
  }

  private async assertNotLastAdmin(excludingId: string): Promise<void> {
    const adminCount = await this.operatorsRepository.count({
      where: { role: Role.ADMIN },
    });
    const isOnlyAdmin = adminCount <= 1;
    if (isOnlyAdmin) {
      const operator = await this.operatorsRepository.findOne({
        where: { id: excludingId },
      });
      if (operator?.role === Role.ADMIN) {
        throw new BadRequestException(
          'No se puede quitar al único administrador restante',
        );
      }
    }
  }

  private stack(error: unknown): string | undefined {
    return error instanceof Error ? error.stack : undefined;
  }
}
