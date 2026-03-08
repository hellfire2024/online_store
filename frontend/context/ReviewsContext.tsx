import React, {
  createContext,
  useState,
  useEffect,
  useContext,
  ReactNode,
} from "react";
import { apiClient } from "../services/apiClient";
import {
  fetchReviews as fetchMockReviews,
  addReview as addMockReview,
  updateReview as updateMockReview,
  deleteReview as deleteMockReview,
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
          const mockReviewsData = await fetchMockReviews();
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
      console.log("[ReviewsContext] Adding review:", {
        author: review.author,
        email: review.email,
        rating: review.rating,
        textLength: review.text?.length || 0,
      });
      const newReview = await apiClient.reviews.create(review);
      console.log("[ReviewsContext] Review created successfully:", newReview.id);
      setReviews((prev) => [...prev, newReview]);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error("[ReviewsContext] Failed to add review via API:", errorMessage);
      throw new Error(`Failed to submit review: ${errorMessage}`);
    }
  };

  const updateReview = async (review: Review) => {
    try {
      console.log("[ReviewsContext] Updating review:", review.id);
      const updatedReview = await apiClient.reviews.update(review.id, review);
      console.log("[ReviewsContext] Review updated successfully:", review.id);
      setReviews((prev) =>
        prev.map((r) => (r.id === updatedReview.id ? updatedReview : r)),
      );
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error("[ReviewsContext] Failed to update review via API:", errorMessage);
      throw new Error(`Failed to update review: ${errorMessage}`);
    }
  };

  const deleteReview = async (reviewId: string) => {
    try {
      console.log("[ReviewsContext] Deleting review:", reviewId);
      await apiClient.reviews.delete(reviewId);
      console.log("[ReviewsContext] Review deleted successfully:", reviewId);
      setReviews((prev) => prev.filter((r) => r.id !== reviewId));
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error("[ReviewsContext] Failed to delete review via API:", errorMessage);
      throw new Error(`Failed to delete review: ${errorMessage}`);
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
