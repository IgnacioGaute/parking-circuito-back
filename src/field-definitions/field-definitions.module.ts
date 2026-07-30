import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { FieldDefinition } from './entities/field-definition.entity';
import { FieldDefinitionsController } from './field-definitions.controller';
import { FieldDefinitionsService } from './field-definitions.service';
import { FieldDefinitionsSeed } from './seed/field-definitions.seed';

@Module({
  imports: [TypeOrmModule.forFeature([FieldDefinition])],
  controllers: [FieldDefinitionsController],
  providers: [FieldDefinitionsService, FieldDefinitionsSeed],
  exports: [FieldDefinitionsService],
})
export class FieldDefinitionsModule {}
