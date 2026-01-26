import React from "react";
import ProductCard from "../components/ProductCard";
import { useSiteSettings } from "../context/SiteSettingsContext";
import { useProducts } from "../context/ProductContext";
import { useReviews } from "../context/ReviewsContext";
import Spinner from "../components/Spinner";

const HomePage: React.FC = () => {
  const { siteSettings, isLoading: settingsLoading } = useSiteSettings();
  const { products, isLoading: productsLoading } = useProducts();
  const { reviews, isLoading: reviewsLoading } = useReviews();

  // THIS IS THE CORRECT AND FINAL FIX.
  // We will not attempt to render anything until all data is loaded and verified.
  if (
    settingsLoading ||
    productsLoading ||
    reviewsLoading ||
    !siteSettings ||
    !products ||
    !reviews
  ) {
    return (
      <div className="flex justify-center items-center min-h-[60vh]">
        <Spinner />
      </div>
    );
  }

  const featuredProducts = products.slice(0, 4);
  const featuredReviews = reviews.slice(0, 3);

  return (
    <div className="space-y-16">
      {/* Hero Section */}
      <div className="relative text-center text-white bg-slate-900 rounded-lg overflow-hidden">
        <img
          src={siteSettings.heroBackgroundImageUrl}
          alt="Hero background"
          className="absolute inset-0 w-full h-full object-cover opacity-30"
        />
        <div className="relative isolate px-6 pt-14 lg:px-8">
          <div className="mx-auto max-w-2xl py-32 sm:py-48 lg:py-56">
            <h1 className="text-4xl font-bold tracking-tight sm:text-6xl">
              {siteSettings.heroTitle}
            </h1>
            <p className="mt-6 text-lg leading-8 text-gray-300">
              {siteSettings.heroSubtitle}
            </p>
          </div>
        </div>
      </div>

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

      {/* Featured Reviews */}
      <div>
        <h2 className="text-3xl font-bold text-white text-center mb-8">
          What Our Customers Say
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {featuredReviews.map((review) => (
            <div
              key={review.id}
              className="bg-slate-800 p-6 rounded-lg border border-slate-700"
            >
              <p className="text-gray-300">"{review.text}"</p>
              <p className="mt-4 font-semibold text-white">- {review.author}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default HomePage;
