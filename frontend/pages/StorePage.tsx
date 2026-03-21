import React, { useState } from "react";
import { useProducts } from "../context/ProductContext";
import ProductCard from "../components/ProductCard";
import Spinner from "../components/Spinner";
import Pagination from "../components/Pagination";
import { isProductArchived } from "../utils/productPricing";

const StorePage: React.FC = () => {
  const { products, isLoading } = useProducts();
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(12);
  const visibleProducts = products.filter(
    (product) => !isProductArchived(product),
  );

  const paginatedProducts =
    itemsPerPage === -1
      ? visibleProducts
      : visibleProducts.slice(
          (currentPage - 1) * itemsPerPage,
          currentPage * itemsPerPage,
        );

  return (
    <div>
      <h1 className="text-5xl font-bold text-white text-center mb-12">
        Our Products
      </h1>
      {isLoading ? (
        <div className="mt-16">
          <Spinner />
        </div>
      ) : (
        <>
          <div className="flex flex-wrap justify-center gap-8">
            {paginatedProducts.map((product) => (
              <div
                key={product.id}
                className="w-full sm:w-[calc(50%-1rem)] lg:w-[calc(25%-1.5rem)] max-w-sm"
              >
                <ProductCard product={product} />
              </div>
            ))}
          </div>
          <Pagination
            currentPage={currentPage}
            totalItems={visibleProducts.length}
            itemsPerPage={itemsPerPage}
            onPageChange={setCurrentPage}
            onItemsPerPageChange={(value) => {
              setItemsPerPage(value);
              setCurrentPage(1);
            }}
          />
        </>
      )}
    </div>
  );
};

export default StorePage;
