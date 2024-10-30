import { useQuery } from "@tanstack/react-query";

import { apiRequests } from "../api/requests";

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
    queryKey: ["all facilities", params.page, params.pageSize],
    queryFn: () => apiRequests.getAllFacilities({ ...params }),
    staleTime: 60000,
    gcTime: 60000
  });

  return {
    ...data
  };
};

export const useGetAllPositions = () => {
  const { ...data } = useQuery({
    queryKey: ["all positions"],
    queryFn: () => apiRequests.getAllPositions(),
    staleTime: 60000,
    gcTime: 60000
  });

  return {
    ...data
  };
};

export const useGetAllWorkers = (params: { searchName?: string }) => {
  const { searchName } = { ...params };

  const { ...data } = useQuery({
    queryKey: ["all workers", searchName],
    queryFn: () =>
      apiRequests.getWorkers({
        searchName
      }),
    staleTime: 60000,
    gcTime: 60000
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
    staleTime: 60000,
    gcTime: 60000,
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
    staleTime: 1000000,
    gcTime: 1000000,
    enabled: enabled
  });
  return { ...data };
};

export const useGetAllEmployees = () => {
  const { ...data } = useQuery({
    queryKey: ["all employees"],
    queryFn: () => apiRequests.getEmployees(),
    staleTime: 10000,
    gcTime: 10000
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
      }),
    staleTime: 10000,
    gcTime: 10000
  });
  return { ...data };
};

export const refetchQuery = (queryKey: string[]) => {
  return queryClient.refetchQueries({
    queryKey: queryKey
  });
};
