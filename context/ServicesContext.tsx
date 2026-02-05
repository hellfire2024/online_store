import React, {
  createContext,
  useState,
  useContext,
  ReactNode,
  useEffect,
} from "react";
import { Service } from "../types";
import * as mockApi from "../services/mockApi";
import { apiClient } from "../services/apiClient";

interface ServicesContextType {
  services: Service[];
  isLoading: boolean;
  addService: (service: Omit<Service, "id">) => Promise<void>;
  updateService: (service: Service) => Promise<void>;
  deleteService: (serviceId: string) => Promise<void>;
  reorderServices: (reorderedServices: Service[]) => void;
}

const ServicesContext = createContext<ServicesContextType | undefined>(
  undefined,
);

export const ServicesProvider: React.FC<{ children: ReactNode }> = ({
  children,
}) => {
  const [services, setServices] = useState<Service[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true);
      try {
        const servicesData = await apiClient.services.getAll();
        setServices(Array.isArray(servicesData) ? servicesData : []);
      } catch (error) {
        console.error("Failed to load services from API, using mock data", error);
        try {
          const mockServicesData = await mockApi.fetchServices();
          setServices(mockServicesData);
        } catch (mockError) {
          console.error("Failed to load mock services", mockError);
        }
      } finally {
        setIsLoading(false);
      }
    };
    loadData();
  }, []);

  const addService = async (service: Omit<Service, "id">) => {
    try {
      const newService = await apiClient.services.create(service);
      setServices((prev) => [...prev, newService]);
    } catch (error) {
      console.error("Failed to add service via API, using mock", error);
      const newService = await mockApi.addService(service);
      setServices((prev) => [...prev, newService]);
    }
  };

  const updateService = async (service: Service) => {
    try {
      const updatedService = await apiClient.services.update(service.id, service);
      setServices((prev) =>
        prev.map((s) => (s.id === updatedService.id ? updatedService : s)),
      );
    } catch (error) {
      console.error("Failed to update service via API, using mock", error);
      const updatedService = await mockApi.updateService(service);
      setServices((prev) =>
        prev.map((s) => (s.id === updatedService.id ? updatedService : s)),
      );
    }
  };

  const deleteService = async (serviceId: string) => {
    try {
      await apiClient.services.delete(serviceId);
      setServices((prev) => prev.filter((s) => s.id !== serviceId));
    } catch (error) {
      console.error("Failed to delete service via API, using mock", error);
      await mockApi.deleteService(serviceId);
      setServices((prev) => prev.filter((s) => s.id !== serviceId));
    }
  };

  const reorderServices = (reorderedServices: Service[]) => {
    setServices(reorderedServices);
  };

  return (
    <ServicesContext.Provider
      value={{ services, isLoading, addService, updateService, deleteService, reorderServices }}
    >
      {children}
    </ServicesContext.Provider>
  );
};

export const useServices = () => {
  const context = useContext(ServicesContext);
  if (context === undefined) {
    throw new Error("useServices must be used within a ServicesProvider");
  }
  return context;
};
