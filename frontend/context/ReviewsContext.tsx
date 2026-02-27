import React, {
  createContext,
  useState,
  useEffect,
  useContext,
  ReactNode,
} from "react";
import { apiClient } from "../services/apiClient";
import {
  fetchReviews,
  addReview,
  updateReview,
  deleteReview,
} from "../services/mockApi";

interface ReviewsContextType {
  reviews: Review[];
  isLoading: boolean;
  addReview: (review: Omit<Review, "id">) => Promise<void>;
  updateReview: (review: Review) => Promise<void>;
  deleteReview: (reviewId: string) => Promise<void>;
}

const ReviewsContext = createContext<ReviewsContextType | undefined>(undefined);

export const ReviewsProvider: React.FC<{ children: ReactNode }> = ({
  children,
}) => {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true);
      try {
        const reviewsData = await apiClient.reviews.getAll();
        setReviews(Array.isArray(reviewsData) ? reviewsData : []);
      } catch (error) {
        console.error(
          "Failed to load reviews from API, using mock data",
          error,
        );
        try {
          const mockReviewsData = await fetchReviews();
          setReviews(mockReviewsData);
        } catch (mockError) {
          console.error("Failed to load mock reviews", mockError);
        }
      } finally {
        setIsLoading(false);
      }
    };
    loadData();
  }, []);

  const addReview = async (review: Omit<Review, "id">) => {
    try {
      const newReview = await apiClient.reviews.create(review);
      setReviews((prev) => [...prev, newReview]);
    } catch (error) {
      console.error("Failed to add review via API, using mock", error);
      const newReview = await addReview(review);
      setReviews((prev) => [...prev, newReview]);
    }
  };

  const updateReview = async (review: Review) => {
    try {
      const updatedReview = await apiClient.reviews.update(review.id, review);
      setReviews((prev) =>
        prev.map((r) => (r.id === updatedReview.id ? updatedReview : r)),
      );
    } catch (error) {
      console.error("Failed to update review via API, using mock", error);
      const updatedReview = await updateReview(review);
      setReviews((prev) =>
        prev.map((r) => (r.id === updatedReview.id ? updatedReview : r)),
      );
    }
  };

  const deleteReview = async (reviewId: string) => {
    try {
      await apiClient.reviews.delete(reviewId);
      setReviews((prev) => prev.filter((r) => r.id !== reviewId));
    } catch (error) {
      console.error("Failed to delete review via API, using mock", error);
      await deleteReview(reviewId);
      setReviews((prev) => prev.filter((r) => r.id !== reviewId));
    }
  };

  return (
    <ReviewsContext.Provider
      value={{ reviews, isLoading, addReview, updateReview, deleteReview }}
    >
      {children}
    </ReviewsContext.Provider>
  );
};

export const useReviews = () => {
  const context = useContext(ReviewsContext);
  if (context === undefined) {
    throw new Error("useReviews must be used within a ReviewsProvider");
  }
  return context;
};
// ...existing code...
