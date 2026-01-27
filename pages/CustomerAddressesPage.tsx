import React, { useState } from "react";
import { useCustomerAuth } from "../context/CustomerAuthContext";
import { useToast } from "../hooks/useToast";
import { CustomerAddress } from "../types";
import Pagination from "../components/Pagination";

const CustomerAddressesPage: React.FC = () => {
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
    fullName: "",
    streetAddress: "",
    city: "",
    state: "",
    zipCode: "",
    country: "USA",
    phone: "",
    isDefault: false,
  });

  if (!customer) {
    return (
      <div className="max-w-4xl mx-auto p-6 text-center">
        <p className="text-gray-400">Please log in to manage addresses</p>
      </div>
    );
  }

  const handleAddAddress = async () => {
    if (!formData.fullName || !formData.streetAddress || !formData.city) {
      addToast("Please fill in all required fields", "error");
      return;
    }

    const result = await addAddress(formData);
    if (result.success) {
      addToast("Address added successfully", "success");
      setIsAdding(false);
      setFormData({
        type: "shipping",
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

  const handleUpdateAddress = async (addressId: string) => {
    const result = await updateAddress({ id: addressId, ...formData });
    if (result.success) {
      addToast("Address updated successfully", "success");
      setEditingId(null);
    }
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
        <button
          onClick={() => setIsAdding(!isAdding)}
          className="px-4 py-2 bg-sky-500 hover:bg-sky-600 text-white rounded-md"
        >
          {isAdding ? "Cancel" : "+ Add Address"}
        </button>
      </div>

      {/* Add New Address Form */}
      {isAdding && (
        <div className="bg-slate-800 p-6 rounded-lg border border-slate-700 mb-6">
          <h2 className="text-xl font-bold text-white mb-4">Add New Address</h2>
          {/* Form fields would go here */}
          <div className="space-y-4">
            <input
              type="text"
              placeholder="Full Name"
              value={formData.fullName}
              onChange={(e) =>
                setFormData({ ...formData, fullName: e.target.value })
              }
              className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-md text-white"
            />
            <input
              type="text"
              placeholder="Street Address"
              value={formData.streetAddress}
              onChange={(e) =>
                setFormData({ ...formData, streetAddress: e.target.value })
              }
              className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-md text-white"
            />
            <div className="grid grid-cols-2 gap-4">
              <input
                type="text"
                placeholder="City"
                value={formData.city}
                onChange={(e) =>
                  setFormData({ ...formData, city: e.target.value })
                }
                className="px-3 py-2 bg-slate-700 border border-slate-600 rounded-md text-white"
              />
              <input
                type="text"
                placeholder="State"
                value={formData.state}
                onChange={(e) =>
                  setFormData({ ...formData, state: e.target.value })
                }
                className="px-3 py-2 bg-slate-700 border border-slate-600 rounded-md text-white"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <input
                type="text"
                placeholder="Zip Code"
                value={formData.zipCode}
                onChange={(e) =>
                  setFormData({ ...formData, zipCode: e.target.value })
                }
                className="px-3 py-2 bg-slate-700 border border-slate-600 rounded-md text-white"
              />
              <input
                type="tel"
                placeholder="Phone"
                value={formData.phone}
                onChange={(e) =>
                  setFormData({ ...formData, phone: e.target.value })
                }
                className="px-3 py-2 bg-slate-700 border border-slate-600 rounded-md text-white"
              />
            </div>
            <button
              onClick={handleAddAddress}
              className="w-full px-4 py-2 bg-sky-500 hover:bg-sky-600 text-white rounded-md"
            >
              Save Address
            </button>
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
              const paginatedAddresses = itemsPerPage === -1 
                ? customer.addresses 
                : customer.addresses.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);
              
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
                    {address.type} Address {address.isDefault && "(Default)"}
                  </p>
                </div>
                <div className="space-x-2">
                  <button
                    onClick={() => setEditingId(address.id)}
                    className="px-3 py-1 bg-slate-700 hover:bg-slate-600 text-white rounded text-sm"
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
