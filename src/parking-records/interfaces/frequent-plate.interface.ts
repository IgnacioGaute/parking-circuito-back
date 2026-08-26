import { VehicleType } from '../enums/vehicle-type.enum';

export interface FrequentPlate {
  placa: string;
  tipo: VehicleType;
  lastEntradaTime: Date;
  extraFields: Record<string, unknown> | null;
  visitCount: number;
}
