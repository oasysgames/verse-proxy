import { Entity, Column, PrimaryGeneratedColumn, Index, Unique } from 'typeorm';
import { bigintTransformer } from 'src/datastore/utils';

@Entity()
@Unique('UQ_name', ['name'])
export class BlockNumberCache {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  @Index()
  name: string;

  @Column()
  value: string;

  @Column('bigint', { transformer: [bigintTransformer] })
  updated_at: number;
}
