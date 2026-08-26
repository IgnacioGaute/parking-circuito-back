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
  {
    key: 'nombre',
    label: 'Nombre y apellido',
    type: FieldType.TEXT,
    required: true,
  },
  { key: 'dni', label: 'DNI', type: FieldType.NUMBER, required: true },
];

@Injectable()
export class FieldDefinitionsSeed implements OnApplicationBootstrap {
  private readonly logger = new Logger(FieldDefinitionsSeed.name);

  constructor(
    private readonly fieldDefinitionsService: FieldDefinitionsService,
  ) {}

  // Corre en cada arranque (no solo en una base vacía): cada campo del
  // sistema se resuelve por su key de forma independiente, así que también
  // sirve para promover a "fijo y obligatorio" un campo que ya existía como
  // campo personalizado (ej: nombre/dni cargados a mano antes desde el admin).
  async onApplicationBootstrap() {
    const all = await this.fieldDefinitionsService.findAll();
    let nextOrder = all.reduce((max, f) => Math.max(max, f.sortOrder), -1) + 1;

    for (const spec of SYSTEM_FIELDS) {
      const current = await this.fieldDefinitionsService.findByKey(spec.key);
      if (!current) {
        await this.fieldDefinitionsService.createSystemField({
          ...spec,
          sortOrder: nextOrder++,
        });
        this.logger.log(`Campo del sistema creado: ${spec.key}`);
        continue;
      }
      const alreadyCorrect =
        current.isSystem &&
        current.active &&
        current.required === spec.required &&
        current.label === spec.label;
      if (!alreadyCorrect) {
        await this.fieldDefinitionsService.promoteToSystem(current.id, spec);
        this.logger.log(`Campo promovido a fijo y obligatorio: ${spec.key}`);
      }
    }
  }
}
