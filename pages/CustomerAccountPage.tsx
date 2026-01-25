import React, { useState } from "react";
import { useCustomerAuth } from "../context/CustomerAuthContext";
import { useNavigate } from "react-router-dom";
import { useToast } from "../hooks/useToast";

const CustomerAccountPage: React.FC = () => {
  const { customer, updateProfile, updateEmailPreferences, logout } =
    useCustomerAuth();
  const navigate = useNavigate();
  const { addToast } = useToast();
  const [isEditing, setIsEditing] = useState(false);
  const [name, setName] = useState(customer?.name || "");
  const [phone, setPhone] = useState(customer?.phone || "");
  const [preferences, setPreferences] = useState(
    customer?.emailPreferences || {
      marketing: true,
      orderUpdates: true,
      announcements: true,
    },
  );

  if (!customer) {
    return (
      <div className="max-w-4xl mx-auto p-6 text-center">
        <p className="text-gray-400">Please log in to view your account</p>
      </div>
    );
  }

  const handleProfileUpdate = async () => {
    const result = await updateProfile(name, phone);
    if (result.success) {
      addToast("Profile updated successfully", "success");
      setIsEditing(false);
    } else {
      addToast(result.error || "Failed to update profile", "error");
    }
  };

  const handlePreferencesUpdate = async () => {
    const result = await updateEmailPreferences(preferences);
    if (result.success) {
      addToast("Email preferences updated", "success");
    } else {
      addToast(result.error || "Failed to update preferences", "error");
    }
  };

  const handleLogout = () => {
    logout();
    addToast("Logged out successfully", "success");
    navigate("/");
  };

  return (
    <div className="max-w-4xl mx-auto p-6">
      <h1 className="text-3xl font-bold text-white mb-8">My Account</h1>

      {/* Profile Section */}
      <div className="bg-slate-800 p-6 rounded-lg border border-slate-700 mb-6">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-white">Profile Information</h2>
          <button
            onClick={() => setIsEditing(!isEditing)}
            className="px-4 py-2 bg-sky-500 hover:bg-sky-600 text-white rounded-md"
          >
            {isEditing ? "Cancel" : "Edit"}
          </button>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-300">
              Email
            </label>
            <p className="mt-1 text-white">{customer.email}</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300">
              Full Name
            </label>
            {isEditing ? (
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="mt-1 block w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-md text-white"
              />
            ) : (
              <p className="mt-1 text-white">{customer.name}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300">
              Phone Number
            </label>
            {isEditing ? (
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="mt-1 block w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-md text-white"
              />
            ) : (
              <p className="mt-1 text-white">
                {customer.phone || "Not provided"}
              </p>
            )}
          </div>

          <div className="pt-4">
            <p className="text-sm text-gray-400">
              Member since {new Date(customer.createdAt).toLocaleDateString()}
            </p>
          </div>

          {isEditing && (
            <button
              onClick={handleProfileUpdate}
              className="w-full px-4 py-2 bg-sky-500 hover:bg-sky-600 text-white rounded-md mt-4"
            >
              Save Changes
            </button>
          )}
        </div>
      </div>

      {/* Email Preferences Section */}
      <div className="bg-slate-800 p-6 rounded-lg border border-slate-700 mb-6">
        <h2 className="text-2xl font-bold text-white mb-6">
          Email Preferences
        </h2>

        <div className="space-y-4">
          <label className="flex items-center">
            <input
              type="checkbox"
              checked={preferences.marketing}
              onChange={(e) =>
                setPreferences({ ...preferences, marketing: e.target.checked })
              }
              className="rounded text-sky-500"
            />
            <span className="ml-3 text-gray-300">
              Receive marketing emails and promotions
            </span>
          </label>

          <label className="flex items-center">
            <input
              type="checkbox"
              checked={preferences.orderUpdates}
              onChange={(e) =>
                setPreferences({
                  ...preferences,
                  orderUpdates: e.target.checked,
                })
              }
              className="rounded text-sky-500"
            />
            <span className="ml-3 text-gray-300">
              Receive order status updates
            </span>
          </label>

          <label className="flex items-center">
            <input
              type="checkbox"
              checked={preferences.announcements}
              onChange={(e) =>
                setPreferences({
                  ...preferences,
                  announcements: e.target.checked,
                })
              }
              className="rounded text-sky-500"
            />
            <span className="ml-3 text-gray-300">
              Receive announcements and news
            </span>
          </label>

          <button
            onClick={handlePreferencesUpdate}
            className="w-full px-4 py-2 bg-sky-500 hover:bg-sky-600 text-white rounded-md mt-4"
          >
            Save Preferences
          </button>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="bg-slate-800 p-6 rounded-lg border border-slate-700">
        <h2 className="text-2xl font-bold text-white mb-6">Quick Actions</h2>

        <div className="space-y-3">
          <button className="w-full px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-md text-left">
            → Manage Addresses
          </button>
          <button className="w-full px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-md text-left">
            → View Orders
          </button>
          <button className="w-full px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-md text-left">
            → Change Password
          </button>
          <button
            onClick={handleLogout}
            className="w-full px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-md text-left"
          >
            → Logout
          </button>
        </div>
      </div>
    </div>
  );
};

export default CustomerAccountPage;
