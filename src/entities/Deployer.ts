import { Entity, Column, PrimaryGeneratedColumn } from 'typeorm';

@Entity()
export class Deployer {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  address: string;
}
