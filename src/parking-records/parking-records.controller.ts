import { Body, Controller, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { CurrentOperator } from '../auth/decorators/current-operator.decorator';
import type { AuthenticatedOperator } from '../auth/strategies/jwt.strategy';
import { CreateParkingRecordDto } from './dto/create-parking-record.dto';
import { QueryHistoryDto } from './dto/query-history.dto';
import { QueryInsideDto } from './dto/query-inside.dto';
import { ParkingRecord } from './entities/parking-record.entity';
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

  @Patch(':id/exit')
  registerSalida(
    @Param('id') id: string,
    @CurrentOperator() operator: AuthenticatedOperator,
  ): Promise<ParkingRecord> {
    return this.parkingRecordsService.registerSalida(id, operator);
  }
}
