import React, {
  createContext,
  useState,
  useContext,
  ReactNode,
  useEffect,
} from "react";
import { StaffMember } from "../types";
import * as mockApi from "../services/mockApi";
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
        console.error("Failed to load staff from API, using mock data", error);
        try {
          const mockStaffData = await mockApi.fetchStaff();
          setStaff(mockStaffData);
        } catch (mockError) {
          console.error("Failed to load mock staff", mockError);
        }
      } finally {
        setIsLoading(false);
      }
    };
    loadStaff();
  }, []);

  const addStaff = async (staffMember: Omit<StaffMember, "id">) => {
    try {
      const newStaff = await apiClient.staff.create(staffMember);
      setStaff((prev) => [...prev, newStaff]);
    } catch (error) {
      console.error("Failed to add staff via API, using mock", error);
      const newStaff = await mockApi.addStaff(staffMember);
      setStaff((prev) => [...prev, newStaff]);
    }
  };

  const updateStaff = async (staffMember: StaffMember) => {
    try {
      const updatedStaff = await apiClient.staff.update(
        staffMember.id,
        staffMember,
      );
      setStaff((prev) =>
        prev.map((s) => (s.id === updatedStaff.id ? updatedStaff : s)),
      );
    } catch (error) {
      console.error("Failed to update staff via API, using mock", error);
      const updatedStaff = await mockApi.updateStaff(staffMember);
      setStaff((prev) =>
        prev.map((s) => (s.id === updatedStaff.id ? updatedStaff : s)),
      );
    }
  };

  const deleteStaff = async (staffId: string) => {
    try {
      await apiClient.staff.delete(staffId);
      setStaff((prev) => prev.filter((s) => s.id !== staffId));
    } catch (error) {
      console.error("Failed to delete staff via API, using mock", error);
      await mockApi.deleteStaff(staffId);
      setStaff((prev) => prev.filter((s) => s.id !== staffId));
    }
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
