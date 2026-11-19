import { Module } from '@nestjs/common';
import { OrganizationsModule } from '../organizations/organizations.module';
import { RealtimeGateway } from '../realtime/realtime.gateway';
import { QueueController } from './queue.controller';
import { QueueService } from './queue.service';
import { RoomsController } from './rooms.controller';
import { RoomsService } from './rooms.service';

/** Salas, invitados y el gateway de tiempo real (comparten estado de presencia). */
@Module({
  imports: [OrganizationsModule],
  controllers: [RoomsController, QueueController],
  providers: [RoomsService, QueueService, RealtimeGateway],
})
export class RoomsModule {}
