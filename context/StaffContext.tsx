import React, {
  createContext,
  useState,
  useContext,
  ReactNode,
  useEffect,
} from "react";
import { StaffMember } from "../types";
import * as mockApi from "../services/mockApi";

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
        const staffData = await mockApi.fetchStaff();
        setStaff(staffData);
      } catch (error) {
        console.error("Failed to load staff", error);
      } finally {
        setIsLoading(false);
      }
    };
    loadStaff();
  }, []);

  const addStaff = async (staffMember: Omit<StaffMember, "id">) => {
    const newStaff = await mockApi.addStaff(staffMember);
    setStaff((prev) => [...prev, newStaff]);
  };

  const updateStaff = async (staffMember: StaffMember) => {
    const updatedStaff = await mockApi.updateStaff(staffMember);
    setStaff((prev) =>
      prev.map((s) => (s.id === updatedStaff.id ? updatedStaff : s)),
    );
  };

  const deleteStaff = async (staffId: string) => {
    await mockApi.deleteStaff(staffId);
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
