import { UserType } from "./user";

export interface facilitiyType {
  alt_name: string;
  id: number;
  name: string;
  address: string | null;
  description: string | null;
  masterFactories: {
    master_id: number;
    master: Pick<UserType, "lastName" | "firstName" | "middleName" | "phoneNumber">;
  }[];
  settings: facilityTimesheetSettingType;
  productionCalendar: productionCalendarType[];
}

export interface productionCalendarType {
  id: number;
  facilityId: number;
  startDate: string;
  endDate: string | null;
  workingDays: string[];
  months: Month;
  createdAt: string;
}

export interface Month {
  month: number;
  days: number[];
}

export interface masterFacilityType {
  master_id: number[];
  facility_id: number;
}
export interface createFacilityWithMasterType {
  facilityName: string;
  masters: number[];
  settings: facilityTimesheetSettingType;
}

export interface facilityTimesheetSettingType {
  letters: true;
  integers: worksheetTableFacilitySettingIntegersType;
}

export type worksheetTableFacilitySettingIntegersType = {
  allowDay: boolean;
  allowNight: boolean;
  allowOverwork: boolean;
  allowOnlyTotal: boolean;
};
