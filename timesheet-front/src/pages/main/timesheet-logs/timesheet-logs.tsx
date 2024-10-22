import { useEffect } from "react";

import { Pagination } from "antd";

import { workLogLogsColumns } from "./utils/constants";

import { GridTable } from "~src/components/grid-table/grid-table";
import { usePagination } from "~src/shared/hooks";
import { useGetAllLogs } from "~src/shared/hooks/useRequests";

export const TimeSheetLogsPage = () => {
  const { currentPage, onChange, onShowSizeChange, pageSize, setTotalPage, totalPage } =
    usePagination();

  const { data, isLoading } = useGetAllLogs({
    page: currentPage,
    pageSize: pageSize
  });

  useEffect(() => {
    if (data?.data?.totalPage) {
      setTotalPage(data?.data?.totalPage);
    }
  }, [data?.data]);

  return (
    <div className="flex flex-1 flex-col gap-5 justify-center p-5">
      {data?.data && <GridTable columns={workLogLogsColumns} rowData={data?.data?.items} />}
      {data?.data && (
        <Pagination
          onChange={onChange}
          current={currentPage}
          // showSizeChanger
          onShowSizeChange={onShowSizeChange}
          showTotal={(total, range) => `${range[0]}-${range[1]} из ${total} элементов`}
          total={data?.data?.totalItems}
          pageSize={pageSize}
          align="center"
        />
      )}
    </div>
  );
};
