
import React, { useState } from 'react';
import { useAdmin } from '../../context/AdminContext';
import { Product } from '../../types';
import { EditIcon, TrashIcon, PlusIcon } from '../../components/Icons';

const ProductManagement: React.FC = () => {
    const { products, galleries, updateProduct, deleteProduct, addProduct } = useAdmin();
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingProduct, setEditingProduct] = useState<Partial<Product> | null>(null);

    const openModal = (product?: Product) => {
        setEditingProduct(product || { name: '', price: 0, description: '', imageUrl: '', inventory: 0, customizable: false, galleryId: '' });
        setIsModalOpen(true);
    };

    const closeModal = () => {
        setIsModalOpen(false);
        setEditingProduct(null);
    };

    const handleSave = async () => {
        if (!editingProduct) return;

        if (editingProduct.id) {
            await updateProduct(editingProduct as Product);
        } else {
            await addProduct(editingProduct as Omit<Product, 'id'>);
        }
        closeModal();
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
        const { name, value, type } = e.target;
        let parsedValue: string | number | boolean = value;
        if (type === 'number') {
            parsedValue = parseFloat(value) || 0;
        } else if (type === 'checkbox') {
            parsedValue = (e.target as HTMLInputElement).checked;
        }
        setEditingProduct(prev => prev ? { ...prev, [name]: parsedValue } : null);
    };

    const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            const file = e.target.files[0];
            const reader = new FileReader();
            reader.onloadend = () => {
                setEditingProduct(prev => prev ? { ...prev, imageUrl: reader.result as string } : null);
            };
            reader.readAsDataURL(file);
        }
    };
    
    const inputClasses = "w-full p-2 bg-slate-700 border border-slate-600 rounded-md text-white";

    return (
        <div>
            <div className="flex justify-between items-center mb-8">
                <h1 className="text-3xl font-bold text-white">Product Management</h1>
                <button onClick={() => openModal()} className="bg-sky-500 text-white font-bold py-2 px-4 rounded-lg flex items-center hover:bg-sky-600">
                    <PlusIcon className="w-5 h-5 mr-2" />
                    Add Product
                </button>
            </div>

            <div className="bg-slate-800 rounded-lg border border-slate-700 overflow-hidden">
                <table className="w-full text-left">
                    <thead className="bg-slate-900">
                        <tr>
                            <th className="p-4">Product</th>
                            <th className="p-4">Price</th>
                            <th className="p-4">Inventory</th>
                            <th className="p-4">Gallery</th>
                            <th className="p-4">Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {products.map(product => (
                            <tr key={product.id} className="border-t border-slate-700">
                                <td className="p-4 flex items-center">
                                    <img src={product.imageUrl} alt={product.name} className="w-12 h-12 object-cover rounded-md mr-4" />
                                    {product.name}
                                </td>
                                <td className="p-4">${product.price.toFixed(2)}</td>
                                <td className="p-4">{product.inventory}</td>
                                <td className="p-4 text-gray-400">{galleries.find(g => g.id === product.galleryId)?.name || 'None'}</td>
                                <td className="p-4">
                                    <button onClick={() => openModal(product)} className="text-gray-400 hover:text-sky-400 mr-4"><EditIcon className="w-5 h-5" /></button>
                                    <button onClick={() => deleteProduct(product.id)} className="text-gray-400 hover:text-red-500"><TrashIcon className="w-5 h-5" /></button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {isModalOpen && editingProduct && (
                <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
                    <div className="bg-slate-800 rounded-lg shadow-2xl p-8 w-full max-w-lg border border-slate-700 max-h-full overflow-y-auto">
                        <h2 className="text-2xl font-bold text-white mb-6">{editingProduct.id ? 'Edit' : 'Add'} Product</h2>
                        <div className="space-y-4">
                            <input type="text" name="name" value={editingProduct.name} onChange={handleChange} placeholder="Product Name" className={inputClasses} />
                            <textarea name="description" value={editingProduct.description} onChange={handleChange} placeholder="Description" className={inputClasses} rows={3}></textarea>
                            <div>
                                <label className="block text-sm font-medium text-gray-300 mb-1">Product Image</label>
                                <div className="mt-2 flex items-center gap-4">
                                    <img src={editingProduct.imageUrl} alt="Product preview" className="w-24 h-24 object-cover rounded-md bg-slate-700" />
                                    <label className="cursor-pointer bg-slate-600 hover:bg-slate-500 text-white font-bold py-2 px-4 rounded-lg">
                                        <span>Upload Image</span>
                                        <input type="file" className="hidden" accept="image/*" onChange={handleImageUpload} />
                                    </label>
                                </div>
                            </div>
                            <div className="flex space-x-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-300 mb-1">Price</label>
                                    <div className="relative">
                                        <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                                            <span className="text-gray-400 sm:text-sm">$</span>
                                        </div>
                                        <input type="number" name="price" value={editingProduct.price || ''} onChange={handleChange} placeholder="25.00" className={`${inputClasses} pl-7`} />
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-300 mb-1">Inventory</label>
                                    <input type="number" name="inventory" value={editingProduct.inventory || ''} onChange={handleChange} placeholder="100" className={inputClasses} />
                                </div>
                            </div>
                             <div className="flex items-center space-x-4">
                                <input type="checkbox" id="customizable" name="customizable" checked={editingProduct.customizable} onChange={handleChange} className="h-4 w-4 rounded border-gray-300 text-sky-600 focus:ring-sky-500" />
                                <label htmlFor="customizable" className="block text-sm text-gray-300">Customizable</label>
                            </div>
                            {editingProduct.customizable && (
                                <div>
                                    <label htmlFor="galleryId" className="block text-sm font-medium text-gray-300 mb-1">Assign Gallery</label>
                                    <select name="galleryId" id="galleryId" value={editingProduct.galleryId || ''} onChange={handleChange} className={inputClasses}>
                                        <option value="">None</option>
                                        {galleries.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
                                    </select>
                                </div>
                            )}
                        </div>
                        <div className="mt-8 flex justify-end space-x-4">
                            <button onClick={closeModal} className="bg-slate-600 text-white font-bold py-2 px-4 rounded-lg hover:bg-slate-700">Cancel</button>
                            <button onClick={handleSave} className="bg-sky-500 text-white font-bold py-2 px-4 rounded-lg hover:bg-sky-600">Save</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ProductManagement;
