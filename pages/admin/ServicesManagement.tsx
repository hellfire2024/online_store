import React, { useState } from "react";
import { useAdmin } from "../../context/AdminContext";
import Spinner from "../../components/Spinner";
import { Service } from "../../types";
import { EditIcon, TrashIcon, PlusIcon } from "../../components/Icons";

const ServicesManagement: React.FC = () => {
  const { services, addService, updateService, deleteService } = useAdmin();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingService, setEditingService] = useState<Partial<Service> | null>(
    null,
  );

  const openModal = (service?: Service) => {
    setEditingService(service || { title: "", description: "", icon: "shirt" });
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingService(null);
  };

  const handleSave = async () => {
    if (!editingService) return;

    if (editingService.id) {
      await updateService(editingService as Service);
    } else {
      await addService(editingService as Omit<Service, "id">);
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
              {services.map((service) => (
                <tr key={service.id} className="border-t border-slate-700">
                  <td className="p-4">{service.title}</td>
                  <td className="p-4 max-w-md truncate">
                    {service.description}
                  </td>
                  <td className="p-4">{service.icon}</td>
                  <td className="p-4">
                    <button
                      onClick={() => openModal(service)}
                      className="text-gray-400 hover:text-sky-400 mr-4"
                    >
                      <EditIcon className="w-5 h-5" />
                    </button>
                    <button
                      onClick={() => deleteService(service.id)}
                      className="text-gray-400 hover:text-red-500"
                    >
                      <TrashIcon className="w-5 h-5" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {isModalOpen && editingService && (
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
              <input
                type="text"
                name="icon"
                value={editingService.icon}
                onChange={handleChange}
                placeholder="Icon Name (e.g., 'shirt')"
                className={inputClasses}
              />
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
