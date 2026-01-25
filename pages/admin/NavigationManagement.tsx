
import React, { useState, useEffect } from 'react';
import { useAdmin } from '../../context/AdminContext';
import { Menu, MenuItem } from '../../types';
import { PlusIcon, TrashIcon } from '../../components/Icons';
import { useToast } from '../../hooks/useToast';

const NavigationManagement: React.FC = () => {
    const { menus, pages, updateMenu } = useAdmin();
    const [selectedMenuId, setSelectedMenuId] = useState<string | null>(null);
    const [currentMenu, setCurrentMenu] = useState<Menu | null>(null);
    const { addToast } = useToast();

    const builtInPages = [
        { title: 'Home', path: '/' },
        { title: 'Store', path: '/store' },
        { title: 'About', path: '/about' },
        { title: 'Contact', path: '/contact' },
        { title: 'Cart', path: '/cart' },
        { title: 'Login', path: '/login' },
    ];

    useEffect(() => {
        if (menus.length > 0 && !selectedMenuId) {
            setSelectedMenuId(menus[0].id);
        }
    }, [menus, selectedMenuId]);

    useEffect(() => {
        if (selectedMenuId) {
            // Deep copy to avoid direct state mutation
            const foundMenu = menus.find(m => m.id === selectedMenuId);
            setCurrentMenu(foundMenu ? JSON.parse(JSON.stringify(foundMenu)) : null);
        }
    }, [selectedMenuId, menus]);

    const handleItemChange = (itemId: string, field: 'text' | 'url', value: string) => {
        if (!currentMenu) return;
        const updatedItems = currentMenu.items.map(item => 
            item.id === itemId ? { ...item, [field]: value } : item
        );
        setCurrentMenu({ ...currentMenu, items: updatedItems });
    };

    const addNewItem = () => {
        if (!currentMenu) return;
        const newItem: MenuItem = { id: `item_${Date.now()}`, text: 'New Link', url: '/' };
        setCurrentMenu({ ...currentMenu, items: [...currentMenu.items, newItem] });
    };

    const deleteItem = (itemId: string) => {
        if (!currentMenu) return;
        const updatedItems = currentMenu.items.filter(item => item.id !== itemId);
        setCurrentMenu({ ...currentMenu, items: updatedItems });
    };

    const handleSaveMenu = async () => {
        if (currentMenu) {
            await updateMenu(currentMenu);
            addToast(`Menu "${currentMenu.name}" updated successfully!`, 'success');
        }
    };

    return (
        <div>
            <h1 className="text-3xl font-bold text-white mb-8">Navigation Management</h1>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="lg:col-span-1 bg-slate-800 p-6 rounded-lg border border-slate-700 self-start">
                    <h2 className="text-xl font-semibold text-white mb-4">Menus</h2>
                    <div className="space-y-2">
                        {menus.map(menu => (
                            <div key={menu.id} onClick={() => setSelectedMenuId(menu.id)} className={`p-3 rounded-md cursor-pointer transition-colors ${selectedMenuId === menu.id ? 'bg-sky-600 text-white' : 'bg-slate-700 hover:bg-slate-600 text-gray-300'}`}>
                                {menu.name}
                            </div>
                        ))}
                    </div>
                </div>
                <div className="lg:col-span-2">
                    {currentMenu ? (
                        <div className="bg-slate-800 p-6 rounded-lg border border-slate-700">
                            <h2 className="text-xl font-semibold text-white mb-4">Editing "{currentMenu.name}"</h2>
                            <div className="space-y-4">
                                {currentMenu.items.map(item => (
                                    <div key={item.id} className="flex items-center gap-2 p-2 bg-slate-700 rounded-md">
                                        <input type="text" value={item.text} onChange={e => handleItemChange(item.id, 'text', e.target.value)} placeholder="Link Text" className="flex-grow p-2 bg-slate-600 border border-slate-500 rounded-md text-white" />
                                        <select value={item.url} onChange={e => handleItemChange(item.id, 'url', e.target.value)} className="flex-grow p-2 bg-slate-600 border border-slate-500 rounded-md text-white">
                                            <optgroup label="Site Pages">
                                                {builtInPages.map(p => <option key={p.path} value={p.path}>{p.title}</option>)}
                                            </optgroup>
                                            <optgroup label="Custom Pages">
                                                {pages.map(p => <option key={p.id} value={p.path}>{p.title}</option>)}
                                            </optgroup>
                                        </select>
                                        <button onClick={() => deleteItem(item.id)} className="p-2 bg-red-500 text-white rounded-md hover:bg-red-600"><TrashIcon className="w-5 h-5" /></button>
                                    </div>
                                ))}
                            </div>
                            <div className="flex justify-between mt-6">
                                <button onClick={addNewItem} className="flex items-center text-sky-400 hover:text-sky-300">
                                    <PlusIcon className="w-5 h-5 mr-2" /> Add Menu Item
                                </button>
                                <button onClick={handleSaveMenu} className="bg-sky-500 text-white font-bold py-2 px-6 rounded-lg hover:bg-sky-600">
                                    Save Menu
                                </button>
                            </div>
                        </div>
                    ) : (
                         <div className="bg-slate-800 p-6 rounded-lg border border-slate-700 flex items-center justify-center h-full min-h-[20rem]">
                            <p className="text-gray-400">Select a menu to edit.</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default NavigationManagement;
