import { User } from 'src/users/user.model';

export enum rolesType {
  'admin' = 'admin',
  'master' = 'master',
  'employee' = 'employee',
  'personnel_officer' = 'personnel_officer',
  'financier' = 'financier',
}

export enum employeeStatus {
  'fired' = 'fired',
  'master' = 'master',
  'archieve' = 'archieve',
}

export interface EmployeesReturnType extends Omit<User, 'role'> {
  role: {
    alt_name: string;
    name: string;
  };
}

export interface cellValueType {
  day?: number;
  night?: number;
  overwork?: number;
  total?: number;
}
