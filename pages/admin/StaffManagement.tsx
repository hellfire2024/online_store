import React, { useState, useEffect } from "react";
import { useStaff } from "../../context/StaffContext";
import { PlusIcon, EditIcon, TrashIcon } from "../../components/Icons";
import { useToast } from "../../hooks/useToast";
import Spinner from "../../components/Spinner";
import Pagination from "../../components/Pagination";
import { StaffMember } from "../../types";
import { useUnsavedChanges } from "../../context/UnsavedChangesContext";
import ImageUploadInput from "../../components/admin/ImageUploadInput";
import {
  loadStaffRoles,
  saveStaffRoles,
  StaffRole,
} from "../../services/staffRolesConfig";

const StaffManagement: React.FC = () => {
  const { staff, isLoading, addStaff, updateStaff, deleteStaff } = useStaff();
  const [roleOptions, setRoleOptions] = useState<StaffRole[]>(loadStaffRoles());
  const [showNewRoleInput, setShowNewRoleInput] = useState(false);
  const [newRoleName, setNewRoleName] = useState("");
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

  const handleRoleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const { value } = e.target;
    if (newStaffMember) {
      setNewStaffMember((prev) => ({ ...prev!, role: value }));
    } else if (editingStaff) {
      setEditingStaff((prev) => ({ ...prev!, role: value }));
    }
  };

  const handleSave = async () => {
    if (!currentStaff?.name || !currentStaff?.role) {
      addToast("Please fill in all required fields", "error");
      return;
    }

    let finalImageUrl = currentStaff?.imageUrl || "";

    if (selectedImageFile) {
      try {
        // Upload image to server
        const formData = new FormData();
        formData.append("image", selectedImageFile);

        const response = await fetch("http://localhost:3001/api/upload/image", {
          method: "POST",
          body: formData,
        });

        if (!response.ok) {
          addToast("Image upload failed", "error");
          return;
        }

        const result = await response.json();
        finalImageUrl = result.imageUrl;
        addToast("Image uploaded successfully!", "success");
      } catch (error) {
        addToast("Image upload failed!", "error");
        console.error("Image upload error:", error);
        return;
      }
    }

    const staffToSave = {
      id: editingStaff?.id || `staff_${Date.now()}`,
      name: currentStaff.name,
      role: currentStaff.role,
      imageUrl: finalImageUrl,
    };

    try {
      if (newStaffMember) {
        await addStaff(staffToSave as Omit<StaffMember, "id">);
        addToast("Staff member added successfully!", "success");
      } else if (editingStaff) {
        await updateStaff(staffToSave as StaffMember);
        addToast("Staff member updated successfully!", "success");
      }
      setNewStaffMember(null);
      setEditingStaff(null);
      setSelectedImageFile(null);
    } catch (error) {
      addToast("Failed to save staff member", "error");
      console.error("Save error:", error);
    }
  };

  // Pagination logic
  const paginatedStaff =
    itemsPerPage === -1
      ? staff
      : staff.slice(
          (currentPage - 1) * itemsPerPage,
          currentPage * itemsPerPage,
        );

  if (isLoading) {
    return <Spinner />;
  }

  return (
    <div>
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
                  if (
                    window.confirm(
                      `Are you sure you want to delete "${staffMember.name}"? This action cannot be undone.`,
                    )
                  ) {
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
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Full Name
                </label>
                <input
                  type="text"
                  name="name"
                  placeholder="Enter full name"
                  value={currentStaff.name}
                  onChange={handleChange}
                  className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-md text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-sky-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Role
                </label>
                <div className="flex gap-2">
                  <select
                    name="role"
                    value={currentStaff.role}
                    onChange={handleRoleChange}
                    className="flex-1 px-4 py-2 bg-slate-700 border border-slate-600 rounded-md text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-sky-500"
                  >
                    <option value="">Select a role...</option>
                    {roleOptions.map((r) => (
                      <option key={r.key} value={r.key}>
                        {r.label}
                      </option>
                    ))}
                  </select>
                  <button
                    onClick={() => setShowNewRoleInput(!showNewRoleInput)}
                    className="px-4 py-2 bg-sky-600 hover:bg-sky-700 text-white rounded-md font-medium transition-colors whitespace-nowrap"
                    title="Add new role"
                  >
                    + Add Role
                  </button>
                </div>
                {showNewRoleInput && (
                  <div className="mt-3 p-4 bg-slate-700/50 rounded-md border border-slate-600">
                    <p className="text-sm text-gray-300 mb-3 font-medium">
                      Create New Role
                    </p>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={newRoleName}
                        onChange={(e) => setNewRoleName(e.target.value)}
                        placeholder="Role name (e.g., Videographer)"
                        className="flex-1 px-4 py-2 bg-slate-700 border border-slate-600 rounded-md text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-sky-500"
                      />
                      <button
                        onClick={() => {
                          if (newRoleName.trim()) {
                            const newRole: StaffRole = {
                              key: newRoleName
                                .toLowerCase()
                                .replace(/\s+/g, "_"),
                              label: newRoleName,
                            };
                            const updatedRoles = [...roleOptions, newRole];
                            setRoleOptions(updatedRoles);
                            saveStaffRoles(updatedRoles);
                            if (newStaffMember) {
                              setNewStaffMember({
                                ...newStaffMember,
                                role: newRole.key,
                              });
                            } else if (editingStaff) {
                              setEditingStaff({
                                ...editingStaff,
                                role: newRole.key,
                              });
                            }
                            setNewRoleName("");
                            setShowNewRoleInput(false);
                            addToast(
                              `Role "${newRoleName}" created successfully`,
                              "success",
                            );
                          }
                        }}
                        className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-md font-medium transition-colors whitespace-nowrap"
                      >
                        Create
                      </button>
                      <button
                        onClick={() => {
                          setShowNewRoleInput(false);
                          setNewRoleName("");
                        }}
                        className="px-4 py-2 bg-slate-600 hover:bg-slate-500 text-white rounded-md font-medium transition-colors whitespace-nowrap"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                )}
              </div>
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
