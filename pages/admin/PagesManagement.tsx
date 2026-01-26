import React from "react";
import { Link, useNavigate } from "react-router-dom";
import { usePages } from "../../context/PagesContext";
import { PlusIcon, EditIcon, TrashIcon } from "../../components/Icons";
import Spinner from "../../components/Spinner";

const PagesManagement: React.FC = () => {
  const { pages, isLoading, deletePage } = usePages();
  const navigate = useNavigate();

  if (isLoading) {
    return <Spinner />;
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold text-white">Pages Management</h1>
        <Link
          to="/admin/pages/new"
          className="bg-sky-500 text-white font-bold py-2 px-4 rounded-lg flex items-center hover:bg-sky-600"
        >
          <PlusIcon className="w-5 h-5 mr-2" />
          Create New Page
        </Link>
      </div>

      <div className="bg-slate-800 rounded-lg border border-slate-700 overflow-hidden">
        <table className="w-full text-left">
          <thead className="bg-slate-900">
            <tr>
              <th className="p-4">Title</th>
              <th className="p-4">Type</th>
              <th className="p-4">Path</th>
              <th className="p-4">Actions</th>
            </tr>
          </thead>
          <tbody>
            {pages.map((page) => (
              <tr key={page.id} className="border-t border-slate-700">
                <td className="p-4 text-white">{page.title}</td>
                <td className="p-4">
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                    page.pageType === 'home' ? 'bg-sky-900 text-sky-300' :
                    page.pageType === 'about' ? 'bg-purple-900 text-purple-300' :
                    page.pageType === 'contact' ? 'bg-green-900 text-green-300' :
                    'bg-slate-700 text-gray-300'
                  }`}>
                    {page.pageType || 'custom'}
                  </span>
                </td>
                <td className="p-4 text-gray-400">{page.path}</td>
                <td className="p-4">
                  <div className="flex items-center gap-2">
                    <Link
                      to={`/admin/pages/edit/${page.id}`}
                      className="text-gray-400 hover:text-sky-400 p-2"
                      title="Edit page"
                    >
                      <EditIcon className="w-5 h-5" />
                    </Link>
                    <button
                      onClick={() => {
                        if (confirm(`Delete "${page.title}"? You can recreate it later if needed.`)) {
                          deletePage(page.id);
                        }
                      }}
                      className="text-gray-400 hover:text-red-500 p-2"
                      title="Delete page"
                    >
                      <TrashIcon className="w-5 h-5" />
                    </button>
                  </div>
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
