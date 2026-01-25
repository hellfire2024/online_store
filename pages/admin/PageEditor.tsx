
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAdmin } from '../../context/AdminContext';
import { Page } from '../../types';
import { useToast } from '../../hooks/useToast';
import ReactQuill from 'react-quill';

const PageEditor: React.FC = () => {
    const { pageId } = useParams<{ pageId: string }>();
    const navigate = useNavigate();
    const { pages, addPage, updatePage } = useAdmin();
    const { addToast } = useToast();
    
    const [page, setPage] = useState<Partial<Page>>({ title: '', path: '', content: '' });
    const isNewPage = !pageId;

    useEffect(() => {
        if (!isNewPage) {
            const existingPage = pages.find(p => p.id === pageId);
            if (existingPage) {
                setPage(existingPage);
            }
        }
    }, [pageId, pages, isNewPage]);

    const handleSave = async () => {
        if (!page.title || !page.path) {
            addToast('Title and Path are required.', 'error');
            return;
        }

        if (isNewPage) {
            await addPage(page as Omit<Page, 'id'>);
            addToast('Page created successfully!', 'success');
        } else {
            await updatePage(page as Page);
            addToast('Page updated successfully!', 'success');
        }
        navigate('/admin/pages');
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        let processedValue = value;
        if (name === 'path') {
            processedValue = value.startsWith('/') ? value : `/${value}`;
            processedValue = processedValue.toLowerCase().replace(/\s+/g, '-');
        }
        setPage(prev => ({ ...prev, [name]: processedValue }));
    };

    const handleContentChange = (content: string) => {
        setPage(prev => ({ ...prev, content }));
    };

    const inputClasses = "w-full p-2 bg-slate-700 border border-slate-600 rounded-md text-white";

    return (
        <div>
            <div className="flex justify-between items-center mb-8">
                <h1 className="text-3xl font-bold text-white">{isNewPage ? 'Create New Page' : 'Edit Page'}</h1>
                <div>
                    <button onClick={() => navigate('/admin/pages')} className="bg-slate-600 text-white font-bold py-2 px-4 rounded-lg hover:bg-slate-700 mr-4">
                        Back to Pages
                    </button>
                    <button onClick={handleSave} className="bg-sky-500 text-white font-bold py-2 px-4 rounded-lg hover:bg-sky-600">
                        Save Page
                    </button>
                </div>
            </div>

            <div className="bg-slate-800 p-6 rounded-lg border border-slate-700 space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <label htmlFor="title" className="block text-sm font-medium text-gray-300 mb-1">Page Title</label>
                        <input type="text" id="title" name="title" value={page.title} onChange={handleChange} placeholder="e.g., Privacy Policy" className={inputClasses} />
                    </div>
                    <div>
                        <label htmlFor="path" className="block text-sm font-medium text-gray-300 mb-1">URL Path</label>
                        <input type="text" id="path" name="path" value={page.path} onChange={handleChange} placeholder="/privacy-policy" className={inputClasses} />
                    </div>
                </div>
                <div>
                    <label htmlFor="content" className="block text-sm font-medium text-gray-300 mb-1">Page Content</label>
                    <div className="bg-white text-gray-800 rounded-md overflow-hidden">
                         <ReactQuill theme="snow" value={page.content} onChange={handleContentChange} style={{ height: '400px', border: 'none' }} />
                    </div>
                </div>
            </div>
        </div>
    );
};

export default PageEditor;
