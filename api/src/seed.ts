// Creates the first admin account and a starting list of cities.
// Run once after the first migration: npm run seed
import 'dotenv/config';
import 'reflect-metadata';
import { normalizePhone, hashPin } from './auth/auth.service';
import dataSource from './data-source';
import { City, User, UserRole } from './entities';

const STARTING_CITIES: { name: string; region: string | null }[] = [
  { name: 'Mogadishu', region: 'Banaadir' },
  { name: 'Kismaayo', region: null },
  { name: 'Baidoa', region: null },
  { name: 'Beledweyne', region: null },
  { name: 'Garoowe', region: null },
  { name: 'Afgooye', region: null },
];

async function seed() {
  await dataSource.initialize();
  const cities = dataSource.getRepository(City);
  const users = dataSource.getRepository(User);

  for (const city of STARTING_CITIES) {
    if (!(await cities.exists({ where: { name: city.name } }))) {
      await cities.save(cities.create(city));
      console.log(`Added city ${city.name}`);
    }
  }

  const phone = normalizePhone(process.env.ADMIN_PHONE ?? '');
  const pin = process.env.ADMIN_PIN ?? '';
  if (!phone || !/^\d{4,6}$/.test(pin)) {
    throw new Error('Set ADMIN_PHONE and a 4–6 digit ADMIN_PIN in .env');
  }
  if (!(await users.exists({ where: { phone } }))) {
    await users.save(
      users.create({
        name: process.env.ADMIN_NAME ?? 'Admin',
        phone,
        role: UserRole.ADMIN,
        stationId: null,
        pinHash: await hashPin(pin),
      }),
    );
    console.log(`Created admin ${phone}`);
  }

  await dataSource.destroy();
}

seed().catch((err) => {
  console.error(err);
  process.exit(1);
});
