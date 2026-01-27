import React, { useState } from "react";
import ProductCard from "../components/ProductCard";
import { useProducts } from "../context/ProductContext";
import { useReviews } from "../context/ReviewsContext";
import { usePages } from "../context/PagesContext";
import { useSiteSettings } from "../context/SiteSettingsContext";
import { useCustomerAuth } from "../context/CustomerAuthContext";
import { useServices } from "../context/ServicesContext";
import { HomePageContent } from "../types";
import Spinner from "../components/Spinner";
import { useToast } from "../hooks/useToast";
import * as Icons from "../components/Icons";

const HomePage: React.FC = () => {
  const { products, isLoading: productsLoading } = useProducts();
  const { reviews, isLoading: reviewsLoading, addReview } = useReviews();
  const { pages, isLoading: pagesLoading } = usePages();
  const { services, isLoading: servicesLoading } = useServices();
  const { siteSettings } = useSiteSettings();
  const { addToast } = useToast();
    const { isAuthenticated } = useCustomerAuth();
  const [showReviewForm, setShowReviewForm] = useState(false);
  const [reviewForm, setReviewForm] = useState({ author: "", email: "", text: "", rating: 5 });

  const homePage = pages.find((page) => page.pageType === "home");

  if (productsLoading || reviewsLoading || pagesLoading || servicesLoading || !homePage) {
    return (
      <div className="flex justify-center items-center min-h-[60vh]">
        <Spinner />
      </div>
    );
  }

  const featuredProducts = products.slice(0, 4);
  const approvedReviews = reviews.filter((r) => r.status === "approved");
  const maxReviews = siteSettings?.maxReviewsDisplayed || 5;
  const featuredReviews = approvedReviews.slice(0, maxReviews);

  const handleSubmitReview = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!reviewForm.author.trim() || !reviewForm.email.trim() || !reviewForm.text.trim()) {
      addToast("Please fill in all fields", "error");
      return;
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(reviewForm.email)) {
      addToast("Please enter a valid email", "error");
      return;
    }

    try {
      await addReview({
        author: reviewForm.author,
        email: reviewForm.email,
        text: reviewForm.text,
        rating: reviewForm.rating,
        status: "pending",
        createdAt: new Date().toISOString(),
      });
      
      addToast("Thank you! Your review has been submitted for approval.", "success");
      setReviewForm({ author: "", email: "", text: "", rating: 5 });
      setShowReviewForm(false);
    } catch (error) {
      addToast("Failed to submit review", "error");
    }
  };

  return (
    <div className="space-y-16">
      {/* Hero Section */}
      {homePage.pageType === "home" && homePage.contentData && (
        <div className="relative text-center text-white bg-slate-900 rounded-lg overflow-hidden h-96">
          <img
            src={(homePage.contentData as HomePageContent).heroBackgroundImageUrl}
            alt="Hero background"
            className="absolute inset-0 w-full h-full object-cover opacity-30"
          />
          <div className="relative isolate px-6 pt-14 lg:px-8 h-full flex items-center justify-center">
            <div className="mx-auto max-w-2xl py-32 sm:py-48 lg:py-56">
              <h1 className="text-4xl font-bold tracking-tight sm:text-6xl">
                {(homePage.contentData as HomePageContent).heroTitle}
              </h1>
              <p className="mt-6 text-lg leading-8 text-gray-300">
                {(homePage.contentData as HomePageContent).heroSubtitle}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Featured Products */}
      <div>
        <h2 className="text-3xl font-bold text-white text-center mb-8">
          Featured Products
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
          {featuredProducts.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      </div>

      {/* Services Offered */}
      {services.length > 0 && (
        <div>
          <h2 className="text-3xl font-bold text-white text-center mb-8">
            Services We Offer
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
            {services.map((service) => {
              const IconComponent = (Icons as any)[service.icon] || Icons.LayersIcon;
              return (
                <div key={service.id} className="bg-slate-800 p-6 rounded-lg border border-slate-700 text-center">
                  <div className="flex justify-center mb-4">
                    <IconComponent className="w-12 h-12 text-sky-400" />
                  </div>
                  <h3 className="text-xl font-bold text-white mb-2">{service.title}</h3>
                  <p className="text-gray-300">{service.description}</p>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Featured Reviews */}
      <div>
        <div className="flex justify-between items-center mb-8">
          <h2 className="text-3xl font-bold text-white">
            What Our Customers Say
          </h2>
          <button
              onClick={() => {
                if (!isAuthenticated) {
                  addToast("Please log in to submit a review", "error");
                  return;
                }
                setShowReviewForm(!showReviewForm);
              }}
            className="bg-sky-500 hover:bg-sky-600 text-white font-bold py-2 px-4 rounded-lg"
          >
            {showReviewForm ? "Cancel" : "Write a Review"}
          </button>
        </div>

          {showReviewForm && isAuthenticated && (
          <div className="bg-slate-800 p-6 rounded-lg border border-slate-700 mb-8">
            <form onSubmit={handleSubmitReview} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-gray-300 text-sm font-bold mb-2">Name</label>
                  <input
                    type="text"
                    value={reviewForm.author}
                    onChange={(e) => setReviewForm({ ...reviewForm, author: e.target.value })}
                    placeholder="Your name"
                    className="w-full p-2 bg-slate-700 border border-slate-600 rounded text-white"
                  />
                </div>
                <div>
                  <label className="block text-gray-300 text-sm font-bold mb-2">Email</label>
                  <input
                    type="email"
                    value={reviewForm.email}
                    onChange={(e) => setReviewForm({ ...reviewForm, email: e.target.value })}
                    placeholder="your@email.com"
                    className="w-full p-2 bg-slate-700 border border-slate-600 rounded text-white"
                  />
                </div>
              </div>
              <div>
                <label className="block text-gray-300 text-sm font-bold mb-2">Rating</label>
                <select
                  value={reviewForm.rating}
                  onChange={(e) => setReviewForm({ ...reviewForm, rating: parseInt(e.target.value) })}
                  className="w-full p-2 bg-slate-700 border border-slate-600 rounded text-white"
                >
                  <option value="5">⭐⭐⭐⭐⭐ Excellent (5 stars)</option>
                  <option value="4">⭐⭐⭐⭐ Good (4 stars)</option>
                  <option value="3">⭐⭐⭐ Average (3 stars)</option>
                  <option value="2">⭐⭐ Poor (2 stars)</option>
                  <option value="1">⭐ Very Poor (1 star)</option>
                </select>
              </div>
              <div>
                <label className="block text-gray-300 text-sm font-bold mb-2">Your Review</label>
                <textarea
                  value={reviewForm.text}
                  onChange={(e) => setReviewForm({ ...reviewForm, text: e.target.value })}
                  placeholder="Share your experience with our products..."
                  rows={4}
                  className="w-full p-2 bg-slate-700 border border-slate-600 rounded text-white"
                />
              </div>
              <button
                type="submit"
                className="w-full bg-sky-500 hover:bg-sky-600 text-white font-bold py-2 rounded-lg"
              >
                Submit Review for Approval
              </button>
              <p className="text-xs text-gray-400 text-center">
                Your review will be reviewed by our team before appearing on the site.
              </p>
            </form>
          </div>
        )}

        {featuredReviews.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {featuredReviews.map((review) => (
              <div
                key={review.id}
                className="bg-slate-800 p-6 rounded-lg border border-slate-700"
              >
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <p className="text-gray-300">"{review.text}"</p>
                    <p className="mt-4 font-semibold text-white">- {review.author}</p>
                  </div>
                  <div className="flex text-yellow-400">
                    {[...Array(review.rating)].map((_, i) => (
                      <span key={i}>⭐</span>
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8 text-gray-400">
            No reviews yet. Be the first to share your experience!
          </div>
        )}
      </div>
    </div>
  );
};

export default HomePage;
