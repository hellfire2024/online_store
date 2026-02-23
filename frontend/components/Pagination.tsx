import React from "react";

interface PaginationProps {
  currentPage: number;
  totalItems: number;
  itemsPerPage: number;
  onPageChange: (page: number) => void;
  onItemsPerPageChange: (itemsPerPage: number) => void;
}

const Pagination: React.FC<PaginationProps> = ({
  currentPage,
  totalItems,
  itemsPerPage,
  onPageChange,
  onItemsPerPageChange,
}) => {
  const totalPages =
    itemsPerPage === -1 ? 1 : Math.ceil(totalItems / itemsPerPage);
  const startItem =
    itemsPerPage === -1 ? 1 : (currentPage - 1) * itemsPerPage + 1;
  const endItem =
    itemsPerPage === -1
      ? totalItems
      : Math.min(currentPage * itemsPerPage, totalItems);

  const pageNumbers = [];
  const maxVisiblePages = 5;

  if (totalPages <= maxVisiblePages) {
    for (let i = 1; i <= totalPages; i++) {
      pageNumbers.push(i);
    }
  } else {
    if (currentPage <= 3) {
      for (let i = 1; i <= 4; i++) pageNumbers.push(i);
      pageNumbers.push(-1); // ellipsis
      pageNumbers.push(totalPages);
    } else if (currentPage >= totalPages - 2) {
      pageNumbers.push(1);
      pageNumbers.push(-1);
      for (let i = totalPages - 3; i <= totalPages; i++) pageNumbers.push(i);
    } else {
      pageNumbers.push(1);
      pageNumbers.push(-1);
      for (let i = currentPage - 1; i <= currentPage + 1; i++)
        pageNumbers.push(i);
      pageNumbers.push(-1);
      pageNumbers.push(totalPages);
    }
  }

  return (
    <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mt-6 px-4 py-3 bg-slate-800 rounded-lg border border-slate-700">
      <div className="flex items-center gap-2">
        <label className="text-sm text-gray-300">Show:</label>
        <select
          value={itemsPerPage}
          onChange={(e) => {
            const value = parseInt(e.target.value);
            onItemsPerPageChange(value);
            onPageChange(1);
          }}
          className="px-3 py-1 bg-slate-700 border border-slate-600 rounded text-white text-sm"
        >
          <option value="10">10</option>
          <option value="25">25</option>
          <option value="50">50</option>
          <option value="100">100</option>
          <option value="250">250</option>
          <option value="-1">All</option>
        </select>
        <span className="text-sm text-gray-400">
          Showing {totalItems === 0 ? 0 : startItem}-{endItem} of {totalItems}
        </span>
      </div>

      {itemsPerPage !== -1 && totalPages > 1 && (
        <div className="flex items-center gap-1">
          <button
            onClick={() => onPageChange(currentPage - 1)}
            disabled={currentPage === 1}
            className="px-3 py-1 text-sm rounded bg-slate-700 text-gray-300 hover:bg-slate-600 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Previous
          </button>

          {pageNumbers.map((page, index) =>
            page === -1 ? (
              <span key={`ellipsis-${index}`} className="px-2 text-gray-500">
                ...
              </span>
            ) : (
              <button
                key={page}
                onClick={() => onPageChange(page)}
                className={`px-3 py-1 text-sm rounded ${
                  currentPage === page
                    ? "bg-sky-500 text-white"
                    : "bg-slate-700 text-gray-300 hover:bg-slate-600"
                }`}
              >
                {page}
              </button>
            ),
          )}

          <button
            onClick={() => onPageChange(currentPage + 1)}
            disabled={currentPage === totalPages}
            className="px-3 py-1 text-sm rounded bg-slate-700 text-gray-300 hover:bg-slate-600 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
};

export default Pagination;
