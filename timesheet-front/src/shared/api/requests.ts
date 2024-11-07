import { toast } from "react-toastify";

import { defaultPaginatedType } from "../hooks/useRequests";
import { defaultPaginatedResponseType } from "../types/default";
import {
  actualWorkersResponseType,
  createWorkerType,
  workersByFacilityIdType,
  workersResponseType,
  workerStatusType
} from "../types/employees";
import {
  facilitiyType,
  facilityTimesheetSettingType,
  masterFacilityType
} from "../types/facilities";
import { workLogsChangeResponseType } from "../types/logs";
import { positionType } from "../types/positions";
import { roleType } from "../types/roles";
import { CreateEmployeeType, usersEmployeeType, UserType } from "../types/user";

import { apiConfigRequests } from "./config";

import {
  datesToBackType,
  employeesFromBackType,
  employeeToBackType,
  employeeType
} from "~src/pages/main/timesheet/data";

export const apiRequests = {
  createEmployee: (createEmployee: CreateEmployeeType) => {
    return apiConfigRequests({
      method: "post",
      url: "/auth/create",
      data: { ...createEmployee }
    });
  },

  updateUser: (updateEmployee: CreateEmployeeType, id?: number) => {
    if (!id) return;

    return apiConfigRequests({
      method: "patch",
      url: `/users/${id}`,
      data: {
        ...Object.fromEntries(
          Object.entries(updateEmployee).filter(([key, value]) => Boolean(value))
        )
      }
    });
  },

  getUser: () => {
    return apiConfigRequests<UserType>({
      method: "get",
      url: "/auth/user"
    });
  },
  getRoles: () => {
    return apiConfigRequests<roleType[]>({
      method: "get",
      url: "/roles"
    });
  },
  updateRole: (roleId: number, newName: string) => {
    return apiConfigRequests({
      method: "patch",
      url: `/roles/${roleId}`,
      data: {
        alt_name: newName
      }
    });
  },

  getEmployees: (type?: string, facilityId?: number) => {
    return apiConfigRequests<usersEmployeeType[]>({
      method: "get",
      url: "/users/employees",
      params: {
        ...(type && {
          type
        }),
        ...(facilityId && {
          facilityId
        })
      }
    });
  },

  getAllFacilities: ({ page, pageSize }: defaultPaginatedType) => {
    return apiConfigRequests<defaultPaginatedResponseType<facilitiyType>>({
      method: "get",
      url: "/facilities",
      params: {
        page,
        pageSize
      }
    });
  },
  createFacility: ({
    name,
    mastersIds,
    settings
  }: {
    name: string;
    mastersIds: number[];
    settings: facilityTimesheetSettingType;
  }) => {
    return apiConfigRequests<facilitiyType>({
      method: "post",
      url: "/facilities",
      data: {
        name,
        mastersIds,
        settings
      }
    });
  },
  updateFacilityName: ({
    id,
    newName,
    mastersIds
  }: {
    id: number;
    newName: string;
    mastersIds: number[];
  }) => {
    return apiConfigRequests({
      method: "patch",
      url: `/facilities/${id}`,
      data: {
        name: newName,
        ...(mastersIds?.length && {
          mastersIds
        })
      }
    });
  },

  updateMasterFacility: async ({ facility_id, master_id }: masterFacilityType) => {
    return apiConfigRequests({
      method: "patch",
      url: `/master-facilities?id=${facility_id}`,
      data: {
        mastersIds: master_id
      }
    });
  },

  getAllPositions: async () => {
    return apiConfigRequests<positionType[]>({
      method: "get",
      url: "/positions"
    });
  },
  getPositionsByFacilityId: async (facilityId?: number) => {
    if (!facilityId) return Promise.reject([]);
    return apiConfigRequests<positionType[]>({
      method: "get",
      url: `positions/byFacility/${facilityId}`
    });
  },

  createPosition: async ({ name, facilities }: Pick<positionType, "name" | "facilities">) => {
    return apiConfigRequests<positionType>({
      method: "post",
      url: "/positions",
      data: {
        name,
        ...(facilities?.length && {
          facilities: facilities
        })
      }
    });
  },
  updatePosition: async ({
    id,
    name,
    facilities
  }: Pick<positionType, "name" | "id" | "facilities">) => {
    return apiConfigRequests<positionType>({
      method: "patch",
      url: `/positions/${id}`,
      data: {
        name,
        ...(facilities?.length && {
          facilities
        })
      }
    });
  },

  getWorkers: async ({ searchName, status }: { searchName?: string; status: workerStatusType }) => {
    return apiConfigRequests<actualWorkersResponseType[]>({
      method: "get",
      url: "/employees",
      params: {
        ...(searchName && {
          searchName
        }),
        status
      }
    });
  },
  createWorker: async (data: createWorkerType) => {
    return apiConfigRequests<workersResponseType>({
      method: "post",
      url: "/employees",
      data
    });
  },
  updateWorker: async (data: Omit<createWorkerType, "createdById">, id?: number) => {
    if (!id) return;
    return apiConfigRequests<workersResponseType>({
      method: "patch",
      url: `/employees/${id}`,
      data
    });
  },

  downloadReport: async (facilityId: number, date: string) => {
    return apiConfigRequests({
      method: "get",
      url: `work-logs/download?date=${date}&id=${facilityId}`,
      responseType: "blob"
    });
  },

  getWorkersByFacilityId: async (facilityId: number, date: string) => {
    if (!facilityId) return;

    return apiConfigRequests<workersByFacilityIdType[]>({
      method: "get",
      url: `/employees/byFacilities`,
      params: {
        facilityId,
        date
      }
    });
  },
  /**
   * Формат MM-YYYY
   */

  getFacilityId: async (id?: number) => {
    if (!id) return Promise.reject([]);
    const { data } = await apiConfigRequests<facilitiyType>({
      method: "get",
      url: `/facilities/${id}`
    });
    return data;
  },

  getWorkLogs: (date: string, id?: number) => {
    if (!id) return;
    return apiConfigRequests<employeesFromBackType[]>({
      method: "get",
      url: `/work-logs/${date.replace(/^0(\d)-/, "$1-")}/${id}`
    });
  },
  saveWorkLogs: (data: employeeType[], facilityId?: number) => {
    if (!facilityId) {
      toast.error("ID объекта не был передан");
      return new Promise((res, rej) => {
        rej("ID объекта не был передан");
      });
    }

    const copyOfData = structuredClone(data);
    copyOfData.splice(copyOfData?.length - 1, 1);

    const dataToSave: employeeToBackType[] = [];

    for (let i = 0; i < copyOfData.length; i++) {
      const element = copyOfData[i];

      const newDates: datesToBackType = {};

      for (const j in element.dates) {
        const date = element.dates[j];

        if (typeof date === "string") {
          newDates[j] = date === "" ? null : date;
        } else {
          newDates[j] = {
            day: +date?.day,
            night: +date?.night,
            overwork: +date?.overwork,
            total: +date?.total
          };
        }
      }

      dataToSave.push({
        dates: newDates,
        employeeId: element.employeeId,
        facilityId: facilityId
      });
    }

    return apiConfigRequests<workersResponseType>({
      method: "post",
      url: `/work-logs`,
      data: dataToSave
    });
  },

  getLogs: ({ page, pageSize }: { page: number; pageSize: number }) => {
    return apiConfigRequests<workLogsChangeResponseType>({
      method: "get",
      url: "/worklogschanges",
      params: {
        page,
        pageSize
      }
    });
  }
};
