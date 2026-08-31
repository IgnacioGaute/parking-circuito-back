import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Operator } from '../../operators/entities/operator.entity';
import { VehicleType } from '../enums/vehicle-type.enum';

@Entity('parking_records')
export class ParkingRecord {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Index()
  @Column()
  placa!: string;

  @Column({ type: 'enum', enum: VehicleType })
  tipo!: VehicleType;

  @Column({ type: 'timestamptz' })
  entradaTime!: Date;

  @Column({ type: 'timestamptz', nullable: true })
  salidaTime!: Date | null;

  @Column({ type: 'varchar', nullable: true })
  fotoUrl!: string | null;

  @Column({ type: 'jsonb', nullable: true })
  extraFields!: Record<string, unknown> | null;

  // Lets an operator flag a plate as frequent from its very first visit,
  // instead of waiting for the automatic 2-visit threshold (findFrequent()).
  @Column({ default: false })
  markedFrequent!: boolean;

  @ManyToOne(() => Operator, (operator) => operator.entradasRegistradas, {
    eager: true,
    nullable: false,
  })
  @JoinColumn({ name: 'operadorEntradaId' })
  operadorEntrada!: Operator;

  @ManyToOne(() => Operator, (operator) => operator.salidasRegistradas, {
    eager: true,
    nullable: true,
  })
  @JoinColumn({ name: 'operadorSalidaId' })
  operadorSalida!: Operator | null;

  // "Last corrected by/when" — not a full change history. Corrections
  // (edit/cancel/reopen) are how human data-entry errors get fixed.
  @Column({ type: 'timestamptz', nullable: true })
  editedAt!: Date | null;

  @ManyToOne(() => Operator, { eager: true, nullable: true })
  @JoinColumn({ name: 'editedById' })
  editedBy!: Operator | null;

  // Soft delete, same reasoning as FieldDefinition.active: a record created
  // by mistake is never hard-deleted, just hidden from every normal view.
  @Column({ default: false })
  cancelled!: boolean;

  @Column({ type: 'timestamptz', nullable: true })
  cancelledAt!: Date | null;

  @ManyToOne(() => Operator, { eager: true, nullable: true })
  @JoinColumn({ name: 'cancelledById' })
  cancelledBy!: Operator | null;

  @Column({ type: 'varchar', nullable: true })
  cancelReason!: string | null;

  @CreateDateColumn()
  createdAt!: Date;
}
