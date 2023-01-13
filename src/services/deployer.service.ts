import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Deployer } from 'src/entities';

@Injectable()
export class DeployerService {
  constructor(
    @InjectRepository(Deployer)
    private deployerRepository: Repository<Deployer>,
  ) {}

  findAll(): Promise<Deployer[]> {
    return this.deployerRepository.find();
  }

  findOne(id: number): Promise<Deployer | null> {
    return this.deployerRepository.findOneBy({ id });
  }

  async remove(id: string): Promise<void> {
    await this.deployerRepository.delete(id);
  }
}
