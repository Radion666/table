import { employmentPeriodsType, facilityPeriodsType } from "~src/shared/types/employees";

export interface employeeTotalType {
  hoursOfDay: number;
  hoursOfNight: number;
  countOfWorkDays: number;
  hoursOfWeekendWorkDays: number;
  countOfWeekendWorkDays: number;
  hoursOfOverworkTwoHours: number;
  hoursOfOverworkMoreTwoHours: number;
  hoursOfOnlyTotalHours: number;
  lettersSum: lettersSumType;
}

export type lettersSumType = {
  Я: number;
  П: number;
  Б: number;
  В: number;
  О: number;
  МО: number;
  А: number;
};

export type employeeDatesType = Record<
  string,
  | string
  | {
      day: string;
      night: string;
      overwork: string;
      total: string;
      lettersSum?: lettersSumType;
    }
>;

export interface employeeType {
  fullName: string;
  position: string;
  local: number;
  isTotal?: boolean;
  employmentPeriods: employmentPeriodsType[];
  actualAddress: string;
  registeredAddress: string;
  facilityPeriods: facilityPeriodsType[];
  employeeId: number;
  phoneNumber: string;
  lastName: string;
  firstName: string;
  middleName: string;
  dates: employeeDatesType;
  total: employeeTotalType;
  lastStatus: string;
  lastPosition: {
    id: number;
    name: string;
  };
  lastIsOutOfTown: boolean;
}

export type datesToBackType = Record<
  string,
  | string
  | {
      day: number;
      night: number;
      overwork: number;
      total: number;
    }
  | null
>;

export type dateToBackValueType =
  | string
  | {
      day: number;
      night: number;
      overwork: number;
      total: number;
    }
  | null;

export interface employeeToBackType {
  facilityId: number;
  employeeId: number;
  dates: datesToBackType;
}

export interface employeesFromBackType {
  facilityId: number;
  employee: {
    id: number;
    firstName: string;
    lastName: string;
    middleName: string;
  };
  workDays: datesToBackType;
}

export type dateValueType =
  | string
  | {
      day: string;
      night: string;
      overwork: string;
      total: string;
      lettersSum?: lettersSumType;
    };

export interface filledDateValueTye {
  day: string;
  night: string;
  overwork: string;
  total: string;
}
