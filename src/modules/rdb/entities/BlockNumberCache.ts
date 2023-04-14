import { Entity, Column, PrimaryGeneratedColumn } from 'typeorm';

@Entity()
export class BlockNumberCache {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  name: string;

  @Column()
  value: string;

  @Column()
  updated_at: Date;
}
