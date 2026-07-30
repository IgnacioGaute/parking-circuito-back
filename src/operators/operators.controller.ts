import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
} from '@nestjs/common';
import { Public } from '../auth/decorators/public.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { Role } from '../common/enums/role.enum';
import { CreateOperatorDto } from './dto/create-operator.dto';
import { OperatorResponseDto } from './dto/operator-response.dto';
import { UpdateOperatorDto } from './dto/update-operator.dto';
import { OperatorsService } from './operators.service';

@Controller('operators')
export class OperatorsController {
  constructor(private readonly operatorsService: OperatorsService) {}

  @Public()
  @Get()
  async findAll(): Promise<OperatorResponseDto[]> {
    const operators = await this.operatorsService.findAll();
    return operators.map((operator) => OperatorResponseDto.fromEntity(operator));
  }

  @Roles(Role.ADMIN)
  @Post()
  async create(@Body() dto: CreateOperatorDto): Promise<OperatorResponseDto> {
    const operator = await this.operatorsService.create(
      dto.name,
      dto.pin,
      dto.role,
    );
    return OperatorResponseDto.fromEntity(operator);
  }

  @Roles(Role.ADMIN)
  @Patch(':id')
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateOperatorDto,
  ): Promise<OperatorResponseDto> {
    const operator = await this.operatorsService.update(id, dto);
    return OperatorResponseDto.fromEntity(operator);
  }

  @Roles(Role.ADMIN)
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(@Param('id') id: string): Promise<void> {
    await this.operatorsService.remove(id);
  }
}
