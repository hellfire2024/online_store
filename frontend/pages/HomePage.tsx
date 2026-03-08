import React, { useState, useEffect, useMemo } from "react";
import ProductCard from "../components/ProductCard";
import RecentCreationsGallery from "../components/RecentCreationsGallery";
import { useProducts } from "../context/ProductContext";
import { useReviews } from "../context/ReviewsContext";
import { usePages } from "../context/PagesContext";
import { useSiteSettings } from "../context/SiteSettingsContext";
import { useCustomerAuth } from "../context/CustomerAuthContext";
import { useServices } from "../context/ServicesContext";
import { useGalleries } from "../context/GalleryContext";
import { HomePageContent, GalleryImage } from "../types";
import Spinner from "../components/Spinner";
import { useToast } from "../hooks/useToast";
import * as Icons from "../components/Icons";

type GalleryImageCompat = {
  id: string;
  galleryId?: string;
  imageUrl?: string;
  name?: string;
  url?: string;
  title?: string;
};

type NormalizedGalleryImage = GalleryImage & { galleryId?: string };

const HomePage: React.FC = () => {
  const { products, isLoading: productsLoading } = useProducts();
  const { reviews, isLoading: reviewsLoading, addReview } = useReviews();
  const { pages, isLoading: pagesLoading } = usePages();
  const { services, isLoading: servicesLoading } = useServices();
  const {
    galleryImages: galleryImagesRecord = {},
    isLoading: galleriesLoading,
  } = useGalleries();
  const { siteSettings } = useSiteSettings();
  const { addToast } = useToast();
  const { isAuthenticated, customer } = useCustomerAuth();

  const [showReviewForm, setShowReviewForm] = useState(false);
  const [reviewForm, setReviewForm] = useState({
    text: "",
    rating: 5,
  });
  const [reviewImages, setReviewImages] = useState<string[]>([]);
  const [carouselIndex, setCarouselIndex] = useState(0);

  const galleryImages = useMemo<GalleryImageCompat[]>(
    () =>
      Object.values(galleryImagesRecord)
        .flat()
        .map((img) => img as GalleryImageCompat),
    [galleryImagesRecord],
  );

  const normalizedGalleryImages = useMemo<NormalizedGalleryImage[]>(
    () =>
      galleryImages.reduce<NormalizedGalleryImage[]>((acc, img) => {
        const imageUrl = img.imageUrl || img.url;
        if (!imageUrl) {
          return acc;
        }

        acc.push({
          id: img.id,
          ...(img.galleryId ? { galleryId: img.galleryId } : {}),
          imageUrl,
          name: img.name || img.title || "Gallery image",
        });

        return acc;
      }, []),
    [galleryImages],
  );

  const homePage = pages.find((page) => page.pageType === "home");
  const homeContent = useMemo(
    () => (homePage?.contentData as HomePageContent) || {},
    [homePage],
  );

  useEffect(() => {
    if (
      !homeContent.galleryRotationEnabled ||
      !homeContent.galleryRotationId ||
      galleriesLoading
    ) {
      return;
    }

    const filteredImages = normalizedGalleryImages.filter(
      (img) => img.galleryId === homeContent.galleryRotationId,
    );
    if (filteredImages.length === 0) return;

    const interval = homeContent.galleryRotationInterval || 5;
    const timer = setInterval(() => {
      setCarouselIndex((prev) => (prev + 1) % filteredImages.length);
    }, interval * 1000);

    return () => clearInterval(timer);
  }, [homeContent, normalizedGalleryImages, galleriesLoading]);

  if (
    productsLoading ||
    reviewsLoading ||
    pagesLoading ||
    servicesLoading ||
    !homePage
  ) {
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
  const pageFont = homeContent?.pageFont;
  const heroImageUrl =
    homeContent.heroBackgroundImageUrl ||
    siteSettings?.siteBackgroundImageUrl ||
    "https://picsum.photos/seed/hero/1200/800";

  const handleSubmitReview = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!customer) {
      addToast("Please log in to submit a review", "error");
      return;
    }

    if (!reviewForm.text.trim()) {
      addToast("Please write a review", "error");
      return;
    }

    const authorName = `${customer.firstName} ${customer.lastName}`;

    try {
      console.log("[HomePage] Submitting review for:", authorName);
      await addReview({
        author: authorName,
        email: customer.email,
        text: reviewForm.text,
        rating: reviewForm.rating,
        status: "pending",
        createdAt: new Date().toISOString(),
        images: reviewImages.length > 0 ? reviewImages : undefined,
      });

      addToast(
        "Thank you! Your review has been submitted for approval.",
        "success",
      );
      setReviewForm({ text: "", rating: 5 });
      setReviewImages([]);
      setShowReviewForm(false);
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      console.error("[HomePage] Review submission failed:", errorMessage);
      addToast(
        errorMessage || "Failed to submit review. Please try again.",
        "error",
      );
    }
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    const remainingSlots = 3 - reviewImages.length;
    if (remainingSlots <= 0) {
      addToast("Maximum of 3 images allowed", "error");
      return;
    }

    const filesToProcess = Array.from(files).slice(0, remainingSlots);

    filesToProcess.forEach((file) => {
      if (!file.type.startsWith("image/")) {
        addToast("Only image files are allowed", "error");
        return;
      }

      if (file.size > 5 * 1024 * 1024) {
        addToast("Image size must be less than 5MB", "error");
        return;
      }

      const reader = new FileReader();
      reader.onloadend = () => {
        setReviewImages((prev) => [...prev, reader.result as string]);
      };
      reader.readAsDataURL(file);
    });
  };

  const removeImage = (index: number) => {
    setReviewImages((prev) => prev.filter((_, i) => i !== index));
  };

  return (
    <div className="space-y-16" style={{ fontFamily: pageFont || undefined }}>
      {homePage.pageType === "home" && homePage.contentData && (
        <div className="relative text-center text-white bg-slate-900 rounded-lg overflow-hidden h-96">
          <img
            src={heroImageUrl}
            alt="Hero background"
            className="absolute inset-0 w-full h-full object-cover opacity-30"
            onError={(event) => {
              const target = event.currentTarget;
              target.onerror = null;
              target.src = "https://picsum.photos/seed/hero/1200/800";
            }}
          />
          <div className="relative isolate px-6 pt-14 lg:px-8 h-full flex items-center justify-center">
            <div className="mx-auto max-w-2xl py-32 sm:py-48 lg:py-56">
              <h1 className="text-4xl font-bold tracking-tight sm:text-6xl">
                {homeContent.heroTitle}
              </h1>
              <p className="mt-6 text-lg leading-8 text-gray-300">
                {homeContent.heroSubtitle}
              </p>
            </div>
          </div>
        </div>
      )}

      {homeContent.galleryRotationEnabled &&
        homeContent.galleryRotationId &&
        !galleriesLoading && (
          <div>
            <h2 className="text-3xl font-bold text-white text-center mb-8">
              Gallery
            </h2>
            {(() => {
              const carouselImages = normalizedGalleryImages.filter(
                (img) => img.galleryId === homeContent.galleryRotationId,
              );
              if (carouselImages.length === 0) return null;
              const currentImage = carouselImages[carouselIndex];

              return (
                <div className="relative bg-slate-800 rounded-lg overflow-hidden">
                  <img
                    src={currentImage.imageUrl}
                    alt={currentImage.name}
                    className="w-full h-96 object-cover"
                  />
                  <div className="absolute bottom-4 left-0 right-0 flex justify-center gap-2">
                    {carouselImages.map((_, idx: number) => (
                      <button
                        key={idx}
                        onClick={() => setCarouselIndex(idx)}
                        className={`w-2 h-2 rounded-full transition-colors ${
                          idx === carouselIndex ? "bg-white" : "bg-gray-500"
                        }`}
                      />
                    ))}
                  </div>
                </div>
              );
            })()}
          </div>
        )}

      {homeContent.recentCreationsGalleryId && !galleriesLoading && (
        <RecentCreationsGallery
          galleryImages={normalizedGalleryImages.filter(
            (img) => img.galleryId === homeContent.recentCreationsGalleryId,
          )}
          autoScroll={homeContent.recentCreationsAutoScroll !== false}
          autoScrollInterval={homeContent.recentCreationsInterval || 5}
        />
      )}

      <div>
        <h2 className="text-3xl font-bold text-white text-center mb-8">
          Featured Products
        </h2>
        <div className="flex flex-wrap justify-center gap-8">
          {featuredProducts.map((product) => (
            <div
              key={product.id}
              className="w-full sm:w-[calc(50%-1rem)] lg:w-[calc(25%-1.5rem)] max-w-sm"
            >
              <ProductCard product={product} />
            </div>
          ))}
        </div>
      </div>

      {services.length > 0 && (
        <div>
          <h2 className="text-3xl font-bold text-white text-center mb-8">
            Services We Offer
          </h2>
          <div className="flex flex-wrap justify-center gap-8">
            {services.map((service) => {
              const IconComponent =
                (Icons as any)[service.icon] || Icons.LayersIcon;
              return (
                <div
                  key={service.id}
                  className="bg-slate-800 p-6 rounded-lg border border-slate-700 text-center w-full sm:w-[calc(50%-1rem)] lg:w-[calc(33.333%-1.33rem)] max-w-sm"
                >
                  <div className="flex justify-center mb-4">
                    <IconComponent className="w-12 h-12 text-sky-400" />
                  </div>
                  <h3 className="text-xl font-bold text-white mb-2">
                    {service.title}
                  </h3>
                  <p className="text-gray-300">{service.description}</p>
                </div>
              );
            })}
          </div>
        </div>
      )}

      <div className="flex flex-col items-center w-full">
        <div className="text-center mb-8 w-full">
          <h2 className="text-3xl font-bold text-white mb-6">
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
            className="px-6 py-3 bg-linear-to-r from-sky-500 to-sky-400 hover:from-sky-600 hover:to-sky-500 text-white font-semibold rounded-lg shadow-lg hover:shadow-xl transition-all duration-200 transform hover:-translate-y-0.5 active:translate-y-0"
          >
            {showReviewForm ? "Cancel" : "✨ Write a Review"}
          </button>
        </div>

        {showReviewForm && isAuthenticated && customer && (
          <div className="bg-slate-800 p-6 rounded-lg border border-slate-700 mb-8 w-full max-w-2xl">
            <form onSubmit={handleSubmitReview} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-gray-300 text-sm font-bold mb-2">
                    Name
                  </label>
                  <input
                    type="text"
                    value={`${customer.firstName} ${customer.lastName}`}
                    readOnly
                    className="w-full p-2 bg-slate-600 border border-slate-500 rounded text-gray-300 cursor-not-allowed"
                  />
                </div>
                <div>
                  <label className="block text-gray-300 text-sm font-bold mb-2">
                    Email
                  </label>
                  <input
                    type="email"
                    value={customer.email}
                    readOnly
                    className="w-full p-2 bg-slate-600 border border-slate-500 rounded text-gray-300 cursor-not-allowed"
                  />
                </div>
              </div>
              <div>
                <label className="block text-gray-300 text-sm font-bold mb-2">
                  Rating
                </label>
                <select
                  value={reviewForm.rating}
                  onChange={(e) =>
                    setReviewForm({
                      ...reviewForm,
                      rating: parseInt(e.target.value),
                    })
                  }
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
                <label className="block text-gray-300 text-sm font-bold mb-2">
                  Your Review
                </label>
                <textarea
                  value={reviewForm.text}
                  onChange={(e) =>
                    setReviewForm({ ...reviewForm, text: e.target.value })
                  }
                  placeholder="Share your experience with our products..."
                  rows={4}
                  className="w-full p-2 bg-slate-700 border border-slate-600 rounded text-white"
                />
              </div>
              <div>
                <label className="block text-gray-300 text-sm font-bold mb-2">
                  Product Images (Optional - Max 3)
                </label>
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={handleImageUpload}
                  disabled={reviewImages.length >= 3}
                  className="w-full p-2 bg-slate-700 border border-slate-600 rounded text-white file:mr-4 file:py-2 file:px-4 file:rounded file:border-0 file:text-sm file:font-semibold file:bg-sky-600 file:text-white hover:file:bg-sky-700 disabled:opacity-50"
                />
                <p className="text-xs text-gray-400 mt-1">
                  Upload photos of your product ({reviewImages.length}/3 used).
                  Max 5MB per image.
                </p>
                {reviewImages.length > 0 && (
                  <div className="grid grid-cols-3 gap-2 mt-3">
                    {reviewImages.map((img, idx) => (
                      <div key={idx} className="relative group">
                        <img
                          src={img}
                          alt={`Review image ${idx + 1}`}
                          className="w-full h-24 object-cover rounded border border-slate-600"
                        />
                        <button
                          type="button"
                          onClick={() => removeImage(idx)}
                          className="absolute top-1 right-1 bg-red-600 hover:bg-red-700 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          ×
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              <button
                type="submit"
                className="w-full bg-sky-500 hover:bg-sky-600 text-white font-bold py-2 rounded-lg"
              >
                Submit Review for Approval
              </button>
              <p className="text-xs text-gray-400 text-center">
                Your review will be reviewed by our team before appearing on the
                site.
              </p>
            </form>
          </div>
        )}

        {featuredReviews.length > 0 ? (
          <div className="flex flex-wrap justify-center gap-8 w-full">
            {featuredReviews.map((review) => (
              <div
                key={review.id}
                className="bg-slate-800 p-6 rounded-lg border border-slate-700 w-full sm:w-[calc(50%-1rem)] lg:w-[calc(33.333%-1.33rem)] max-w-sm"
              >
                <div className="flex justify-between items-start gap-4 mb-2">
                  <div className="flex-1 min-w-0">
                    <p className="text-gray-300">"{review.text}"</p>
                    {review.images && review.images.length > 0 && (
                      <div className="grid grid-cols-3 gap-2 mt-3 mb-3">
                        {review.images.map((img: string, idx: number) => (
                          <img
                            key={idx}
                            src={img}
                            alt={`Review image ${idx + 1}`}
                            className="w-full h-20 object-cover rounded border border-slate-600 cursor-pointer hover:opacity-80 transition-opacity"
                            onClick={() => window.open(img, "_blank")}
                          />
                        ))}
                      </div>
                    )}
                    <p className="mt-4 font-semibold text-white">
                      - {review.author}
                    </p>
                    <p className="text-xs text-gray-500 mt-1">
                      {new Date(review.createdAt).toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                      })}
                    </p>
                  </div>
                  <div className="flex text-yellow-400 shrink-0">
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
