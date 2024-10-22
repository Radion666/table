import { employmentPeriodsType, facilityPeriodsType } from "~src/shared/types/employees";

const people: employeeType[] = [];

for (let i = 1; i <= 2; i++) {
  people.push({
    fullName: `ФИО ${i}`, // Замените на реальные имена, если нужно
    position: `Профессия ${i}`, // Можно заменить на реальные профессии
    local: Math.round(Math.random()), // Случайно выбираем 0 или 1
    dates: {}
  });
}

export interface employeeTotalType {
  hoursOfDay: number;
  hoursOfNight: number;
  countOfWorkDays: number;
  hoursOfWeekendWorkDays: number;
  countOfWeekendWorkDays: number;
  hoursOfOverworkTwoHours: number;
  hoursOfOverworkMoreTwoHours: number;
}

export type employeeDatesType = Record<
  string,
  | string
  | {
      day: string;
      night: string;
      overwork: string;
    }
>;

export interface employeeType {
  fullName: string;
  position: string;
  local: number;
  isTotal?: boolean;
  employmentPeriods: employmentPeriodsType[];
  facilityPeriods: facilityPeriodsType[];
  employeeId: number;
  dates: employeeDatesType;
  total: employeeTotalType;
}

export type datesToBackType = Record<
  string,
  | string
  | {
      day: number;
      night: number;
      overwork: number;
    }
  | null
>;

export type dateToBackValueType =
  | string
  | {
      day: number;
      night: number;
      overwork: number;
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
    };

export interface filledDateValueTye {
  day: string;
  night: string;
  overwork: string;
}

export { people };
