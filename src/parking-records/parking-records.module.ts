import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { FieldDefinitionsModule } from '../field-definitions/field-definitions.module';
import { OperatorsModule } from '../operators/operators.module';
import { ParkingRecord } from './entities/parking-record.entity';
import { ParkingRecordsController } from './parking-records.controller';
import { ParkingRecordsService } from './parking-records.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([ParkingRecord]),
    FieldDefinitionsModule,
    OperatorsModule,
  ],
  controllers: [ParkingRecordsController],
  providers: [ParkingRecordsService],
})
export class ParkingRecordsModule {}
