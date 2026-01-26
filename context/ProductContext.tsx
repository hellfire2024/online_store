import React, {
  createContext,
  useState,
  useContext,
  ReactNode,
  useEffect,
} from "react";
import { Product } from "../types";
import * as mockApi from "../services/mockApi";

interface ProductContextType {
  products: Product[];
  isLoading: boolean;
  addProduct: (product: Omit<Product, "id">) => Promise<void>;
  updateProduct: (product: Product) => Promise<void>;
  deleteProduct: (productId: string) => Promise<void>;
}

const ProductContext = createContext<ProductContextType | undefined>(undefined);

export const ProductProvider: React.FC<{ children: ReactNode }> = ({
  children,
}) => {
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadProducts = async () => {
      setIsLoading(true);
      try {
        const productsData = await mockApi.fetchProducts();
        setProducts(productsData);
      } catch (error) {
        console.error("Failed to load products", error);
      } finally {
        setIsLoading(false);
      }
    };
    loadProducts();
  }, []);

  const addProduct = async (product: Omit<Product, "id">) => {
    const newProduct = await mockApi.addProduct(product);
    setProducts((prev) => [...prev, newProduct]);
  };

  const updateProduct = async (product: Product) => {
    const updatedProduct = await mockApi.updateProduct(product);
    setProducts((prev) =>
      prev.map((p) => (p.id === updatedProduct.id ? updatedProduct : p)),
    );
  };

  const deleteProduct = async (productId: string) => {
    await mockApi.deleteProduct(productId);
    setProducts((prev) => prev.filter((p) => p.id !== productId));
  };

  return (
    <ProductContext.Provider
      value={{ products, isLoading, addProduct, updateProduct, deleteProduct }}
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
