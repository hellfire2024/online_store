import React, { useState } from "react";
import { Link } from "react-router-dom";
import { useToast } from "../hooks/useToast";

const ForgotPasswordPage: React.FC = () => {
  const [email, setEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const { addToast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!email.trim()) {
      addToast("Email is required", "error");
      return;
    }

    if (!email.includes("@")) {
      addToast("Please enter a valid email address", "error");
      return;
    }

    setIsLoading(true);
    try {
      // TODO: Replace with actual API call to /api/auth/customer/request-password-reset
      // For now, we'll simulate the request
      const response = await fetch("/api/auth/customer/request-password-reset", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email }),
      });

      if (!response.ok) {
        const error = await response.json();
        addToast(error.message || "Failed to send reset email", "error");
        return;
      }

      setIsSubmitted(true);
      addToast("Password reset email sent successfully", "success");
    } catch (error) {
      console.error("Error requesting password reset:", error);
      addToast("Failed to send reset email", "error");
    } finally {
      setIsLoading(false);
    }
  };

  const inputClasses =
    "mt-1 block w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-md shadow-sm text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-sky-500";

  return (
    <div className="max-w-md mx-auto mt-10 bg-slate-800 p-8 rounded-lg shadow-2xl border border-slate-700">
      <h1 className="text-2xl font-bold text-white text-center mb-6">
        Reset Your Password
      </h1>

      {isSubmitted ? (
        <div className="space-y-4">
          <div className="bg-green-900/30 border border-green-700 rounded-lg p-4 text-center">
            <p className="text-green-200 font-medium mb-2">✓ Email Sent Successfully</p>
            <p className="text-green-100 text-sm">
              We've sent a password reset link to <strong>{email}</strong>
            </p>
            <p className="text-green-100 text-sm mt-2">
              Please check your email and click the link to reset your password.
            </p>
            <p className="text-gray-400 text-xs mt-3">
              Don't see the email? Check your spam folder.
            </p>
          </div>

          <div className="mt-6 text-center">
            <p className="text-gray-400 text-sm mb-3">
              Remember your password?
            </p>
            <Link
              to="/login"
              className="px-6 py-2 bg-sky-600 text-white rounded hover:bg-sky-700 transition-colors font-medium"
            >
              Back to Login
            </Link>
          </div>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label
              htmlFor="email"
              className="block text-sm font-medium text-gray-300"
            >
              Email Address *
            </label>
            <input
              type="email"
              id="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className={inputClasses}
              placeholder="you@example.com"
              disabled={isLoading}
            />
            <p className="mt-2 text-xs text-gray-400">
              Enter the email address associated with your account. We'll send you a link to reset your password.
            </p>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full flex justify-center py-3 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-sky-500 hover:bg-sky-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {isLoading ? "Sending..." : "Send Reset Link"}
          </button>

          <div className="text-center">
            <Link
              to="/login"
              className="text-sm text-sky-400 hover:text-sky-300"
            >
              Back to Login
            </Link>
          </div>
        </form>
      )}
    </div>
  );
};

export default ForgotPasswordPage;
