import React, {
  createContext,
  useState,
  useContext,
  ReactNode,
  useEffect,
} from "react";
import { Product } from "../types";
import * as mockApi from "../services/mockApi";
import { apiClient } from "../services/apiClient";

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
      const productsData = await apiClient.products.getAll();
      setProducts(Array.isArray(productsData) ? productsData : []);
    } catch (error) {
      console.error("Failed to load products from API, using mock data", error);
      try {
        const mockProductsData = await mockApi.fetchProducts();
        setProducts(mockProductsData);
      } catch (mockError) {
        console.error("Failed to load mock products", mockError);
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
      console.error("Failed to add product via API, using mock", error);
      const newProduct = await mockApi.addProduct(product);
      setProducts((prev) => [...prev, newProduct]);
      return newProduct;
    }
  };

  const updateProduct = async (product: Product) => {
    try {
      const updatedProduct = await apiClient.products.update(product.id, product);
      const resolvedProduct = {
        ...updatedProduct,
        imageUrl: updatedProduct.imageUrl || product.imageUrl,
      };
      setProducts((prev) =>
        prev.map((p) => (p.id === resolvedProduct.id ? resolvedProduct : p)),
      );
      await fetchProducts();
      return resolvedProduct;
    } catch (error) {
      console.error("Failed to update product via API, using mock", error);
      const updatedProduct = await mockApi.updateProduct(product);
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
      console.error("Failed to delete product via API, using mock", error);
      await mockApi.deleteProduct(productId);
      setProducts((prev) => prev.filter((p) => p.id !== productId));
    }
  };

  return (
    <ProductContext.Provider
      value={{ products, isLoading, addProduct, updateProduct, fetchProducts, deleteProduct }}
    >
      {children}
    </ProductContext.Provider>
  );
};

export const useProducts = () => {
  const context = useContext(ProductContext);
  if (context === undefined) {
    throw new Error("useProducts must be used within a ProductProvider");
  }
  return context;
};
