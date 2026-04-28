import React, { useState, useEffect } from "react";
import { useProducts } from "../../context/ProductContext";
import { useGalleries } from "../../context/GalleryContext";
// WARNING: This page uses useGalleries and must be rendered within a GalleryProvider (see App.tsx)
import { PlusIcon, EditIcon, TrashIcon } from "../../components/Icons";
import { useToast } from "../../hooks/useToast";
import Spinner from "../../components/Spinner";
import Pagination from "../../components/Pagination";
import { Product, ProductOption, ProductOptionList } from "../../types";
import { useUnsavedChanges } from "../../context/UnsavedChangesContext";
import { apiClient } from "../../services/apiClient";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

interface SortableOptionListProps {
  optionList: ProductOptionList;
  onChangeName: (value: string) => void;
  onToggleRequired: () => void;
  onChangeMaxSelections: (value: number | undefined) => void;
  onDelete: () => void;
  onAddOption: () => void;
  onOptionChange: (
    optionId: string,
    field: "name" | "priceDelta",
    value: string,
  ) => void;
  onDeleteOption: (optionId: string) => void;
  onDragEndOption: (event: DragEndEvent) => void;
}

const SortableOptionList: React.FC<SortableOptionListProps> = ({
  optionList,
  onChangeName,
  onToggleRequired,
  onChangeMaxSelections,
  onDelete,
  onAddOption,
  onOptionChange,
  onDeleteOption,
  onDragEndOption,
}) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: optionList.id });

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const sortedOptions = [...optionList.options].sort(
    (a, b) => a.order - b.order,
  );

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="p-4 border border-slate-600 rounded-lg bg-slate-700/80 mb-3"
    >
      <div className="flex items-center gap-3 mb-3">
        <button
          type="button"
          className="cursor-grab active:cursor-grabbing text-gray-400 hover:text-white text-xl"
          {...attributes}
          {...listeners}
        >
          ⋮⋮
        </button>
        <input
          type="text"
          value={optionList.name}
          onChange={(e) => onChangeName(e.target.value)}
          className="flex-1 p-2 bg-slate-800 border border-slate-600 rounded text-white font-semibold"
          placeholder="Option list name (e.g., Size, Color)"
        />
        <label className="flex items-center gap-2 text-sm text-gray-300">
          <input
            type="checkbox"
            checked={optionList.required}
            onChange={onToggleRequired}
            className="rounded border-gray-300 text-sky-600 focus:ring-sky-500"
          />
          Required
        </label>
        <div className="flex items-center gap-2">
          <label className="text-sm text-gray-300 whitespace-nowrap">
            Max Selections:
          </label>
          <input
            type="number"
            min="1"
            max={optionList.options.length}
            value={optionList.maxSelections || ""}
            onChange={(e) => {
              const val = e.target.value ? parseInt(e.target.value) : undefined;
              onChangeMaxSelections(val);
            }}
            className="w-14 p-1 bg-slate-800 border border-slate-600 rounded text-white text-sm"
            placeholder="∞"
            title="Leave empty for unlimited selections"
          />
        </div>
        <button
          type="button"
          onClick={onDelete}
          className="text-gray-400 hover:text-red-500 transition-colors"
          title="Delete list"
        >
          <TrashIcon className="w-4 h-4" />
        </button>
      </div>

      <div className="ml-8 space-y-2">
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={onDragEndOption}
        >
          <SortableContext
            items={sortedOptions.map((o) => o.id)}
            strategy={verticalListSortingStrategy}
          >
            {sortedOptions.map((opt) => (
              <SortableOption
                key={opt.id}
                option={opt}
                onChangeName={(value) => onOptionChange(opt.id, "name", value)}
                onChangePriceDelta={(value) =>
                  onOptionChange(opt.id, "priceDelta", value)
                }
                onDelete={() => onDeleteOption(opt.id)}
              />
            ))}
          </SortableContext>
        </DndContext>

        {sortedOptions.length === 0 && (
          <p className="text-sm text-gray-400 italic p-2">
            No options in this list yet
          </p>
        )}

        <button
          type="button"
          onClick={onAddOption}
          className="text-xs px-3 py-1 bg-slate-800 border border-slate-600 rounded text-sky-300 hover:bg-slate-700"
        >
          + Add Option
        </button>
      </div>
    </div>
  );
};

