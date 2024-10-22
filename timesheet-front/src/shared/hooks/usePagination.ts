import { useState } from "react";

import { PaginationProps } from "antd";

export const usePagination = () => {
  const [totalPage, setTotalPage] = useState<number>(0);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(50);

  const onShowSizeChange: PaginationProps["onShowSizeChange"] = (current, pageSize) => {
    setPageSize(pageSize);
  };
  const onChange: PaginationProps["onChange"] = (page) => {
    setCurrentPage(page);
  };

  return {
    totalPage,
    setTotalPage,
    currentPage,
    pageSize,
    onShowSizeChange,
    onChange
  };
};
