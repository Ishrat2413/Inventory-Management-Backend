/**
 * Shared pagination helper used by every module's `getMany*` service.
 * Mirrors the shape already produced by the user module so all list
 * endpoints return a consistent `{ data, totalData, totalPages }` envelope.
 */
export interface PaginationInput {
  pageNo?: number;
  showPerPage?: number;
}

export interface PaginationResult {
  skip: number;
  take: number;
  pageNo: number;
  showPerPage: number;
}

export const buildPagination = ({ pageNo = 1, showPerPage = 10 }: PaginationInput): PaginationResult => {
  const parsedPageNo = Number(pageNo);
  const parsedShowPerPage = Number(showPerPage);
  
  const safePageNo = parsedPageNo > 0 && !isNaN(parsedPageNo) ? parsedPageNo : 1;
  const safeShowPerPage = parsedShowPerPage > 0 && !isNaN(parsedShowPerPage) ? parsedShowPerPage : 10;
  return {
    skip: (safePageNo - 1) * safeShowPerPage,
    take: safeShowPerPage,
    pageNo: safePageNo,
    showPerPage: safeShowPerPage,
  };
};

export const totalPagesOf = (totalData: number, showPerPage: number) => Math.ceil(totalData / showPerPage) || 1;
