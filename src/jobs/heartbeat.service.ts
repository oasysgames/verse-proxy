import { Injectable } from '@nestjs/common';
import { Interval } from '@nestjs/schedule';
import { HeartbeatMillisecondInterval } from 'src/constants';
import { DatastoreService } from 'src/datastore/services';

@Injectable()
export class HeartbeatService {
  constructor(private datastoreService: DatastoreService) {}

  @Interval(HeartbeatMillisecondInterval)
  handleInterval() {
    console.log('Called setHeartBeat');
    this.datastoreService.setHeartBeat();
  }
}
