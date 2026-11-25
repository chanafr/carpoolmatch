// Core data model. Shape mirrors carpool-seed-data.json so seed data loads without remapping.

export const DAYS = ['sun', 'mon', 'tue', 'wed', 'thu'] as const;
export type DayKey = (typeof DAYS)[number];

export const DIRECTIONS = ['morning', 'afternoon'] as const;
export type Direction = (typeof DIRECTIONS)[number];

export const DAY_LABELS: Record<DayKey, string> = {
  sun: 'ראשון',
  mon: 'שני',
  tue: 'שלישי',
  wed: 'רביעי',
  thu: 'חמישי',
};

export const DIRECTION_LABELS: Record<Direction, string> = {
  morning: 'בוקר',
  afternoon: 'צהריים',
};

export interface Institution {
  id: string;
  name: string;
  color: string; // hex, used for the school tag
  defaultStartTime: string; // "HH:MM"
  defaultEndTime: string;
}

export type Availability = Record<DayKey, Record<Direction, boolean>>;

export interface Parent {
  id: string;
  name: string;
  phone?: string;
  seatCapacity: number; // passenger seats, excluding the driver
  color: string; // avatar badge color (hex)
  availability: Availability;
}

export interface ChildDaySchedule {
  start: string; // "HH:MM" — morning drop-off time
  end: string; // "HH:MM" — afternoon pick-up time
  needsMorning?: boolean; // defaults to true
  needsAfternoon?: boolean; // defaults to true
}

export interface Child {
  id: string;
  name: string;
  parentId: string;
  institutionId: string;
  // A missing day means the child needs no rides that day.
  schedule: Partial<Record<DayKey, ChildDaySchedule>>;
}

export interface RideSlot {
  id: string;
  day: DayKey;
  direction: Direction;
  institutionId: string;
  time: string; // start time (morning) or end time (afternoon)
  driverId: string | null; // null = conflict, no eligible driver
  passengerIds: string[]; // child ids
  assignmentReason: string;
}

export interface CarpoolData {
  institutions: Institution[];
  parents: Parent[];
  children: Child[];
}

export interface AppState extends CarpoolData {
  rides: RideSlot[];
  activeParentId: string | null; // "Viewing as" switcher
  scheduleStale?: boolean; // data edited since the last auto-schedule
}

export type FairnessLabel = 'מאוזן מאוד' | 'סביר' | 'דורש איזון';

export interface FairnessResult {
  score: number; // 0–100
  label: FairnessLabel;
  spread: number;
  maxDrives: number;
  minDrives: number;
  counts: Record<string, number>; // parentId -> drives this week
}

export interface SwapCandidate {
  parent: Parent;
  driveCount: number;
  hasOwnChild: boolean;
}
