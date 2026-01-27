import React, { useState, useEffect } from "react";
import { useStaff } from "../../context/StaffContext";
import { PlusIcon, EditIcon, TrashIcon } from "../../components/Icons";
import { useToast } from "../../hooks/useToast";
import Spinner from "../../components/Spinner";
import Pagination from "../../components/Pagination";
import { StaffMember } from "../../types";
import { useUnsavedChanges } from "../../context/UnsavedChangesContext";
import ImageUploadInput from "../../components/admin/ImageUploadInput";

const StaffManagement: React.FC = () => {
  const { staff, isLoading, addStaff, updateStaff, deleteStaff } = useStaff();
  const [newStaffMember, setNewStaffMember] = useState<Omit<
    StaffMember,
    "id"
  > | null>(null);
  const [editingStaff, setEditingStaff] = useState<StaffMember | null>(null);
  const [originalStaff, setOriginalStaff] = useState<
    StaffMember | Omit<StaffMember, "id"> | null
  >(null);
  const [selectedImageFile, setSelectedImageFile] = useState<File | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const { addToast } = useToast();
  const { setHasUnsavedChanges } = useUnsavedChanges();

  const isModalOpen = !!newStaffMember || !!editingStaff;
  const currentStaff = newStaffMember || editingStaff;
  const hasUnsavedChanges =
    isModalOpen &&
    JSON.stringify(currentStaff) !== JSON.stringify(originalStaff);

  useEffect(() => {
    setHasUnsavedChanges(hasUnsavedChanges);
    return () => {
      setHasUnsavedChanges(false);
    };
  }, [hasUnsavedChanges, setHasUnsavedChanges]);

  const handleAddNew = () => {
    const newStaff = { name: "", role: "", imageUrl: "" };
    setNewStaffMember(newStaff);
    setOriginalStaff(newStaff);
  };

  const handleEdit = (staffMember: StaffMember) => {
    setEditingStaff({ ...staffMember });
    setOriginalStaff({ ...staffMember });
  };

  const handleCloseModal = () => {
    if (hasUnsavedChanges) {
      if (
        window.confirm(
          "You have unsaved changes. Are you sure you want to discard them?",
        )
      ) {
        setNewStaffMember(null);
        setEditingStaff(null);
      }
    } else {
      setNewStaffMember(null);
      setEditingStaff(null);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    if (newStaffMember) {
      setNewStaffMember((prev) => ({ ...prev!, [name]: value }));
    } else if (editingStaff) {
      setEditingStaff((prev) => ({ ...prev!, [name]: value }));
    }
  };

  const handleSave = async () => {
    let finalImageUrl = currentStaff?.imageUrl || "";

    if (selectedImageFile) {
      // Simulate image upload - in a real app, this would be an API call
      try {
        // Replace with actual image upload service call
        finalImageUrl = await new Promise((resolve) => {
          const reader = new FileReader();
          reader.onloadend = () => resolve(reader.result as string);
          reader.readAsDataURL(selectedImageFile);
        });
        addToast("Image uploaded successfully!", "success");
      } catch (error) {
        addToast("Image upload failed!", "error");
        console.error("Image upload error:", error);
        return; // Stop save if upload fails
      }
    }

    const staffToSave = {
      ...((newStaffMember || editingStaff) as Omit<StaffMember, "id">),
      imageUrl: finalImageUrl,
    };

    if (newStaffMember) {
      addStaff(staffToSave as Omit<StaffMember, "id">);
      addToast("Staff member added!", "success");
    } else if (editingStaff) {
      updateStaff(staffToSave as StaffMember);
      addToast("Staff member updated!", "success");
    }
    setNewStaffMember(null);
    setEditingStaff(null);
    setSelectedImageFile(null);
  };

  // Pagination logic
  const paginatedStaff = itemsPerPage === -1 
    ? staff 
    : staff.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  if (isLoading) {
    return <Spinner />;
  }

  return (
    <div className="max-w-4xl mx-auto">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold text-white">Staff Management</h1>
        <button
          onClick={handleAddNew}
          className="flex items-center gap-2 bg-sky-500 text-white font-bold py-2 px-4 rounded-lg hover:bg-sky-600"
        >
          <PlusIcon /> Add New Staff
        </button>
      </div>

      <div className="bg-slate-800 rounded-lg border border-slate-700">
        {paginatedStaff.map((staffMember, index) => (
          <div
            key={staffMember.id}
            className={`flex items-center justify-between p-4 ${index > 0 ? "border-t border-slate-700" : ""}`}
          >
            <div className="flex items-center gap-4">
              <img
                src={staffMember.imageUrl}
                alt={staffMember.name}
                className="w-16 h-16 object-cover rounded-full bg-slate-700"
              />
              <div>
                <p className="font-semibold text-white">{staffMember.name}</p>
                <p className="text-sm text-gray-400">{staffMember.role}</p>
              </div>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => handleEdit(staffMember)}
                className="text-sky-400 hover:text-sky-300 p-2"
              >
                <EditIcon />
              </button>
              <button
                onClick={() => {
                  if (window.confirm(`Are you sure you want to delete "${staffMember.name}"? This action cannot be undone.`)) {
                    deleteStaff(staffMember.id);
                  }
                }}
                className="text-red-400 hover:text-red-300 p-2"
              >
                <TrashIcon />
              </button>
            </div>
          </div>
        ))}
      </div>

      <Pagination
        currentPage={currentPage}
        totalItems={staff.length}
        itemsPerPage={itemsPerPage}
        onPageChange={setCurrentPage}
        onItemsPerPageChange={(value) => {
          setItemsPerPage(value);
          setCurrentPage(1);
        }}
      />

      {isModalOpen && currentStaff && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center">
          <div className="bg-slate-800 rounded-lg shadow-2xl p-8 w-full max-w-lg border border-slate-700">
            <h2 className="text-2xl font-bold text-white mb-6">
              {editingStaff ? "Edit Staff Member" : "Add New Staff Member"}
            </h2>
            <div className="space-y-4">
              <input
                type="text"
                name="name"
                placeholder="Full Name"
                value={currentStaff.name}
                onChange={handleChange}
                className="w-full p-2 bg-slate-700 border border-slate-600 rounded-md text-white"
              />
              <input
                type="text"
                name="role"
                placeholder="Role"
                value={currentStaff.role}
                onChange={handleChange}
                className="w-full p-2 bg-slate-700 border border-slate-600 rounded-md text-white"
              />
              <ImageUploadInput
                label="Image"
                imageUrl={currentStaff.imageUrl}
                onImageUrlChange={() => {}} // No longer directly setting URL
                onFileSelect={(file) => {
                  setSelectedImageFile(file);
                  if (newStaffMember) {
                    setNewStaffMember((prev) => ({
                      ...prev!,
                      imageUrl: URL.createObjectURL(file),
                    }));
                  } else if (editingStaff) {
                    setEditingStaff((prev) => ({
                      ...prev!,
                      imageUrl: URL.createObjectURL(file),
                    }));
                  }
                }}
              />
            </div>
            <div className="flex justify-end gap-4 mt-8">
              <button
                onClick={handleCloseModal}
                className="text-gray-400 hover:text-white px-4 py-2"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                className="bg-sky-500 text-white font-bold py-2 px-6 rounded-lg hover:bg-sky-600 disabled:opacity-50"
                disabled={!hasUnsavedChanges}
              >
                Save Staff Member
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default StaffManagement;
