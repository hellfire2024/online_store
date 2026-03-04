import React, {
  createContext,
  useState,
  useContext,
  ReactNode,
  useEffect,
} from "react";
import { StaffMember } from "../types";
import { apiClient } from "../services/apiClient";

interface StaffContextType {
  staff: StaffMember[];
  isLoading: boolean;
  addStaff: (staffMember: Omit<StaffMember, "id">) => Promise<void>;
  updateStaff: (staffMember: StaffMember) => Promise<void>;
  deleteStaff: (staffId: string) => Promise<void>;
}

const StaffContext = createContext<StaffContextType | undefined>(undefined);

export const StaffProvider: React.FC<{ children: ReactNode }> = ({
  children,
}) => {
  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadStaff = async () => {
      setIsLoading(true);
      try {
        const staffData = await apiClient.staff.getAll();
        setStaff(Array.isArray(staffData) ? staffData : []);
      } catch (error) {
        console.error("Failed to load staff from API", error);
        setStaff([]);
      } finally {
        setIsLoading(false);
      }
    };
    loadStaff();
  }, []);

  const addStaff = async (staffMember: Omit<StaffMember, "id">) => {
    console.log("[StaffContext] Creating staff member:", staffMember);
    const newStaff = await apiClient.staff.create(staffMember);
    console.log("[StaffContext] Staff member created successfully:", newStaff);
    setStaff((prev) => [...prev, newStaff]);
  };

  const updateStaff = async (staffMember: StaffMember) => {
    const updatedStaff = await apiClient.staff.update(
      staffMember.id,
      staffMember,
    );
    setStaff((prev) =>
      prev.map((s) => (s.id === updatedStaff.id ? updatedStaff : s)),
    );
  };

  const deleteStaff = async (staffId: string) => {
    await apiClient.staff.delete(staffId);
    setStaff((prev) => prev.filter((s) => s.id !== staffId));
  };

  return (
    <StaffContext.Provider
      value={{ staff, isLoading, addStaff, updateStaff, deleteStaff }}
    >
      {children}
    </StaffContext.Provider>
  );
};

export const useStaff = () => {
  const context = useContext(StaffContext);
  if (context === undefined) {
    throw new Error("useStaff must be used within a StaffProvider");
  }
  return context;
};
// ...existing code...
