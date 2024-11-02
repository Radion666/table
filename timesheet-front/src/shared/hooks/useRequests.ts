import { useQuery } from "@tanstack/react-query";

import { apiRequests } from "../api/requests";
import { workerStatusType } from "../types/employees";

import { useGetUser } from "./useGetUser";

import { queryClient } from "~src/app/App";

export const defaultQueryKeys = {
  allFacilities: ["all facilities"],
  allMasters: ["all masters"],
  allPositions: ["all positions"],
  allWorkers: ["all workers"],
  allEmployess: ["all employees"]
};

export type defaultPaginatedType = { page: number; pageSize: number };

export const useGetAllFacilities = (params: defaultPaginatedType) => {
  const { ...data } = useQuery({
    queryKey: ["all facilities", params?.page, params?.pageSize],
    queryFn: () => apiRequests.getAllFacilities({ ...params })
  });

  return {
    ...data
  };
};

export const useGetAllPositions = () => {
  const { ...data } = useQuery({
    queryKey: ["all positions"],
    queryFn: () => apiRequests.getAllPositions()
  });

  return {
    ...data
  };
};

export const useGetAllWorkers = (params: { searchName?: string; status: workerStatusType }) => {
  const { searchName, status } = { ...params };

  const { ...data } = useQuery({
    queryKey: ["all workers", searchName, status],
    queryFn: () =>
      apiRequests.getWorkers({
        searchName,
        status
      })
  });

  return {
    ...data
  };
};

export const useGetAllMasters = () => {
  const { user } = useGetUser();

  const { ...data } = useQuery({
    queryKey: ["all masters"],
    queryFn: () => apiRequests.getEmployees("master"),
    enabled: user?.role?.name !== "master"
  });

  return {
    ...data
  };
};

export const useGetAllRoles = (enabled?: boolean) => {
  const { ...data } = useQuery({
    queryKey: ["all roles"],
    queryFn: () => apiRequests.getRoles(),
    enabled: enabled
  });
  return { ...data };
};

export const useGetAllEmployees = () => {
  const { ...data } = useQuery({
    queryKey: ["all employees"],
    queryFn: () => apiRequests.getEmployees()
  });
  return { ...data };
};

export const useGetAllLogs = ({ page, pageSize }: { page: number; pageSize: number }) => {
  const { ...data } = useQuery({
    queryKey: ["all logs", page, pageSize],
    queryFn: () =>
      apiRequests.getLogs({
        page,
        pageSize
      })
  });
  return { ...data };
};

export const refetchQuery = (queryKey: string[]) => {
  return queryClient.refetchQueries({
    queryKey: queryKey
  });
};
