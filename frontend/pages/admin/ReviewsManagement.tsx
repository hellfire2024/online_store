import React, { useState } from "react";
import { useReviews } from "../../context/ReviewsContext";
import { useSiteSettings } from "../../context/SiteSettingsContext";
import { StarIcon } from "../../components/Icons";
import Pagination from "../../components/Pagination";
import { Review } from "../../types";

const ReviewsManagement: React.FC = () => {
  const { reviews, updateReview, deleteReview } = useReviews();
  const { siteSettings, updateSiteSettings } = useSiteSettings();
  const [filterStatus, setFilterStatus] = useState<"pending" | "approved" | "rejected" | "archived" | "all">("pending");
  const [editingReview, setEditingReview] = useState<Review | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [rejectionReason, setRejectionReason] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);


  const openModal = (review?: Review) => {
    setEditingReview(review || ({ author: "", email: "", text: "", rating: 5, status: "pending", createdAt: new Date().toISOString() } as Review));
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingReview(null);
    setRejectionReason("");
  };

  const handleApprove = async (review: Review) => {
    await updateReview({
      ...review,
      status: "approved",
      approvedAt: new Date().toISOString(),
    });
  };

  const handleReject = async (review: Review) => {
    if (!rejectionReason.trim()) {
      alert("Please provide a rejection reason");
      return;
    }
    await updateReview({
      ...review,
      status: "rejected",
      rejectionReason: rejectionReason,
    });
    setRejectionReason("");
  };

  const handleArchive = async (review: Review) => {
    await updateReview({
      ...review,
      status: "archived",
    });
  };

  const handleDelete = async (reviewId: string) => {
    await deleteReview(reviewId);
    setDeleteConfirmId(null);
  };



  const handleMaxReviewsChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const maxReviews = parseInt(e.target.value, 10);
    if (siteSettings) {
      updateSiteSettings({
        ...siteSettings,
        maxReviewsDisplayed: maxReviews,
      });
    }
  };

  const filteredReviews = reviews.filter(
    (review) => filterStatus === "all" || review.status === filterStatus
  );

  // Pagination logic
  const paginatedReviews = itemsPerPage === -1 
    ? filteredReviews 
    : filteredReviews.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  const inputClasses =
    "w-full p-2 bg-slate-700 border border-slate-600 rounded-md text-white";

  return (
    <div>
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold text-white">Reviews Management</h1>
      </div>

      <div className="bg-slate-800 rounded-lg border border-slate-700 p-6 mb-8">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-gray-300 text-sm font-bold mb-2">
              Max Reviews Displayed on Site
            </label>
            <input
              type="number"
              min="1"
              max="50"
              value={siteSettings?.maxReviewsDisplayed || 5}
              onChange={handleMaxReviewsChange}
              className={inputClasses}
            />
            <p className="text-xs text-gray-400 mt-1">Currently showing {siteSettings?.maxReviewsDisplayed || 5} approved reviews</p>
          </div>
          <div>
            <label className="block text-gray-300 text-sm font-bold mb-2">
              Filter by Status
            </label>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value as any)}
              className={inputClasses}
            >
              <option value="all">All Reviews</option>
              <option value="pending">Pending Review</option>
              <option value="approved">Approved</option>
              <option value="rejected">Rejected</option>
              <option value="archived">Archived</option>
            </select>
          </div>
        </div>
      </div>

      <div className="bg-slate-800 rounded-lg border border-slate-700 overflow-x-auto">
        <table className="w-full text-left text-sm min-w-250">
          <thead className="bg-slate-900">
            <tr>
              <th className="p-4 w-32">Author</th>
              <th className="p-4 w-40">Email</th>
              <th className="p-4">Review</th>
              <th className="p-4 w-32">Rating</th>
              <th className="p-4 w-32 whitespace-nowrap">Date Submitted</th>
              <th className="p-4 w-28">Status</th>
              <th className="p-4 w-40">Actions</th>
            </tr>
          </thead>
          <tbody>
            {paginatedReviews.map((review) => (
              <tr key={review.id} className="border-t border-slate-700">
                <td className="p-4 font-medium">{review.author}</td>
                <td className="p-4 text-xs text-gray-400 break-all">{review.email || "-"}</td>
                <td className="p-4">
                  <div className="text-gray-300 mb-2">{review.text}</div>
                  {review.images && review.images.length > 0 && (
                    <div className="flex gap-2 mt-2">
                      {review.images.map((img, idx) => (
                        <img
                          key={idx}
                          src={img}
                          alt={`Review image ${idx + 1}`}
                          className="w-16 h-16 object-cover rounded border border-slate-600 cursor-pointer hover:opacity-80"
                          onClick={() => window.open(img, '_blank')}
                          title="Click to view full size"
                        />
                      ))}
                    </div>
                  )}
                </td>
                <td className="p-4">
                  <div className="flex">
                    {[...Array(review.rating)].map((_, i) => (
                      <StarIcon key={i} className="w-4 h-4 text-yellow-400" />
                    ))}
                    {[...Array(5 - review.rating)].map((_, i) => (
                      <StarIcon key={i} className="w-4 h-4 text-gray-600" />
                    ))}
                  </div>
                </td>
                <td className="p-4 text-gray-400 whitespace-nowrap">
                  {new Date(review.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                </td>
                <td className="p-4">
                  <span className={`px-2 py-1 rounded-full text-xs font-medium whitespace-nowrap ${
                    review.status === "pending" ? "bg-yellow-900 text-yellow-300" :
                    review.status === "approved" ? "bg-green-900 text-green-300" :
                    review.status === "rejected" ? "bg-red-900 text-red-300" :
                    "bg-slate-700 text-gray-400"
                  }`}>
                    {review.status.charAt(0).toUpperCase() + review.status.slice(1)}
                  </span>
                </td>
                <td className="p-4">
                  <div className="flex flex-col gap-1 whitespace-nowrap">
                    {review.status !== "approved" && (
                      <button
                        onClick={() => handleApprove(review)}
                        className="text-green-400 hover:text-green-300 text-xs font-medium"
                        title="Approve"
                      >
                        ✓ Approve
                      </button>
                    )}
                    {review.status !== "rejected" && (
                      <button
                        onClick={() => openModal(review)}
                        className="text-red-400 hover:text-red-300 text-xs font-medium"
                        title="Reject"
                      >
                        ✗ Reject
                      </button>
                    )}
                    {review.status !== "archived" && (
                      <button
                        onClick={() => handleArchive(review)}
                        className="text-gray-400 hover:text-gray-300 text-xs font-medium"
                        title="Archive"
                      >
                        📦 Archive
                      </button>
                    )}
                    {deleteConfirmId === review.id ? (
                      <div className="flex gap-1 items-center">
                        <button
                          onClick={() => handleDelete(review.id)}
                          className="text-red-400 hover:text-red-300 text-xs font-medium"
                        >
                          Confirm
                        </button>
                        <span className="text-gray-600">|</span>
                        <button
                          onClick={() => setDeleteConfirmId(null)}
                          className="text-gray-400 hover:text-gray-300 text-xs font-medium"
                        >
                          Cancel
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => setDeleteConfirmId(review.id)}
                        className="text-red-500 hover:text-red-400 text-xs font-medium"
                        title="Delete permanently"
                      >
                        🗑 Delete
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
            {paginatedReviews.length === 0 && (
              <tr>
                <td colSpan={7} className="p-8 text-center text-gray-400">
                  No {filterStatus === "all" ? "reviews" : `${filterStatus} reviews`} found
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <Pagination
        currentPage={currentPage}
        totalItems={filteredReviews.length}
        itemsPerPage={itemsPerPage}
        onPageChange={setCurrentPage}
        onItemsPerPageChange={(value) => {
          setItemsPerPage(value);
          setCurrentPage(1);
        }}
      />

      {/* Rejection Modal */}
      {isModalOpen && editingReview && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-slate-800 p-6 rounded-lg border border-slate-700 max-w-md w-full">
            <h2 className="text-xl font-bold text-white mb-4">Reject Review</h2>
            <p className="text-gray-300 mb-4">Review by <strong>{editingReview.author}</strong></p>
            <textarea
              placeholder="Provide rejection reason (visible to admin only)"
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
              className={inputClasses + " mb-4"}
              rows={4}
            />
            <div className="flex gap-2">
              <button
                onClick={() => handleReject(editingReview)}
                className="flex-1 bg-red-600 hover:bg-red-700 text-white font-bold py-2 rounded-md"
              >
                Reject
              </button>
              <button
                onClick={closeModal}
                className="flex-1 bg-slate-700 hover:bg-slate-600 text-white font-bold py-2 rounded-md"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ReviewsManagement;
