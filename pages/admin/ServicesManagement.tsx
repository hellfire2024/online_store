import React, { useState, useEffect } from "react";
import { useServices } from "../../context/ServicesContext";
import { PlusIcon, EditIcon, TrashIcon, DashboardIcon, ProductIcon, GalleryIcon, ContentIcon, StarIcon, UsersIcon, MessageSquareIcon, SettingsIcon, LayersIcon, CoffeeIcon, AwardIcon, FileTextIcon, UploadIcon } from "../../components/Icons";
import Spinner from "../../components/Spinner";
import Pagination from "../../components/Pagination";
import { Service } from "../../types";
import { useUnsavedChanges } from "../../context/UnsavedChangesContext";

const ServicesManagement: React.FC = () => {
  const { services, isLoading, addService, updateService, deleteService } =
    useServices();
  const [newService, setNewService] = useState<Omit<Service, "id"> | null>(
    null,
  );
  const [editingService, setEditingService] = useState<Service | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  const openModal = (service?: Service) => {
    setEditingService(service || { title: "", description: "", icon: "shirt" });
  };

  const closeModal = () => {
    setEditingService(null);
  };

  const handleSave = async () => {
    if (!editingService) return;

    if (editingService.id) {
      await updateService(editingService);
    } else {
      await addService(editingService);
    }
    closeModal();
  };

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
  ) => {
    const { name, value } = e.target;
    setEditingService((prev) => (prev ? { ...prev, [name]: value } : null));
  };

  const inputClasses =
    "w-full p-2 bg-slate-700 border border-slate-600 rounded-md text-white";

  // Pagination logic
  const paginatedServices = itemsPerPage === -1 
    ? services 
    : services.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  if (isLoading) {
    return <Spinner />;
  }

  return (
    <div className="max-w-4xl mx-auto">
      <h1 className="text-3xl font-bold text-white mb-8">
        Services Management
      </h1>

      <div className="bg-slate-800 p-6 rounded-lg border border-slate-700 mb-8">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-2xl font-bold text-white">All Services</h2>
          <button
            onClick={() => openModal()}
            className="bg-sky-500 text-white font-bold py-2 px-4 rounded-lg flex items-center hover:bg-sky-600"
          >
            <PlusIcon className="w-5 h-5 mr-2" />
            Add Service
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-slate-900">
              <tr>
                <th className="p-4">Title</th>
                <th className="p-4">Description</th>
                <th className="p-4">Icon</th>
                <th className="p-4">Actions</th>
              </tr>
            </thead>
            <tbody>
              {paginatedServices.map((service) => {
                const iconMap: Record<string, React.FC<{ className?: string }>> = {
                  DashboardIcon, ProductIcon, GalleryIcon, ContentIcon, StarIcon,
                  UsersIcon, MessageSquareIcon, SettingsIcon, LayersIcon,
                  CoffeeIcon, AwardIcon, FileTextIcon, EditIcon, UploadIcon
                };
                const ServiceIcon = iconMap[service.icon] || LayersIcon;
                
                return (
                  <tr key={service.id} className="border-t border-slate-700">
                    <td className="p-4">{service.title}</td>
                    <td className="p-4 max-w-md truncate">
                      {service.description}
                    </td>
                    <td className="p-4">
                      <ServiceIcon className="w-6 h-6 text-sky-400" />
                    </td>
                    <td className="p-4">
                      <button
                        onClick={() => openModal(service)}
                        className="text-gray-400 hover:text-sky-400 mr-4"
                      >
                        <EditIcon className="w-5 h-5" />
                      </button>
                      <button
                        onClick={() => {
                          if (window.confirm(`Are you sure you want to delete "${service.title}"? This action cannot be undone.`)) {
                            deleteService(service.id);
                          }
                        }}
                        className="text-gray-400 hover:text-red-500"
                      >
                        <TrashIcon className="w-5 h-5" />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      <Pagination
        currentPage={currentPage}
        totalItems={services.length}
        itemsPerPage={itemsPerPage}
        onPageChange={setCurrentPage}
        onItemsPerPageChange={(value) => {
          setItemsPerPage(value);
          setCurrentPage(1);
        }}
      />

      {editingService && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center">
          <div className="bg-slate-800 rounded-lg shadow-2xl p-8 w-full max-w-lg border border-slate-700">
            <h2 className="text-2xl font-bold text-white mb-6">
              {editingService.id ? "Edit" : "Add"} Service
            </h2>
            <div className="space-y-4">
              <input
                type="text"
                name="title"
                value={editingService.title}
                onChange={handleChange}
                placeholder="Service Title"
                className={inputClasses}
              />
              <textarea
                name="description"
                value={editingService.description}
                onChange={handleChange}
                placeholder="Description"
                className={inputClasses}
                rows={3}
              ></textarea>
              <div>
                <label className="block text-gray-300 text-sm font-bold mb-2">Icon</label>
                <div className="grid grid-cols-2 gap-2 max-h-64 overflow-y-auto p-2 bg-slate-900 rounded-lg">
                  {[
                    { name: "DashboardIcon", Icon: DashboardIcon, label: "Dashboard" },
                    { name: "ProductIcon", Icon: ProductIcon, label: "Product" },
                    { name: "GalleryIcon", Icon: GalleryIcon, label: "Gallery" },
                    { name: "ContentIcon", Icon: ContentIcon, label: "Document" },
                    { name: "StarIcon", Icon: StarIcon, label: "Star" },
                    { name: "UsersIcon", Icon: UsersIcon, label: "Users" },
                    { name: "MessageSquareIcon", Icon: MessageSquareIcon, label: "Message" },
                    { name: "SettingsIcon", Icon: SettingsIcon, label: "Settings" },
                    { name: "LayersIcon", Icon: LayersIcon, label: "Layers" },
                    { name: "CoffeeIcon", Icon: CoffeeIcon, label: "Coffee" },
                    { name: "AwardIcon", Icon: AwardIcon, label: "Award" },
                    { name: "FileTextIcon", Icon: FileTextIcon, label: "File" },
                    { name: "EditIcon", Icon: EditIcon, label: "Edit" },
                    { name: "UploadIcon", Icon: UploadIcon, label: "Upload" },
                  ].map((iconData) => (
                    <button
                      key={iconData.name}
                      type="button"
                      onClick={() => setEditingService(prev => prev ? { ...prev, icon: iconData.name } : null)}
                      className={`flex items-center gap-2 p-3 rounded-lg border-2 transition-all ${
                        editingService.icon === iconData.name
                          ? 'border-sky-500 bg-sky-500/20'
                          : 'border-slate-600 bg-slate-700 hover:border-slate-500'
                      }`}
                    >
                      <iconData.Icon className="w-5 h-5 text-white" />
                      <span className="text-sm text-white">{iconData.label}</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
            <div className="mt-8 flex justify-end space-x-4">
              <button
                onClick={closeModal}
                className="bg-slate-600 text-white font-bold py-2 px-4 rounded-lg hover:bg-slate-700"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                className="bg-sky-500 text-white font-bold py-2 px-4 rounded-lg hover:bg-sky-600"
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ServicesManagement;
