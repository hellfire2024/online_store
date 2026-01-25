
import React from 'react';
import { useAdmin } from '../../context/AdminContext';
import { useNavigate } from 'react-router-dom';
import { EditIcon, TrashIcon, PlusIcon } from '../../components/Icons';

const PagesManagement: React.FC = () => {
    const { pages, deletePage } = useAdmin();
    const navigate = useNavigate();

    return (
        <div>
            <div className="flex justify-between items-center mb-8">
                <h1 className="text-3xl font-bold text-white">Pages Management</h1>
                <button onClick={() => navigate('/admin/pages/new')} className="bg-sky-500 text-white font-bold py-2 px-4 rounded-lg flex items-center hover:bg-sky-600">
                    <PlusIcon className="w-5 h-5 mr-2" />
                    Create New Page
                </button>
            </div>

            <div className="bg-slate-800 rounded-lg border border-slate-700 overflow-hidden">
                <table className="w-full text-left">
                    <thead className="bg-slate-900">
                        <tr>
                            <th className="p-4">Title</th>
                            <th className="p-4">Path</th>
                            <th className="p-4">Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {pages.map(page => (
                            <tr key={page.id} className="border-t border-slate-700">
                                <td className="p-4">{page.title}</td>
                                <td className="p-4 text-gray-400">{page.path}</td>
                                <td className="p-4">
                                    <button onClick={() => navigate(`/admin/pages/edit/${page.id}`)} className="text-gray-400 hover:text-sky-400 mr-4"><EditIcon className="w-5 h-5" /></button>
                                    <button onClick={() => deletePage(page.id)} className="text-gray-400 hover:text-red-500"><TrashIcon className="w-5 h-5" /></button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default PagesManagement;
