import { VehicleType } from '../enums/vehicle-type.enum';

export interface FrequentPlate {
  // Id of the most recent (non-cancelled) visit for this plate — lets the
  // frontend edit that record directly, whether it's still open or already
  // closed, without a separate lookup.
  id: string;
  placa: string;
  tipo: VehicleType;
  lastEntradaTime: Date;
  extraFields: Record<string, unknown> | null;
  visitCount: number;
}
