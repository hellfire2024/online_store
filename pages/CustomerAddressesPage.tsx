import React, { useState } from "react";
import { useCustomerAuth } from "../context/CustomerAuthContext";
import { useToast } from "../hooks/useToast";
import { useNavigate } from "react-router-dom";
import { CustomerAddress } from "../types";
import Pagination from "../components/Pagination";

const CustomerAddressesPage: React.FC = () => {
  const navigate = useNavigate();
  const {
    customer,
    addAddress,
    updateAddress,
    deleteAddress,
    setDefaultAddress,
  } = useCustomerAuth();
  const { addToast } = useToast();
  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [formData, setFormData] = useState<Omit<CustomerAddress, "id">>({
    type: "shipping",
    firstName: "",
    lastName: "",
    fullName: "",
    streetAddress: "",
    city: "",
    state: "",
    zipCode: "",
    country: "USA",
    phone: "",
    isDefault: false,
  });
  const [saveAddress, setSaveAddress] = useState(true);

  if (!customer) {
    return (
      <div className="max-w-4xl mx-auto p-6 text-center">
        <p className="text-gray-400">Please log in to manage addresses</p>
      </div>
    );
  }

  const handleAddAddress = async () => {
    if (
      !formData.firstName ||
      !formData.lastName ||
      !formData.streetAddress ||
      !formData.city
    ) {
      addToast("Please fill in all required fields", "error");
      return;
    }

    if (saveAddress) {
      const result = await addAddress({
        ...formData,
        fullName: `${formData.firstName} ${formData.lastName}`,
      });
      if (result.success) {
        addToast("Address added successfully", "success");
        setIsAdding(false);
        setFormData({
          type: "shipping",
          firstName: "",
          lastName: "",
          fullName: "",
          streetAddress: "",
          city: "",
          state: "",
          zipCode: "",
          country: "USA",
          phone: "",
          isDefault: false,
        });
        setSaveAddress(true);
      }
    } else {
      addToast("One-time address entered (not saved)", "info");
      setIsAdding(false);
      setFormData({
        type: "shipping",
        firstName: "",
        lastName: "",
        fullName: "",
        streetAddress: "",
        city: "",
        state: "",
        zipCode: "",
        country: "USA",
        phone: "",
        isDefault: false,
      });
      setSaveAddress(true);
    }
  };

  const handleEditAddress = (address: CustomerAddress) => {
    const nameParts = address.fullName.split(" ");
    const firstName = nameParts[0] || "";
    const lastName = nameParts.slice(1).join(" ") || "";

    setEditingId(address.id);
    setFormData({
      type: address.type,
      firstName,
      lastName,
      fullName: address.fullName,
      streetAddress: address.streetAddress,
      city: address.city,
      state: address.state,
      zipCode: address.zipCode,
      country: address.country,
      phone: address.phone,
      isDefault: address.isDefault,
    });
  };

  const handleUpdateAddress = async () => {
    if (
      !formData.firstName ||
      !formData.lastName ||
      !formData.streetAddress ||
      !formData.city
    ) {
      addToast("Please fill in all required fields", "error");
      return;
    }

    if (!editingId) return;

    const result = await updateAddress({
      id: editingId,
      ...formData,
      fullName: `${formData.firstName} ${formData.lastName}`,
    });
    if (result.success) {
      addToast("Address updated successfully", "success");
      setEditingId(null);
      setFormData({
        type: "shipping",
        firstName: "",
        lastName: "",
        fullName: "",
        streetAddress: "",
        city: "",
        state: "",
        zipCode: "",
        country: "USA",
        phone: "",
        isDefault: false,
      });
    }
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setIsAdding(false);
    setFormData({
      type: "shipping",
      firstName: "",
      lastName: "",
      fullName: "",
      streetAddress: "",
      city: "",
      state: "",
      zipCode: "",
      country: "USA",
      phone: "",
      isDefault: false,
    });
    setSaveAddress(true);
  };

  const handleDeleteAddress = async (addressId: string) => {
    const result = await deleteAddress(addressId);
    if (result.success) {
      addToast("Address deleted successfully", "success");
    }
  };

  const handleSetDefault = async (
    addressId: string,
    type: "shipping" | "billing",
  ) => {
    const result = await setDefaultAddress(addressId, type);
    if (result.success) {
      addToast("Default address updated", "success");
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold text-white">Addresses</h1>
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate("/account")}
            className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-md transition-colors flex items-center gap-2"
          >
            <svg
              className="w-4 h-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15 19l-7-7 7-7"
              />
            </svg>
            Back to Account
          </button>
          <button
            onClick={() => {
              setIsAdding(!isAdding);
              setEditingId(null);
            }}
            disabled={editingId !== null}
            className={`px-4 py-2 text-white rounded-md font-medium ${
              editingId
                ? "bg-gray-600 cursor-not-allowed"
                : "bg-sky-500 hover:bg-sky-600"
            }`}
          >
            {editingId ? "Finish Editing" : "+ Add Address"}
          </button>
        </div>
      </div>

      {/* Add/Edit Address Form */}
      {(isAdding || editingId) && (
        <div className="bg-slate-800 p-6 rounded-lg border border-slate-700 mb-6">
          <h2 className="text-xl font-bold text-white mb-4">
            {editingId ? "Edit Address" : "Add New Address"}
          </h2>
          <div className="space-y-4">
            <div>
              <label className="block text-gray-300 text-sm font-medium mb-1">
                Address Type
              </label>
              <select
                value={formData.type}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    type: e.target.value as "shipping" | "billing",
                  })
                }
                className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-md text-white"
              >
                <option value="shipping">Shipping</option>
                <option value="billing">Billing</option>
              </select>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-gray-300 text-sm font-medium mb-1">
                  First Name *
                </label>
                <input
                  type="text"
                  placeholder="First Name"
                  value={formData.firstName}
                  onChange={(e) =>
                    setFormData({ ...formData, firstName: e.target.value })
                  }
                  className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-md text-white placeholder-gray-400"
                />
              </div>
              <div>
                <label className="block text-gray-300 text-sm font-medium mb-1">
                  Last Name *
                </label>
                <input
                  type="text"
                  placeholder="Last Name"
                  value={formData.lastName}
                  onChange={(e) =>
                    setFormData({ ...formData, lastName: e.target.value })
                  }
                  className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-md text-white placeholder-gray-400"
                />
              </div>
            </div>

            <div>
              <label className="block text-gray-300 text-sm font-medium mb-1">
                Phone
              </label>
              <input
                type="tel"
                placeholder="Phone"
                value={formData.phone}
                onChange={(e) =>
                  setFormData({ ...formData, phone: e.target.value })
                }
                className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-md text-white placeholder-gray-400"
              />
            </div>

            <div>
              <label className="block text-gray-300 text-sm font-medium mb-1">
                Street Address *
              </label>
              <input
                type="text"
                placeholder="Street Address"
                value={formData.streetAddress}
                onChange={(e) =>
                  setFormData({ ...formData, streetAddress: e.target.value })
                }
                className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-md text-white placeholder-gray-400"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-gray-300 text-sm font-medium mb-1">
                  City *
                </label>
                <input
                  type="text"
                  placeholder="City"
                  value={formData.city}
                  onChange={(e) =>
                    setFormData({ ...formData, city: e.target.value })
                  }
                  className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-md text-white placeholder-gray-400"
                />
              </div>
              <div>
                <label className="block text-gray-300 text-sm font-medium mb-1">
                  State
                </label>
                <input
                  type="text"
                  placeholder="State"
                  value={formData.state}
                  onChange={(e) =>
                    setFormData({ ...formData, state: e.target.value })
                  }
                  className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-md text-white placeholder-gray-400"
                />
              </div>
              <div>
                <label className="block text-gray-300 text-sm font-medium mb-1">
                  Zip Code
                </label>
                <input
                  type="text"
                  placeholder="Zip Code"
                  value={formData.zipCode}
                  onChange={(e) =>
                    setFormData({ ...formData, zipCode: e.target.value })
                  }
                  className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-md text-white placeholder-gray-400"
                />
              </div>
            </div>

            <div>
              <label className="block text-gray-300 text-sm font-medium mb-1">
                Country
              </label>
              <input
                type="text"
                placeholder="Country"
                value={formData.country}
                onChange={(e) =>
                  setFormData({ ...formData, country: e.target.value })
                }
                className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-md text-white placeholder-gray-400"
              />
            </div>

            <div className="flex items-center">
              <input
                type="checkbox"
                id="saveAddress"
                checked={saveAddress}
                onChange={(e) => setSaveAddress(e.target.checked)}
                className="w-4 h-4 text-sky-500 bg-slate-700 border-slate-600 rounded focus:ring-sky-500 focus:ring-2"
                disabled={!!editingId}
              />
              <label
                htmlFor="saveAddress"
                className="ml-2 text-sm text-gray-300"
              >
                Save this address for future use
              </label>
            </div>

            <div className="flex gap-3">
              <button
                onClick={editingId ? handleUpdateAddress : handleAddAddress}
                className="flex-1 px-4 py-2 bg-sky-500 hover:bg-sky-600 text-white rounded-md font-medium"
              >
                {editingId ? "Update Address" : "Save Address"}
              </button>
              <button
                onClick={handleCancelEdit}
                className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-md font-medium"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Address List */}
      <div className="space-y-4">
        {customer.addresses.length === 0 ? (
          <div className="bg-slate-800 p-6 rounded-lg border border-slate-700 text-center">
            <p className="text-gray-400">
              No addresses saved yet. Add one to get started!
            </p>
          </div>
        ) : (
          <>
            {(() => {
              const paginatedAddresses =
                itemsPerPage === -1
                  ? customer.addresses
                  : customer.addresses.slice(
                      (currentPage - 1) * itemsPerPage,
                      currentPage * itemsPerPage,
                    );

              return paginatedAddresses.map((address) => (
                <div
                  key={address.id}
                  className="bg-slate-800 p-6 rounded-lg border border-slate-700"
                >
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <h3 className="text-lg font-bold text-white">
                        {address.fullName}
                      </h3>
                      <p className="text-gray-400 text-sm capitalize">
                        {address.type} Address{" "}
                        {address.isDefault && "(Default)"}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleEditAddress(address)}
                        className="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded text-sm"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleDeleteAddress(address.id)}
                        className="px-3 py-1 bg-red-600 hover:bg-red-700 text-white rounded text-sm"
                      >
                        Delete
                      </button>
                    </div>
                  </div>

                  <div className="text-gray-300">
                    <p>{address.streetAddress}</p>
                    <p>
                      {address.city}, {address.state} {address.zipCode}
                    </p>
                    <p>{address.country}</p>
                    <p className="text-sm mt-2">{address.phone}</p>
                  </div>

                  {!address.isDefault && (
                    <button
                      onClick={() => handleSetDefault(address.id, address.type)}
                      className="mt-4 px-3 py-1 bg-sky-500 hover:bg-sky-600 text-white rounded text-sm"
                    >
                      Set as Default
                    </button>
                  )}
                </div>
              ));
            })()}
            <Pagination
              currentPage={currentPage}
              totalItems={customer.addresses.length}
              itemsPerPage={itemsPerPage}
              onPageChange={setCurrentPage}
              onItemsPerPageChange={(value) => {
                setItemsPerPage(value);
                setCurrentPage(1);
              }}
            />
          </>
        )}
      </div>
    </div>
  );
};

export default CustomerAddressesPage;
