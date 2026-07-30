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

  @CreateDateColumn()
  createdAt!: Date;
}
