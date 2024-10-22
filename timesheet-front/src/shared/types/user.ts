import { positionType } from "./positions";
import { roleType } from "./roles";

export interface UserType {
  firstName: string;
  lastName: string;
  login: string;
  middleName: string;
  position: string | null;
  role: {
    id: number;
    alt_name: string;
    name: "admin" | "master";
  };
  phoneNumber?: string;
  id: number;
}

export interface EmployeeType extends Omit<UserType, "role"> {
  phoneNumber: string;
  birthDate: string;
  employmentDate: string;
  lastLoginAt: string;
  role_id: number | null;
  positionId: number | null;
}

export interface CreateEmployeeType extends EmployeeType {
  password: string;
}

export interface usersEmployeeType {
  id: number;
  login: string;
  lastName: string;
  firstName: string;
  middleName: string;
  phoneNumber: string;
  position?: positionType;
  role?: roleType;
}

export interface actualUserType {
  firstName: string;
  lastName: string;
  middleName: string;
  position: positionType;
  role: {
    id: number;
    alt_name: string;
    name: "admin" | "master";
  };
  phoneNumber?: string;
  id: number;
}
