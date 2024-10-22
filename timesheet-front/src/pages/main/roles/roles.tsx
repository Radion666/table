import { useQuery } from "@tanstack/react-query";

import { rolesColumns } from "./utils/constants";

import { GridTable } from "~src/components/grid-table/grid-table";
import { Loader } from "~src/components/loader/loader";
import { apiRequests } from "~src/shared/api/requests";

export const RolesPage = () => {
  const { data, isFetching } = useQuery({
    queryKey: ["all roles"],
    queryFn: () => apiRequests.getRoles(),
    retry: false,
    gcTime: 100000,
    staleTime: 100000
  });

  if (isFetching) {
    return <Loader />;
  }

  return (
    <div className="flex flex-1 justify-center p-5 ">
      {data?.data && (
        <GridTable
          rowData={data?.data?.filter((role) => role.name !== "worker")}
          columns={rolesColumns}
          defaultColDefParams={{
            sortable: true
          }}
        />
      )}
    </div>
  );
};
