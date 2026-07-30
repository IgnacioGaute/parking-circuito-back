import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { FieldType } from '../enums/field-type.enum';

@Entity('field_definitions')
export class FieldDefinition {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ unique: true })
  key!: string;

  @Column()
  label!: string;

  @Column({ type: 'enum', enum: FieldType })
  type!: FieldType;

  @Column({ default: false })
  required!: boolean;

  @Column({ type: 'jsonb', nullable: true })
  options!: string[] | null;

  @Column({ default: 0 })
  sortOrder!: number;

  @Column({ default: true })
  active!: boolean;

  @Column({ default: false })
  isSystem!: boolean;

  @CreateDateColumn()
  createdAt!: Date;
}
