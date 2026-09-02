import {
  Column,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('app_settings')
export class AppSettings {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ default: 60 })
  alertThresholdMinutes!: number;

  @UpdateDateColumn()
  updatedAt!: Date;
}
