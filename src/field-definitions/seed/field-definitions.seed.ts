import { Injectable, Logger, OnApplicationBootstrap } from '@nestjs/common';
import { FieldDefinitionsService } from '../field-definitions.service';
import { FieldType } from '../enums/field-type.enum';

const SYSTEM_FIELDS = [
  { key: 'placa', label: 'Placa', type: FieldType.TEXT, required: true },
  {
    key: 'tipo',
    label: 'Tipo de vehículo',
    type: FieldType.SELECT,
    required: true,
    options: ['auto', 'moto'],
  },
  { key: 'foto', label: 'Foto', type: FieldType.TEXT, required: false },
];

@Injectable()
export class FieldDefinitionsSeed implements OnApplicationBootstrap {
  private readonly logger = new Logger(FieldDefinitionsSeed.name);

  constructor(private readonly fieldDefinitionsService: FieldDefinitionsService) {}

  async onApplicationBootstrap() {
    const existing = await this.fieldDefinitionsService.countSystemFields();
    if (existing > 0) return;

    for (let i = 0; i < SYSTEM_FIELDS.length; i++) {
      await this.fieldDefinitionsService.createSystemField({
        ...SYSTEM_FIELDS[i],
        sortOrder: i,
      });
    }
    this.logger.log('Sembrados los campos fijos del formulario (placa, tipo, foto)');
  }
}
