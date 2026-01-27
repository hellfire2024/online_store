import React, { useState, useEffect, useMemo } from "react";
import { useSiteSettings } from "../../context/SiteSettingsContext";
import { usePages } from "../../context/PagesContext";
import { useToast } from "../../hooks/useToast";
import { SiteSettings, Menu, MenuItem, FooterItem, FooterColumn, TaxRule } from "../../types";
import { useUnsavedChanges } from "../../context/UnsavedChangesContext";
import MenuEditor from "../../components/admin/MenuEditor"; // Correctly import the isolated component
import ImageUploadInput from "../../components/admin/ImageUploadInput";
import { US_STATES } from "../../services/taxService";
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  DragOverlay,
  DragStartEvent,
  DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  useSortable,
  arrayMove,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";


type SettingsTab = "general" | "contact" | "footer" | "menus" | "payment" | "shipping" | "tax";

// --- Draggable Item Component ---
const DraggableItem: React.FC<{ item: FooterItem, isOverlay?: boolean }> = ({ item, isOverlay }) => {
  return (
    <div className={`p-2 bg-slate-600 rounded-md text-white border border-slate-500 ${isOverlay ? 'shadow-lg' : ''}`}>
      {item.title}
    </div>
  );
};


// --- Sortable Item Component ---
const SortableItem: React.FC<{ item: FooterItem }> = ({ item }) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: item.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div ref={setNodeRef} style={style} {...attributes} {...listeners}>
      <DraggableItem item={item} />
    </div>
  );
};


// --- Droppable Column Component ---
const DroppableColumn: React.FC<{ column: FooterColumn, children: React.ReactNode }> = ({ column, children }) => {
  const { setNodeRef } = useSortable({ id: column.id });

  return (
    <div ref={setNodeRef} className="bg-slate-900 p-4 rounded-lg min-h-50 flex flex-col gap-2">
      <h3 className="text-lg font-semibold text-white capitalize mb-2">{column.id}</h3>
      <SortableContext items={column.items.map(i => i.id)} strategy={verticalListSortingStrategy}>
        {children}
      </SortableContext>
    </div>
  );
};


