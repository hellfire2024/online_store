import React, { useState, useEffect } from "react";
import { useSiteSettings } from "../../context/SiteSettingsContext";
import { usePages } from "../../context/PagesContext";
import { useToast } from "../../hooks/useToast";
import { SiteSettings, Menu, MenuItem, Page } from "../../types";
import { useUnsavedChanges } from "../../context/UnsavedChangesContext";
import { PlusIcon, TrashIcon } from "../../components/Icons";
import MenuEditor from "../../components/admin/MenuEditor"; // Correctly import the isolated component
import { DragEndEvent } from "@dnd-kit/core";
import { arrayMove } from "@dnd-kit/sortable";

type SettingsTab = "general" | "footer" | "menus" | "payment" | "shipping";

const SettingsManagement: React.FC = () => {
  const { siteSettings, updateSiteSettings } = useSiteSettings();
  const { pages, menus, updateMenu } = usePages();

  const [settings, setSettings] = useState<Partial<SiteSettings>>(siteSettings);
  const [activeTab, setActiveTab] = useState<SettingsTab>("general");
  const { addToast } = useToast();
  const { setHasUnsavedChanges } = useUnsavedChanges();

  // --- State for Menu Editor ---
  const [selectedMenuId, setSelectedMenuId] = useState<string | null>(null);
  const [currentMenu, setCurrentMenu] = useState<Menu | null>(null);
  const [originalMenu, setOriginalMenu] = useState<Menu | null>(null);

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

  const handleSaveSettings = async () => {
    await updateSiteSettings(settings);
    addToast("Settings updated successfully!", "success");
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

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (currentMenu && over && active.id !== over.id) {
      const oldIndex = currentMenu.items.findIndex(
        (item) => item.id === active.id,
      );
      const newIndex = currentMenu.items.findIndex(
        (item) => item.id === over.id,
      );
      const newItems = arrayMove(currentMenu.items, oldIndex, newIndex);
      setCurrentMenu({ ...currentMenu, items: newItems });
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
        <TabButton tab="footer" label="Footer" />
        <TabButton tab="menus" label="Menus" />
        <TabButton tab="payment" label="Payment" />
        <TabButton tab="shipping" label="Shipping" />
      </div>

      <div className="bg-slate-800 p-6 rounded-b-lg border border-t-0 border-slate-700 min-h-[40rem]">
        {activeTab === "general" && (
          <div className="space-y-6">
            <h2 className="text-xl font-semibold text-white">
              General Site Info
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">
                  Logo Text
                </label>
                <input
                  type="text"
                  name="logoText"
                  value={settings.logoText || ""}
                  onChange={handleInputChange}
                  className={inputClasses}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">
                  Logo Accent Text
                </label>
                <input
                  type="text"
                  name="logoTextAccent"
                  value={settings.logoTextAccent || ""}
                  onChange={handleInputChange}
                  className={inputClasses}
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">
                About Page Content (HTML)
              </label>
              <textarea
                name="aboutPageContent"
                value={settings.aboutPageContent || ""}
                onChange={handleInputChange}
                className={inputClasses}
                rows={8}
              ></textarea>
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

        {activeTab === "footer" && (
          <div className="space-y-6">
            <h2 className="text-xl font-semibold text-white">Footer Content</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div>
                <h3 className="text-lg text-gray-300 mb-2">Contact Info</h3>
                <div className="space-y-2">
                  <input
                    type="email"
                    name="footerContactEmail"
                    value={settings.footerContactEmail || ""}
                    onChange={handleInputChange}
                    placeholder="Contact Email"
                    className={inputClasses}
                  />
                  <input
                    type="tel"
                    name="footerContactPhone"
                    value={settings.footerContactPhone || ""}
                    onChange={handleInputChange}
                    placeholder="Contact Phone"
                    className={inputClasses}
                  />
                  <input
                    type="text"
                    name="footerContactAddress"
                    value={settings.footerContactAddress || ""}
                    onChange={handleInputChange}
                    placeholder="Address"
                    className={inputClasses}
                  />
                </div>
              </div>
              <div>
                <h3 className="text-lg text-gray-300 mb-2">Social Links</h3>
                {settings.footerSocialLinks?.map((link) => (
                  <div key={link.id} className="flex gap-2 mb-2">
                    <input
                      type="text"
                      value={link.text}
                      onChange={(e) =>
                        handleSocialLinkChange(link.id, "text", e.target.value)
                      }
                      placeholder="Name"
                      className={inputClasses}
                    />
                    <input
                      type="text"
                      value={link.url}
                      onChange={(e) =>
                        handleSocialLinkChange(link.id, "url", e.target.value)
                      }
                      placeholder="URL"
                      className={inputClasses}
                    />
                  </div>
                ))}
              </div>
            </div>
            <div className="flex justify-end">
              <button
                onClick={handleSaveSettings}
                className={buttonClasses}
                disabled={!hasSettingsUnsavedChanges}
              >
                Save Footer Settings
              </button>
            </div>
          </div>
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
      </div>
    </div>
  );
};

export default SettingsManagement;
