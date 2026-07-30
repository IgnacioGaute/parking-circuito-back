import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { AuthenticatedOperator } from '../strategies/jwt.strategy';

export const CurrentOperator = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): AuthenticatedOperator => {
    const request = ctx.switchToHttp().getRequest();
    return request.user;
  },
);