const SettingsManagement: React.FC = () => {
  const { siteSettings, updateSiteSettings, uploadFavicon } = useSiteSettings();
  const { pages, menus, updateMenu } = usePages();

  const [settings, setSettings] = useState<Partial<SiteSettings>>(siteSettings);
  const [activeTab, setActiveTab] = useState<SettingsTab>("general");
  const { addToast } = useToast();
  const { setHasUnsavedChanges } = useUnsavedChanges();
  const [selectedFaviconFile, setSelectedFaviconFile] = useState<File | null>(null);
  const [selectedLogoFile, setSelectedLogoFile] = useState<File | null>(null);
  const [activeDragItem, setActiveDragItem] = useState<FooterItem | null>(null);

  // --- State for Menu Editor ---
  const [selectedMenuId, setSelectedMenuId] = useState<string | null>(null);
  const [currentMenu, setCurrentMenu] = useState<Menu | null>(null);
  const [originalMenu, setOriginalMenu] = useState<Menu | null>(null);

  // --- State for Tax Management ---
  const [taxRules, setTaxRules] = useState<TaxRule[]>(siteSettings.taxConfig?.rules || []);
  const [enableTax, setEnableTax] = useState(siteSettings.taxConfig?.enableTaxCollection ?? true);
  const [defaultTaxRate, setDefaultTaxRate] = useState(siteSettings.taxConfig?.defaultTaxRate ?? 0);
  const [editingTaxId, setEditingTaxId] = useState<string | null>(null);
  const [taxFormData, setTaxFormData] = useState<Partial<TaxRule>>({
    name: '',
    states: [],
    taxRate: 0,
    exemptedProductIds: [],
    enabled: true,
    priority: 0,
  });

  const hasSettingsUnsavedChanges =
    JSON.stringify(settings) !== JSON.stringify(siteSettings);
  const hasMenuUnsavedChanges =
    JSON.stringify(currentMenu) !== JSON.stringify(originalMenu);

  useEffect(() => {
    setHasUnsavedChanges(hasSettingsUnsavedChanges || hasMenuUnsavedChanges);
  }, [hasSettingsUnsavedChanges, hasMenuUnsavedChanges, setHasUnsavedChanges]);

  useEffect(() => {
    if (!hasSettingsUnsavedChanges) {
      setSettings(siteSettings);
    }
  }, [siteSettings]);

  // --- Effects for Menu Editor ---
  useEffect(() => {
    if (activeTab === "menus" && menus.length > 0 && !selectedMenuId) {
      setSelectedMenuId(menus[0].id);
    }
  }, [activeTab, menus, selectedMenuId]);

  useEffect(() => {
    if (selectedMenuId) {
      const foundMenu = menus.find((m) => m.id === selectedMenuId);
      if (foundMenu) {
        const deepCopy = JSON.parse(JSON.stringify(foundMenu));
        setCurrentMenu(deepCopy);
        setOriginalMenu(deepCopy);
      } else {
        setCurrentMenu(null);
        setOriginalMenu(null);
      }
    }
  }, [selectedMenuId, menus]);


  const availableFooterItems = useMemo((): FooterItem[] => {
    const defaultItems: FooterItem[] = [
      { id: 'contactInfo', type: 'contactInfo', title: 'Contact Info' },
      { id: 'socialLinks', type: 'socialLinks', title: 'Social Links' },
    ];
    const menuItems: FooterItem[] = menus.map(menu => ({
      id: `menu_${menu.id}`,
      type: 'menu',
      menuId: menu.id,
      title: `Menu: ${menu.name}`,
    }));
    return [...defaultItems, ...menuItems];
  }, [menus]);


  const handleDragStart = (event: DragStartEvent) => {
    const { active } = event;
    const item = availableFooterItems.find(i => i.id === active.id) || 
                 settings.footerConfig?.columns.flatMap(c => c.items).find(i => i.id === active.id);
    setActiveDragItem(item || null);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveDragItem(null);

    if (!over) return;

    const activeId = active.id.toString();
    const overId = over.id.toString();

    setSettings(prev => {
      if (!prev || !prev.footerConfig) return prev;

      const newColumns = [...prev.footerConfig.columns];

      const activeContainer = findContainer(activeId, newColumns) || 'available';
      const overContainer = findContainer(overId, newColumns) || findColumn(overId, newColumns)?.id;

      if (!activeContainer || !overContainer) return prev;

      let activeItem = findItem(activeId, newColumns) || availableFooterItems.find(i => i.id === activeId);
      if (!activeItem) return prev;


      // Moving an item
      if (activeContainer !== overContainer) {
        // Remove from old container
        if (activeContainer !== 'available') {
          const oldColumn = newColumns.find(c => c.id === activeContainer);
          if(oldColumn) oldColumn.items = oldColumn.items.filter(i => i.id !== activeId);
        }

        // Add to new container
        if (overContainer !== 'available') {
           const newColumn = newColumns.find(c => c.id === overContainer);
           if (newColumn) {
             const overIndex = newColumn.items.findIndex(i => i.id === overId);
             if (overIndex !== -1) {
                newColumn.items.splice(overIndex, 0, activeItem!);
             } else {
                newColumn.items.push(activeItem!);
             }
           }
        }
      } else {
        // Sorting within the same container
        const column = newColumns.find(c => c.id === activeContainer);
        if (column) {
          const oldIndex = column.items.findIndex(i => i.id === activeId);
          const newIndex = column.items.findIndex(i => i.id === overId);
          if (oldIndex !== -1 && newIndex !== -1) {
            column.items = arrayMove(column.items, oldIndex, newIndex);
          }
        }
      }

      return { ...prev, footerConfig: { columns: newColumns } };
    });
  };

  const findContainer = (id: string, columns: FooterColumn[]) => {
    if (availableFooterItems.some(i => i.id === id)) return 'available';
    return columns.find(c => c.items.some(i => i.id === id))?.id;
  };

  const findColumn = (id: string, columns: FooterColumn[]) => {
    return columns.find(c => c.id === id);
  }

  const findItem = (id: string, columns: FooterColumn[]) => {
     return columns.flatMap(c => c.items).find(i => i.id === id);
  }

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    })
  );


  const handleSaveSettings = async () => {
    let finalSettings = { ...settings };

    if (selectedFaviconFile) {
      try {
        const faviconUrl = await uploadFavicon(selectedFaviconFile);
        finalSettings.faviconUrl = faviconUrl;
        addToast("Favicon uploaded successfully!", "success");
      } catch (error) {
        addToast("Favicon upload failed!", "error");
        return;
      }
    }

    if (selectedLogoFile) {
      try {
        // We can reuse the uploadFavicon logic for any image upload
        const logoUrl = await uploadFavicon(selectedLogoFile);
        finalSettings.headerLogoUrl = logoUrl;
        addToast("Header logo uploaded successfully!", "success");
      } catch (error) {
        addToast("Header logo upload failed!", "error");
        return;
      }
    }

    await updateSiteSettings(finalSettings);
    addToast("Settings updated successfully!", "success");
    setSelectedFaviconFile(null);
    setSelectedLogoFile(null);
  };

  const handleInputChange = (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
    >,
  ) => {
    const { name, value, type } = e.target;
    const parsedValue = type === "number" ? parseFloat(value) : value;
    setSettings((prev) => ({ ...prev, [name]: parsedValue }));
  };

  const handleApiKeyChange = (
    section: "paymentApiKeys" | "shippingApiKeys",
    provider: string,
    value: string,
  ) => {
    setSettings((prev) => ({
      ...prev,
      [section]: {
        ...(prev[section] || {}),
        [provider]: value,
      },
    }));
  };

  const handleSocialLinkChange = (
    id: string,
    field: "text" | "url",
    value: string,
  ) => {
    const updatedLinks = settings.footerSocialLinks?.map((link) =>
      link.id === id ? { ...link, [field]: value } : link,
    );
    setSettings((prev) => ({ ...prev, footerSocialLinks: updatedLinks }));
  };

  // --- Handlers for Menu Editor ---
  const handleMenuSelection = (menuId: string) => {
    if (hasMenuUnsavedChanges) {
      if (
        window.confirm(
          "You have unsaved changes. Are you sure you want to discard them?",
        )
      ) {
        setSelectedMenuId(menuId);
      }
    } else {
      setSelectedMenuId(menuId);
    }
  };

  const handleMenuItemChange = (
    itemId: string,
    field: "text" | "url",
    value: string,
  ) => {
    if (!currentMenu) return;
    const updatedItems = currentMenu.items.map((item) =>
      item.id === itemId ? { ...item, [field]: value } : item,
    );
    setCurrentMenu({ ...currentMenu, items: updatedItems });
  };

  const addMenuItem = () => {
    if (!currentMenu) return;
    const newItem: MenuItem = {
      id: `item_${Date.now()}`,
      text: "New Link",
      url: "/",
    };
    setCurrentMenu({ ...currentMenu, items: [...currentMenu.items, newItem] });
  };

  const deleteMenuItem = (itemId: string) => {
    if (!currentMenu) return;
    const updatedItems = currentMenu.items.filter((item) => item.id !== itemId);
    setCurrentMenu({ ...currentMenu, items: updatedItems });
  };

  const handleSaveMenu = async () => {
    if (currentMenu) {
      await updateMenu(currentMenu);
      setOriginalMenu(JSON.parse(JSON.stringify(currentMenu)));
      addToast(`Menu "${currentMenu.name}" updated successfully!`, "success");
    }
  };

  const inputClasses =
    "w-full p-2 bg-slate-700 border border-slate-600 rounded-md text-white";
  const buttonClasses =
    "bg-sky-500 text-white font-bold py-2 px-6 rounded-lg hover:bg-sky-600";

  const TabButton: React.FC<{ tab: SettingsTab; label: string }> = ({
    tab,
    label,
  }) => (
    <button
      onClick={() => setActiveTab(tab)}
      className={`px-4 py-2 text-sm font-medium rounded-t-md transition-colors ${activeTab === tab ? "bg-slate-800 text-white" : "bg-slate-900 text-gray-400 hover:text-white"}`}
    >
      {label}
    </button>
  );

  if (!siteSettings) return null;

  return (
    <div>
      <h1 className="text-3xl font-bold text-white mb-8">Site Settings</h1>

      <div className="flex border-b border-slate-700">
        <TabButton tab="general" label="General" />
        <TabButton tab="contact" label="Contact & Social" />
        <TabButton tab="footer" label="Footer" />
        <TabButton tab="menus" label="Menus" />
        <TabButton tab="payment" label="Payment" />
        <TabButton tab="shipping" label="Shipping" />
        <TabButton tab="tax" label="Tax Rules" />
      </div>

      <div className="bg-slate-800 p-6 rounded-b-lg border border-t-0 border-slate-700 min-h-160">
        {activeTab === "general" && (
          <div className="space-y-6">
            <h2 className="text-2xl font-semibold text-white mb-4">
              General Site Information
            </h2>
            <div>
              <label
                htmlFor="siteTitle"
                className="block text-gray-300 text-sm font-bold mb-1"
              >
                Site Title (Browser Tab)
              </label>
              <input
                type="text"
                id="siteTitle"
                name="siteTitle"
                value={settings.siteTitle || ""}
                onChange={handleInputChange}
                className={inputClasses}
                placeholder="Your Site Title"
              />
            </div>
            <ImageUploadInput
              label="Favicon (Browser Tab Icon)"
              imageUrl={settings.faviconUrl || ""}
              onImageUrlChange={(url) =>
                setSettings((prev) => ({ ...prev!, faviconUrl: url }))
              }
              onFileSelect={(file) => {
                setSelectedFaviconFile(file);
                setSettings((prev) => ({
                  ...prev!,
                  faviconUrl: URL.createObjectURL(file),
                }));
              }}
            />
            <div>
              <label
                htmlFor="logoText"
                className="block text-gray-300 text-sm font-bold mb-1"
              >
                Header Logo Text
              </label>
              <input
                type="text"
                id="logoText"
                name="logoText"
                value={settings.logoText || ""}
                onChange={handleInputChange}
                className={inputClasses}
                placeholder="Your Brand Name"
              />
            </div>
            <div>
              <label
                htmlFor="logoTextAccent"
                className="block text-gray-300 text-sm font-bold mb-1"
              >
                Header Logo Accent Text
              </label>
              <input
                type="text"
                id="logoTextAccent"
                name="logoTextAccent"
                value={settings.logoTextAccent || ""}
                onChange={handleInputChange}
                className={inputClasses}
                placeholder="Accent (e.g., Shop, Store)"
              />
            </div>
            <ImageUploadInput
              label="Header Logo"
              imageUrl={settings.headerLogoUrl || ""}
              onImageUrlChange={(url) =>
                setSettings((prev) => ({ ...prev!, headerLogoUrl: url }))
              }
              onFileSelect={(file) => {
                setSelectedLogoFile(file);
                setSettings((prev) => ({
                  ...prev!,
                  headerLogoUrl: URL.createObjectURL(file),
                }));
              }}
            />

            <div className="border-t border-slate-700 pt-6">
              <h3 className="text-lg font-semibold text-white mb-4">Review Settings</h3>
              <div>
                <label
                  htmlFor="maxReviewsDisplayed"
                  className="block text-gray-300 text-sm font-bold mb-1"
                >
                  Maximum Reviews to Display on Homepage
                </label>
                <input
                  type="number"
                  id="maxReviewsDisplayed"
                  name="maxReviewsDisplayed"
                  min="1"
                  max="50"
                  value={settings.maxReviewsDisplayed || 5}
                  onChange={handleInputChange}
                  className={inputClasses}
                />
                <p className="text-xs text-gray-400 mt-1">Shows the most recent approved reviews up to this limit</p>
              </div>
            </div>

            <div className="flex justify-end">
              <button
                onClick={handleSaveSettings}
                className={buttonClasses}
                disabled={!hasSettingsUnsavedChanges}
              >
                Save General Settings
              </button>
            </div>
          </div>
        )}

        {activeTab === "contact" && (
          <div className="space-y-6">
            <h2 className="text-xl font-semibold text-white">Contact Information</h2>
            <div className="p-4 border border-slate-700 rounded-md space-y-4">
              <div>
                <label htmlFor="footerContactEmail" className="block text-sm font-medium text-gray-400 mb-1">Contact Email</label>
                <input
                  type="email"
                  id="footerContactEmail"
                  name="footerContactEmail"
                  value={settings.footerContactEmail || ""}
                  onChange={handleInputChange}
                  placeholder="support@example.com"
                  className={inputClasses}
                />
              </div>
              <div>
                <label htmlFor="footerContactPhone" className="block text-sm font-medium text-gray-400 mb-1">Contact Phone</label>
                <input
                  type="tel"
                  id="footerContactPhone"
                  name="footerContactPhone"
                  value={settings.footerContactPhone || ""}
                  onChange={handleInputChange}
                  placeholder="(123) 456-7890"
                  className={inputClasses}
                />
              </div>
              <div>
                <label htmlFor="footerContactAddress" className="block text-sm font-medium text-gray-400 mb-1">Address</label>
                <input
                  type="text"
                  id="footerContactAddress"
                  name="footerContactAddress"
                  value={settings.footerContactAddress || ""}
                  onChange={handleInputChange}
                  placeholder="123 Example St, City, State"
                  className={inputClasses}
                />
              </div>
            </div>

            <h2 className="text-xl font-semibold text-white pt-4">Social Links</h2>
            <div className="p-4 border border-slate-700 rounded-md">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-2">
                <label className="block text-sm font-medium text-gray-400">Link Text</label>
                <label className="block text-sm font-medium text-gray-400">Link URL</label>
              </div>
              {settings.footerSocialLinks?.map((link) => (
                <div key={link.id} className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-2">
                  <input
                    type="text"
                    aria-label="Link Text"
                    value={link.text}
                    onChange={(e) =>
                      handleSocialLinkChange(link.id, "text", e.target.value)
                    }
                    placeholder="e.g., Facebook"
                    className={inputClasses}
                  />
                  <input
                    type="text"
                    aria-label="Link URL"
                    value={link.url}
                    onChange={(e) =>
                      handleSocialLinkChange(link.id, "url", e.target.value)
                    }
                    placeholder="https://facebook.com/..."
                    className={inputClasses}
                  />
                </div>
              ))}
            </div>
            <div className="flex justify-end">
              <button
                onClick={handleSaveSettings}
                className={buttonClasses}
                disabled={!hasSettingsUnsavedChanges}
              >
                Save Contact Settings
              </button>
            </div>
          </div>
        )}

        {activeTab === "footer" && (
           <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragStart={handleDragStart}
            onDragEnd={handleDragEnd}
          >
            <div className="grid grid-cols-4 gap-4">
              {/* Available Items */}
              <div className="col-span-1">
                <h2 className="text-xl font-semibold text-white mb-2">Available Items</h2>
                <div className="space-y-2 p-4 bg-slate-900 rounded-lg">
                  <SortableContext items={availableFooterItems.map(i => i.id)} strategy={verticalListSortingStrategy}>
                    {availableFooterItems
                       .filter(item => !findItem(item.id, settings.footerConfig?.columns || []))
                       .map(item => <SortableItem key={item.id} item={item} />)
                    }
                  </SortableContext>
                </div>
              </div>

              {/* Footer Columns */}
              <div className="col-span-3 grid grid-cols-3 gap-4">
                {settings.footerConfig?.columns.map(column => (
                  <DroppableColumn key={column.id} column={column}>
                    {column.items.map(item => <SortableItem key={item.id} item={item} />)}
                  </DroppableColumn>
                ))}
              </div>
            </div>
             <DragOverlay>
              {activeDragItem ? <DraggableItem item={activeDragItem} isOverlay /> : null}
            </DragOverlay>
            <div className="flex justify-end mt-8">
              <button
                onClick={handleSaveSettings}
                className={buttonClasses}
                disabled={!hasSettingsUnsavedChanges}
              >
                Save Footer Layout
              </button>
            </div>
          </DndContext>
        )}

        {activeTab === "menus" && (
          <MenuEditor
            menus={menus}
            pages={pages}
            selectedMenuId={selectedMenuId}
            currentMenu={currentMenu}
            handleMenuSelection={handleMenuSelection}
            handleMenuItemChange={handleMenuItemChange}
            deleteMenuItem={deleteMenuItem}
            addMenuItem={addMenuItem}
            handleSaveMenu={handleSaveMenu}
            hasMenuUnsavedChanges={hasMenuUnsavedChanges}
          />
        )}

        {activeTab === "payment" && (
          <div className="space-y-6">
            <h2 className="text-xl font-semibold text-white">
              Payment Configuration
            </h2>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">
                Payment Provider
              </label>
              <select
                name="paymentProvider"
                value={settings.paymentProvider || "none"}
                onChange={handleInputChange}
                className={inputClasses}
              >
                <option value="none">None</option>
                <option value="stripe">Stripe</option>
                <option value="paypal">PayPal</option>
                <option value="square">Square</option>
                <option value="authorizeNet">Authorize.Net</option>
              </select>
            </div>

            {settings.paymentProvider === "stripe" && (
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">
                  Stripe Secret Key
                </label>
                <input
                  type="password"
                  value={settings.paymentApiKeys?.stripe || ""}
                  onChange={(e) =>
                    handleApiKeyChange(
                      "paymentApiKeys",
                      "stripe",
                      e.target.value,
                    )
                  }
                  placeholder="sk_test_************************"
                  className={inputClasses}
                />
              </div>
            )}

            {settings.paymentProvider === "paypal" && (
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">
                  PayPal Client ID
                </label>
                <input
                  type="password"
                  value={settings.paymentApiKeys?.paypal || ""}
                  onChange={(e) =>
                    handleApiKeyChange(
                      "paymentApiKeys",
                      "paypal",
                      e.target.value,
                    )
                  }
                  placeholder="************************"
                  className={inputClasses}
                />
              </div>
            )}

            {settings.paymentProvider === "square" && (
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">
                  Square Access Token
                </label>
                <input
                  type="password"
                  value={settings.paymentApiKeys?.square || ""}
                  onChange={(e) =>
                    handleApiKeyChange(
                      "paymentApiKeys",
                      "square",
                      e.target.value,
                    )
                  }
                  placeholder="EAAA************************"
                  className={inputClasses}
                />
              </div>
            )}

            {settings.paymentProvider === "authorizeNet" && (
              <>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">
                    API Login ID
                  </label>
                  <input
                    type="text"
                    value={
                      settings.paymentApiKeys?.authorizeNet?.split(":")[0] || ""
                    }
                    onChange={(e) =>
                      handleApiKeyChange(
                        "paymentApiKeys",
                        "authorizeNet",
                        `${e.target.value}:${settings.paymentApiKeys?.authorizeNet?.split(":")[1] || ""}`,
                      )
                    }
                    placeholder="API Login ID"
                    className={inputClasses}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">
                    Transaction Key
                  </label>
                  <input
                    type="password"
                    value={
                      settings.paymentApiKeys?.authorizeNet?.split(":")[1] || ""
                    }
                    onChange={(e) =>
                      handleApiKeyChange(
                        "paymentApiKeys",
                        "authorizeNet",
                        `${settings.paymentApiKeys?.authorizeNet?.split(":")[0] || ""}:${e.target.value}`,
                      )
                    }
                    placeholder="Transaction Key"
                    className={inputClasses}
                  />
                </div>
              </>
            )}

            <div className="flex justify-between items-center pt-4">
              <div>
                <span className="text-gray-400">Status: </span>
                {settings.paymentProvider !== "none" &&
                settings.paymentApiKeys?.[
                  settings.paymentProvider as keyof typeof settings.paymentApiKeys
                ] ? (
                  <span className="text-green-400 font-semibold">
                    Connected
                  </span>
                ) : (
                  <span className="text-yellow-400">Not Connected</span>
                )}
              </div>
              <button onClick={handleSaveSettings} className={buttonClasses}>
                Save & Connect
              </button>
            </div>
          </div>
        )}

        {activeTab === "shipping" && (
          <div className="space-y-6">
            <h2 className="text-xl font-semibold text-white">
              Shipping Configuration
            </h2>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">
                Shipping Method
              </label>
              <select
                name="shippingProvider"
                value={settings.shippingProvider || "none"}
                onChange={handleInputChange}
                className={inputClasses}
              >
                <option value="none">None</option>
                <option value="flatRate">Flat Rate</option>
                <option value="fedex">FedEx</option>
                <option value="ups">UPS</option>
                <option value="usps">USPS</option>
              </select>
            </div>

            {settings.shippingProvider === "flatRate" && (
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">
                  Flat Rate Cost ($)
                </label>
                <input
                  type="number"
                  name="shippingFlatRate"
                  value={settings.shippingFlatRate || 0}
                  onChange={handleInputChange}
                  className={inputClasses}
                />
              </div>
            )}
            {["fedex", "ups", "usps"].includes(
              settings.shippingProvider || "none",
            ) && (
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">
                  {settings.shippingProvider?.toUpperCase()} API Key
                </label>
                <input
                  type="password"
                  value={
                    settings.shippingApiKeys?.[
                      settings.shippingProvider as keyof typeof settings.shippingApiKeys
                    ] || ""
                  }
                  onChange={(e) =>
                    handleApiKeyChange(
                      "shippingApiKeys",
                      settings.shippingProvider!,
                      e.target.value,
                    )
                  }
                  placeholder="Enter API Key"
                  className={inputClasses}
                />
              </div>
            )}
            <div className="flex justify-end">
              <button
                onClick={handleSaveSettings}
                className={buttonClasses}
                disabled={!hasSettingsUnsavedChanges}
              >
                Save Shipping Settings
              </button>
            </div>
          </div>
        )}

        {activeTab === "tax" && (
          <div className="space-y-6">
            <h2 className="text-2xl font-semibold text-white mb-4">Tax Configuration</h2>
            
            {/* Global Settings */}
            <div className="bg-slate-700 p-6 rounded-lg border border-slate-600">
              <h3 className="text-xl font-semibold text-white mb-4">Global Settings</h3>
              
              <div className="space-y-4">
                <label className="flex items-center space-x-3">
                  <input
                    type="checkbox"
                    checked={enableTax}
                    onChange={(e) => setEnableTax(e.target.checked)}
                    className="w-4 h-4"
                  />
                  <span className="text-white">Enable Tax Collection</span>
                </label>

                <div>
                  <label className="block text-white mb-2">Default Tax Rate (%)</label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    step="0.01"
                    value={defaultTaxRate}
                    onChange={(e) => setDefaultTaxRate(parseFloat(e.target.value))}
                    className={inputClasses}
                  />
                  <p className="text-sm text-gray-400 mt-1">
                    Used when no state-specific rule matches
                  </p>
                </div>

                <button
                  onClick={() => {
                    const updatedSettings = {
                      ...settings,
                      taxConfig: {
                        enableTaxCollection: enableTax,
                        defaultTaxRate,
                        taxIncludedInPrice: settings.taxConfig?.taxIncludedInPrice ?? false,
                        rules: taxRules,
                      },
                    };
                    setSettings(updatedSettings);
                    updateSiteSettings(updatedSettings);
                    addToast('Tax settings saved', 'success');
                  }}
                  className={buttonClasses}
                >
                  Save Global Settings
                </button>
              </div>
            </div>

            {/* Add/Edit Rule Form */}
            <div className="bg-slate-700 p-6 rounded-lg border border-slate-600">
              <h3 className="text-xl font-semibold text-white mb-4">
                {editingTaxId ? 'Edit Tax Rule' : 'Add New Tax Rule'}
              </h3>

              <div className="space-y-4">
                <div>
                  <label className="block text-white mb-2">Rule Name</label>
                  <input
                    type="text"
                    placeholder="e.g., California Sales Tax"
                    value={taxFormData.name || ''}
                    onChange={(e) => setTaxFormData({ ...taxFormData, name: e.target.value })}
                    className={inputClasses}
                  />
                </div>

                <div>
                  <label className="block text-white mb-2">Tax Rate (%)</label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    step="0.01"
                    value={taxFormData.taxRate || 0}
                    onChange={(e) => setTaxFormData({ ...taxFormData, taxRate: parseFloat(e.target.value) })}
                    className={inputClasses}
                  />
                </div>

                <div>
                  <label className="block text-white mb-2">Priority (higher = applies first)</label>
                  <input
                    type="number"
                    min="0"
                    value={taxFormData.priority || 0}
                    onChange={(e) => setTaxFormData({ ...taxFormData, priority: parseInt(e.target.value) })}
                    className={inputClasses}
                  />
                </div>

                <div>
                  <label className="block text-white mb-2">States (click to select)</label>
                  <div className="grid grid-cols-4 gap-2 max-h-48 overflow-y-auto bg-slate-600 p-4 rounded-md border border-slate-500">
                    {US_STATES.map((state) => (
                      <button
                        key={state}
                        type="button"
                        onClick={() => {
                          const newStates = taxFormData.states || [];
                          if (newStates.includes(state)) {
                            setTaxFormData({
                              ...taxFormData,
                              states: newStates.filter((s) => s !== state),
                            });
                          } else {
                            setTaxFormData({
                              ...taxFormData,
                              states: [...newStates, state],
                            });
                          }
                        }}
                        className={`p-2 rounded-md font-semibold transition-colors ${
                          (taxFormData.states || []).includes(state)
                            ? 'bg-sky-500 text-white'
                            : 'bg-slate-500 text-gray-300 hover:bg-slate-400'
                        }`}
                      >
                        {state}
                      </button>
                    ))}
                  </div>
                  <p className="text-sm text-gray-400 mt-2">
                    Selected: {(taxFormData.states || []).join(', ') || 'None'}
                  </p>
                </div>

                <label className="flex items-center space-x-3">
                  <input
                    type="checkbox"
                    checked={taxFormData.enabled !== false}
                    onChange={(e) => setTaxFormData({ ...taxFormData, enabled: e.target.checked })}
                    className="w-4 h-4"
                  />
                  <span className="text-white">Enabled</span>
                </label>

                <div className="flex space-x-2">
                  <button
                    onClick={() => {
                      if (!taxFormData.name || (taxFormData.states || []).length === 0) {
                        addToast('Rule name and at least one state are required', 'error');
                        return;
                      }

                      const newRule: TaxRule = {
                        id: editingTaxId || Date.now().toString(),
                        name: taxFormData.name || '',
                        states: taxFormData.states || [],
                        taxRate: taxFormData.taxRate || 0,
                        exemptedProductIds: taxFormData.exemptedProductIds || [],
                        enabled: taxFormData.enabled !== false,
                        priority: taxFormData.priority || 0,
                      };

                      if (editingTaxId) {
                        setTaxRules(taxRules.map((r) => (r.id === editingTaxId ? newRule : r)));
                        setEditingTaxId(null);
                        addToast('Tax rule updated', 'success');
                      } else {
                        setTaxRules([...taxRules, newRule]);
                        addToast('Tax rule added', 'success');
                      }

                      setTaxFormData({
                        name: '',
                        states: [],
                        taxRate: 0,
                        exemptedProductIds: [],
                        enabled: true,
                        priority: 0,
                      });
                    }}
                    className={buttonClasses}
                  >
                    {editingTaxId ? 'Update Rule' : 'Add Rule'}
                  </button>
                  {editingTaxId && (
                    <button
                      onClick={() => {
                        setEditingTaxId(null);
                        setTaxFormData({
                          name: '',
                          states: [],
                          taxRate: 0,
                          exemptedProductIds: [],
                          enabled: true,
                          priority: 0,
                        });
                      }}
                      className="flex-1 bg-gray-600 text-white font-bold py-2 rounded-lg hover:bg-gray-700 transition-colors"
                    >
                      Cancel
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* Tax Rules List */}
            <div className="bg-slate-700 p-6 rounded-lg border border-slate-600">
              <h3 className="text-xl font-semibold text-white mb-4">Tax Rules</h3>
              
              {taxRules.length === 0 ? (
                <p className="text-gray-400">No tax rules configured yet.</p>
              ) : (
                <div className="space-y-4">
                  {taxRules.map((rule) => (
                    <div key={rule.id} className="bg-slate-600 p-4 rounded-lg border border-slate-500">
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <h4 className="text-white font-semibold">{rule.name}</h4>
                          <p className="text-gray-400 text-sm">
                            Rate: {rule.taxRate}% | Priority: {rule.priority} | Status:{' '}
                            <span className={rule.enabled ? 'text-green-400' : 'text-red-400'}>
                              {rule.enabled ? 'Enabled' : 'Disabled'}
                            </span>
                          </p>
                        </div>
                        <div className="space-x-2">
                          <button
                            onClick={() => {
                              setTaxFormData(rule);
                              setEditingTaxId(rule.id);
                            }}
                            className="px-3 py-1 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors text-sm"
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => {
                              setTaxRules(taxRules.filter((r) => r.id !== rule.id));
                              addToast('Tax rule deleted', 'success');
                            }}
                            className="px-3 py-1 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors text-sm"
                          >
                            Delete
                          </button>
                        </div>
                      </div>
                      <p className="text-gray-300 text-sm">States: {rule.states.join(', ')}</p>
                    </div>
                  ))}
                </div>
              )}

              <button
                onClick={() => {
                  const updatedSettings = {
                    ...settings,
                    taxConfig: {
                      enableTaxCollection: enableTax,
                      defaultTaxRate,
                      taxIncludedInPrice: settings.taxConfig?.taxIncludedInPrice ?? false,
                      rules: taxRules,
                    },
                  };
                  setSettings(updatedSettings);
                  updateSiteSettings(updatedSettings);
                  addToast('All tax settings saved', 'success');
                }}
                className={`mt-4 ${buttonClasses}`}
              >
                Save All Tax Rules
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default SettingsManagement;
