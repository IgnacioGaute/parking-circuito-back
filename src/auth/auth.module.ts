import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtModule, JwtSignOptions } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { minutes, ThrottlerModule } from '@nestjs/throttler';
import { OperatorsModule } from '../operators/operators.module';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { JwtStrategy } from './strategies/jwt.strategy';

@Module({
  imports: [
    OperatorsModule,
    PassportModule,
    // Aplicado solo al endpoint de login (ver auth.controller.ts): frena el
    // fuerza bruta del PIN de 4 dígitos, que hoy no tiene ningún límite.
    ThrottlerModule.forRoot({
      throttlers: [{ limit: 5, ttl: minutes(5) }],
      errorMessage: 'Demasiados intentos. Probá de nuevo en unos minutos.',
      getTracker: (req: { ip?: string; body?: { operatorId?: string } }) =>
        `${req.ip}:${req.body?.operatorId ?? 'unknown'}`,
    }),
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        secret: configService.getOrThrow<string>('JWT_SECRET'),
        signOptions: {
          expiresIn: configService.get<string>(
            'JWT_EXPIRES_IN',
            '12h',
          ) as unknown as JwtSignOptions['expiresIn'],
        },
      }),
    }),
  ],
  controllers: [AuthController],
  providers: [AuthService, JwtStrategy],
})
export class AuthModule {}
