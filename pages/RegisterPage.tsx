import React, { useState } from "react";
import { useCustomerAuth } from "../context/CustomerAuthContext";
import { useNavigate, Link } from "react-router-dom";
import { useToast } from "../hooks/useToast";

const RegisterPage: React.FC = () => {
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [agreeToTerms, setAgreeToTerms] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const { register } = useCustomerAuth();
  const navigate = useNavigate();
  const { addToast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!firstName.trim() || !lastName.trim()) {
      addToast("First and last name are required", "error");
      return;
    }

    if (!agreeToTerms) {
      addToast("You must agree to the terms and conditions", "error");
      return;
    }

    if (password !== confirmPassword) {
      addToast("Passwords do not match", "error");
      return;
    }

    if (password.length < 8) {
      addToast("Password must be at least 8 characters", "error");
      return;
    }

    const phonePattern = /^(\d{3}-\d{3}-\d{4})?$/;
    if (phone && !phonePattern.test(phone)) {
      addToast("Phone must be in format: 555-123-4567", "error");
      return;
    }

    setIsLoading(true);
    const result = await register(`${firstName} ${lastName}`, email, password);

    if (result.success) {
      addToast("Account created successfully! Welcome!", "success");
      navigate("/account");
    } else {
      addToast(result.error || "Registration failed", "error");
    }
    setIsLoading(false);
  };

  const inputClasses =
    "mt-1 block w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-md shadow-sm text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-sky-500";

  return (
    <div className="max-w-2xl mx-auto mt-10 bg-slate-800 p-8 rounded-lg shadow-2xl border border-slate-700">
      <h1 className="text-3xl font-bold text-white text-center mb-6">
        Create Account
      </h1>
      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label
              htmlFor="firstName"
              className="block text-sm font-medium text-gray-300"
            >
              First Name *
            </label>
            <input
              type="text"
              id="firstName"
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              required
              className={inputClasses}
              placeholder="John"
            />
          </div>
          <div>
            <label
              htmlFor="lastName"
              className="block text-sm font-medium text-gray-300"
            >
              Last Name *
            </label>
            <input
              type="text"
              id="lastName"
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              required
              className={inputClasses}
              placeholder="Doe"
            />
          </div>
        </div>

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
          />
        </div>

        <div>
          <label
            htmlFor="phone"
            className="block text-sm font-medium text-gray-300"
          >
            Phone (Optional)
          </label>
          <input
            type="tel"
            id="phone"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            className={inputClasses}
            placeholder="555-123-4567"
          />
          <p className="mt-1 text-xs text-gray-400">Format: XXX-XXX-XXXX</p>
        </div>

        <div>
          <label
            htmlFor="password"
            className="block text-sm font-medium text-gray-300"
          >
            Password *
          </label>
          <input
            type="password"
            id="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            className={inputClasses}
            placeholder="••••••••"
          />
          <p className="mt-1 text-xs text-gray-400">At least 8 characters</p>
        </div>

        <div>
          <label
            htmlFor="confirmPassword"
            className="block text-sm font-medium text-gray-300"
          >
            Confirm Password *
          </label>
          <input
            type="password"
            id="confirmPassword"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            required
            className={inputClasses}
            placeholder="••••••••"
          />
        </div>

        <label className="flex items-center">
          <input
            type="checkbox"
            checked={agreeToTerms}
            onChange={(e) => setAgreeToTerms(e.target.checked)}
            className="h-4 w-4 text-sky-500 bg-slate-700 border-slate-600 rounded"
            required
          />
          <span className="ml-2 text-sm text-gray-300">
            I agree to the{" "}
            <Link to="/terms" className="text-sky-400 hover:text-sky-300">
              Terms and Conditions
            </Link>
          </span>
        </label>

        <button
          type="submit"
          disabled={isLoading}
          className="w-full flex justify-center py-3 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-sky-500 hover:bg-sky-600 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isLoading ? "Creating Account..." : "Create Account"}
        </button>
      </form>

      <p className="mt-6 text-center text-sm text-gray-400">
        Already have an account?{" "}
        <Link
          to="/login"
          className="font-medium text-sky-400 hover:text-sky-300"
        >
          Sign in
        </Link>
      </p>
    </div>
  );
};

export default RegisterPage;
