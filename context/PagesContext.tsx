import React, {
  createContext,
  useState,
  useContext,
  ReactNode,
  useEffect,
} from "react";
import { Page, Menu } from "../types";
import * as mockApi from "../services/mockApi";

interface PagesContextType {
  pages: Page[];
  menus: Menu[];
  isLoading: boolean;
  addPage: (page: Omit<Page, "id">) => Promise<Page>;
  updatePage: (page: Page) => Promise<void>;
  deletePage: (pageId: string) => Promise<void>;
  updateMenu: (menu: Menu) => Promise<void>;
}

const PagesContext = createContext<PagesContextType | undefined>(undefined);

export const PagesProvider: React.FC<{ children: ReactNode }> = ({
  children,
}) => {
  const [pages, setPages] = useState<Page[]>([]);
  const [menus, setMenus] = useState<Menu[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true);
      try {
        const [pagesData, menusData] = await Promise.all([
          mockApi.fetchPages(),
          mockApi.fetchMenus(),
        ]);
        setPages(pagesData);
        setMenus(menusData);
      } catch (error) {
        console.error("Failed to load pages and menus", error);
      } finally {
        setIsLoading(false);
      }
    };
    loadData();
  }, []);

  const addPage = async (page: Omit<Page, "id">) => {
    const newPage = await mockApi.addPage(page);
    setPages((prev) => [...prev, newPage]);
    return newPage;
  };

  const updatePage = async (page: Page) => {
    await mockApi.updatePage(page);
    setPages((prev) => prev.map((p) => (p.id === page.id ? page : p)));
  };

  const deletePage = async (pageId: string) => {
    await mockApi.deletePage(pageId);
    setPages((prev) => prev.filter((p) => p.id !== pageId));
  };

  const updateMenu = async (menu: Menu) => {
    await mockApi.updateMenu(menu);
    setMenus((prev) => prev.map((m) => (m.id === menu.id ? menu : m)));
  };

  return (
    <PagesContext.Provider
      value={{
        pages,
        menus,
        isLoading,
        addPage,
        updatePage,
        deletePage,
        updateMenu,
      }}
    >
      {children}
    </PagesContext.Provider>
  );
};

export const usePages = () => {
  const context = useContext(PagesContext);
  if (context === undefined) {
    throw new Error("usePages must be used within a PagesProvider");
  }
  return context;
};
