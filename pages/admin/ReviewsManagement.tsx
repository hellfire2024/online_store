import React, { useState, useEffect } from "react";
import { useReviews } from "../../context/ReviewsContext";
import { EditIcon, TrashIcon, StarIcon } from "../../components/Icons";
import { Review } from "../../types";
import { useUnsavedChanges } from "../../context/UnsavedChangesContext";

const ReviewsManagement: React.FC = () => {
  const { reviews, isLoading, updateReview, deleteReview } = useReviews();
  const [editingReview, setEditingReview] = useState<Review | null>(null);
  const [originalReview, setOriginalReview] = useState<Review | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  useEffect(() => {
    if (editingReview) {
      setOriginalReview(editingReview);
    }
  }, [editingReview]);

  const openModal = (review?: Review) => {
    setEditingReview(review || ({ author: "", text: "", rating: 5 } as Review));
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingReview(null);
  };

  const handleSave = async () => {
    if (!editingReview) return;

    await updateReview(editingReview);
    closeModal();
  };

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
  ) => {
    const { name, value, type } = e.target;
    setEditingReview((prev) =>
      prev
        ? { ...prev, [name]: type === "number" ? parseInt(value, 10) : value }
        : null,
    );
  };

  const inputClasses =
    "w-full p-2 bg-slate-700 border border-slate-600 rounded-md text-white";

  return (
    <div>
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold text-white">Reviews Management</h1>
      </div>

      <div className="bg-slate-800 rounded-lg border border-slate-700 overflow-hidden">
        <table className="w-full text-left">
          <thead className="bg-slate-900">
            <tr>
              <th className="p-4">Author</th>
              <th className="p-4">Review</th>
              <th className="p-4">Rating</th>
              <th className="p-4">Actions</th>
            </tr>
          </thead>
          <tbody>
            {reviews.map((review) => (
              <tr key={review.id} className="border-t border-slate-700">
                <td className="p-4">{review.author}</td>
                <td className="p-4 max-w-md truncate">{review.text}</td>
                <td className="p-4">
                  <div className="flex">
                    {[...Array(review.rating)].map((_, i) => (
                      <StarIcon key={i} className="w-5 h-5 text-yellow-400" />
                    ))}
                    {[...Array(5 - review.rating)].map((_, i) => (
                      <StarIcon key={i} className="w-5 h-5 text-gray-600" />
                    ))}
                  </div>
                </td>
                <td className="p-4">
                  <button
                    onClick={() => openModal(review)}
                    className="text-gray-400 hover:text-sky-400 mr-4"
                  >
                    <EditIcon className="w-5 h-5" />
                  </button>
                  <button
                    onClick={() => deleteReview(review.id)}
                    className="text-gray-400 hover:text-red-500"
                  >
                    <TrashIcon className="w-5 h-5" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

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
