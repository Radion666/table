import { actualUserType } from "./user";

export interface workersResponseType {
  id: number;
  dateAdded: string;
  status: workerStatusType;
  phoneNumber: string;
  isOutOfTown: boolean;
  registeredAddress: string;
  actualAddress: string;
  createdAt: string;
  updatedAt: string;
  position?: Position;
  facility?: Facility;
  creator?: Creator;
  master?: Master;
  firstName: string;
  middleName: string;
  lastName: string;
}

export interface actualWorkersResponseType {
  id: number;
  dateAdded: string;
  employmentPeriods: employmentPeriodsType[];
  phoneNumber: string;
  outOfTownPeriods: outOfTownPeriodsType[];
  registeredAddress: string;
  actualAddress: string;
  createdAt: string;
  updatedAt: string;
  positionPeriods?: positionPeriodsType[];
  facilityPeriods: facilityPeriodsType[];
  lastFacility?: lastfacilityType;
  lastIsOutOfTown: boolean;
  lastMaster?: masterPeriodsType;
  lastPosition?: lastPositionType;
  lastStatus: workerStatusType;
  creator?: Creator;
  masterPeriods: masterPeriodsType[];
  firstName: string;
  middleName: string;
  lastName: string;
}

interface lastPositionType extends defaultIdNameType {}

interface lastfacilityType extends defaultIdNameType {}

interface defaultIdNameType {
  id: number;
  name: string;
}

export interface positionPeriodsType {
  createdAt: string;
  endDate: string | null;
  startDate: string;
  position: {
    name: string;
    id: number;
  };
  id: number;
}

export interface employmentPeriodsType {
  createdAt: string;
  endDate: string | null;
  startDate: string;
  status: workerStatusType;
  id: number;
}

export interface masterPeriodsType {
  createdAt: string;
  endDate: string | null;
  startDate: string;
  id: number;
  user: actualUserType;
}

export interface facilityPeriodsType {
  createdAt: string;
  endDate: string | null;
  startDate: string;
  facility: {
    name: string;
    id: number;
  };
  employeeId: number;
}

export interface outOfTownPeriodsType {
  createdAt: string;
  endDate: string | null;
  startDate: string;
  isOutOfTown: boolean;
}

export interface workersByFacilityIdType {
  id: number;
  status: workerStatusType;
  isOutOfTown: boolean;
  position: Position;
  firstName: string;
  middleName: string;
  lastName: string;
  employmentPeriods: employmentPeriodsType[];
  facilityPeriods: facilityPeriodsType[];
  lastIsOutOfTown: boolean;
  lastPosition: {
    id: number;
    name: string;
  };
}

export interface createWorkerType {
  createdById: number;
  status: workerStatusType;
  phoneNumber: string;
  isOutOfTown: boolean;
  lastName: string;
  firstName: string;
  middleName: string;
  registeredAddress: string;
  actualAddress: string;
  facilityId: number | null;
  positionId: number | null;
  masterId: number | null;
}

export type workerStatusType = "working" | "fired" | "archived";

interface Position {
  id: number;
  name: string;
}

interface Facility {
  id: number;
  name: string;
}

interface Creator {
  id: number;
  firstName: string;
  lastName: string;
}

interface Master {
  id: number;
  firstName: string;
  lastName: string;
}
