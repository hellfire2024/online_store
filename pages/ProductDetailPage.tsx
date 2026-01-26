
import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Product, GalleryImage } from '../types';
import { useProducts } from '../context/ProductContext';
import { useGalleries } from '../context/GalleryContext';
import { getDesignIdeas } from '../services/geminiService';
import { useCart } from '../context/CartContext';
import Spinner from '../components/Spinner';
import WatermarkedImage from '../components/WatermarkedImage';

type CustomizationTab = 'gallery' | 'upload' | 'ideas';

const ProductDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { products } = useProducts();
  const { galleryImages, fetchGalleryImages } = useGalleries();
  const { addToCart } = useCart();

  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [quantity, setQuantity] = useState(1);
  const [activeTab, setActiveTab] = useState<CustomizationTab>('gallery');
  
  const [selectedGalleryImage, setSelectedGalleryImage] = useState<GalleryImage | null>(null);
  
  const [uploadedImage, setUploadedImage] = useState<string | null>(null);
  const [uploadedFileName, setUploadedFileName] = useState<string>('');

  const [designIdeas, setDesignIdeas] = useState<string[]>([]);
  const [ideasLoading, setIdeasLoading] = useState(false);

  useEffect(() => {
    if (products.length > 0) {
      const foundProduct = products.find(p => p.id === id);
      if (foundProduct) {
        setProduct(foundProduct);
        if (foundProduct.galleryId) {
          fetchGalleryImages(foundProduct.galleryId);
        }
      } else {
        navigate('/store');
      }
      setLoading(false);
    }
  }, [id, products, navigate, fetchGalleryImages]);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setUploadedFileName(file.name);
      const reader = new FileReader();
      reader.onloadend = () => {
        setUploadedImage(reader.result as string);
        setSelectedGalleryImage(null);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleAddToCart = () => {
    if (!product) return;
    
    let customization;
    if (selectedGalleryImage) {
        customization = { type: 'gallery' as const, value: selectedGalleryImage.imageUrl };
    } else if (uploadedImage) {
        customization = { type: 'upload' as const, value: uploadedImage };
    }

    if (product.customizable && !customization) {
        alert('Please select a design or upload your own image.');
        return;
    }

    addToCart({
      product,
      quantity,
      customization,
    });
  };

  const handleFetchIdeas = useCallback(async () => {
    if (!product) return;
    setIdeasLoading(true);
    const ideas = await getDesignIdeas(product.name);
    setDesignIdeas(ideas);
    setIdeasLoading(false);
  }, [product]);

  if (loading || !product) {
    return <div className="mt-16"><Spinner /></div>;
  }

  const currentGalleryImages = product.galleryId ? galleryImages[product.galleryId] || [] : [];

  const TabButton = ({ tab, label }: { tab: CustomizationTab, label: string }) => (
    <button
      onClick={() => setActiveTab(tab)}
      className={`px-4 py-2 text-sm font-medium rounded-t-md transition-colors ${activeTab === tab ? 'bg-slate-700 text-white' : 'bg-transparent text-gray-400 hover:bg-slate-800 hover:text-white'}`}
    >
      {label}
    </button>
  );

  return (
    <div className="bg-slate-800 p-8 rounded-lg shadow-2xl border border-slate-700">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
        <div className="relative w-full aspect-square bg-slate-700 rounded-lg flex items-center justify-center border border-slate-600">
          <img src={product.imageUrl} alt={product.name} className="max-w-full max-h-full object-contain" />
          <div className="absolute inset-0 pointer-events-none select-none">
            <div className="absolute inset-0 flex flex-col items-center justify-around opacity-15" style={{ transform: 'rotate(-45deg)' }}>
              <div className="text-white font-bold whitespace-nowrap" style={{ textShadow: '0 0 5px black', fontSize: '18px' }}>CustomThreads</div>
              <div className="text-white font-bold whitespace-nowrap" style={{ textShadow: '0 0 5px black', fontSize: '18px' }}>CustomThreads</div>
              <div className="text-white font-bold whitespace-nowrap" style={{ textShadow: '0 0 5px black', fontSize: '18px' }}>CustomThreads</div>
              <div className="text-white font-bold whitespace-nowrap" style={{ textShadow: '0 0 5px black', fontSize: '18px' }}>CustomThreads</div>
              <div className="text-white font-bold whitespace-nowrap" style={{ textShadow: '0 0 5px black', fontSize: '18px' }}>CustomThreads</div>
            </div>
          </div>
          {(selectedGalleryImage || uploadedImage) && (
            <div className="absolute top-1/4 left-1/4 w-1/2 h-1/2 bg-contain bg-no-repeat bg-center"
                 style={{ backgroundImage: `url(${selectedGalleryImage?.imageUrl || uploadedImage})` }}>
              <div className="absolute inset-0 pointer-events-none select-none">
                <div className="absolute inset-0 flex flex-col items-center justify-around opacity-15" style={{ transform: 'rotate(-45deg)' }}>
                  <div className="text-white font-bold whitespace-nowrap" style={{ textShadow: '0 0 5px black', fontSize: '12px' }}>CustomThreads</div>
                  <div className="text-white font-bold whitespace-nowrap" style={{ textShadow: '0 0 5px black', fontSize: '12px' }}>CustomThreads</div>
                  <div className="text-white font-bold whitespace-nowrap" style={{ textShadow: '0 0 5px black', fontSize: '12px' }}>CustomThreads</div>
                </div>
              </div>
            </div>
          )}
        </div>

        <div>
          <h1 className="text-4xl font-bold text-white mb-2">{product.name}</h1>
          <p className="text-3xl text-sky-400 font-light mb-4">${product.price.toFixed(2)}</p>
          <p className="text-gray-300 mb-6 leading-relaxed">{product.description}</p>

          {product.customizable && (
            <div className="mb-6">
              <h3 className="text-xl font-semibold text-white mb-3">Customize Your Design</h3>
              <div className="flex space-x-2 border-b border-slate-700">
                <TabButton tab="gallery" label="Choose from Gallery" />
                <TabButton tab="upload" label="Upload Your Own" />
                {product.enableAIIdeas && <TabButton tab="ideas" label="Get AI Ideas" />}
              </div>
              
              <div className="p-4 bg-slate-700 rounded-b-md">
                {activeTab === 'gallery' && (
                  <div className="grid grid-cols-3 gap-2">
                    {currentGalleryImages.length > 0 ? currentGalleryImages.map(img => (
                      <WatermarkedImage 
                        key={img.id} 
                        src={img.imageUrl} 
                        alt={img.name}
                        isSelected={selectedGalleryImage?.id === img.id}
                        onClick={() => { setSelectedGalleryImage(img); setUploadedImage(null); }}
                      />
                    )) : <p className="col-span-3 text-center text-gray-400">No designs available for this product.</p>}
                  </div>
                )}

                {activeTab === 'upload' && (
                  <div>
                    <label className="w-full flex flex-col items-center px-4 py-6 bg-slate-600 text-sky-300 rounded-lg shadow-sm tracking-wide uppercase border-2 border-dashed border-slate-500 cursor-pointer hover:bg-slate-500 hover:text-white hover:border-sky-400">
                      <svg className="w-8 h-8" fill="currentColor" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20"><path d="M16.88 9.1A4 4 0 0 1 16 17H5a5 5 0 0 1-1-9.9V7a3 3 0 0 1 4.52-2.59A4.98 4.98 0 0 1 17 8c0 .38-.04.74-.12 1.1zM11 11h3l-4 4-4-4h3V7h2v4z" /></svg>
                      <span className="mt-2 text-base leading-normal">{uploadedFileName || 'Select a file'}</span>
                      <input type='file' className="hidden" accept="image/*" onChange={handleImageUpload} />
                    </label>
                    {uploadedImage && <p className="text-sm text-green-400 mt-2 text-center">Image ready for preview.</p>}
                  </div>
                )}

                {activeTab === 'ideas' && (
                  <div>
                    <button onClick={handleFetchIdeas} disabled={ideasLoading} className="w-full mb-4 bg-slate-800 text-white font-bold py-2 px-4 rounded-lg hover:bg-slate-900 disabled:bg-slate-600 disabled:cursor-not-allowed">
                      {ideasLoading ? 'Generating...' : `Get AI Ideas for ${product.name}`}
                    </button>
                    {ideasLoading && <Spinner />}
                    {designIdeas.length > 0 && (
                      <ul className="list-disc list-inside space-y-2 text-gray-300">
                        {designIdeas.map((idea, index) => <li key={index}>{idea}</li>)}
                      </ul>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}

          <div className="flex items-center space-x-4 mb-6">
            <label htmlFor="quantity" className="font-semibold text-white">Quantity:</label>
            <input
              type="number"
              id="quantity"
              min="1"
              max={product.inventory}
              value={quantity}
              onChange={(e) => setQuantity(parseInt(e.target.value, 10))}
              className="w-20 p-2 bg-slate-700 border border-slate-600 rounded-md text-center text-white"
            />
          </div>

          <button
            onClick={handleAddToCart}
            className="w-full bg-sky-500 text-white font-bold py-3 px-6 rounded-lg hover:bg-sky-600 transition-colors disabled:bg-gray-500 disabled:cursor-not-allowed"
            disabled={product.inventory === 0}
          >
            {product.inventory > 0 ? 'Add to Cart' : 'Out of Stock'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ProductDetailPage;
