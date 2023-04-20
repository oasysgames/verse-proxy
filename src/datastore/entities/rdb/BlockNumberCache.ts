import { Entity, Column, PrimaryGeneratedColumn, Index } from 'typeorm';

@Entity()
export class BlockNumberCache {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  @Index()
  name: string;

  @Column()
  value: string;

  @Column()
  updated_at: Date;
}
