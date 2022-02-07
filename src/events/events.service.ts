import { Injectable, Logger } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { User } from "./../auth/user.entity";
import { paginate, PaginateOptions } from "./../pagination/paginator";
import { DeleteResult, Repository, SelectQueryBuilder } from "typeorm";
import { AttendeeAnswerEnum } from './attendee.entity';
import { Event, PaginatedEvents } from "./event.entity";
import { CreateEventDto } from "./input/create-event.dto";
import { ListEvents, WhenEventFilter } from "./input/list.events";
import { UpdateEventDto } from "./input/update-event.dto";

@Injectable()
export class EventsService {
  private readonly logger = new Logger(EventsService.name)
  constructor(
    @InjectRepository(Event)
    private readonly eventsRepository: Repository<Event>
  ){}
  
  private getEventsBaseQuery(): SelectQueryBuilder<Event> {
    return this.eventsRepository
      .createQueryBuilder('e')
      .orderBy('e.id', 'DESC')
  }

  public getEventsWithAttendeeCountQuery(): SelectQueryBuilder<Event> {
    return this.getEventsBaseQuery()
      .loadRelationCountAndMap(
        'e.attendeeCount', 'e.attendees'
      )
      .loadRelationCountAndMap(
        'e.attendeeAccepted',
        'e.attendees',
        'attendee',
        (qb) => qb
          .where(
            'attendee.answer = :answer',
            { answer: AttendeeAnswerEnum.Accepted }
          )
      )
      .loadRelationCountAndMap(
        'e.attendeeMaybe',
        'e.attendees',
        'attendee',
        (qb) => qb
          .where(
            'attendee.answer = :answer',
            { answer: AttendeeAnswerEnum.Maybe }
          )
      )
      .loadRelationCountAndMap(
        'e.attendeeRejected',
        'e.attendees',
        'attendee',
        (qb) => qb
          .where(
            'attendee.answer = :answer',
            { answer: AttendeeAnswerEnum.Rejected }
          )
      )
  }

  private getEventsWithAttendeeCountFilteredQuery(filter?: ListEvents): SelectQueryBuilder<Event>{
    let query = this.getEventsWithAttendeeCountQuery();

    if (!filter){
      return query;
    }

    if (filter.when){
      if (filter.when == WhenEventFilter.Today) {
        query = query.andWhere(
          `e.when >= CURRENT_DATE AND e.when <= CURRENT_DATE + INTERVAL '1 DAY'`
        );
      }

      if (filter.when == WhenEventFilter.Tommorow) {
        query = query.andWhere(
          `e.when >= CURRENT_DATE + INTERVAL '1 DAY' AND e.when <= CURRENT_DATE + INTERVAL '2 DAY'`
        );
      }

      if (filter.when == WhenEventFilter.ThisWeek) {
        query = query.andWhere("TO_CHAR(e.when, 'WW') = TO_CHAR(CURRENT_DATE, 'ww')");
      }

      if (filter.when == WhenEventFilter.NextWeek) {
        query = query.andWhere("TO_CHAR(e.when, 'WW')::integer = TO_CHAR(CURRENT_DATE, 'ww')::integer + 1");
      }
    }

    return query
  }

  public async getEventsWithAttendeeCountFilteredPaginated(
    filter: ListEvents,
    PaginateOptions: PaginateOptions
  ): Promise<PaginatedEvents> {
    return await paginate(
      await this.getEventsWithAttendeeCountFilteredQuery(filter),
      PaginateOptions
    ) 
  }

  public async getEventWithAttendeeCount(id: number): Promise<Event | undefined> {
    const query = this.getEventsWithAttendeeCountQuery()
      .andWhere('e.id = :id', { id });

    return await query.getOne();
  }

  public async findOne(id: number): Promise<Event | undefined>{
    return await this.eventsRepository.findOne(id)
  }

  public async createEvent(input: CreateEventDto, user: User): Promise<Event> {
    return await this.eventsRepository.save(
      new Event({
        ...input,
        organizer: user,
        when: new Date(input.when)
      })
    )
  }

  public async updateEvent(event: Event, input: UpdateEventDto): Promise<Event> {
    return await this.eventsRepository.save(
      new Event({
        ...event,
        ...input,
        when: input.when ? new Date(input.when) : event.when
      })
    )
  }

  public async deleteEvent(id: number): Promise<DeleteResult> {
    return await this.eventsRepository
      .createQueryBuilder('e')
      .delete()
      .where('id = :id', { id })
      .execute()
  }

  public async getEventsOrganizedByUserIdPaginated(userId: number, PaginateOptions: PaginateOptions): Promise<PaginatedEvents> {
    return await paginate<Event>(
      this.getEventsOrganizedByUserIdQuery(userId),
      PaginateOptions
    )
  }

  private getEventsOrganizedByUserIdQuery(
    userId: number
  ): SelectQueryBuilder<Event>{
    return this.getEventsBaseQuery().where('e.organizerId = :userId', { userId })
  }

  public async getEventsAttendedByUserIdPaginated(userId: number, PaginateOptions: PaginateOptions): Promise<PaginatedEvents> {
    return await paginate<Event>(
      this.getEventsAttendeddByUserIdQuery(userId),
      PaginateOptions
    )
  }

  private getEventsAttendeddByUserIdQuery(
    userId: number
  ): SelectQueryBuilder<Event>{
    return this.getEventsBaseQuery().leftJoinAndSelect('e.attendees', 'a').where('a.userId = :userId', { userId })
  }
}