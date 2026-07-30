import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Operator } from './entities/operator.entity';
import { OperatorsController } from './operators.controller';
import { OperatorsService } from './operators.service';
import { OperatorsSeed } from './seed/operators.seed';

@Module({
  imports: [TypeOrmModule.forFeature([Operator])],
  controllers: [OperatorsController],
  providers: [OperatorsService, OperatorsSeed],
  exports: [OperatorsService],
})
export class OperatorsModule {}
