import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, EntityManager, In, Repository } from 'typeorm';
import { assertStationAccess, isAdmin } from '../auth/access';
import { AuthUser } from '../auth/auth.types';
import { BusesService, normalizePlate } from '../buses/buses.service';
import { dayRange, mogadishuToday } from '../common/dates';
import { Passenger, PassengerStatus, Trip, TripStatus } from '../entities';
import { LiveGateway } from '../live/live.gateway';
import { LocationsService } from '../locations/locations.service';
import { CreateTripDto, TripRecordsQueryDto, UpdateTripDto } from './trips.dto';

export const ACTIVE_STATUSES = [TripStatus.WAITING, TripStatus.BOARDING];

export type TripWithSeats = Trip & { seatsBooked: number; seatsLeft: number };

@Injectable()
export class TripsService {
  constructor(
    private readonly ds: DataSource,
    @InjectRepository(Trip) private readonly trips: Repository<Trip>,
    private readonly locations: LocationsService,
    private readonly buses: BusesService,
    private readonly live: LiveGateway,
  ) {}

  // ---------- Reading ----------

  /** The bus queue for one route, first in line first. */
  async getQueue(routeId: number, user: AuthUser) {
    const route = await this.locations.findRoute(routeId);
    assertStationAccess(user, route.stationId);
    const trips = await this.trips.find({
      where: { routeId, status: In(ACTIVE_STATUSES) },
      relations: { bus: true },
      order: { queuePosition: 'ASC' },
    });
    return { route, trips: await this.withSeats(trips) };
  }

  async getTrip(id: number, user: AuthUser): Promise<TripWithSeats> {
    const trip = await this.findTrip(id);
    assertStationAccess(user, trip.route.stationId);
    const [withSeats] = await this.withSeats([trip]);
    return withSeats;
  }

  /** Past and current trips, for the Records screen. Managers only see their own boosteejo. */
  async records(q: TripRecordsQueryDto, user: AuthUser) {
    const qb = this.trips
      .createQueryBuilder('t')
      .innerJoinAndSelect('t.route', 'r')
      .innerJoinAndSelect('r.station', 's')
      .innerJoinAndSelect('r.destinationCity', 'dest')
      .innerJoinAndSelect('t.bus', 'b')
      .orderBy('t.arrivedAt', 'DESC')
      .take(200);

    const stationId = isAdmin(user) ? q.stationId : user.stationId;
    if (stationId) qb.andWhere('s.id = :stationId', { stationId });
    if (q.routeId) qb.andWhere('r.id = :routeId', { routeId: q.routeId });
    if (q.plate) qb.andWhere('b.plate LIKE :plate', { plate: `%${normalizePlate(q.plate)}%` });
    if (q.date) {
      const { from, to } = dayRange(q.date);
      qb.andWhere('t.arrivedAt >= :from AND t.arrivedAt < :to', { from, to });
    }
    return this.withSeats(await qb.getMany());
  }

  /** Numbers for the Today screen of one boosteejo, per route. */
  async today(stationId: number, user: AuthUser) {
    assertStationAccess(user, stationId);
    const station = await this.locations.findStation(stationId);
    const { from, to } = dayRange(mogadishuToday());

    const inQueue = await this.trips
      .createQueryBuilder('t')
      .innerJoin('t.route', 'r')
      .select('r.id', 'routeId')
      .addSelect('COUNT(*)', 'count')
      .where('r.station_id = :stationId', { stationId })
      .andWhere('t.status IN (:...active)', { active: ACTIVE_STATUSES })
      .groupBy('r.id')
      .getRawMany<{ routeId: number; count: string }>();

    const departed = await this.trips
      .createQueryBuilder('t')
      .innerJoin('t.route', 'r')
      .select('r.id', 'routeId')
      .addSelect('COUNT(*)', 'count')
      .where('r.station_id = :stationId', { stationId })
      .andWhere('t.status = :departed', { departed: TripStatus.DEPARTED })
      .andWhere('t.departedAt >= :from AND t.departedAt < :to', { from, to })
      .groupBy('r.id')
      .getRawMany<{ routeId: number; count: string }>();

    const passengers = await this.ds
      .getRepository(Passenger)
      .createQueryBuilder('p')
      .innerJoin('p.trip', 't')
      .innerJoin('t.route', 'r')
      .select('r.id', 'routeId')
      .addSelect('COALESCE(SUM(p.seats), 0)', 'count')
      .where('r.station_id = :stationId', { stationId })
      .andWhere('p.status = :active', { active: PassengerStatus.ACTIVE })
      .andWhere('p.createdAt >= :from AND p.createdAt < :to', { from, to })
      .groupBy('r.id')
      .getRawMany<{ routeId: number; count: string }>();

    const countFor = (rows: { routeId: number; count: string }[], routeId: number) =>
      Number(rows.find((row) => Number(row.routeId) === routeId)?.count ?? 0);

    const routes = station.routes
      .filter((r) => r.active)
      .map((r) => ({
        routeId: r.id,
        destination: r.destinationCity.name,
        busesInQueue: countFor(inQueue, r.id),
        departedToday: countFor(departed, r.id),
        passengersToday: countFor(passengers, r.id),
      }));

    return {
      station: { id: station.id, name: station.name, city: station.city.name },
      date: mogadishuToday(),
      totals: {
        busesInQueue: routes.reduce((n, r) => n + r.busesInQueue, 0),
        departedToday: routes.reduce((n, r) => n + r.departedToday, 0),
        passengersToday: routes.reduce((n, r) => n + r.passengersToday, 0),
      },
      routes,
    };
  }

