import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { City, Route, Station } from '../entities';
import {
  CreateCityDto,
  CreateRouteDto,
  CreateStationDto,
  StationQueryDto,
  UpdateCityDto,
  UpdateRouteDto,
  UpdateStationDto,
} from './locations.dto';

@Injectable()
export class LocationsService {
  constructor(
    @InjectRepository(City) private readonly cities: Repository<City>,
    @InjectRepository(Station) private readonly stations: Repository<Station>,
    @InjectRepository(Route) private readonly routes: Repository<Route>,
  ) {}

  // ---- Cities ----

  listCities() {
    return this.cities.find({ order: { name: 'ASC' } });
  }

  async createCity(dto: CreateCityDto) {
    if (await this.cities.exists({ where: { name: dto.name } })) {
      throw new ConflictException(`${dto.name} is already registered`);
    }
    return this.cities.save(this.cities.create(dto));
  }

  async updateCity(id: number, dto: UpdateCityDto) {
    const city = await this.findCity(id);
    return this.cities.save(Object.assign(city, dto));
  }

  async findCity(id: number) {
    const city = await this.cities.findOne({ where: { id } });
    if (!city) throw new NotFoundException('City not found');
    return city;
  }

  // ---- Boosteejos ----

  listStations(query: StationQueryDto) {
    const qb = this.stations
      .createQueryBuilder('s')
      .leftJoinAndSelect('s.city', 'city')
      .leftJoinAndSelect('s.routes', 'r', 'r.active = true AND r.deleted_at IS NULL')
      .leftJoinAndSelect('r.destinationCity', 'dest')
      .where('s.active = true')
      .orderBy('city.name', 'ASC')
      .addOrderBy('s.name', 'ASC');

    if (query.cityId) qb.andWhere('s.city_id = :cityId', { cityId: query.cityId });
    if (query.destinationCityId) {
      qb.andWhere(
        'EXISTS (SELECT 1 FROM routes r2 WHERE r2.station_id = s.id AND r2.destination_city_id = :dest AND r2.active = true AND r2.deleted_at IS NULL)',
        { dest: query.destinationCityId },
      );
    }
    return qb.getMany();
  }

  async findStation(id: number) {
    const station = await this.stations.findOne({
      where: { id },
      relations: { city: true, routes: { destinationCity: true } },
    });
    if (!station) throw new NotFoundException('Boosteejo not found');
    return station;
  }

  async createStation(dto: CreateStationDto) {
    await this.findCity(dto.cityId);
    if (await this.stations.exists({ where: { cityId: dto.cityId, name: dto.name } })) {
      throw new ConflictException(`A boosteejo called ${dto.name} already exists in this city`);
    }
    const saved = await this.stations.save(this.stations.create(dto));
    return this.findStation(saved.id);
  }

  async updateStation(id: number, dto: UpdateStationDto) {
    const station = await this.stations.findOne({ where: { id } });
    if (!station) throw new NotFoundException('Boosteejo not found');
    if (dto.cityId) await this.findCity(dto.cityId);
    await this.stations.save(Object.assign(station, dto));
    return this.findStation(id);
  }

  // ---- Routes ----

  listRoutes(stationId: number) {
    return this.routes.find({
      where: { stationId },
      relations: { destinationCity: true },
      order: { destinationCity: { name: 'ASC' } },
    });
  }

  async createRoute(stationId: number, dto: CreateRouteDto) {
    const station = await this.findStation(stationId);
    await this.findCity(dto.destinationCityId);
    if (station.cityId === dto.destinationCityId) {
      throw new ConflictException('A route must go to a different city');
    }
    if (await this.routes.exists({ where: { stationId, destinationCityId: dto.destinationCityId } })) {
      throw new ConflictException('This boosteejo already serves that destination');
    }
    const saved = await this.routes.save(this.routes.create({ stationId, destinationCityId: dto.destinationCityId }));
    return this.findRoute(saved.id);
  }

  async updateRoute(id: number, dto: UpdateRouteDto) {
    const route = await this.findRoute(id);
    route.active = dto.active;
    return this.routes.save(route);
  }

  /** The route with its boosteejo, used to check which boosteejo a trip belongs to. */
  async findRoute(id: number) {
    const route = await this.routes.findOne({
      where: { id },
      relations: { station: { city: true }, destinationCity: true },
    });
    if (!route) throw new NotFoundException('Route not found');
    return route;
  }
}
