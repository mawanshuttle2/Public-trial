
export enum TransportType {
  BUS = 'BUS',
  FERRY = 'FERRY'
}

export type Language = 'en' | 'zh';
export type ScheduleOverride = 'auto' | 'weekday' | 'saturday' | 'sunday';

export interface LocalizedString {
  en: string;
  zh: string;
}

export interface Stop {
  name: LocalizedString;
}

export interface ScheduleData {
  weekday: string[];
  saturday: string[];
  sunday: string[];
}

export interface Direction {
  label: LocalizedString;
  from: LocalizedString;
  to: LocalizedString;
  stops: Stop[];
  departures: ScheduleData;
}

export interface Route {
  id: string;
  name: LocalizedString;
  type: TransportType;
  directions: Direction[];
}

export interface CountdownState {
  minutes: number;
  seconds: number;
  departureTime: string;
  isAvailable: boolean;
}
