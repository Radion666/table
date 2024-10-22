export interface defaultPaginatedResponseType<T> {
  currentPage: number;
  pageSize: number;
  totalItems: number;
  totalPage: number;
  items: T[];
}
