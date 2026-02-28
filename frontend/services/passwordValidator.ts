/**
 * Password Validation Service
 * Enforces password complexity requirements
 */

export interface PasswordValidation {
  isValid: boolean;
  errors: string[];
  strength: "weak" | "fair" | "good" | "strong";
  score: number; // 0-4
}

export interface PasswordRequirements {
  minLength: number;
  requireUppercase: boolean;
  requireLowercase: boolean;
  requireNumbers: boolean;
  requireSymbols: boolean;
}

const DEFAULT_REQUIREMENTS: PasswordRequirements = {
  minLength: 8,
  requireUppercase: true,
  requireLowercase: true,
  requireNumbers: true,
  requireSymbols: true,
};

// Common passwords to avoid
const COMMON_PASSWORDS = [
  "password",
  "123456",
  "password123",
  "admin",
  "letmein",
  "qwerty",
  "welcome",
  "monkey",
  "dragon",
  "master",
  "sunshine",
  "princess",
  "football",
  "baseball",
  "iloveyou",
  "trustno1",
  "1qaz2wsx",
  "passpass",
  "abcdef",
  "111111",
  "123123",
  "test",
  "guest",
  "pass",
];

export const validatePassword = (
  password: string,
  requirements: PasswordRequirements = DEFAULT_REQUIREMENTS,
  personalInfo: string[] = []
): PasswordValidation => {
  const errors: string[] = [];
  let score = 0;

  if (!password) {
    return {
      isValid: false,
      errors: ["Password is required"],
      strength: "weak",
      score: 0,
    };
  }

  // Check minimum length
  if (password.length < requirements.minLength) {
    errors.push(
      `Password must be at least ${requirements.minLength} characters long`
    );
  } else {
    score++;
  }

  // Check for uppercase
  if (requirements.requireUppercase && !/[A-Z]/.test(password)) {
    errors.push("Password must contain at least one uppercase letter");
  } else if (/[A-Z]/.test(password)) {
    score++;
  }

  // Check for lowercase
  if (requirements.requireLowercase && !/[a-z]/.test(password)) {
    errors.push("Password must contain at least one lowercase letter");
  } else if (/[a-z]/.test(password)) {
    score++;
  }

  // Check for numbers
  if (requirements.requireNumbers && !/\d/.test(password)) {
    errors.push("Password must contain at least one number");
  } else if (/\d/.test(password)) {
    score++;
  }

  // Check for symbols
  if (requirements.requireSymbols && !/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) {
    errors.push(
      "Password must contain at least one special character (!@#$%^&* etc.)"
    );
  } else if (/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) {
    score++;
  }

  // Check against common passwords
  if (COMMON_PASSWORDS.includes(password.toLowerCase())) {
    errors.push("This password is too common. Please choose a stronger one");
  }

  // Check against personal information (email, name, etc.)
  const lowerPassword = password.toLowerCase();
  for (const info of personalInfo) {
    if (info && info.length > 2) {
      const lowerInfo = info.toLowerCase();
      if (
        lowerPassword.includes(lowerInfo) ||
        lowerInfo.includes(lowerPassword.substring(0, 3))
      ) {
        errors.push(
          "Password must not contain personal information (name, email, etc.)"
        );
        break;
      }
    }
  }

  // Determine strength
  let strength: "weak" | "fair" | "good" | "strong" = "weak";
  if (errors.length === 0) {
    if (password.length >= 16 && score >= 4) {
      strength = "strong";
    } else if (password.length >= 12 && score >= 3) {
      strength = "good";
    } else if (score >= 2) {
      strength = "fair";
    } else {
      strength = "weak";
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
    strength,
    score: Math.min(score, 4),
  };
};

export const getPasswordStrengthColor = (
  strength: "weak" | "fair" | "good" | "strong"
): string => {
  switch (strength) {
    case "weak":
      return "text-red-400";
    case "fair":
      return "text-yellow-400";
    case "good":
      return "text-blue-400";
    case "strong":
      return "text-green-400";
    default:
      return "text-gray-400";
  }
};

export const getPasswordStrengthBgColor = (
  strength: "weak" | "fair" | "good" | "strong"
): string => {
  switch (strength) {
    case "weak":
      return "bg-red-900";
    case "fair":
      return "bg-yellow-900";
    case "good":
      return "bg-blue-900";
    case "strong":
      return "bg-green-900";
    default:
      return "bg-slate-700";
  }
};
