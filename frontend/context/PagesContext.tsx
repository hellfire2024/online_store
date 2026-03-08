import React, {
  createContext,
  useState,
  useContext,
  ReactNode,
  useEffect,
} from "react";
import { Page, Menu, HomePageContent, AboutPageContent } from "../types";
import * as mockApi from "../services/mockApi";
import { apiClient } from "../services/apiClient";
import { useSiteSettings } from "./SiteSettingsContext";
import { useToast } from "../hooks/useToast";

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
  const { siteSettings, isLoading: settingsLoading } = useSiteSettings();
  const { addToast } = useToast();

  useEffect(() => {
    if (settingsLoading) {
      return;
    }
    const loadData = async () => {
      setIsLoading(true);
      try {
        let pagesData: Page[] = [];
        let menusData: Menu[] = [];
        try {
          const apiPages = await apiClient.pages.getAll();
          pagesData = Array.isArray(apiPages) ? apiPages : [];
          menusData = await mockApi.fetchMenus();
        } catch (apiError) {
          [pagesData, menusData] = await Promise.all([
            mockApi.fetchPages(),
            mockApi.fetchMenus(),
          ]);
        }
        let currentSiteSettings = siteSettings;
        let homePage = pagesData.find((p) => p.pageType === "home");
        const initialHeroData: HomePageContent = {
          heroTitle: "Welcome to Custom Threads",
          heroSubtitle: "Design Your Imagination",
          heroBackgroundImageUrl:
            currentSiteSettings?.siteBackgroundImageUrl ||
            "https://picsum.photos/seed/hero/1200/800",
        };
        if (!homePage) {
          homePage = {
            id: "home-page",
            title: "Home",
            path: "/",
            pageType: "home",
            contentData: initialHeroData,
          };
          try {
            const createdHome = await apiClient.pages.create(homePage);
            pagesData.push(createdHome);
          } catch (apiError) {
            console.warn(
              "[PagesContext] Home page create failed, using fallback:",
              apiError,
            );
            pagesData.push(homePage);
          }
        }
        let aboutUsPage = pagesData.find((p) => p.pageType === "about");
        if (!aboutUsPage) {
          const aboutData: AboutPageContent = {
            aboutPageContent: `<h1>About Us</h1><p>Welcome to Custom Threads, where creativity meets quality. We were founded on a simple idea: everyone should be able to wear their imagination. Whether you're an artist, a small business owner, or just someone with a brilliant idea, our platform is designed to bring your vision to life.</p><p>Our mission is to provide high-quality, customizable products that you can be proud of. We use state-of-the-art printing technology and source only the best materials to ensure your designs look fantastic and last long. From t-shirts and hoodies to mugs and tote bags, we offer a wide range of canvases for your creativity.</p><p>We believe in the power of self-expression and are committed to making the custom design process as easy and enjoyable as possible. Thank you for choosing Custom Threads to be a part of your creative journey.</p>`,
          };
          aboutUsPage = {
            id: "about-us-page",
            title: "About Us",
            path: "/about",
            pageType: "about",
            contentData: aboutData,
          };
          try {
            const createdAbout = await apiClient.pages.create(aboutUsPage);
            pagesData.push(createdAbout);
          } catch (apiError) {
            console.warn(
              "[PagesContext] About page create failed, using fallback:",
              apiError,
            );
            pagesData.push(aboutUsPage);
          }
        }
        let contactPage = pagesData.find((p) => p.pageType === "contact");
        if (!contactPage) {
          contactPage = {
            id: "contact-page",
            title: "Contact Us",
            path: "/contact",
            pageType: "contact",
            contentData: {
              pageTitle: "Get In Touch",
              pageSubtitle:
                "Have questions? We'd love to hear from you. Send us a message and we'll respond as soon as possible.",
              targetEmail: "contact@customthreads.com",
              subjectTemplate: "Contact Form Submission: {subject}",
              successMessage:
                "Thank you for your message! We'll get back to you soon.",
              formFields: [
                {
                  id: "f1",
                  type: "fullName" as const,
                  label: "Full Name",
                  placeholder: "John Doe",
                  required: true,
                  enabled: true,
                },
                {
                  id: "f2",
                  type: "email" as const,
                  label: "Email Address",
                  placeholder: "john@example.com",
                  required: true,
                  enabled: true,
                  validation: { pattern: "^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$" },
                },
                {
                  id: "f3",
                  type: "phone" as const,
                  label: "Phone Number",
                  placeholder: "(555) 123-4567",
                  required: false,
                  enabled: true,
                  validation: { pattern: "^[\\d\\s()+-]+$" },
                },
                {
                  id: "f4",
                  type: "subject" as const,
                  label: "Subject",
                  placeholder: "How can we help?",
                  required: true,
                  enabled: true,
                },
                {
                  id: "f5",
                  type: "message" as const,
                  label: "Message",
                  placeholder: "Your message here...",
                  required: true,
                  enabled: true,
                  validation: { minLength: 10 },
                },
              ],
            },
          };
          try {
            const createdContact = await apiClient.pages.create(contactPage);
            pagesData.push(createdContact);
          } catch (apiError) {
            console.warn(
              "[PagesContext] Contact page create failed, using fallback:",
              apiError,
            );
            pagesData.push(contactPage);
          }
        }
        setPages(pagesData);
        setMenus(menusData);
      } catch (error) {
        console.error("Failed to load pages and menus", error);
      } finally {
        setIsLoading(false);
      }
    };
    loadData();
  }, [settingsLoading, siteSettings]);

  const addPage = async (page: Omit<Page, "id">) => {
    try {
      const newPage = await apiClient.pages.create(page);
      setPages((prev) => [...prev, newPage]);
      return newPage;
    } catch (error) {
      const newPage = await mockApi.addPage(page);
      setPages((prev) => [...prev, newPage]);
      return newPage;
    }
  };

  const updatePage = async (page: Page) => {
    try {
      await apiClient.pages.update(page.id, page);
      setPages((prev) => prev.map((p) => (p.id === page.id ? page : p)));
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      if (message.includes("Page not found") || message.includes("HTTP 404")) {
        try {
          const createdPage = await apiClient.pages.create(page);
          setPages((prev) => {
            const exists = prev.some((p) => p.id === createdPage.id);
            return exists
              ? prev.map((p) => (p.id === createdPage.id ? createdPage : p))
              : [...prev, createdPage];
          });
          return;
        } catch (createError) {
          console.error("Failed to create page after update 404", createError);
        }
      }
      await mockApi.updatePage(page);
      setPages((prev) => prev.map((p) => (p.id === page.id ? page : p)));
    }
  };

  const deletePage = async (pageId: string) => {
    try {
      await apiClient.pages.delete(pageId);
      setPages((prev) => prev.filter((p) => p.id !== pageId));
    } catch (error) {
      await mockApi.deletePage(pageId);
      setPages((prev) => prev.filter((p) => p.id !== pageId));
    }
    addToast(
      "Page deleted. You can recreate it from the Page Editor.",
      "success",
    );
  };

  const updateMenu = async (menu: Menu) => {
    try {
      await apiClient.pages.update(menu.id, menu);
      setMenus((prev) => prev.map((m) => (m.id === menu.id ? menu : m)));
    } catch (error) {
      await mockApi.updateMenu(menu);
      setMenus((prev) => prev.map((m) => (m.id === menu.id ? menu : m)));
    }
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
// ...existing code...
