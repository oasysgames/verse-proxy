import { Entity, Column, PrimaryGeneratedColumn, Index } from 'typeorm';

@Entity()
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
