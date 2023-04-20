import { Entity, Column, PrimaryGeneratedColumn, Index, Unique } from 'typeorm';

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

  @Column()
  created_at: Date;
}
