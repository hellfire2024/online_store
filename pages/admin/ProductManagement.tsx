import React, { useState, useEffect } from "react";
import { useProducts } from "../../context/ProductContext";
import { useGalleries } from "../../context/GalleryContext";
import { PlusIcon, EditIcon, TrashIcon } from "../../components/Icons";
import { useToast } from "../../hooks/useToast";
import Spinner from "../../components/Spinner";
import { Product, ProductOption } from "../../types";
import { useUnsavedChanges } from "../../context/UnsavedChangesContext";
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
          className="text-xs px-3 py-2 bg-red-700/60 border border-red-600 rounded text-red-100 hover:bg-red-700"
        >
          ✕
        </button>
      </div>
    </div>
  );
};

const ProductManagement: React.FC = () => {
  const { products, isLoading, addProduct, updateProduct, deleteProduct } =
    useProducts();
  const { galleries, galleryImages, fetchGalleryImages } = useGalleries();
  const [newProduct, setNewProduct] = useState<Omit<Product, "id"> | null>(
    null,
  );
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [originalProduct, setOriginalProduct] = useState<
    Product | Omit<Product, "id"> | null
  >(null);
  const [imagePreview, setImagePreview] = useState<string>("");
  const [showImageSelector, setShowImageSelector] = useState(false);
  const { addToast } = useToast();
  const { setHasUnsavedChanges } = useUnsavedChanges();

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const isModalOpen = !!newProduct || !!editingProduct;
  const currentProduct = newProduct || editingProduct;
  const hasUnsavedChanges =
    isModalOpen &&
    JSON.stringify(currentProduct) !== JSON.stringify(originalProduct);

  const setProductState = (
    updater: (p: Product | Omit<Product, "id">) => Product | Omit<Product, "id">
  ) => {
    if (newProduct) {
      setNewProduct((prev) => (prev ? (updater(prev) as Omit<Product, "id">) : prev));
    } else if (editingProduct) {
      setEditingProduct((prev) => (prev ? (updater(prev) as Product) : prev));
    }
  };

  const lowStockProducts = products.filter(
    (p) => (p.lowStockThreshold ?? 0) > 0 && p.inventory <= (p.lowStockThreshold ?? 0)
  );
  const outOfStockProducts = products.filter((p) => p.inventory <= 0);

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
      options: [],
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

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const dataUrl = reader.result as string;
        setImagePreview(dataUrl);
        if (newProduct) {
          setNewProduct({ ...newProduct, imageUrl: dataUrl });
        } else if (editingProduct) {
          setEditingProduct({ ...editingProduct, imageUrl: dataUrl });
        }
      };
      reader.readAsDataURL(file);
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
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>,
  ) => {
    const { name, value, type } = e.target;
    const parsedValue = type === "number" ? parseFloat(value) : value;

    if (newProduct) {
      setNewProduct((prev) => ({ ...prev!, [name]: parsedValue }));
    } else if (editingProduct) {
      setEditingProduct((prev) => ({ ...prev!, [name]: parsedValue }));
    }
  };

  const handleCheckboxChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, checked } = e.target;
    if (newProduct) {
      setNewProduct((prev) => ({ ...prev!, [name]: checked }));
    } else if (editingProduct) {
      setEditingProduct((prev) => ({ ...prev!, [name]: checked }));
    }
  };

  const handleAddOption = () => {
    setProductState((prev) => {
      const options = [...(prev.options || [])];
      options.push({
        id: `opt-${Date.now()}`,
        name: "New Option",
        priceDelta: 0,
        order: options.length + 1,
      });
      return { ...prev, options } as Product;
    });
  };

  const handleOptionChange = (
    optionId: string,
    field: "name" | "priceDelta",
    value: string,
  ) => {
    setProductState((prev) => {
      const options = (prev.options || []).map((opt) =>
        opt.id === optionId
          ? {
              ...opt,
              [field]: field === "priceDelta" ? parseFloat(value) || 0 : value,
            }
          : opt,
      );
      return { ...prev, options } as Product;
    });
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    setProductState((prev) => {
      const options = [...(prev.options || [])].sort((a, b) => a.order - b.order);
      const oldIndex = options.findIndex((o) => o.id === active.id);
      const newIndex = options.findIndex((o) => o.id === over.id);
      const reordered = arrayMove(options, oldIndex, newIndex).map((opt, idx) => ({
        ...opt,
        order: idx + 1,
      }));
      return { ...prev, options: reordered } as Product;
    });
  };

  const handleDeleteOption = (optionId: string) => {
    setProductState((prev) => {
      const options = (prev.options || []).filter((o) => o.id !== optionId);
      const reordered = options.map((opt, idx) => ({ ...opt, order: idx + 1 }));
      return { ...prev, options: reordered } as Product;
    });
  };

  const handleSave = () => {
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
    
    if (!productToSave.inventory || productToSave.inventory < 0) {
      addToast("Product inventory must be 0 or greater", "error");
      return;
    }
    
    if (!productToSave.imageUrl?.trim()) {
      addToast("Product image is required", "error");
      return;
    }

    if (newProduct) {
      addProduct(newProduct);
      addToast("Product added!", "success");
    } else if (editingProduct) {
      updateProduct(editingProduct);
      addToast("Product updated!", "success");
    }
    setNewProduct(null);
    setEditingProduct(null);
  };

  if (isLoading) {
    return <Spinner />;
  }

  return (
    <div className="max-w-7xl mx-auto">
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
          <p className="text-2xl font-bold text-yellow-300">{lowStockProducts.length}</p>
          <p className="text-xs text-gray-500">Inventory at or below threshold</p>
        </div>
        <div className="bg-slate-800 border border-slate-700 rounded-lg p-4">
          <p className="text-sm text-gray-400 mb-1">Out of Stock</p>
          <p className="text-2xl font-bold text-red-300">{outOfStockProducts.length}</p>
          <p className="text-xs text-gray-500">Needs immediate attention</p>
        </div>
        <div className="bg-slate-800 border border-slate-700 rounded-lg p-4">
          <p className="text-sm text-gray-400 mb-1">Total Products</p>
          <p className="text-2xl font-bold text-sky-300">{products.length}</p>
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
            {products.map((product) => {
              const isOut = product.inventory <= 0;
              const isLow = (product.lowStockThreshold ?? 0) > 0 && product.inventory <= (product.lowStockThreshold ?? 0) && !isOut;
              return (
                <tr key={product.id} className="border-t border-slate-700">
                  <td className="p-4 flex items-center gap-4">
                    <img
                      src={product.imageUrl}
                      alt={product.name}
                      className="w-16 h-16 object-cover rounded-md bg-slate-700"
                    />
                    <span>{product.name}</span>
                  </td>
                  <td className="p-4">${product.price.toFixed(2)}</td>
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
                        onClick={() => deleteProduct(product.id)}
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

      {isModalOpen && currentProduct && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-slate-800 rounded-lg shadow-2xl p-8 w-full max-w-4xl border border-slate-700 my-8 max-h-[90vh] overflow-y-auto">
            <h2 className="text-2xl font-bold text-white mb-6">
              {editingProduct ? "Edit Product" : "Add New Product"}
            </h2>
            <div className="space-y-4">
              <div>
                <label htmlFor="name" className="block text-sm font-semibold text-gray-300 mb-1">
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
                <label htmlFor="description" className="block text-sm font-semibold text-gray-300 mb-1">
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
                  <label htmlFor="price" className="block text-sm font-semibold text-gray-300 mb-1">
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
                  <label htmlFor="inventory" className="block text-sm font-semibold text-gray-300 mb-1">
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
                <label htmlFor="lowStockThreshold" className="block text-sm font-semibold text-gray-300 mb-1">
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
                <p className="text-xs text-gray-400 mt-1">Alerts when inventory drops to this level.</p>
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
                    <svg className="w-5 h-5 mr-2" fill="currentColor" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20"><path d="M16.88 9.1A4 4 0 0 1 16 17H5a5 5 0 0 1-1-9.9V7a3 3 0 0 1 4.52-2.59A4.98 4.98 0 0 1 17 8c0 .38-.04.74-.12 1.1zM11 11h3l-4 4-4-4h3V7h2v4z" /></svg>
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
                  <p className="text-sm text-gray-300 mb-3">Select from gallery images:</p>
                  <div className="grid grid-cols-4 gap-2 max-h-64 overflow-y-auto">
                    {galleries.length === 0 ? (
                      <p className="col-span-4 text-center text-gray-400 text-sm">No galleries available</p>
                    ) : (
                      galleries.flatMap((gallery) => 
                        galleryImages[gallery.id]?.map((img) => (
                          <div
                            key={img.id}
                            onClick={() => {
                              setImagePreview(img.imageUrl);
                              if (newProduct) {
                                setNewProduct({ ...newProduct, imageUrl: img.imageUrl });
                              } else if (editingProduct) {
                                setEditingProduct({ ...editingProduct, imageUrl: img.imageUrl });
                              }
                              setShowImageSelector(false);
                            }}
                            className={`cursor-pointer rounded-md overflow-hidden border-2 transition-colors hover:border-sky-400 ${
                              imagePreview === img.imageUrl ? 'border-sky-500' : 'border-slate-600'
                            }`}
                          >
                            <img
                              src={img.imageUrl}
                              alt={img.name}
                              className="w-full h-20 object-cover"
                              title={img.name}
                            />
                          </div>
                        )) || []
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
                  checked={currentProduct.customizable}
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
              {currentProduct.customizable && (
                <>
                  <div>
                    <label htmlFor="galleryId" className="block text-sm text-gray-300 mb-1">
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
                </>
              )}

              <div className="mt-4">
                <div className="flex justify-between items-center mb-2">
                  <label className="block text-sm font-semibold text-gray-300">Product Options</label>
                  <button
                    type="button"
                    onClick={handleAddOption}
                    className="text-xs px-3 py-1 bg-slate-700 border border-slate-600 rounded text-sky-300 hover:bg-slate-600"
                  >
                    + Add Option
                  </button>
                </div>
                {currentProduct.options?.length ? (
                  <DndContext
                    sensors={sensors}
                    collisionDetection={closestCenter}
                    onDragEnd={handleDragEnd}
                  >
                    <SortableContext
                      items={[...currentProduct.options].sort((a, b) => a.order - b.order).map((o) => o.id)}
                      strategy={verticalListSortingStrategy}
                    >
                      <div className="space-y-2">
                        {[...currentProduct.options].sort((a, b) => a.order - b.order).map((opt) => (
                          <SortableOption
                            key={opt.id}
                            option={opt}
                            onChangeName={(value) => handleOptionChange(opt.id, "name", value)}
                            onChangePriceDelta={(value) => handleOptionChange(opt.id, "priceDelta", value)}
                            onDelete={() => handleDeleteOption(opt.id)}
                          />
                        ))}
                      </div>
                    </SortableContext>
                  </DndContext>
                ) : (
                  <p className="text-sm text-gray-400">No options yet. Add sizes, materials, or bundles.</p>
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
