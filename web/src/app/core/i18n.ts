import { Injectable, Pipe, PipeTransform, inject, signal } from '@angular/core';

export type Lang = 'so' | 'en';

// Somali wording is a first draft: have a boosteejo manager check it before the pilot.
const TEXT = {
  appName: { en: 'Socdaal Boosteejo', so: 'Socdaal Boosteejo' },
  signIn: { en: 'Sign in', so: 'Gal' },
  signOut: { en: 'Sign out', so: 'Ka bax' },
  phone: { en: 'Phone number', so: 'Lambarka taleefanka' },
  pin: { en: 'PIN', so: 'PIN' },
  today: { en: 'Today', so: 'Maanta' },
  queue: { en: 'Bus queue', so: 'Safka basaska' },
  records: { en: 'Records', so: 'Diiwaanka' },
  admin: { en: 'Admin', so: 'Maamulka' },
  boosteejo: { en: 'Boosteejo', so: 'Boosteejo' },
  busesInQueue: { en: 'Buses in queue', so: 'Basaska safka ku jira' },
  departedToday: { en: 'Departed today', so: 'Ambabaxay maanta' },
  passengersToday: { en: 'Passengers today', so: 'Rakaabka maanta' },
  route: { en: 'Route', so: 'Jidka' },
  routes: { en: 'Routes', so: 'Jidadka' },
  registerBus: { en: 'Register bus arrival', so: 'Diiwaangeli bas yimid' },
  boarding: { en: 'Boarding', so: 'Rakaab qaadaya' },
  waiting: { en: 'Waiting', so: 'Sugaya' },
  departed: { en: 'Departed', so: 'Ambabaxay' },
  cancelled: { en: 'Cancelled', so: 'La joojiyay' },
  markDeparted: { en: 'Mark departed', so: 'Calaamadi ambabax' },
  departureTime: { en: 'Departure time', so: 'Waqtiga ambabaxa' },
  driver: { en: 'Driver', so: 'Darawalka' },
  driverPhone: { en: 'Driver phone', so: 'Taleefanka darawalka' },
  seats: { en: 'Seats', so: 'Kuraasta' },
  seatsLeft: { en: 'seats left', so: 'kursi banaan' },
  booked: { en: 'booked', so: 'la qabsaday' },
  statusBooked: { en: 'Booked', so: 'La qabsaday' },
  passengers: { en: 'Passengers', so: 'Rakaabka' },
  addPassenger: { en: 'Register passenger', so: 'Diiwaangeli rakaab' },
  name: { en: 'Full name', so: 'Magaca oo buuxa' },
  cancel: { en: 'Cancel', so: 'Jooji' },
  save: { en: 'Save', so: 'Kaydi' },
  search: { en: 'Search', so: 'Raadi' },
  date: { en: 'Date', so: 'Taariikhda' },
  plate: { en: 'Plate number', so: 'Taarikada' },
  bus: { en: 'Bus', so: 'Baska' },
  busType: { en: 'Bus type', so: 'Nooca baska' },
  newBus: { en: 'New bus', so: 'Bas cusub' },
  owner: { en: 'Owner', so: 'Milkiilaha' },
  ownerPhone: { en: 'Owner phone', so: 'Taleefanka milkiilaha' },
  open: { en: 'Open', so: 'Fur' },
  noBuses: { en: 'No buses in the queue for this route.', so: 'Bas kuma jiro safka jidkan.' },
  noPassengers: { en: 'No passengers yet.', so: 'Weli rakaab ma jiraan.' },
  moveUp: { en: 'Move up', so: 'Kor u qaad' },
  moveDown: { en: 'Move down', so: 'Hoos u dhig' },
  removeFromQueue: { en: 'Remove from queue', so: 'Ka saar safka' },
  trips: { en: 'Trips', so: 'Safarada' },
  arrived: { en: 'Arrived', so: 'Yimid' },
  status: { en: 'Status', so: 'Xaaladda' },
  notConnected: { en: 'Not connected — changes from other devices will not show', so: 'Lama xiriirin — isbeddelada qalabka kale ma muuqanayaan' },
  menu: { en: 'Menu', so: 'Menu-ga' },
  allRoutes: { en: 'All routes', so: 'Dhammaan jidadka' },
  noResults: { en: 'Nothing found. Try another date, route or plate.', so: 'Waxba lama helin. Isku day taariikh, jid ama taarikad kale.' },
  searchPassenger: { en: 'Name or phone number', so: 'Magaca ama lambarka taleefanka' },
  navStation: { en: 'Station', so: 'Boosteejada' },
  navSettings: { en: 'Settings', so: 'Habaynta' },
  queueSub: { en: 'Buses leave in this order. The first bus is boarding.', so: 'Basasku waxay u ambabaxaan sidan. Baska koowaad ayaa rakaab qaadaya.' },
  todaySub: { en: 'What is happening at this boosteejo today', so: 'Waxa maanta ka socda boosteejadan' },
  noBusesHint: { en: 'Register a bus when it arrives at the boosteejo.', so: 'Diiwaangeli baska marka uu yimaado boosteejada.' },
  timeNotSet: { en: 'Time not set', so: 'Waqti lama dhigin' },
  full: { en: 'Full', so: 'Buuxa' },
  of: { en: 'of', so: 'ka mid ah' },
  findBus: { en: 'Find the bus', so: 'Hel baska' },
  findBusHint: { en: 'Search by plate. A bus is registered once and reused.', so: 'Ku raadi taarikada. Bas hal mar ayaa la diiwaangeliyaa.' },
  notFoundNewBus: { en: 'No bus with this plate yet. Add its details to register it.', so: 'Bas taarikadan leh ma jiro. Ku dar faahfaahintiisa.' },
  change: { en: 'Change', so: 'Beddel' },
  tripDetails: { en: 'Trip details', so: 'Faahfaahinta safarka' },
  optional: { en: 'Optional', so: 'Ikhtiyaari' },
  addToQueue: { en: 'Add to queue', so: 'Ku dar safka' },
  signInSub: { en: 'Sign in with the phone number and PIN the admin gave you.', so: 'Ku gal lambarka taleefanka iyo PIN-ka maamulaha kuu siiyay.' },
  chooseStation: { en: 'Choose boosteejo', so: 'Dooro boosteejo' },
  noRoutes: { en: 'This boosteejo has no routes yet. The admin adds them.', so: 'Boosteejadan weli jid looma samayn. Maamulaha ayaa ku daraya.' },
} satisfies Record<string, Record<Lang, string>>;

export type TextKey = keyof typeof TEXT;

const LANG_KEY = 'socdaal.lang';

@Injectable({ providedIn: 'root' })
export class I18nService {
  readonly lang = signal<Lang>(this.readLang());

  t(key: TextKey): string {
    return TEXT[key][this.lang()];
  }

  setLang(lang: Lang) {
    this.lang.set(lang);
    document.documentElement.lang = lang;
    try {
      localStorage.setItem(LANG_KEY, lang);
    } catch {
      /* not remembered in private mode */
    }
  }

  private readLang(): Lang {
    try {
      return localStorage.getItem(LANG_KEY) === 'en' ? 'en' : 'so';
    } catch {
      return 'so';
    }
  }
}

/** {{ 'today' | t }} — impure so it follows the language switch. */
@Pipe({ name: 't', standalone: true, pure: false })
export class TranslatePipe implements PipeTransform {
  private readonly i18n = inject(I18nService);
  transform(key: TextKey): string {
    return this.i18n.t(key);
  }
}
