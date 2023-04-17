import { Entity, Column, PrimaryGeneratedColumn } from 'typeorm';

@Entity()
export class TransactionCount {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  name: string;

  @Column()
  count: number;

  @Column()
  created_at: Date;
}
