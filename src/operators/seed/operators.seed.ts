import { Injectable, Logger, OnApplicationBootstrap } from '@nestjs/common';
import { Role } from '../../common/enums/role.enum';
import { OperatorsService } from '../operators.service';

const SEED_OPERATORS = [
  { name: 'Carlos Ruiz', pin: '1234', role: Role.ADMIN },
  { name: 'Ana Torres', pin: '1234', role: Role.USER },
  { name: 'Luis Medina', pin: '1234', role: Role.USER },
];

@Injectable()
export class OperatorsSeed implements OnApplicationBootstrap {
  private readonly logger = new Logger(OperatorsSeed.name);

  constructor(private readonly operatorsService: OperatorsService) {}

  async onApplicationBootstrap() {
    const existing = await this.operatorsService.count();
    if (existing > 0) return;

    for (const { name, pin, role } of SEED_OPERATORS) {
      await this.operatorsService.create(name, pin, role);
    }
    this.logger.log(`Sembrados ${SEED_OPERATORS.length} operadores (PIN de prueba: 1234)`);
  }
}
