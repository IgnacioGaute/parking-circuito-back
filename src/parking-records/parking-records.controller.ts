import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { CurrentOperator } from '../auth/decorators/current-operator.decorator';
import type { AuthenticatedOperator } from '../auth/strategies/jwt.strategy';
import { CancelParkingRecordDto } from './dto/cancel-parking-record.dto';
import { CreateParkingRecordDto } from './dto/create-parking-record.dto';
import { QueryHistoryDto } from './dto/query-history.dto';
import { QueryInsideDto } from './dto/query-inside.dto';
import { UpdateParkingRecordDto } from './dto/update-parking-record.dto';
import { ParkingRecord } from './entities/parking-record.entity';
import { FrequentPlate } from './interfaces/frequent-plate.interface';
import { ParkingRecordsService } from './parking-records.service';

@Controller('parking-records')
export class ParkingRecordsController {
  constructor(private readonly parkingRecordsService: ParkingRecordsService) {}

  @Post()
  createEntrada(
    @Body() dto: CreateParkingRecordDto,
    @CurrentOperator() operator: AuthenticatedOperator,
  ): Promise<ParkingRecord> {
    return this.parkingRecordsService.createEntrada(dto, operator);
  }

  @Get('inside')
  findInside(@Query() query: QueryInsideDto): Promise<ParkingRecord[]> {
    return this.parkingRecordsService.findInside(query.placa);
  }

  @Get('history')
  findHistory(@Query() query: QueryHistoryDto): Promise<ParkingRecord[]> {
    return this.parkingRecordsService.findHistory(query);
  }

  @Get('frequent')
  findFrequent(): Promise<FrequentPlate[]> {
    return this.parkingRecordsService.findFrequent();
  }

  @Patch(':id/exit')
  registerSalida(
    @Param('id') id: string,
    @CurrentOperator() operator: AuthenticatedOperator,
  ): Promise<ParkingRecord> {
    return this.parkingRecordsService.registerSalida(id, operator);
  }

  @Patch(':id/cancel')
  cancelRecord(
    @Param('id') id: string,
    @Body() dto: CancelParkingRecordDto,
    @CurrentOperator() operator: AuthenticatedOperator,
  ): Promise<ParkingRecord> {
    return this.parkingRecordsService.cancelRecord(id, dto, operator);
  }

  @Patch(':id/reopen')
  reopenRecord(
    @Param('id') id: string,
    @CurrentOperator() operator: AuthenticatedOperator,
  ): Promise<ParkingRecord> {
    return this.parkingRecordsService.reopenRecord(id, operator);
  }

  // No @Roles() here — the permission is conditional on whether THIS record
  // is still open or already closed, which only the service can evaluate
  // after loading the row (see assertCanMutate in parking-records.service.ts).
  @Patch(':id')
  updateRecord(
    @Param('id') id: string,
    @Body() dto: UpdateParkingRecordDto,
    @CurrentOperator() operator: AuthenticatedOperator,
  ): Promise<ParkingRecord> {
    return this.parkingRecordsService.updateRecord(id, dto, operator);
  }
}
