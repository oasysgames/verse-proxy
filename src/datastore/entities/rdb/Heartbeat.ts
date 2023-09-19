import { Entity, PrimaryGeneratedColumn, Column, Index } from 'typeorm';
import { bigintTransformer } from '../../utils';

@Entity()
@Index('IDX_created_at', ['created_at'])
export class Heartbeat {
  @PrimaryGeneratedColumn()
  id: number;

  @Column('bigint', { transformer: [bigintTransformer] })
  created_at: number;
}
