import { FC, lazy } from "react";

import { allowedRolesType } from "~src/components/navbar/utils/constants";

const LoginPageLazy = lazy(() =>
  import("~src/pages/auth/login").then((res) => ({ default: res.LoginPage }))
);
const TimesheetLazy = lazy(() =>
  import("~src/pages/main/timesheet/timesheet").then((res) => ({ default: res.TimesheetPage }))
);
const TimesheetLogsLazy = lazy(() =>
  import("~src/pages/main/timesheet-logs/timesheet-logs").then((res) => ({
    default: res.TimeSheetLogsPage
  }))
);
const RolesLazy = lazy(() =>
  import("~src/pages/main/roles/roles").then((res) => ({ default: res.RolesPage }))
);
const FacilitiesLazy = lazy(() =>
  import("~src/pages/main/facilities/facilities").then((res) => ({ default: res.FacilitiesPage }))
);
const EmployeesLazy = lazy(() =>
  import("~src/pages/main/employees/employees").then((res) => ({ default: res.EmployeesPage }))
);
const PositionsLazy = lazy(() =>
  import("~src/pages/main/positions/positions").then((res) => ({
    default: res.PositionsPage
  }))
);
const WorkersLazy = lazy(() =>
  import("~src/pages/main/workers/workers").then((res) => ({
    default: res.WorkersPage
  }))
);

export const ROUTE_CONSTANTS = {
  MAIN: "/",
  LOGIN: "/login",
  TIMESHEET: "/timesheet/:id",
  ROLES: "/roles",
  FACILITIES: "/facilities",
  USERS: "/users",
  POISITIONS: "/positions",
  EMPLOYEES: "/employees",
  TIMESHEET_LOGS: "/timesheet-logs"
};

interface RoutsType {
  component: FC;
  path: string;
  children?: RoutsType[];
  icon?: string;
  roleAccess?: string[];
  title?: string;
  allowedRoles: allowedRolesType[];
}

export const AuthRoutes: RoutsType[] = [
  {
    path: ROUTE_CONSTANTS.LOGIN,
    component: LoginPageLazy,
    allowedRoles: []
  }
];

export const MainRoutes: RoutsType[] = [
  {
    path: ROUTE_CONSTANTS.TIMESHEET,
    component: TimesheetLazy,
    allowedRoles: ["admin", "financier", "master", "personnel_officer"]
  },
  {
    path: ROUTE_CONSTANTS.ROLES,
    component: RolesLazy,
    allowedRoles: ["admin", "financier", "master", "personnel_officer"]
  },
  {
    path: ROUTE_CONSTANTS.FACILITIES,
    component: FacilitiesLazy,
    allowedRoles: ["admin", "financier", "master", "personnel_officer"]
  },
  {
    path: ROUTE_CONSTANTS.USERS,
    component: EmployeesLazy,
    allowedRoles: ["admin", "financier", "master", "personnel_officer"]
  },
  {
    path: ROUTE_CONSTANTS.POISITIONS,
    component: PositionsLazy,
    allowedRoles: ["admin", "financier", "master", "personnel_officer"]
  },
  {
    path: ROUTE_CONSTANTS.EMPLOYEES,
    component: WorkersLazy,
    allowedRoles: ["admin", "financier", "master", "personnel_officer"]
  },
  {
    path: ROUTE_CONSTANTS.TIMESHEET_LOGS,
    component: TimesheetLogsLazy,
    allowedRoles: ["admin", "financier", "master", "personnel_officer"]
  }
];
