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
}

export interface masterFacilityType {
  master_id: number[];
  facility_id: number;
}
export interface createFacilityWithMasterType {
  facilityName: string;
  masters: number[];
}
