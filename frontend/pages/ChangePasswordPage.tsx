import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useCustomerAuth } from "../context/CustomerAuthContext";
import { useToast } from "../hooks/useToast";
import {
  validatePassword,
  getPasswordStrengthColor,
  getPasswordStrengthBgColor,
} from "../services/passwordValidator";

const ChangePasswordPage: React.FC = () => {
  const navigate = useNavigate();
  const { customer, changePassword } = useCustomerAuth();
  const { addToast } = useToast();

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  if (!customer) {
    return (
      <div className="max-w-2xl mx-auto p-6 text-center">
        <p className="text-gray-400">Please log in to change your password</p>
        <button
          onClick={() => navigate("/login")}
          className="mt-4 px-4 py-2 bg-sky-500 hover:bg-sky-600 text-white rounded-md"
        >
          Go to Login
        </button>
      </div>
    );
  }

  const validatePasswords = (): boolean => {
    if (!currentPassword.trim()) {
      addToast("Current password is required", "error");
      return false;
    }
    if (!newPassword.trim()) {
      addToast("New password is required", "error");
      return false;
    }
    if (newPassword !== confirmPassword) {
      addToast("New passwords do not match", "error");
      return false;
    }
    if (currentPassword === newPassword) {
      addToast("New password must be different from current password", "error");
      return false;
    }

    // Validate password with strict rules
    const validation = validatePassword(newPassword);
    if (!validation.isValid) {
      validation.errors.forEach((error) => addToast(error, "error"));
      return false;
    }

    return true;
  };

  const handleChangePassword = async () => {
    if (!validatePasswords()) return;

    setIsLoading(true);
    try {
      const result = await changePassword(currentPassword, newPassword);
      if (!result.success) {
        addToast(result.error || "Failed to change password", "error");
        return;
      }

      addToast("Password changed successfully", "success");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");

      // Redirect back to account page after 2 seconds
      setTimeout(() => {
        navigate("/account");
      }, 2000);
    } catch (error) {
      console.error("Error changing password:", error);
      addToast("Failed to change password", "error");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto p-6">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold text-white">Change Password</h1>
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
      </div>

      <div className="bg-slate-800 p-6 rounded-lg border border-slate-700">
        <p className="text-gray-400 mb-6">
          Update your account password to keep your account secure
        </p>

        <div className="space-y-4">
          {/* Current Password */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Current Password
            </label>
            <div className="relative">
              <input
                type={showCurrentPassword ? "text" : "password"}
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                placeholder="Enter your current password"
                disabled={isLoading}
                className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-md text-white placeholder-gray-500 disabled:opacity-50"
              />
              <button
                type="button"
                onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                className="absolute right-3 top-2.5 text-gray-400 hover:text-gray-300"
              >
                {showCurrentPassword ? "Hide" : "Show"}
              </button>
            </div>
          </div>

          {/* New Password */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              New Password
            </label>
            <div className="relative">
              <input
                type={showNewPassword ? "text" : "password"}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Enter your new password (at least 8 characters)"
                disabled={isLoading}
                className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-md text-white placeholder-gray-500 disabled:opacity-50"
              />
              <button
                type="button"
                onClick={() => setShowNewPassword(!showNewPassword)}
                className="absolute right-3 top-2.5 text-gray-400 hover:text-gray-300"
              >
                {showNewPassword ? "Hide" : "Show"}
              </button>
            </div>
            {newPassword && (
              <div className="mt-3 space-y-2">
                <div
                  className={`p-3 rounded-md ${getPasswordStrengthBgColor(validatePassword(newPassword).strength)}`}
                >
                  <p
                    className={`text-sm font-medium ${getPasswordStrengthColor(validatePassword(newPassword).strength)}`}
                  >
                    Password Strength:{" "}
                    {validatePassword(newPassword)
                      .strength.charAt(0)
                      .toUpperCase() +
                      validatePassword(newPassword).strength.slice(1)}
                  </p>
                </div>
                <div className="p-3 bg-slate-700 rounded-md border border-slate-600">
                  <p className="text-xs font-semibold text-gray-300 mb-2">
                    Requirements:
                  </p>
                  <ul className="text-xs text-gray-400 space-y-1">
                    <li
                      className={
                        newPassword.length >= 8
                          ? "text-green-400"
                          : "text-gray-400"
                      }
                    >
                      {newPassword.length >= 8 ? "✓" : "✗"} At least 8
                      characters
                    </li>
                    <li
                      className={
                        /[A-Z]/.test(newPassword)
                          ? "text-green-400"
                          : "text-gray-400"
                      }
                    >
                      {/[A-Z]/.test(newPassword) ? "✓" : "✗"} One uppercase
                      letter
                    </li>
                    <li
                      className={
                        /[a-z]/.test(newPassword)
                          ? "text-green-400"
                          : "text-gray-400"
                      }
                    >
                      {/[a-z]/.test(newPassword) ? "✓" : "✗"} One lowercase
                      letter
                    </li>
                    <li
                      className={
                        /\d/.test(newPassword)
                          ? "text-green-400"
                          : "text-gray-400"
                      }
                    >
                      {/\d/.test(newPassword) ? "✓" : "✗"} One number
                    </li>
                    <li
                      className={
                        /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(
                          newPassword,
                        )
                          ? "text-green-400"
                          : "text-gray-400"
                      }
                    >
                      {/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(newPassword)
                        ? "✓"
                        : "✗"}{" "}
                      One special character (!@#$% etc)
                    </li>
                  </ul>
                </div>
              </div>
            )}
          </div>

          {/* Confirm Password */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Confirm Password
            </label>
            <div className="relative">
              <input
                type={showConfirmPassword ? "text" : "password"}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Re-enter your new password"
                disabled={isLoading}
                className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-md text-white placeholder-gray-500 disabled:opacity-50"
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                className="absolute right-3 top-2.5 text-gray-400 hover:text-gray-300"
              >
                {showConfirmPassword ? "Hide" : "Show"}
              </button>
            </div>
            {confirmPassword && newPassword && (
              <p
                className={`text-sm mt-1 ${newPassword === confirmPassword ? "text-green-400" : "text-red-400"}`}
              >
                {newPassword === confirmPassword
                  ? "✓ Passwords match"
                  : "✗ Passwords do not match"}
              </p>
            )}
          </div>

          {/* Security Tips */}
          <div className="bg-slate-700 p-4 rounded-md border border-slate-600">
            <h3 className="text-sm font-semibold text-white mb-2">
              Security Tips:
            </h3>
            <ul className="text-sm text-gray-300 space-y-1 list-disc list-inside">
              <li>Use at least 8 characters</li>
              <li>Mix uppercase, lowercase, numbers, and symbols</li>
              <li>Avoid using common words or personal information</li>
              <li>Don't reuse old passwords</li>
            </ul>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3 pt-4">
            <button
              onClick={handleChangePassword}
              disabled={
                isLoading ||
                !currentPassword ||
                !newPassword ||
                !confirmPassword
              }
              className="flex-1 px-4 py-2 bg-sky-500 hover:bg-sky-600 disabled:bg-slate-600 disabled:cursor-not-allowed text-white rounded-md font-medium transition-colors"
            >
              {isLoading ? "Updating..." : "Update Password"}
            </button>
            <button
              onClick={() => navigate("/account")}
              disabled={isLoading}
              className="flex-1 px-4 py-2 bg-slate-700 hover:bg-slate-600 disabled:opacity-50 text-white rounded-md font-medium transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ChangePasswordPage;
