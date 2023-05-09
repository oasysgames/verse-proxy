import { Injectable } from '@nestjs/common';
import { Interval } from '@nestjs/schedule';
import { workerCountMillisecondInterval } from 'src/constants';
import { DatastoreService } from 'src/datastore/services';

@Injectable()
export class WorkerCountService {
  constructor(private datastoreService: DatastoreService) {}

  @Interval(workerCountMillisecondInterval)
  handleInterval() {
    console.log('Called setWorkerCount');
    this.datastoreService.setWorkerCount();
  }
}
