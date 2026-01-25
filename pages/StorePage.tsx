
import React from 'react';
import { useAdmin } from '../context/AdminContext';
import ProductCard from '../components/ProductCard';
import Spinner from '../components/Spinner';

const StorePage: React.FC = () => {
  const { products } = useAdmin();
  const loading = products.length === 0;

  return (
    <div>
      <h1 className="text-5xl font-bold text-white text-center mb-12">Our Products</h1>
      {loading ? (
        <div className="mt-16">
          <Spinner />
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-8">
          {products.map(product => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      )}
    </div>
  );
};

export default StorePage;
