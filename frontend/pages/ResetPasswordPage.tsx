import React, { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useToast } from "../hooks/useToast";
import { useCustomerAuth } from "../context/CustomerAuthContext";

const PASSWORD_RULES = {
  minLength: 8,
  requireUppercase: true,
  requireLowercase: true,
  requireNumbers: true,
  requireSymbols: true,
};

const validatePassword = (password: string) => {
  const errors: string[] = [];

  if (password.length < PASSWORD_RULES.minLength) {
    errors.push(`At least ${PASSWORD_RULES.minLength} characters`);
  }
  if (PASSWORD_RULES.requireUppercase && !/[A-Z]/.test(password)) {
    errors.push("One uppercase letter");
  }
  if (PASSWORD_RULES.requireLowercase && !/[a-z]/.test(password)) {
    errors.push("One lowercase letter");
  }
  if (PASSWORD_RULES.requireNumbers && !/\d/.test(password)) {
    errors.push("One number");
  }
  if (PASSWORD_RULES.requireSymbols && !/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
    errors.push("One special character (!@#$%^&*)");
  }

  return errors;
};

const ResetPasswordPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { addToast } = useToast();
  const { resetPassword } = useCustomerAuth();

  const [token, setToken] = useState<string | null>(null);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isResetComplete, setIsResetComplete] = useState(false);
  const [passwordErrors, setPasswordErrors] = useState<string[]>([]);

  useEffect(() => {
    const tokenParam = searchParams.get("token");
    if (!tokenParam) {
      addToast("Invalid or missing reset token", "error");
      navigate("/login");
      return;
    }
    setToken(tokenParam);
  }, [searchParams, navigate, addToast]);

  const handlePasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const pwd = e.target.value;
    setNewPassword(pwd);
    setPasswordErrors(validatePassword(pwd));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!token) {
      addToast("Invalid reset token", "error");
      return;
    }

    if (newPassword.trim() === "") {
      addToast("Password is required", "error");
      return;
    }

    if (confirmPassword.trim() === "") {
      addToast("Please confirm your password", "error");
      return;
    }

    if (passwordErrors.length > 0) {
      addToast(
        "Password does not meet complexity requirements",
        "error",
      );
      return;
    }

    if (newPassword !== confirmPassword) {
      addToast("Passwords do not match", "error");
      return;
    }

    setIsLoading(true);
    try {
      const result = await resetPassword(token, newPassword);
      if (!result.success) {
        addToast(result.error || "Failed to reset password", "error");
        return;
      }

      setIsResetComplete(true);
      addToast("Password reset successfully!", "success");
      
      // Redirect to login after 3 seconds
      setTimeout(() => {
        navigate("/login");
      }, 3000);
    } catch (error) {
      console.error("Password reset error:", error);
      addToast("Failed to reset password", "error");
    } finally {
      setIsLoading(false);
    }
  };

  const inputClasses =
    "mt-1 block w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-md shadow-sm text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-sky-500";

  if (!token) {
    return null;
  }

  return (
    <div className="max-w-md mx-auto mt-10 bg-slate-800 p-8 rounded-lg shadow-2xl border border-slate-700">
      <h1 className="text-2xl font-bold text-white text-center mb-6">
        Reset Your Password
      </h1>

      {isResetComplete ? (
        <div className="space-y-4">
          <div className="bg-green-900/30 border border-green-700 rounded-lg p-4 text-center">
            <p className="text-green-200 font-medium mb-2">
              ✓ Password Reset Successfully
            </p>
            <p className="text-green-100 text-sm">
              Your password has been updated. Redirecting to login...
            </p>
          </div>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label
              htmlFor="password"
              className="block text-sm font-medium text-gray-300"
            >
              New Password *
            </label>
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                id="password"
                value={newPassword}
                onChange={handlePasswordChange}
                disabled={isLoading}
                className={inputClasses}
                placeholder="Enter new password"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-300 text-sm"
              >
                {showPassword ? "Hide" : "Show"}
              </button>
            </div>

            {passwordErrors.length > 0 && (
              <div className="mt-2 p-3 bg-red-900/20 border border-red-700 rounded">
                <p className="text-red-200 text-xs font-medium mb-1">
                  Password must contain:
                </p>
                <ul className="text-red-200 text-xs space-y-1">
                  {passwordErrors.map((error, idx) => (
                    <li key={idx}>• {error}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          <div>
            <label
              htmlFor="confirmPassword"
              className="block text-sm font-medium text-gray-300"
            >
              Confirm Password *
            </label>
            <div className="relative">
              <input
                type={showConfirmPassword ? "text" : "password"}
                id="confirmPassword"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                disabled={isLoading}
                className={inputClasses}
                placeholder="Confirm new password"
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-300 text-sm"
              >
                {showConfirmPassword ? "Hide" : "Show"}
              </button>
            </div>

            {confirmPassword.trim() !== "" &&
              newPassword !== confirmPassword && (
                <p className="mt-2 text-red-400 text-xs">
                  Passwords do not match
                </p>
              )}
          </div>

          <button
            type="submit"
            disabled={isLoading || passwordErrors.length > 0}
            className="w-full flex justify-center py-3 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-sky-500 hover:bg-sky-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {isLoading ? "Resetting..." : "Reset Password"}
          </button>

          <div className="text-center">
            <p className="text-gray-400 text-sm">
              Remember your password?{" "}
              <a
                href="/#/login"
                className="text-sky-400 hover:text-sky-300 font-medium"
              >
                Back to Login
              </a>
            </p>
          </div>
        </form>
      )}
    </div>
  );
};

export default ResetPasswordPage;
