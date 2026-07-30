import {
  Injectable,
  InternalServerErrorException,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { OperatorsService } from '../operators/operators.service';
import { OperatorResponseDto } from '../operators/dto/operator-response.dto';

export interface LoginResult {
  accessToken: string;
  operator: OperatorResponseDto;
}

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly operatorsService: OperatorsService,
    private readonly jwtService: JwtService,
  ) {}

  async login(operatorId: string, pin: string): Promise<LoginResult> {
    try {
      const operator = await this.operatorsService.validatePin(
        operatorId,
        pin,
      );
      if (!operator) {
        throw new UnauthorizedException('PIN incorrecto');
      }

      const accessToken = await this.jwtService.signAsync({
        sub: operator.id,
        name: operator.name,
        role: operator.role,
      });

      await this.operatorsService.setOnDuty(operator.id, true);
      operator.onDuty = true;

      return {
        accessToken,
        operator: OperatorResponseDto.fromEntity(operator),
      };
    } catch (error) {
      if (error instanceof UnauthorizedException) throw error;
      this.logger.error(
        `Error en login de operador ${operatorId}`,
        error instanceof Error ? error.stack : undefined,
      );
      throw new InternalServerErrorException('No se pudo iniciar sesión');
    }
  }

  async logout(operatorId: string): Promise<void> {
    try {
      await this.operatorsService.setOnDuty(operatorId, false);
    } catch (error) {
      this.logger.error(
        `Error en logout de operador ${operatorId}`,
        error instanceof Error ? error.stack : undefined,
      );
      throw new InternalServerErrorException('No se pudo cerrar turno');
    }
  }
}
