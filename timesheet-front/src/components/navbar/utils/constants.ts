import { ROUTE_CONSTANTS } from "~src/shared/constants/routes";
import { iconTypes } from "~src/shared/ui/icon/icon";

export type allowedRolesType = "admin" | "master" | "personnel_officer" | "financier";
export interface navBarItemType {
  label: string;
  icon: iconTypes;
  url: string[];
  allowedRoles: allowedRolesType[];
}

export const navbarItems: navBarItemType[] = [
  // {
  //   label: "Табеля",
  //   icon: "Timesheet",
  //   url: [ROUTE_CONSTANTS.TIMESHEET],
  //   allowedRoles: ["admin", "financier", "master", "personnel_officer"]
  // },
  {
    label: "Пользователи",
    icon: "Employees",
    url: [ROUTE_CONSTANTS.USERS],
    allowedRoles: ["admin"]
  },
  {
    label: "Сотрудники",
    icon: "Worker",
    url: [ROUTE_CONSTANTS.EMPLOYEES],
    allowedRoles: ["admin"]
  },
  {
    label: "Объекты",
    icon: "Facilities",
    url: [ROUTE_CONSTANTS.FACILITIES, ROUTE_CONSTANTS.TIMESHEET],
    allowedRoles: ["admin", "master", "personnel_officer", "financier"]
  },
  {
    label: "Должности",
    icon: "Position",
    url: [ROUTE_CONSTANTS.POISITIONS],
    allowedRoles: ["admin"]
  },
  {
    label: "Роли",
    icon: "Roles",
    url: [ROUTE_CONSTANTS.ROLES],
    allowedRoles: ["admin"]
  },
  {
    label: "История табеля",
    icon: "Logs",
    url: [ROUTE_CONSTANTS.TIMESHEET_LOGS],
    allowedRoles: ["admin"]
  }
];
