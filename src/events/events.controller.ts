import { Body, ClassSerializerInterceptor, Controller, Delete, ForbiddenException, Get, HttpCode, Logger, NotFoundException, Param, ParseIntPipe, Patch, Post, Query, SerializeOptions, UseGuards, UseInterceptors, UsePipes, ValidationPipe } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { Attendee } from "./attendee.entity";
import { CreateEventDto } from "./input/create-event.dto";
import { Event } from "./event.entity";
import { EventsService } from "./events.service";
import { UpdateEventDto } from "./input/update-event.dto";
import { ListEvents } from "./input/list.events";
import { CurrentUser } from "./../auth/current-user.decorator";
import { User } from "./../auth/user.entity";
import { AuthGuardJwt } from "./../auth/auth-guard.jwt";

@Controller('/events')
@SerializeOptions({ strategy: 'excludeAll' })
export class EventsController {
  private readonly logger = new Logger(EventsController.name);
  constructor(
    private readonly eventsService: EventsService
  ){}

  @Get()
  @UsePipes(new ValidationPipe({ transform: true }))
  @UseInterceptors(ClassSerializerInterceptor)
  async findAll(@Query() filter: ListEvents){
    const events = await this.eventsService.getEventsWithAttendeeCountFilteredPaginated(
      filter,
      {
        total: true,
        currentPage: filter.page,
        limit: 3
      }
    );
    return events
  }

  @Get(':id')
  @UseInterceptors(ClassSerializerInterceptor)
  async findOne(@Param('id', ParseIntPipe) id: number){
    const event = await this.eventsService.getEventWithAttendeeCount(id)

    if (!event){
      throw new NotFoundException({ message: 'Evento não encontrado!' });      
    }

    return event
  }

  @Post()
  @UseGuards(AuthGuardJwt)
  @UseInterceptors(ClassSerializerInterceptor)
  async create(@Body() input: CreateEventDto, @CurrentUser() user: User){
    return await this.eventsService.createEvent(input, user)
  }

  @Patch(':id')
  @UseGuards(AuthGuardJwt)
  @UseInterceptors(ClassSerializerInterceptor)
  async update(@Param('id', ParseIntPipe) id, @Body() input: UpdateEventDto, @CurrentUser() user: User){
    const event = await this.eventsService.findOne(id)

    if (!event){
      throw new NotFoundException();      
    }

    if (event.organizerId !== user.id){
      throw new ForbiddenException(null, 'You are not authorized to change this event!')
    }

    return await this.eventsService.updateEvent(event, input)

  }

  @Delete()
  @UseGuards(AuthGuardJwt)
  @HttpCode(204)
  async remove(@Param('id', ParseIntPipe) id, @CurrentUser() user: User){
    const event = await this.eventsService.findOne(id)

    if (!event){
      throw new NotFoundException();
    }

    if (event.organizerId !== user.id){
      throw new ForbiddenException(null, 'You are not authorized to remove this event!')
    }
    
    await this.eventsService.deleteEvent(id)

  }
}