interface SortableOptionProps {
  option: ProductOption;
  onChangeName: (value: string) => void;
  onChangePriceDelta: (value: string) => void;
  onDelete: () => void;
}

const SortableOption: React.FC<SortableOptionProps> = ({
  option,
  onChangeName,
  onChangePriceDelta,
  onDelete,
}) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: option.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="p-3 border border-slate-600 rounded-lg bg-slate-700/60"
    >
      <div className="grid grid-cols-1 md:grid-cols-[auto_1fr_1fr_auto] gap-2 items-center">
        <button
          type="button"
          className="cursor-grab active:cursor-grabbing text-gray-400 hover:text-white p-2"
          {...attributes}
          {...listeners}
        >
          ⋮⋮
        </button>
        <input
          type="text"
          value={option.name}
          onChange={(e) => onChangeName(e.target.value)}
          className="w-full p-2 bg-slate-800 border border-slate-600 rounded text-white"
          placeholder="Option name"
        />
        <input
          type="number"
          step="0.01"
          value={option.priceDelta}
          onChange={(e) => onChangePriceDelta(e.target.value)}
          className="w-full p-2 bg-slate-800 border border-slate-600 rounded text-white"
          placeholder="Price delta"
        />
        <button
          type="button"
          onClick={onDelete}
          className="text-red-400 hover:text-red-300 p-2"
          title="Delete option"
        >
          <TrashIcon className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
};

