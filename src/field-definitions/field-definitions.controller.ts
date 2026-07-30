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
import { Roles } from '../auth/decorators/roles.decorator';
import { Role } from '../common/enums/role.enum';
import { CreateFieldDefinitionDto } from './dto/create-field-definition.dto';
import { UpdateFieldDefinitionDto } from './dto/update-field-definition.dto';
import { FieldDefinition } from './entities/field-definition.entity';
import { FieldDefinitionsService } from './field-definitions.service';

@Controller('field-definitions')
export class FieldDefinitionsController {
  constructor(
    private readonly fieldDefinitionsService: FieldDefinitionsService,
  ) {}

  @Get('active')
  findActive(): Promise<FieldDefinition[]> {
    return this.fieldDefinitionsService.findActive();
  }

  @Get()
  findAll(): Promise<FieldDefinition[]> {
    return this.fieldDefinitionsService.findAll();
  }

  @Roles(Role.ADMIN)
  @Post()
  create(@Body() dto: CreateFieldDefinitionDto): Promise<FieldDefinition> {
    return this.fieldDefinitionsService.create(dto);
  }

  @Roles(Role.ADMIN)
  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() dto: UpdateFieldDefinitionDto,
  ): Promise<FieldDefinition> {
    return this.fieldDefinitionsService.update(id, dto);
  }

  @Roles(Role.ADMIN)
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(@Param('id') id: string): Promise<void> {
    await this.fieldDefinitionsService.remove(id);
  }
}
