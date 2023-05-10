import { Entity, PrimaryGeneratedColumn, Column, Index } from 'typeorm';

@Entity()
@Index('IDX_created_at', ['created_at'])
export class Heartbeat {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'bigint' })
  created_at: number;
}
