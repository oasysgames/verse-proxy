import { Entity, Column, PrimaryGeneratedColumn, Index, Unique } from 'typeorm';
import { bigintTransformer } from '../../utils';

@Entity()
@Unique('UQ_name', ['name'])
export class TransactionCount {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  @Index()
  name: string;

  @Column()
  count: number;

  @Column('bigint', { transformer: [bigintTransformer] })
  created_at: number;
}
