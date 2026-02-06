import React, { useState, useEffect, useCallback, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Product, GalleryImage } from "../types";
import { useProducts } from "../context/ProductContext";
import { useGalleries } from "../context/GalleryContext";
import { getDesignIdeas } from "../services/geminiService";
import { useCart } from "../context/CartContext";
import { generateSlug } from "../services/slugService";
import Spinner from "../components/Spinner";

type CustomizationTab = "gallery" | "upload" | "ideas";

// TabButton component declared outside to prevent recreation on every render
const TabButton = ({
  tab,
  label,
  activeTab,
  setActiveTab,
}: {
  tab: CustomizationTab;
  label: string;
  activeTab: CustomizationTab;
  setActiveTab: (tab: CustomizationTab) => void;
}) => (
  <button
    onClick={() => setActiveTab(tab)}
    className={`flex-1 px-4 py-2.5 text-sm font-medium rounded-md ${
      activeTab === tab
        ? "bg-slate-600 text-white"
        : "bg-transparent text-gray-400 hover:text-gray-200"
    }`}
  >
    {label}
  </button>
);

const ProductDetailPage: React.FC = () => {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const { products } = useProducts();
  const { galleryImages, fetchGalleryImages } = useGalleries();
  const { addToCart } = useCart();

  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [quantity, setQuantity] = useState(1);
  const [activeTab, setActiveTab] = useState<CustomizationTab>("gallery");
  const [selectedOptions, setSelectedOptions] = useState<{
    [listId: string]: string[];
  }>({});
  
  useEffect(() => {
    if (!product?.allowCustomImageUpload && activeTab === "upload") {
      setActiveTab("gallery");
    }
  }, [activeTab, product?.allowCustomImageUpload]);

  const [selectedGalleryImage, setSelectedGalleryImage] =
    useState<GalleryImage | null>(null);

  const [uploadedImage, setUploadedImage] = useState<string | null>(null);
  const [uploadedFileName, setUploadedFileName] = useState<string>("");

  const [customText, setCustomText] = useState<string>("");

  const [designIdeas, setDesignIdeas] = useState<string[]>([]);
  const [ideasLoading, setIdeasLoading] = useState(false);

  useEffect(() => {
    if (products.length > 0 && slug) {
      // Find product by matching generated slug to URL slug
      const foundProduct = products.find((p) => generateSlug(p.name) === slug);
      if (foundProduct) {
        setProduct(foundProduct);
        // Initialize selected options - allow multiple selections per list
        if (
          foundProduct.optionLists?.length &&
          Object.keys(selectedOptions).length === 0
        ) {
          const initialSelections: { [listId: string]: string[] } = {};
          foundProduct.optionLists
            .sort((a, b) => a.order - b.order)
            .forEach((list) => {
              initialSelections[list.id] = []; // Start with empty array for multi-select
            });
          setSelectedOptions(initialSelections);
        }
        if (foundProduct.galleryId) {
          fetchGalleryImages(foundProduct.galleryId);
        }
      } else {
        navigate("/store");
      }
      setLoading(false);
    }
  }, [slug]);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!product?.allowCustomImageUpload) {
      return;
    }
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setUploadedFileName(file.name);
      const reader = new FileReader();
      reader.onloadend = () => {
        setUploadedImage(reader.result as string);
        setSelectedGalleryImage(null);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleOptionChange = useCallback(
    (listId: string, optionId: string, isChecked: boolean) => {
      setSelectedOptions((prev) => {
        const listSelectedOptions = prev[listId] || [];
        const newSelected = isChecked
          ? [...listSelectedOptions, optionId]
          : listSelectedOptions.filter((id) => id !== optionId);
        return {
          ...prev,
          [listId]: newSelected,
        };
      });
    },
    [],
  );

  const handleAddToCart = () => {
    if (!product) return;

    // Calculate total price delta from all selected options (now supporting multiple selections per list)
    let totalPriceDelta = 0;
    if (product.optionLists) {
      product.optionLists.forEach((list) => {
        const selectedOptionIds = selectedOptions[list.id] || [];
        if (selectedOptionIds.length > 0) {
          selectedOptionIds.forEach((optionId) => {
            const option = list.options.find((o) => o.id === optionId);
            if (option) {
              totalPriceDelta += option.priceDelta;
            }
          });
        } else if (list.required) {
          alert(`Please select at least one option for ${list.name}`);
          return;
        }
      });
    }

    let customization;
    if (selectedGalleryImage) {
      customization = {
        type: "gallery" as const,
        value: selectedGalleryImage.imageUrl,
      };
    } else if (uploadedImage && product.allowCustomImageUpload) {
      customization = {
        type: "upload" as const,
        value: uploadedImage,
        fileName: uploadedFileName || undefined,
      };
    }

    if (product.customizable && !customization) {
      alert("Please select a design or upload your own image.");
      return;
    }

    addToCart({
      product,
      quantity,
      customization,
      selectedOptions,
      customText: customText || undefined,
    });
  };

  const handleFetchIdeas = useCallback(async () => {
    if (!product) return;
    setIdeasLoading(true);
    const ideas = await getDesignIdeas(product.name);
    setDesignIdeas(ideas);
    setIdeasLoading(false);
  }, [product]);

  // Memoize gallery images to prevent recalculation on every render
  const currentGalleryImages = useMemo(
    () => (product?.galleryId ? galleryImages[product.galleryId] || [] : []),
    [product?.galleryId, galleryImages],
  );

  // Memoize the entire gallery grid to prevent re-renders
  const GalleryGrid = useMemo(() => {
    if (currentGalleryImages.length === 0) {
      return (
        <p className="col-span-3 text-center text-gray-400">
          No designs available for this product.
        </p>
      );
    }

    return (
      <div className="grid grid-cols-3 gap-2">
        {currentGalleryImages.map((img) => (
          <div
            key={img.id}
            onClick={() => {
              setSelectedGalleryImage(img);
              setUploadedImage(null);
            }}
            className={`relative w-full h-32 rounded-lg cursor-pointer overflow-hidden border-4 ${selectedGalleryImage?.id === img.id ? "border-sky-500" : "border-slate-600"}`}
          >
            <img
              src={img.imageUrl}
              alt={img.name}
              className="w-full h-full object-cover pointer-events-none"
            />
            <div
              className="absolute inset-0 pointer-events-none select-none opacity-30 flex items-center justify-center"
              style={{ transform: "rotate(-45deg)" }}
            >
              <div
                className="text-white font-bold text-3xl whitespace-nowrap"
                style={{ textShadow: "2px 2px 8px black" }}
              >
                CustomThreads
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  }, [currentGalleryImages, selectedGalleryImage]);

  // Calculate display price including all selected options and custom text - memoized
  const displayPrice = useMemo(() => {
    if (!product) return 0;
    let price = Number(product.price);
    if (product.optionLists) {
      product.optionLists.forEach((list) => {
        const selectedOptionIds = selectedOptions[list.id] || [];
        if (Array.isArray(selectedOptionIds)) {
          selectedOptionIds.forEach((optionId) => {
            const option = list.options.find((o) => o.id === optionId);
            if (option) {
              price += Number(option.priceDelta);
            }
          });
        }
      });
    }
    // Add custom text cost
    if (
      product.allowCustomText &&
      customText &&
      product.customTextPricePerChar
    ) {
      price += customText.length * Number(product.customTextPricePerChar);
    }
    return price;
  }, [product, selectedOptions, customText]);

  if (loading || !product) {
    return (
      <div className="mt-16">
        <Spinner />
      </div>
    );
  }

  return (
    <div className="bg-slate-800 p-8 rounded-lg shadow-2xl border border-slate-700">
      <button
        onClick={() => navigate("/store")}
        className="mb-4 text-gray-400 hover:text-white flex items-center gap-2 text-sm"
      >
        <svg
          className="w-4 h-4"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M15 19l-7-7 7-7"
          />
        </svg>
        Back to Store
      </button>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
        <div className="relative w-full aspect-square bg-slate-700 rounded-lg flex items-center justify-center border border-slate-600">
          <img
            src={product.imageUrl}
            alt={product.name}
            className="max-w-full max-h-full object-contain"
          />
          <div
            className="absolute inset-0 pointer-events-none select-none opacity-30 flex items-center justify-center"
            style={{ transform: "rotate(-45deg)" }}
          >
            <div
              className="text-white font-bold text-4xl whitespace-nowrap"
              style={{ textShadow: "2px 2px 8px black" }}
            >
              CustomThreads
            </div>
          </div>
          {(selectedGalleryImage || uploadedImage) && (
            <div
              className="absolute top-1/4 left-1/4 w-1/2 h-1/2 bg-contain bg-no-repeat bg-center"
              style={{
                backgroundImage: `url(${selectedGalleryImage?.imageUrl || uploadedImage})`,
              }}
            >
              <div
                className="absolute inset-0 pointer-events-none select-none opacity-30 flex items-center justify-center"
                style={{ transform: "rotate(-45deg)" }}
              >
                <div
                  className="text-white font-bold text-2xl whitespace-nowrap"
                  style={{ textShadow: "2px 2px 8px black" }}
                >
                  CustomThreads
                </div>
              </div>
            </div>
          )}
        </div>

        <div>
          <h1 className="text-4xl font-bold text-white mb-2">{product.name}</h1>
          <p className="text-3xl text-sky-400 font-light mb-4">
            ${displayPrice.toFixed(2)}
          </p>
          <p className="text-gray-300 mb-6 leading-relaxed">
            {product.description}
          </p>

          {product.optionLists && product.optionLists.length > 0 && (
            <div className="mb-6 space-y-4">
              <h3 className="text-xl font-semibold text-white mb-2">
                Product Options
              </h3>
              {[...product.optionLists]
                .sort((a, b) => a.order - b.order)
                .map((list) => {
                  const sortedOptions = [...list.options].sort(
                    (a, b) => a.order - b.order,
                  );
                  const listSelectedOptions = selectedOptions[list.id] || [];
                  return (
                    <div key={list.id}>
                      <label className="block text-sm font-medium text-gray-300 mb-2">
                        {list.name}{" "}
                        {list.required && (
                          <span className="text-red-400">*</span>
                        )}
                      </label>
                      <div className="space-y-2 p-3 bg-slate-700 border border-slate-600 rounded-md">
                        {sortedOptions.length > 0 ? (
                          sortedOptions.map((opt) => (
                            <label
                              key={opt.id}
                              className="flex items-center text-gray-200 cursor-pointer hover:text-white"
                            >
                              <input
                                type="checkbox"
                                checked={listSelectedOptions.includes(opt.id)}
                                onChange={(e) => {
                                  handleOptionChange(
                                    list.id,
                                    opt.id,
                                    e.target.checked,
                                  );
                                }}
                                className="mr-3 w-4 h-4 bg-slate-600 border border-slate-500 rounded checked:bg-sky-500 checked:border-sky-500"
                              />
                              <span>{opt.name}</span>
                              {Number(opt.priceDelta) !== 0 && (
                                <span className="ml-2 text-sky-400">
                                  (+${Number(opt.priceDelta).toFixed(2)})
                                </span>
                              )}
                            </label>
                          ))
                        ) : (
                          <p className="text-gray-400 text-sm">
                            No options available
                          </p>
                        )}
                      </div>
                    </div>
                  );
                })}
            </div>
          )}

          {product.customizable && (
            <div className="mb-6">
              <h3 className="text-xl font-semibold text-white mb-3">
                Customize Your Design
              </h3>
              <div className="flex gap-1 bg-slate-800 rounded-lg p-1 mb-4">
                <TabButton
                  tab="gallery"
                  label="Choose from Gallery"
                  activeTab={activeTab}
                  setActiveTab={setActiveTab}
                />
                {product.allowCustomImageUpload && (
                  <TabButton
                    tab="upload"
                    label="Upload Your Own"
                    activeTab={activeTab}
                    setActiveTab={setActiveTab}
                  />
                )}
                {!!product.enableAIIdeas && (
                  <TabButton
                    tab="ideas"
                    label="Get AI Ideas"
                    activeTab={activeTab}
                    setActiveTab={setActiveTab}
                  />
                )}
              </div>

              <div className="p-4 bg-slate-700 rounded-lg min-h-75">
                <div
                  style={{
                    display: activeTab === "gallery" ? "block" : "none",
                  }}
                >
                  {GalleryGrid}
                </div>

                <div
                  style={{ display: activeTab === "upload" ? "block" : "none" }}
                >
                  <div>
                    <label className="block w-full px-6 py-8 bg-slate-600 text-sky-300 rounded-lg border-2 border-dashed border-slate-500 cursor-pointer text-center">
                      <svg
                        className="w-10 h-10 mb-3 mx-auto"
                        fill="currentColor"
                        xmlns="http://www.w3.org/2000/svg"
                        viewBox="0 0 20 20"
                      >
                        <path d="M16.88 9.1A4 4 0 0 1 16 17H5a5 5 0 0 1-1-9.9V7a3 3 0 0 1 4.52-2.59A4.98 4.98 0 0 1 17 8c0 .38-.04.74-.12 1.1zM11 11h3l-4 4-4-4h3V7h2v4z" />
                      </svg>
                      <div className="text-base font-medium">
                        {uploadedFileName || "Click to select a file"}
                      </div>
                      <div className="text-xs text-gray-400 mt-1">
                        PNG, JPG, GIF up to 10MB
                      </div>
                      <input
                        type="file"
                        className="hidden"
                        accept="image/*"
                        onChange={handleImageUpload}
                      />
                    </label>
                    {product.customImageUploadPrice ? (
                      <p className="text-xs text-gray-400 mt-2 text-center">
                        Upload fee: +${Number(product.customImageUploadPrice).toFixed(2)}
                      </p>
                    ) : null}
                    {uploadedImage && (
                      <p className="text-sm text-green-400 mt-3 text-center font-medium">
                        ✓ Image ready for preview
                      </p>
                    )}
                  </div>
                </div>

                <div
                  style={{ display: activeTab === "ideas" ? "block" : "none" }}
                >
                  <div>
                    <button
                      onClick={handleFetchIdeas}
                      disabled={ideasLoading}
                      className="w-full mb-4 bg-slate-800 text-white font-bold py-2 px-4 rounded-lg hover:bg-slate-900 disabled:bg-slate-600 disabled:cursor-not-allowed"
                    >
                      {ideasLoading
                        ? "Generating..."
                        : `Get AI Ideas for ${product.name}`}
                    </button>
                    {ideasLoading && <Spinner />}
                    {designIdeas.length > 0 && (
                      <ul className="list-disc list-inside space-y-2 text-gray-300">
                        {designIdeas.map((idea, index) => (
                          <li key={index}>{idea}</li>
                        ))}
                      </ul>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {product.allowCustomText && (
            <div className="mb-6">
              <h3 className="text-xl font-semibold text-white mb-3">
                Custom Engraving Text
              </h3>
              <div className="bg-slate-700 p-4 rounded-lg">
                <textarea
                  value={customText}
                  onChange={(e) => {
                    const text = e.target.value;
                    const maxLength = product.customTextMaxLength || 100;
                    if (text.length <= maxLength) {
                      setCustomText(text);
                    }
                  }}
                  placeholder="Enter your custom text here..."
                  maxLength={product.customTextMaxLength || 100}
                  rows={3}
                  className="w-full p-3 bg-slate-600 border border-slate-500 rounded-md text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-sky-500 resize-none"
                />
                <div className="flex justify-between items-center mt-2 text-sm">
                  <span className="text-gray-400">
                    {customText.length} / {product.customTextMaxLength || 100}{" "}
                    characters
                  </span>
                  {product.customTextPricePerChar && customText.length > 0 && (
                    <span className="text-sky-400 font-semibold">
                      +$
                      {(
                        customText.length * product.customTextPricePerChar
                      ).toFixed(2)}{" "}
                      for text
                    </span>
                  )}
                </div>
                {product.customTextPricePerChar && (
                  <p className="text-xs text-gray-500 mt-2">
                    ${Number(product.customTextPricePerChar).toFixed(2)} per
                    character
                  </p>
                )}
              </div>
            </div>
          )}

          <div className="flex items-center space-x-4 mb-6">
            <label htmlFor="quantity" className="font-semibold text-white">
              Quantity:
            </label>
            <input
              type="number"
              id="quantity"
              min="1"
              max={Number(product.inventory)}
              value={quantity}
              onChange={(e) => setQuantity(parseInt(e.target.value, 10))}
              className="w-20 p-2 bg-slate-700 border border-slate-600 rounded-md text-center text-white"
            />
          </div>

          <button
            onClick={handleAddToCart}
            className="w-full bg-sky-500 text-white font-bold py-3 px-6 rounded-lg hover:bg-sky-600 transition-colors disabled:bg-gray-500 disabled:cursor-not-allowed"
            disabled={Number(product.inventory) === 0}
          >
            {Number(product.inventory) > 0 ? "Add to Cart" : "Out of Stock"}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ProductDetailPage;