  // ---------- Changing the queue ----------

  /** A bus arrives: it joins the end of the route's queue. */
  async create(dto: CreateTripDto, user: AuthUser) {
    const route = await this.locations.findRoute(dto.routeId);
    assertStationAccess(user, route.stationId);
    if (!route.active) throw new BadRequestException('This route is not active');

    const bus = await this.buses.findOne(dto.busId);
    await this.assertBusFree(bus.id, bus.plate);

    const id = await this.ds.transaction(async (em) => {
      const queue = await this.lockQueue(em, route.id);
      const trip = em.create(Trip, {
        routeId: route.id,
        busId: bus.id,
        driverName: dto.driverName ?? null,
        driverPhone: dto.driverPhone ?? null,
        departureTime: dto.departureTime ? new Date(dto.departureTime) : null,
        arrivedAt: new Date(),
        status: TripStatus.WAITING,
        queuePosition: queue.length + 1,
        createdById: user.sub,
      });
      const saved = await em.save(trip);
      await this.applyOrder(em, [...queue, saved]);
      return saved.id;
    });

    this.notifyQueue(route.stationId, route.id);
    return this.getTrip(id, user);
  }

  /** Change the driver or departure time. */
  async update(id: number, dto: UpdateTripDto, user: AuthUser) {
    const trip = await this.findTrip(id);
    assertStationAccess(user, trip.route.stationId);
    this.assertEditable(trip, user);

    if (dto.driverName !== undefined) trip.driverName = dto.driverName;
    if (dto.driverPhone !== undefined) trip.driverPhone = dto.driverPhone;
    if (dto.departureTime !== undefined) {
      trip.departureTime = dto.departureTime === null ? null : new Date(dto.departureTime);
    }
    await this.trips.save(trip);

    this.notifyQueue(trip.route.stationId, trip.routeId);
    return this.getTrip(id, user);
  }

  /** Swap a bus with the one above or below it in the queue. */
  async move(id: number, direction: 'up' | 'down', user: AuthUser) {
    const trip = await this.findTrip(id);
    assertStationAccess(user, trip.route.stationId);
    this.assertInQueue(trip);

    await this.ds.transaction(async (em) => {
      const queue = await this.lockQueue(em, trip.routeId);
      const from = queue.findIndex((t) => t.id === id);
      const to = direction === 'up' ? from - 1 : from + 1;
      if (from < 0 || to < 0 || to >= queue.length) return; // already at the top or bottom
      [queue[from], queue[to]] = [queue[to], queue[from]];
      await this.applyOrder(em, queue);
    });

    this.notifyQueue(trip.route.stationId, trip.routeId);
    return this.getQueue(trip.routeId, user);
  }

  /** The bus leaves: the trip is locked and the next bus starts boarding. */
  async depart(id: number, user: AuthUser) {
    const trip = await this.findTrip(id);
    assertStationAccess(user, trip.route.stationId);
    this.assertInQueue(trip);
    await this.leaveQueue(trip, TripStatus.DEPARTED);
    return this.getTrip(id, user);
  }

  /** The bus leaves the queue without travelling. Its passengers must be cancelled or moved first. */
  async cancel(id: number, user: AuthUser) {
    const trip = await this.findTrip(id);
    assertStationAccess(user, trip.route.stationId);
    this.assertInQueue(trip);
    const [{ seatsBooked }] = await this.withSeats([trip]);
    if (seatsBooked > 0) {
      throw new BadRequestException('This bus still has passengers. Cancel them first.');
    }
    await this.leaveQueue(trip, TripStatus.CANCELLED);
    return this.getTrip(id, user);
  }

