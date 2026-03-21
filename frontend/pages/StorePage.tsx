import React, { useState } from "react";
import { useProducts } from "../context/ProductContext";
import ProductCard from "../components/ProductCard";
import Spinner from "../components/Spinner";
import Pagination from "../components/Pagination";
import { isProductArchived, isProductOnSale } from "../utils/productPricing";

const StorePage: React.FC = () => {
  const { products, isLoading } = useProducts();
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(12);
  const visibleProducts = products.filter(
    (product) => !isProductArchived(product),
  );

  const sortedProducts = [...visibleProducts].sort((a, b) => {
    const aOnSale = isProductOnSale(a);
    const bOnSale = isProductOnSale(b);
    if (aOnSale !== bOnSale) {
      return aOnSale ? -1 : 1;
    }
    return a.name.localeCompare(b.name);
  });

  const saleProducts = sortedProducts.filter((product) =>
    isProductOnSale(product),
  );
  const regularProducts = sortedProducts.filter(
    (product) => !isProductOnSale(product),
  );

  const displayProducts =
    saleProducts.length > 0 ? regularProducts : sortedProducts;

  const paginatedProducts =
    itemsPerPage === -1
      ? displayProducts
      : displayProducts.slice(
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
          {saleProducts.length > 0 && (
            <div className="mb-12">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-3xl font-bold text-red-300">On Sale Now</h2>
                <span className="text-sm text-gray-400">
                  {saleProducts.length} item
                  {saleProducts.length !== 1 ? "s" : ""} on sale
                </span>
              </div>
              <div className="flex flex-wrap justify-center gap-8">
                {saleProducts.map((product) => (
                  <div
                    key={`sale-${product.id}`}
                    className="w-full sm:w-[calc(50%-1rem)] lg:w-[calc(25%-1.5rem)] max-w-sm"
                  >
                    <ProductCard product={product} />
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="mb-6">
            <h2 className="text-3xl font-bold text-white text-center">
              {saleProducts.length > 0 ? "More Products" : "All Products"}
            </h2>
          </div>

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
            totalItems={displayProducts.length}
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
