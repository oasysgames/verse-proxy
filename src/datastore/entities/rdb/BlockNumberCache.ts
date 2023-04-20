import { Entity, Column, PrimaryGeneratedColumn, Index, Unique } from 'typeorm';

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

  @Column()
  updated_at: Date;
}