  /** Admin only: put a departed or cancelled trip back at the front of the queue, to correct a mistake. */
  async reopen(id: number, user: AuthUser) {
    const trip = await this.findTrip(id);
    if (ACTIVE_STATUSES.includes(trip.status)) throw new BadRequestException('This trip is already in the queue');
    await this.assertBusFree(trip.busId, trip.bus.plate);

    await this.ds.transaction(async (em) => {
      const queue = await this.lockQueue(em, trip.routeId);
      trip.status = TripStatus.WAITING;
      trip.departedAt = null;
      await this.applyOrder(em, [trip, ...queue]);
    });

    this.notifyQueue(trip.route.stationId, trip.routeId);
    return this.getTrip(id, user);
  }

  // ---------- Helpers shared with passengers ----------

  async findTrip(id: number, em: EntityManager = this.ds.manager) {
    const trip = await em
      .getRepository(Trip)
      .findOne({ where: { id }, relations: { route: { destinationCity: true }, bus: true } });
    if (!trip) throw new NotFoundException('Trip not found');
    return trip;
  }

  /** Active seats booked per trip. */
  async seatsBooked(tripIds: number[], em: EntityManager = this.ds.manager): Promise<Map<number, number>> {
    if (tripIds.length === 0) return new Map();
    const rows = await em
      .getRepository(Passenger)
      .createQueryBuilder('p')
      .select('p.tripId', 'tripId')
      .addSelect('COALESCE(SUM(p.seats), 0)', 'booked')
      .where('p.tripId IN (:...ids)', { ids: tripIds })
      .andWhere('p.status = :active', { active: PassengerStatus.ACTIVE })
      .groupBy('p.tripId')
      .getRawMany<{ tripId: number; booked: string }>();
    return new Map(rows.map((r) => [Number(r.tripId), Number(r.booked)]));
  }

  assertEditable(trip: Trip, user: AuthUser) {
    if (!ACTIVE_STATUSES.includes(trip.status) && !isAdmin(user)) {
      throw new BadRequestException('This trip has left the queue and is locked');
    }
  }

  notifyQueue(stationId: number, routeId: number) {
    this.live.notifyStation(stationId, 'queue.updated', { routeId });
  }

  // ---------- Private ----------

  private async withSeats(trips: Trip[]): Promise<TripWithSeats[]> {
    const booked = await this.seatsBooked(trips.map((t) => t.id));
    return trips.map((t) => {
      const seatsBooked = booked.get(t.id) ?? 0;
      return Object.assign(t, { seatsBooked, seatsLeft: Math.max(0, t.bus.seatCount - seatsBooked) });
    });
  }

  /** Lock the route's queue rows for this transaction, so two managers can't reorder at the same moment. */
  private lockQueue(em: EntityManager, routeId: number) {
    return em.getRepository(Trip).find({
      where: { routeId, status: In(ACTIVE_STATUSES) },
      order: { queuePosition: 'ASC', id: 'ASC' },
      lock: { mode: 'pessimistic_write' },
    });
  }

  /** Number the queue 1, 2, 3…; the first bus is Boarding, the rest Waiting. */
  private async applyOrder(em: EntityManager, queue: Trip[]) {
    queue.forEach((t, i) => {
      t.queuePosition = i + 1;
      t.status = i === 0 ? TripStatus.BOARDING : TripStatus.WAITING;
    });
    await em.getRepository(Trip).save(queue);
  }

  private async leaveQueue(trip: Trip, status: TripStatus.DEPARTED | TripStatus.CANCELLED) {
    await this.ds.transaction(async (em) => {
      const queue = await this.lockQueue(em, trip.routeId);
      const rest = queue.filter((t) => t.id !== trip.id);
      const leaving = queue.find((t) => t.id === trip.id) ?? trip;
      leaving.status = status;
      leaving.queuePosition = null;
      leaving.departedAt = status === TripStatus.DEPARTED ? new Date() : null;
      await em.getRepository(Trip).save(leaving);
      await this.applyOrder(em, rest);
    });
    this.notifyQueue(trip.route.stationId, trip.routeId);
  }

  private assertInQueue(trip: Trip) {
    if (!ACTIVE_STATUSES.includes(trip.status)) {
      throw new BadRequestException('This bus is no longer in the queue');
    }
  }

  /** A bus can only wait in one queue at a time. */
  private async assertBusFree(busId: number, plate: string) {
    const busy = await this.trips.findOne({
      where: { busId, status: In(ACTIVE_STATUSES) },
      relations: { route: { station: true, destinationCity: true } },
    });
    if (busy) {
      throw new ConflictException(
        `Bus ${plate} is already in the queue at ${busy.route.station.name} for ${busy.route.destinationCity.name}`,
      );
    }
  }
}
