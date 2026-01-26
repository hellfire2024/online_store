import React, {
  createContext,
  useState,
  useContext,
  ReactNode,
  useEffect,
} from "react";
import { Review } from "../types";
import * as mockApi from "../services/mockApi";

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
        setReviews(await mockApi.fetchReviews());
      } catch (error) {
        console.error("Failed to load reviews", error);
      } finally {
        setIsLoading(false);
      }
    };
    loadData();
  }, []);

  const addReview = async (review: Omit<Review, "id">) => {
    const newReview = await mockApi.addReview(review);
    setReviews((prev) => [...prev, newReview]);
  };

  const updateReview = async (review: Review) => {
    const updatedReview = await mockApi.updateReview(review);
    setReviews((prev) =>
      prev.map((r) => (r.id === updatedReview.id ? updatedReview : r)),
    );
  };

  const deleteReview = async (reviewId: string) => {
    await mockApi.deleteReview(reviewId);
    setReviews((prev) => prev.filter((r) => r.id !== reviewId));
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
