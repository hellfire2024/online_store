import React, { useState, useEffect } from "react";
import { useReviews } from "../../context/ReviewsContext";
import { useSiteSettings } from "../../context/SiteSettingsContext";
import { EditIcon, TrashIcon, StarIcon } from "../../components/Icons";
import { Review } from "../../types";
import { useUnsavedChanges } from "../../context/UnsavedChangesContext";

const ReviewsManagement: React.FC = () => {
  const { reviews, isLoading, updateReview, deleteReview } = useReviews();
  const { siteSettings, updateSiteSettings } = useSiteSettings();
  const [filterStatus, setFilterStatus] = useState<"pending" | "approved" | "rejected" | "archived" | "all">("pending");
  const [editingReview, setEditingReview] = useState<Review | null>(null);
  const [originalReview, setOriginalReview] = useState<Review | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [rejectionReason, setRejectionReason] = useState("");

  useEffect(() => {
    if (editingReview) {
      setOriginalReview(editingReview);
    }
  }, [editingReview]);

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

  const handleSave = async () => {
    if (!editingReview) return;
    await updateReview(editingReview);
    closeModal();
  };

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>,
  ) => {
    const { name, value, type } = e.target;
    setEditingReview((prev) =>
      prev
        ? { ...prev, [name]: type === "number" ? parseInt(value, 10) : value }
        : null,
    );
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

      <div className="bg-slate-800 rounded-lg border border-slate-700 overflow-hidden">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-900">
            <tr>
              <th className="p-4">Author</th>
              <th className="p-4">Email</th>
              <th className="p-4">Review</th>
              <th className="p-4">Rating</th>
              <th className="p-4">Status</th>
              <th className="p-4">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredReviews.map((review) => (
              <tr key={review.id} className="border-t border-slate-700">
                <td className="p-4 font-medium">{review.author}</td>
                <td className="p-4 text-xs text-gray-400">{review.email || "-"}</td>
                <td className="p-4 max-w-xs truncate text-gray-300">{review.text}</td>
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
                <td className="p-4">
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                    review.status === "pending" ? "bg-yellow-900 text-yellow-300" :
                    review.status === "approved" ? "bg-green-900 text-green-300" :
                    review.status === "rejected" ? "bg-red-900 text-red-300" :
                    "bg-slate-700 text-gray-400"
                  }`}>
                    {review.status.charAt(0).toUpperCase() + review.status.slice(1)}
                  </span>
                </td>
                <td className="p-4">
                  <div className="flex gap-2">
                    {review.status === "pending" && (
                      <>
                        <button
                          onClick={() => handleApprove(review)}
                          className="text-green-400 hover:text-green-300 text-xs font-medium"
                          title="Approve"
                        >
                          ✓ Approve
                        </button>
                        <button
                          onClick={() => openModal(review)}
                          className="text-red-400 hover:text-red-300 text-xs font-medium"
                          title="Reject"
                        >
                          ✗ Reject
                        </button>
                      </>
                    )}
                    {review.status === "approved" && (
                      <button
                        onClick={() => handleArchive(review)}
                        className="text-gray-400 hover:text-gray-300 text-xs font-medium"
                        title="Archive"
                      >
                        📦 Archive
                      </button>
                    )}
                    <button
                      onClick={() => deleteReview(review.id)}
                      className="text-gray-400 hover:text-red-500"
                      title="Delete permanently"
                    >
                      <TrashIcon className="w-4 h-4" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {filteredReviews.length === 0 && (
              <tr>
                <td colSpan={6} className="p-8 text-center text-gray-400">
                  No {filterStatus === "all" ? "reviews" : `${filterStatus} reviews`} found
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Rejection Modal */}
      {isModalOpen && editingReview?.status === "pending" && (
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

      {isModalOpen && editingReview && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center">
          <div className="bg-slate-800 rounded-lg shadow-2xl p-8 w-full max-w-lg border border-slate-700">
            <h2 className="text-2xl font-bold text-white mb-6">
              {editingReview.id ? "Edit" : "Add"} Review
            </h2>
            <div className="space-y-4">
              <input
                type="text"
                name="author"
                value={editingReview.author}
                onChange={handleChange}
                placeholder="Author Name"
                className={inputClasses}
              />
              <textarea
                name="text"
                value={editingReview.text}
                onChange={handleChange}
                placeholder="Review Text"
                className={inputClasses}
                rows={4}
              ></textarea>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">
                  Rating
                </label>
                <input
                  type="number"
                  name="rating"
                  value={editingReview.rating}
                  onChange={handleChange}
                  min="1"
                  max="5"
                  className={inputClasses}
                />
              </div>
            </div>
            <div className="mt-8 flex justify-end space-x-4">
              <button
                onClick={closeModal}
                className="bg-slate-600 text-white font-bold py-2 px-4 rounded-lg hover:bg-slate-700"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                className="bg-sky-500 text-white font-bold py-2 px-4 rounded-lg hover:bg-sky-600"
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ReviewsManagement;
