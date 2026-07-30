import {
  Column,
  CreateDateColumn,
  Entity,
  OneToMany,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Role } from '../../common/enums/role.enum';
import { ParkingRecord } from '../../parking-records/entities/parking-record.entity';

@Entity('operators')
export class Operator {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column()
  name!: string;

  @Column({ select: false })
  pinHash!: string;

  @Column({ type: 'enum', enum: Role, default: Role.USER })
  role!: Role;

  @Column({ default: false })
  onDuty!: boolean;

  @Column({ type: 'timestamptz', nullable: true })
  lastLoginAt!: Date | null;

  @CreateDateColumn()
  createdAt!: Date;

  @OneToMany(() => ParkingRecord, (record) => record.operadorEntrada)
  entradasRegistradas!: ParkingRecord[];

  @OneToMany(() => ParkingRecord, (record) => record.operadorSalida)
  salidasRegistradas!: ParkingRecord[];
}
