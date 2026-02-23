import React, { useState, useEffect } from "react";
import { useStaff } from "../../context/StaffContext";
import { PlusIcon, EditIcon, TrashIcon } from "../../../components/Icons";
import { useToast } from "../../hooks/useToast";
import Spinner from "../../components/Spinner";
import Pagination from "../../components/Pagination";
import { StaffMember } from "../../../types";
import { useUnsavedChanges } from "../../context/UnsavedChangesContext";
import ImageUploadInput from "../../../components/admin/ImageUploadInput";


const StaffManagement: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [showAddForm, setShowAddForm] = useState(false);
  const [showEditForm, setShowEditForm] = useState(false);
  const [editingStaff, setEditingStaff] = useState<StaffMember | null>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [showImageUpload, setShowImageUpload] = useState(false);

  const { addToast } = useToast();
  const { staff, isLoading, addStaff, updateStaff, deleteStaff } = useStaff();
  const { setHasUnsavedChanges } = useUnsavedChanges();

  useEffect(() => {
    setHasUnsavedChanges(false);
  }, [setHasUnsavedChanges]);

  const handleAddStaff = async (staffData: StaffMember) => {
    await addStaff({ ...staffData, id: Date.now().toString() });
    setShowAddForm(false);
    addToast("Staff added successfully", "success");
  };

  const handleEditStaff = async (staffData: StaffMember) => {
    setEditingStaff(staffData);
    setShowEditForm(true);
  };

  const handleDeleteStaff = async (id: string) => {
    await deleteStaff(id);
    addToast("Staff deleted successfully", "success");
  };

  const handleImageUpload = (file: File) => {
    setImageFile(file);
    setShowImageUpload(true);
  };

  const handleAddFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    // ...existing code for adding staff...
    setShowAddForm(false);
    addToast("Staff added successfully", "success");
    setHasUnsavedChanges(true);
  };

  const handleEditFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    // ...existing code for editing staff...
    setShowEditForm(false);
    addToast("Staff updated successfully", "success");
    setHasUnsavedChanges(true);
  };

  const handleCancelEdit = () => {
    setShowEditForm(false);
    setEditingStaff(null);
  };

  const handleSearch = (e: React.FormEvent) => {
    setSearchTerm((e.target as HTMLInputElement).value);
  };

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  return (
    <div>
      <h2>Staff Management</h2>
      <button onClick={() => setShowAddForm(true)}>
        Add Staff
      </button>
      <button onClick={() => setShowEditForm(true)}>
        Edit Staff
      </button>
      <button onClick={() => setShowImageUpload(true)}>
        Upload Image
      </button>
      <input
        type="text"
        placeholder="Search"
        value={searchTerm}
        onChange={handleSearch}
      />
      <div>
        {staff.map((staffMember) => (
          <div key={staffMember.id}>
            <h3>{staffMember.name}</h3>
            <p>{staffMember.email}</p>
            <p>{staffMember.phone}</p>
            <button onClick={() => handleEditStaff(staffMember)}>
              Edit
            </button>
            <button onClick={() => handleDeleteStaff(staffMember.id)}>
              Delete
            </button>
            <img
              src={staffMember.image}
              alt={staffMember.name}
              style={{
                display: "block",
                width: "100px",
                height: "100px",
                objectFit: "cover",
              }}
            />
          </div>
        ))}
      </div>
      <Pagination
        currentPage={currentPage}
        totalItems={staff.length}
        itemsPerPage={10}
        onPageChange={handlePageChange}
        onItemsPerPageChange={() => {}}
      />
      <form onSubmit={handleAddFormSubmit}>
        <input type="text" placeholder="Name" />
        <input type="email" placeholder="Email" />
        <input type="phone" placeholder="Phone" />
        <button type="submit">Add Staff</button>
      </form>
      <form onSubmit={handleEditFormSubmit}>
        <input type="text" placeholder="Name" />
        <input type="email" placeholder="Email" />
        <input type="phone" placeholder="Phone" />
        <button type="submit">Update Staff</button>
      </form>
      <button onClick={handleCancelEdit}>Cancel</button>
      <div>
        {showImageUpload && (
          <ImageUploadInput
            label="Upload Image"
            imageUrl={editingStaff?.imageUrl || ""}
            onImageUrlChange={() => {}}
            onFileSelect={handleImageUpload}
          />
        )}
      </div>
    </div>
  );
};

export default StaffManagement;
