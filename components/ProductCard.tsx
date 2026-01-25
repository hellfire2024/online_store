
import React from 'react';
import { Link } from 'react-router-dom';
import { Product } from '../types';

interface ProductCardProps {
  product: Product;
}

const ProductCard: React.FC<ProductCardProps> = ({ product }) => {
  return (
    <div className="bg-slate-800 rounded-lg overflow-hidden group transition-all duration-300 hover:shadow-2xl hover:shadow-sky-900/50 hover:-translate-y-1 border border-slate-700 hover:border-sky-500">
      <Link to={`/product/${product.id}`}>
        <div className="w-full h-64 bg-slate-700">
            <img src={product.imageUrl} alt={product.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
        </div>
        <div className="p-5">
          <h3 className="text-lg font-semibold text-white truncate">{product.name}</h3>
          <p className="text-sky-400 font-bold mt-2">${product.price.toFixed(2)}</p>
        </div>
      </Link>
    </div>
  );
};

export default ProductCard;
