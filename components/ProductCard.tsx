
import React from 'react';
import { Link } from 'react-router-dom';
import { Product } from '../types';
import { generateSlug } from '../services/slugService';

interface ProductCardProps {
  product: Product;
}

const ProductCard: React.FC<ProductCardProps> = ({ product }) => {
  const watermarkText = 'CustomThreads';

  return (
    <div className="bg-slate-800 rounded-lg overflow-hidden group transition-all duration-300 hover:shadow-2xl hover:shadow-sky-900/50 hover:-translate-y-1 border border-slate-700 hover:border-sky-500">
      <Link to={`/product/${generateSlug(product.name)}`}>
        <div className="w-full h-64 bg-slate-700 relative overflow-hidden">
          <img src={product.imageUrl} alt={product.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
          <div className="absolute inset-0 pointer-events-none select-none">
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-8 opacity-15" style={{ transform: 'rotate(-45deg)' }}>
              <div className="text-white font-bold whitespace-nowrap" style={{ textShadow: '0 0 5px black', fontSize: '12px' }}>{watermarkText}</div>
              <div className="text-white font-bold whitespace-nowrap" style={{ textShadow: '0 0 5px black', fontSize: '12px' }}>{watermarkText}</div>
              <div className="text-white font-bold whitespace-nowrap" style={{ textShadow: '0 0 5px black', fontSize: '12px' }}>{watermarkText}</div>
            </div>
          </div>
        </div>
        <div className="p-5">
          <h3 className="text-lg font-semibold text-white truncate">{product.name}</h3>
          <p className="text-sky-400 font-bold mt-2">
            {product.optionLists?.length ? `From $${Number(product.price).toFixed(2)}` : `$${Number(product.price).toFixed(2)}`}
          </p>
        </div>
      </Link>
    </div>
  );
};

export default ProductCard;