const ProductManagement: React.FC = () => {
  const {
    products,
    isLoading,
    addProduct,
    updateProduct,
    fetchProducts,
    deleteProduct,
  } = useProducts();
  const { galleries, galleryImages, fetchGalleryImages } = useGalleries();
  const [newProduct, setNewProduct] = useState<Omit<Product, "id"> | null>(
    null,
  );
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [originalProduct, setOriginalProduct] = useState<
    Product | Omit<Product, "id"> | null
  >(null);
  const [imagePreview, setImagePreview] = useState<string>("");
  const [imageVersions, setImageVersions] = useState<Record<string, number>>(
    {},
  );
  const [showImageSelector, setShowImageSelector] = useState(false);
  const { addToast } = useToast();
  const { setHasUnsavedChanges } = useUnsavedChanges();
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  const isModalOpen = !!newProduct || !!editingProduct;
  const currentProduct = newProduct || editingProduct;
  const hasUnsavedChanges =
    isModalOpen &&
    JSON.stringify(currentProduct) !== JSON.stringify(originalProduct);

  const setProductState = (
    updater: (
      p: Product | Omit<Product, "id">,
    ) => Product | Omit<Product, "id">,
  ) => {
    if (newProduct) {
      setNewProduct((prev) =>
        prev ? (updater(prev) as Omit<Product, "id">) : prev,
      );
    } else if (editingProduct) {
      setEditingProduct((prev) => (prev ? (updater(prev) as Product) : prev));
    }
  };

  // Filter out any null/undefined products and ensure valid data
  const validProducts = products.filter((p): p is Product => p != null);

  const lowStockProducts = validProducts.filter(
    (p) =>
      (p.lowStockThreshold ?? 0) > 0 &&
      Number(p.inventory) <= (p.lowStockThreshold ?? 0),
  );
  const outOfStockProducts = validProducts.filter(
    (p) => Number(p.inventory) <= 0,
  );

  useEffect(() => {
    setHasUnsavedChanges(hasUnsavedChanges);
    // Cleanup function to reset on unmount
    return () => {
      setHasUnsavedChanges(false);
    };
  }, [hasUnsavedChanges, setHasUnsavedChanges]);

  // Fetch gallery images when selector is opened
  useEffect(() => {
    if (showImageSelector && galleries.length > 0) {
      galleries.forEach((gallery) => {
        if (!galleryImages[gallery.id]) {
          fetchGalleryImages(gallery.id);
        }
      });
    }
  }, [showImageSelector, galleries, galleryImages, fetchGalleryImages]);

  const handleAddNew = () => {
    const newProd = {
      name: "",
      price: 0,
      description: "",
      imageUrl: "",
      inventory: 0,
      customizable: false,
      lowStockThreshold: 0,
      optionLists: [],
      allowCustomText: false,
      customTextPricePerChar: 0.1,
      customTextMaxLength: 100,
      allowCustomImageUpload: false,
      customImageUploadPrice: undefined,
    };
    setNewProduct(newProd);
    setOriginalProduct(newProd);
    setImagePreview("");
  };

  const handleEdit = (product: Product) => {
    setEditingProduct({ ...product });
    setOriginalProduct({ ...product });
    setImagePreview(product.imageUrl);
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      try {
        const data = await apiClient.upload.image(file, {
          target: "generic",
        });
        const imageUrl = data.imageUrl;

        setImagePreview(imageUrl);
        if (newProduct) {
          setNewProduct({ ...newProduct, imageUrl });
        } else if (editingProduct) {
          setEditingProduct({ ...editingProduct, imageUrl });
        }
        addToast("Image uploaded successfully!", "success");
      } catch (error) {
        console.error("Error uploading image:", error);
        addToast("Failed to upload image. Please try again.", "error");
      }
    }
  };

  const handleCloseModal = () => {
    if (hasUnsavedChanges) {
      if (
        window.confirm(
          "You have unsaved changes. Are you sure you want to discard them?",
        )
      ) {
        setNewProduct(null);
        setEditingProduct(null);
        setImagePreview("");
      }
    } else {
      setNewProduct(null);
      setEditingProduct(null);
      setImagePreview("");
    }
  };

  const handleChange = (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
    >,
  ) => {
    const { name, value, type } = e.target;
    let parsedValue: any = value;
    if (type === "number") {
      parsedValue = value === "" ? undefined : parseFloat(value);
    }

    if (newProduct) {
      setNewProduct((prev) => ({ ...prev!, [name]: parsedValue }));
    } else if (editingProduct) {
      setEditingProduct((prev) => ({ ...prev!, [name]: parsedValue }));
    }
  };

  const handleCheckboxChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, checked } = e.target;
    if (newProduct) {
      setNewProduct((prev) => {
        const updated = { ...prev!, [name]: checked };
        // Clear related fields when feature is disabled
        if (name === "allowCustomText" && !checked) {
          updated.customTextPricePerChar = undefined;
          updated.customTextMaxLength = undefined;
        }
        if (name === "allowCustomImageUpload" && !checked) {
          updated.customImageUploadPrice = undefined;
        }
        return updated;
      });
    } else if (editingProduct) {
      setEditingProduct((prev) => {
        const updated = { ...prev!, [name]: checked };
        // Clear related fields when feature is disabled
        if (name === "allowCustomText" && !checked) {
          updated.customTextPricePerChar = undefined;
          updated.customTextMaxLength = undefined;
        }
        if (name === "allowCustomImageUpload" && !checked) {
          updated.customImageUploadPrice = undefined;
        }
        return updated;
      });
    }
  };

  const handleAddOption = () => {
    setProductState((prev) => {
      const optionLists = [...(prev.optionLists || [])];
      optionLists.push({
        id: `list-${Date.now()}`,
        name: "New Option List",
        required: false,
        order: optionLists.length + 1,
        options: [],
      });
      return { ...prev, optionLists } as Product;
    });
  };

  const handleOptionListChange = (
    listId: string,
    field: "name" | "required" | "maxSelections",
    value: string | boolean | number | undefined,
  ) => {
    setProductState((prev) => {
      const optionLists = (prev.optionLists || []).map((list) =>
        list.id === listId ? { ...list, [field]: value } : list,
      );
      return { ...prev, optionLists } as Product;
    });
  };

  const handleDeleteOptionList = (listId: string) => {
    setProductState((prev) => {
      const optionLists = (prev.optionLists || []).filter(
        (l) => l.id !== listId,
      );
      const reordered = optionLists.map((list, idx) => ({
        ...list,
        order: idx + 1,
      }));
      return { ...prev, optionLists: reordered } as Product;
    });
  };

  const handleAddOptionToList = (listId: string) => {
    setProductState((prev) => {
      const optionLists = (prev.optionLists || []).map((list) => {
        if (list.id === listId) {
          const options = [...list.options];
          options.push({
            id: `opt-${Date.now()}`,
            name: "New Option",
            priceDelta: 0,
            order: options.length + 1,
          });
          return { ...list, options };
        }
        return list;
      });
      return { ...prev, optionLists } as Product;
    });
  };

  const handleOptionChange = (
    listId: string,
    optionId: string,
    field: "name" | "priceDelta",
    value: string,
  ) => {
    setProductState((prev) => {
      const optionLists = (prev.optionLists || []).map((list) => {
        if (list.id === listId) {
          const options = list.options.map((opt) =>
            opt.id === optionId
              ? {
                  ...opt,
                  [field]:
                    field === "priceDelta" ? parseFloat(value) || 0 : value,
                }
              : opt,
          );
          return { ...list, options };
        }
        return list;
      });
      return { ...prev, optionLists } as Product;
    });
  };

  const handleDragEndList = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    setProductState((prev) => {
      const optionLists = [...(prev.optionLists || [])].sort(
        (a, b) => a.order - b.order,
      );
      const oldIndex = optionLists.findIndex((l) => l.id === active.id);
      const newIndex = optionLists.findIndex((l) => l.id === over.id);
      const reordered = arrayMove(optionLists, oldIndex, newIndex).map(
        (list, idx) => ({
          ...list,
          order: idx + 1,
        }),
      );
      return { ...prev, optionLists: reordered } as Product;
    });
  };

  const handleDragEndOption = (listId: string, event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    setProductState((prev) => {
      const optionLists = (prev.optionLists || []).map((list) => {
        if (list.id === listId) {
          const options = [...list.options].sort((a, b) => a.order - b.order);
          const oldIndex = options.findIndex((o) => o.id === active.id);
          const newIndex = options.findIndex((o) => o.id === over.id);
          const reordered = arrayMove(options, oldIndex, newIndex).map(
            (opt, idx) => ({
              ...opt,
              order: idx + 1,
            }),
          );
          return { ...list, options: reordered };
        }
        return list;
      });
      return { ...prev, optionLists } as Product;
    });
  };

  const handleDeleteOption = (listId: string, optionId: string) => {
    setProductState((prev) => {
      const optionLists = (prev.optionLists || []).map((list) => {
        if (list.id === listId) {
          const options = list.options.filter((o) => o.id !== optionId);
          const reordered = options.map((opt, idx) => ({
            ...opt,
            order: idx + 1,
          }));
          return { ...list, options: reordered };
        }
        return list;
      });
      return { ...prev, optionLists } as Product;
    });
  };

  const handleSave = async () => {
    const productToSave = newProduct || editingProduct;

    // Validation
    if (!productToSave?.name?.trim()) {
      addToast("Product name is required", "error");
      return;
    }

    if (!productToSave.price || productToSave.price <= 0) {
      addToast("Product price must be greater than 0", "error");
      return;
    }

    if (!productToSave.inventory || Number(productToSave.inventory) < 0) {
      addToast("Product inventory must be 0 or greater", "error");
      return;
    }

    if (!productToSave.imageUrl?.trim()) {
      addToast("Product image is required", "error");
      return;
    }

    try {
      let savedProduct: Product | null = null;
      if (newProduct) {
        savedProduct = await addProduct(newProduct);
        addToast("Product added!", "success");
      } else if (editingProduct) {
        savedProduct = await updateProduct(editingProduct);
        addToast("Product updated!", "success");
      }

      // Force products to refresh by fetching again
      await fetchProducts();

      if (savedProduct) {
        // Update image version for cache busting (though not needed for base64)
        setImageVersions((prev) => ({
          ...prev,
          [savedProduct.id]: Date.now(),
        }));
      }

      // Clear states
      setImagePreview("");
      setNewProduct(null);
      setEditingProduct(null);
    } catch (error) {
      console.error("Failed to save product", error);
      addToast("Failed to save product. Please try again.", "error");
    }
  };

  if (isLoading) {
    return <Spinner />;
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold text-white">Product Management</h1>
        <button
          onClick={handleAddNew}
          className="flex items-center gap-2 bg-sky-500 text-white font-bold py-2 px-4 rounded-lg hover:bg-sky-600"
        >
          <PlusIcon /> Add New Product
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6">
        <div className="bg-slate-800 border border-slate-700 rounded-lg p-4">
          <p className="text-sm text-gray-400 mb-1">Low Stock</p>
          <p className="text-2xl font-bold text-yellow-300">
            {lowStockProducts.length}
          </p>
          <p className="text-xs text-gray-500">
            Inventory at or below threshold
          </p>
        </div>
        <div className="bg-slate-800 border border-slate-700 rounded-lg p-4">
          <p className="text-sm text-gray-400 mb-1">Out of Stock</p>
          <p className="text-2xl font-bold text-red-300">
            {outOfStockProducts.length}
          </p>
          <p className="text-xs text-gray-500">Needs immediate attention</p>
        </div>
        <div className="bg-slate-800 border border-slate-700 rounded-lg p-4">
          <p className="text-sm text-gray-400 mb-1">Total Products</p>
          <p className="text-2xl font-bold text-sky-300">
            {validProducts.length}
          </p>
          <p className="text-xs text-gray-500">Catalog items</p>
        </div>
      </div>

      <div className="bg-slate-800 rounded-lg border border-slate-700 overflow-hidden">
        <table className="w-full text-left">
          <thead className="bg-slate-900">
            <tr>
              <th className="p-4">Product</th>
              <th className="p-4">Price</th>
              <th className="p-4">Inventory</th>
              <th className="p-4">Status</th>
              <th className="p-4">Actions</th>
            </tr>
          </thead>
          <tbody>
            {(itemsPerPage === -1
              ? validProducts
              : validProducts.slice(
                  (currentPage - 1) * itemsPerPage,
                  currentPage * itemsPerPage,
                )
            ).map((product) => {
              const isOut = Number(product.inventory) <= 0;
              const isLow =
                (product.lowStockThreshold ?? 0) > 0 &&
                Number(product.inventory) <= (product.lowStockThreshold ?? 0) &&
                !isOut;
              const cacheBust = imageVersions[product.id];
              return (
                <tr key={product.id} className="border-t border-slate-700">
                  <td className="p-4 flex items-center gap-4">
                    <img
                      key={cacheBust || 0}
                      src={product.imageUrl}
                      alt={product.name}
                      className="w-16 h-16 object-cover rounded-md bg-slate-700"
                    />
                    <span>{product.name}</span>
                  </td>
                  <td className="p-4">${Number(product.price).toFixed(2)}</td>
                  <td className="p-4">{product.inventory}</td>
                  <td className="p-4">
                    <span
                      className={`px-2 py-1 rounded-full text-xs font-semibold ${
                        isOut
                          ? "bg-red-900 text-red-200"
                          : isLow
                            ? "bg-yellow-900 text-yellow-200"
                            : "bg-green-900 text-green-200"
                      }`}
                    >
                      {isOut ? "Out of stock" : isLow ? "Low stock" : "Healthy"}
                    </span>
                  </td>
                  <td className="p-4">
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleEdit(product)}
                        className="text-sky-400 hover:text-sky-300 p-2"
                      >
                        <EditIcon />
                      </button>
                      <button
                        onClick={() => {
                          if (
                            window.confirm(
                              `Are you sure you want to delete "${product.name}"? This action cannot be undone.`,
                            )
                          ) {
                            deleteProduct(product.id);
                          }
                        }}
                        className="text-red-400 hover:text-red-300 p-2"
                      >
                        <TrashIcon />
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <Pagination
        currentPage={currentPage}
        totalItems={validProducts.length}
        itemsPerPage={itemsPerPage}
        onPageChange={setCurrentPage}
        onItemsPerPageChange={setItemsPerPage}
      />

      {isModalOpen && currentProduct && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-start justify-center p-4 overflow-y-auto">
          <div className="bg-slate-800 rounded-lg shadow-2xl p-8 w-full max-w-4xl border border-slate-700 my-8">
            <h2 className="text-2xl font-bold text-white mb-6">
              {editingProduct ? "Edit Product" : "Add New Product"}
            </h2>
            <div className="space-y-4">
              <div>
                <label
                  htmlFor="name"
                  className="block text-sm font-semibold text-gray-300 mb-1"
                >
                  Product Name
                </label>
                <input
                  id="name"
                  type="text"
                  name="name"
                  placeholder="e.g., T-Shirt, Hoodie"
                  value={currentProduct.name}
                  onChange={handleChange}
                  className="w-full p-2 bg-slate-700 border border-slate-600 rounded-md text-white"
                />
              </div>
              <div>
                <label
                  htmlFor="description"
                  className="block text-sm font-semibold text-gray-300 mb-1"
                >
                  Description
                </label>
                <textarea
                  id="description"
                  name="description"
                  placeholder="Describe the product, materials, sizing, etc."
                  value={currentProduct.description}
                  onChange={handleChange}
                  className="w-full p-2 bg-slate-700 border border-slate-600 rounded-md text-white"
                  rows={3}
                ></textarea>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label
                    htmlFor="price"
                    className="block text-sm font-semibold text-gray-300 mb-1"
                  >
                    Price ($)
                  </label>
                  <input
                    id="price"
                    type="number"
                    name="price"
                    placeholder="0.00"
                    step="0.01"
                    value={currentProduct.price}
                    onChange={handleChange}
                    className="w-full p-2 bg-slate-700 border border-slate-600 rounded-md text-white"
                  />
                </div>
                <div>
                  <label
                    htmlFor="inventory"
                    className="block text-sm font-semibold text-gray-300 mb-1"
                  >
                    Stock Quantity
                  </label>
                  <input
                    id="inventory"
                    type="number"
                    name="inventory"
                    placeholder="0"
                    value={currentProduct.inventory}
                    onChange={handleChange}
                    className="w-full p-2 bg-slate-700 border border-slate-600 rounded-md text-white"
                  />
                </div>
              </div>
              <div>
                <label
                  htmlFor="lowStockThreshold"
                  className="block text-sm font-semibold text-gray-300 mb-1"
                >
                  Low Stock Threshold
                </label>
                <input
                  id="lowStockThreshold"
                  type="number"
                  name="lowStockThreshold"
                  placeholder="e.g., 10"
                  value={currentProduct.lowStockThreshold ?? 0}
                  onChange={handleChange}
                  className="w-full p-2 bg-slate-700 border border-slate-600 rounded-md text-white"
                />
                <p className="text-xs text-gray-400 mt-1">
                  Alerts when inventory drops to this level.
                </p>
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-300 mb-2">
                  Product Image
                </label>
                {imagePreview && (
                  <div className="mb-4">
                    <img
                      src={imagePreview}
                      alt="Preview"
                      className="w-full h-48 object-cover rounded-md bg-slate-700 border border-slate-600"
                    />
                  </div>
                )}
                <div className="flex gap-2 mb-3">
                  <label className="flex-1 flex items-center px-4 py-2 bg-slate-700 text-sky-300 rounded-lg shadow-sm border border-slate-600 cursor-pointer hover:bg-slate-600 hover:text-white transition-colors">
                    <svg
                      className="w-5 h-5 mr-2"
                      fill="currentColor"
                      xmlns="http://www.w3.org/2000/svg"
                      viewBox="0 0 20 20"
                    >
                      <path d="M16.88 9.1A4 4 0 0 1 16 17H5a5 5 0 0 1-1-9.9V7a3 3 0 0 1 4.52-2.59A4.98 4.98 0 0 1 17 8c0 .38-.04.74-.12 1.1zM11 11h3l-4 4-4-4h3V7h2v4z" />
                    </svg>
                    <span className="text-sm">Upload Image</span>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleImageUpload}
                      className="hidden"
                    />
                  </label>
                  <button
                    type="button"
                    onClick={() => setShowImageSelector(!showImageSelector)}
                    className="flex-1 px-4 py-2 bg-slate-700 text-sky-300 rounded-lg border border-slate-600 hover:bg-slate-600 hover:text-white transition-colors text-sm font-medium"
                  >
                    Select from Site
                  </button>
                </div>
              </div>

              {showImageSelector && (
                <div className="bg-slate-700 rounded-lg p-4 border border-slate-600">
                  <p className="text-sm text-gray-300 mb-3">
                    Select from gallery images:
                  </p>
                  <div className="grid grid-cols-4 gap-2 max-h-64 overflow-y-auto">
                    {galleries.length === 0 ? (
                      <p className="col-span-4 text-center text-gray-400 text-sm">
                        No galleries available
                      </p>
                    ) : (
                      galleries.flatMap(
                        (gallery) =>
                          galleryImages[gallery.id]?.map((img) => (
                            <div
                              key={img.id}
                              onClick={() => {
                                setImagePreview(img.imageUrl);
                                if (newProduct) {
                                  setNewProduct({
                                    ...newProduct,
                                    imageUrl: img.imageUrl,
                                  });
                                } else if (editingProduct) {
                                  setEditingProduct({
                                    ...editingProduct,
                                    imageUrl: img.imageUrl,
                                  });
                                }
                                setShowImageSelector(false);
                              }}
                              className={`cursor-pointer rounded-md overflow-hidden border-2 transition-colors hover:border-sky-400 ${
                                imagePreview === img.imageUrl
                                  ? "border-sky-500"
                                  : "border-slate-600"
                              }`}
                            >
                              <img
                                src={img.imageUrl}
                                alt={img.name}
                                className="w-full h-20 object-cover"
                                title={img.name}
                              />
                            </div>
                          )) || [],
                      )
                    )}
                  </div>
                </div>
              )}

              <div className="flex items-center">
                <input
                  type="checkbox"
                  name="customizable"
                  id="customizable"
                  checked={Boolean(currentProduct.customizable)}
                  onChange={handleCheckboxChange}
                  className="h-4 w-4 rounded border-gray-300 text-sky-600 focus:ring-sky-500"
                />
                <label
                  htmlFor="customizable"
                  className="ml-2 block text-sm text-gray-300"
                >
                  Customizable
                </label>
              </div>
              {Boolean(currentProduct.customizable) && (
                <>
                  <div>
                    <label
                      htmlFor="galleryId"
                      className="block text-sm text-gray-300 mb-1"
                    >
                      Gallery for Customization
                    </label>
                    <select
                      name="galleryId"
                      id="galleryId"
                      value={currentProduct.galleryId || ""}
                      onChange={handleChange}
                      className="w-full p-2 bg-slate-700 border border-slate-600 rounded-md text-white"
                    >
                      <option value="">Select a gallery...</option>
                      {galleries.map((gallery) => (
                        <option key={gallery.id} value={gallery.id}>
                          {gallery.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      name="enableAIIdeas"
                      id="enableAIIdeas"
                      checked={currentProduct.enableAIIdeas || false}
                      onChange={handleCheckboxChange}
                      className="h-4 w-4 rounded border-gray-300 text-sky-600 focus:ring-sky-500"
                    />
                    <label
                      htmlFor="enableAIIdeas"
                      className="ml-2 block text-sm text-gray-300"
                    >
                      Enable AI Design Ideas
                    </label>
                  </div>

                  <div className="border-t border-slate-600 pt-4 mt-4">
                    <h4 className="text-sm font-semibold text-gray-300 mb-3">
                      Custom Engraving Text
                    </h4>
                    <div className="flex items-center mb-3">
                      <input
                        type="checkbox"
                        name="allowCustomText"
                        id="allowCustomText"
                        checked={currentProduct.allowCustomText || false}
                        onChange={handleCheckboxChange}
                        className="h-4 w-4 rounded border-gray-300 text-sky-600 focus:ring-sky-500"
                      />
                      <label
                        htmlFor="allowCustomText"
                        className="ml-2 block text-sm text-gray-300"
                      >
                        Allow Custom Engraving Text
                      </label>
                    </div>
                    {currentProduct.allowCustomText && (
                      <>
                        <div className="space-y-3">
                          <div>
                            <label
                              htmlFor="customTextPricePerChar"
                              className="block text-sm text-gray-300 mb-1"
                            >
                              Price Per Character ($)
                            </label>
                            <input
                              type="number"
                              id="customTextPricePerChar"
                              name="customTextPricePerChar"
                              step="0.01"
                              min="0"
                              placeholder="0.10"
                              value={currentProduct.customTextPricePerChar ?? 0}
                              onChange={handleChange}
                              className="w-full p-2 bg-slate-700 border border-slate-600 rounded-md text-white"
                            />
                            <p className="text-xs text-gray-400 mt-1">
                              Cost added per character entered (e.g., 0.10 = 10¢
                              per character)
                            </p>
                          </div>
                          <div>
                            <label
                              htmlFor="customTextMaxLength"
                              className="block text-sm text-gray-300 mb-1"
                            >
                              Maximum Characters
                            </label>
                            <input
                              type="number"
                              id="customTextMaxLength"
                              name="customTextMaxLength"
                              min="1"
                              placeholder="100"
                              value={currentProduct.customTextMaxLength ?? 100}
                              onChange={handleChange}
                              className="w-full p-2 bg-slate-700 border border-slate-600 rounded-md text-white"
                            />
                            <p className="text-xs text-gray-400 mt-1">
                              Maximum number of characters customers can enter
                            </p>
                          </div>
                        </div>
                      </>
                    )}
                  </div>

                  <div className="border-t border-slate-600 pt-4 mt-4">
                    <h4 className="text-sm font-semibold text-gray-300 mb-3">
                      Custom Image Upload
                    </h4>
                    <div className="flex items-center mb-3">
                      <input
                        type="checkbox"
                        name="allowCustomImageUpload"
                        id="allowCustomImageUpload"
                        checked={currentProduct.allowCustomImageUpload || false}
                        onChange={handleCheckboxChange}
                        className="h-4 w-4 rounded border-gray-300 text-sky-600 focus:ring-sky-500"
                      />
                      <label
                        htmlFor="allowCustomImageUpload"
                        className="ml-2 block text-sm text-gray-300"
                      >
                        Allow Custom Image Upload
                      </label>
                    </div>
                    {currentProduct.allowCustomImageUpload ? (
                      <div>
                        <label
                          htmlFor="customImageUploadPrice"
                          className="block text-sm text-gray-300 mb-1"
                        >
                          Upload Fee ($)
                        </label>
                        <input
                          type="number"
                          id="customImageUploadPrice"
                          name="customImageUploadPrice"
                          step="0.01"
                          min="0"
                          placeholder="0.00"
                          value={currentProduct.customImageUploadPrice || ""}
                          onChange={handleChange}
                          className="w-full p-2 bg-slate-700 border border-slate-600 rounded-md text-white"
                        />
                        <p className="text-xs text-gray-400 mt-1">
                          Flat fee added when the customer uploads their own
                          image
                        </p>
                      </div>
                    ) : null}
                  </div>
                </>
              )}

              <div className="mt-4">
                <div className="flex justify-between items-center mb-2">
                  <label className="block text-sm font-semibold text-gray-300">
                    Product Option Lists
                  </label>
                  <button
                    type="button"
                    onClick={handleAddOption}
                    className="text-xs px-3 py-1 bg-slate-700 border border-slate-600 rounded text-sky-300 hover:bg-slate-600"
                  >
                    + Add Option List
                  </button>
                </div>
                <p className="text-xs text-gray-400 mb-3">
                  Create separate lists for different option types (e.g., Size,
                  Color, Material). Drag to reorder.
                </p>
                {currentProduct.optionLists?.length ? (
                  <DndContext
                    sensors={sensors}
                    collisionDetection={closestCenter}
                    onDragEnd={handleDragEndList}
                  >
                    <SortableContext
                      items={[...currentProduct.optionLists]
                        .sort((a, b) => a.order - b.order)
                        .map((l) => l.id)}
                      strategy={verticalListSortingStrategy}
                    >
                      <div className="space-y-2">
                        {[...currentProduct.optionLists]
                          .sort((a, b) => a.order - b.order)
                          .map((list) => (
                            <SortableOptionList
                              key={list.id}
                              optionList={list}
                              onChangeName={(value) =>
                                handleOptionListChange(list.id, "name", value)
                              }
                              onToggleRequired={() =>
                                handleOptionListChange(
                                  list.id,
                                  "required",
                                  !list.required,
                                )
                              }
                              onChangeMaxSelections={(value) =>
                                handleOptionListChange(
                                  list.id,
                                  "maxSelections",
                                  value,
                                )
                              }
                              onDelete={() => handleDeleteOptionList(list.id)}
                              onAddOption={() => handleAddOptionToList(list.id)}
                              onOptionChange={(optionId, field, value) =>
                                handleOptionChange(
                                  list.id,
                                  optionId,
                                  field,
                                  value,
                                )
                              }
                              onDeleteOption={(optionId) =>
                                handleDeleteOption(list.id, optionId)
                              }
                              onDragEndOption={(event) =>
                                handleDragEndOption(list.id, event)
                              }
                            />
                          ))}
                      </div>
                    </SortableContext>
                  </DndContext>
                ) : (
                  <p className="text-sm text-gray-400">
                    No option lists yet. Add separate lists for sizes, colors,
                    materials, etc.
                  </p>
                )}
              </div>
            </div>
            <div className="flex justify-end gap-4 mt-8">
              <button
                onClick={handleCloseModal}
                className="text-gray-400 hover:text-white px-4 py-2"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                className="bg-sky-500 text-white font-bold py-2 px-6 rounded-lg hover:bg-sky-600 disabled:opacity-50"
                disabled={!hasUnsavedChanges}
              >
                Save Product
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProductManagement;
