import {
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ThrottlerGuard } from '@nestjs/throttler';
import { CurrentOperator } from './decorators/current-operator.decorator';
import { Public } from './decorators/public.decorator';
import type { AuthenticatedOperator } from './strategies/jwt.strategy';
import { LoginDto } from './dto/login.dto';
import { AuthService, LoginResult } from './auth.service';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Public()
  @UseGuards(ThrottlerGuard)
  @Post('login')
  @HttpCode(HttpStatus.OK)
  login(@Body() loginDto: LoginDto): Promise<LoginResult> {
    return this.authService.login(loginDto.operatorId, loginDto.pin);
  }

  @Post('logout')
  @HttpCode(HttpStatus.NO_CONTENT)
  logout(@CurrentOperator() operator: AuthenticatedOperator): Promise<void> {
    return this.authService.logout(operator.id);
  }
}
