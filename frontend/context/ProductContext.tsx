import React, {
  createContext,
  useState,
  useContext,
  ReactNode,
  useEffect,
} from "react";
import { Product } from "../types";
import { apiClient } from "../services/apiClient";
import {
  fetchProducts as fetchMockProducts,
  addProduct as addMockProduct,
  updateProduct as updateMockProduct,
  deleteProduct as deleteMockProduct,
} from "../services/mockApi";

interface ProductContextType {
  products: Product[];
  isLoading: boolean;
  addProduct: (product: Omit<Product, "id">) => Promise<Product>;
  updateProduct: (product: Product) => Promise<Product>;
  fetchProducts: () => Promise<void>;
  deleteProduct: (productId: string) => Promise<void>;
}

const ProductContext = createContext<ProductContextType | undefined>(undefined);

export const ProductProvider: React.FC<{ children: ReactNode }> = ({
  children,
}) => {
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchProducts = async () => {
    setIsLoading(true);
    try {
      const productsData = await apiClient.products.getAll(true);
      setProducts(Array.isArray(productsData) ? productsData : []);
    } catch (error) {
      try {
        const mockProductsData = await fetchMockProducts();
        setProducts(Array.isArray(mockProductsData) ? mockProductsData : []);
      } catch {
        setProducts([]);
      }
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchProducts();
  }, []);

  const addProduct = async (product: Omit<Product, "id">) => {
    try {
      const newProduct = await apiClient.products.create(product);
      setProducts((prev) => [...prev, newProduct]);
      return newProduct;
    } catch (error) {
      const newProduct = await addMockProduct(product);
      setProducts((prev) => [...prev, newProduct]);
      return newProduct;
    }
  };

  const updateProduct = async (product: Product) => {
    try {
      const updatedProduct = await apiClient.products.update(
        product.id,
        product,
      );
      setProducts((prev) =>
        prev.map((p) => (p.id === updatedProduct.id ? updatedProduct : p)),
      );
      return updatedProduct;
    } catch (error) {
      const updatedProduct = await updateMockProduct(product);
      setProducts((prev) =>
        prev.map((p) => (p.id === updatedProduct.id ? updatedProduct : p)),
      );
      return updatedProduct;
    }
  };

  const deleteProduct = async (productId: string) => {
    try {
      await apiClient.products.delete(productId);
      setProducts((prev) => prev.filter((p) => p.id !== productId));
    } catch (error) {
      await deleteMockProduct(productId);
      setProducts((prev) => prev.filter((p) => p.id !== productId));
    }
  };

  return (
    <ProductContext.Provider
      value={{
        products,
        isLoading,
        addProduct,
        updateProduct,
        fetchProducts,
        deleteProduct,
      }}
    >
      {children}
    </ProductContext.Provider>
  );
};

export const useProduct = () => {
  const context = useContext(ProductContext);
  if (context === undefined) {
    throw new Error("useProduct must be used within a ProductProvider");
  }
  return context;
};

export const useProducts = useProduct;
// ...existing code...
