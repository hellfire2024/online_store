export const formatPhoneNumber = (value: string): string => {
  const cleaned = value.replace(/\D/g, "").slice(0, 10);

  if (cleaned.length === 0) return "";
  if (cleaned.length <= 3) return cleaned;
  if (cleaned.length <= 6) {
    return `(${cleaned.slice(0, 3)}) ${cleaned.slice(3)}`;
  }
  return `(${cleaned.slice(0, 3)}) ${cleaned.slice(3, 6)}-${cleaned.slice(6)}`;
};

export const isValidPhoneNumber = (value: string): boolean => {
  return /^\(\d{3}\) \d{3}-\d{4}$/.test(value);
};
