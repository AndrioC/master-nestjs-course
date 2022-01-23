import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Attendee } from './attendee.entity';
import { AttendeesService } from './attendee.service';
import { CurrentUserEventAttendanceController } from './current-user-event-attendance.controller';
import { Event } from './event.entity';
import { EventAttendeesController } from './events-attendees.controller';
import { EventsOrganizedByUserController } from './events-organized-by-user.controller';
import { EventsController } from './events.controller';
import { EventsService } from './events.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([Event, Attendee])
  ],
  controllers: [
    EventsController,
    CurrentUserEventAttendanceController,
    EventAttendeesController,
    EventsOrganizedByUserController
  ],
  providers: [EventsService, AttendeesService]
})
export class EventsModule {}
