import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { assertStationAccess, isAdmin } from '../auth/access';
import { normalizePhone } from '../auth/auth.service';
import { AuthUser } from '../auth/auth.types';
import { Bus, Passenger, PassengerStatus, Trip } from '../entities';
import { LiveGateway } from '../live/live.gateway';
import { ACTIVE_STATUSES, TripsService } from '../trips/trips.service';
import { dayRange, mogadishuToday } from '../common/dates';
import { CreatePassengerDto, PassengerQueryDto } from './passengers.dto';

@Injectable()
export class PassengersService {
  constructor(
    private readonly ds: DataSource,
    @InjectRepository(Passenger) private readonly passengers: Repository<Passenger>,
    private readonly trips: TripsService,
    private readonly live: LiveGateway,
  ) {}

  async list(tripId: number, user: AuthUser) {
    const trip = await this.trips.findTrip(tripId);
    assertStationAccess(user, trip.route.stationId);
    return this.passengers.find({ where: { tripId }, order: { createdAt: 'ASC' } });
  }

  /** Register a passenger on a bus. The seat limit is checked inside a lock, so two managers can't overbook. */
  async create(tripId: number, dto: CreatePassengerDto, user: AuthUser) {
    const trip = await this.trips.findTrip(tripId);
    assertStationAccess(user, trip.route.stationId);

    const saved = await this.ds.transaction(async (em) => {
      const locked = await em.getRepository(Trip).findOne({ where: { id: tripId }, lock: { mode: 'pessimistic_write' } });
      if (!locked) throw new NotFoundException('Trip not found');
      if (!ACTIVE_STATUSES.includes(locked.status)) {
        throw new BadRequestException('This bus has left the queue; register the passenger on another bus');
      }

      const bus = await em.getRepository(Bus).findOneOrFail({ where: { id: locked.busId } });
      const booked = (await this.trips.seatsBooked([tripId], em)).get(tripId) ?? 0;
      const left = bus.seatCount - booked;
      if (dto.seats > left) {
        throw new BadRequestException(left > 0 ? `Only ${left} seat(s) left on this bus` : 'This bus is full');
      }

      return em.getRepository(Passenger).save(
        em.create(Passenger, {
          tripId,
          name: dto.name.trim(),
          phone: normalizePhone(dto.phone),
          seats: dto.seats,
          createdById: user.sub,
        }),
      );
    });

    this.notify(trip);
    return saved;
  }

  async cancel(id: number, user: AuthUser) {
    const passenger = await this.passengers.findOne({ where: { id } });
    if (!passenger) throw new NotFoundException('Passenger not found');
    const trip = await this.trips.findTrip(passenger.tripId);
    assertStationAccess(user, trip.route.stationId);
    this.trips.assertEditable(trip, user);

    passenger.status = PassengerStatus.CANCELLED;
    await this.passengers.save(passenger);
    this.notify(trip);
    return passenger;
  }

  /**
   * The Passengers list: everyone registered on a day (default today, Mogadishu time),
   * or everyone matching a name or phone. Managers only see their own boosteejo.
   */
  browse(query: PassengerQueryDto, user: AuthUser) {
    const text = (query.q ?? '').trim();
    if (text && text.length < 2) throw new BadRequestException('Type at least 2 letters or digits');

    const qb = this.passengers
      .createQueryBuilder('p')
      .innerJoinAndSelect('p.trip', 't')
      .innerJoinAndSelect('t.bus', 'b')
      .innerJoinAndSelect('t.route', 'r')
      .innerJoinAndSelect('r.station', 's')
      .innerJoinAndSelect('r.destinationCity', 'dest')
      .orderBy('p.createdAt', 'DESC')
      .take(500);

    if (text) {
      qb.andWhere('(p.name LIKE :name OR p.phone LIKE :phone)', {
        name: `%${text}%`,
        phone: `%${normalizePhone(text) || text}%`,
      });
    } else {
      const { from, to } = dayRange(query.date ?? mogadishuToday());
      qb.andWhere('p.createdAt >= :from AND p.createdAt < :to', { from, to });
    }

    const stationId = isAdmin(user) ? query.stationId : user.stationId;
    if (stationId) qb.andWhere('s.id = :stationId', { stationId });
    if (query.routeId) qb.andWhere('r.id = :routeId', { routeId: query.routeId });
    return qb.getMany();
  }

  private notify(trip: Trip) {
    this.live.notifyStation(trip.route.stationId, 'passengers.updated', { routeId: trip.routeId, tripId: trip.id });
    // Seat counts show on the queue screen too.
    this.trips.notifyQueue(trip.route.stationId, trip.routeId);
  }
}
