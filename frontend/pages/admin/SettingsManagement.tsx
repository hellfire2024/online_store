// --- Tax Test Button ---
const TEST_CART_ITEMS = [
  {
    product: {
      id: "p-1",
      name: "Classic Cotton T-Shirt",
      price: 25,
      description: "Premium cotton tee",
      imageUrl: "https://picsum.photos/seed/tshirt/400/400",
      inventory: 42,
      packageWeight: 1,
      packageLength: 10,
      packageWidth: 6,
      packageHeight: 2,
    },
    quantity: 2,
  },
];
const TEST_SHIPPING_COST = 10;
const TEST_SHIPPING_STATE = "CA";

// --- Payment Test Button ---
const PaymentTestButton = ({ provider, disabled, hasUnsaved, onResult }) => {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const { addToast } = useToast();

  const handleTest = async () => {
    if (hasUnsaved) {
      addToast("Please save your payment settings before testing.", "warning");
      setResult(null);
      return;
    }
    setLoading(true);
    setResult(null);
    try {
      const res = await fetch(`/api/settings/${provider}-config-test`, {
        method: "POST",
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setResult({
          success: true,
          message: `${provider.charAt(0).toUpperCase() + provider.slice(1)} connection successful.`,
        });
        addToast(
          `${provider.charAt(0).toUpperCase() + provider.slice(1)} connection test succeeded!`,
          "success",
        );
        onResult && onResult(true, data);
      } else {
        setResult({
          success: false,
          message:
            data.error ||
            `${provider.charAt(0).toUpperCase() + provider.slice(1)} connection test failed.`,
        });
        addToast(
          data.error ||
            `${provider.charAt(0).toUpperCase() + provider.slice(1)} connection test failed.`,
          "error",
        );
        onResult && onResult(false, data);
      }
    } catch (err) {
      setResult({
        success: false,
        message: `${provider.charAt(0).toUpperCase() + provider.slice(1)} connection test failed. Check server logs.`,
      });
      addToast(
        `${provider.charAt(0).toUpperCase() + provider.slice(1)} connection test failed. Check server logs.`,
        "error",
      );
      onResult && onResult(false, null);
    }
    setLoading(false);
  };

  return (
    <div className="mt-2">
      <button
        type="button"
        className={`px-4 py-2 rounded text-white ${hasUnsaved || disabled ? "bg-slate-500 cursor-not-allowed" : "bg-sky-600 hover:bg-sky-700"}`}
        disabled={hasUnsaved || disabled || loading}
        title={
          hasUnsaved
            ? "Save settings before testing"
            : `Test ${provider.charAt(0).toUpperCase() + provider.slice(1)} connection`
        }
        onClick={handleTest}
      >
        {loading
          ? "Testing..."
          : `Test ${provider.charAt(0).toUpperCase() + provider.slice(1)} Connection`}
      </button>
      {result && (
        <div
          className={
            result.success
              ? "text-green-400 text-xs mt-1"
              : "text-red-400 text-xs mt-1"
          }
        >
          {result.message}
        </div>
      )}
    </div>
  );
};

const TaxTestButton = ({ provider, disabled, hasUnsaved, onResult }) => {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const { addToast } = useToast();

  const handleTest = async () => {
    if (hasUnsaved) {
      addToast("Please save your tax settings before testing.", "warning");
      setResult(null);
      return;
    }
    setLoading(true);
    setResult(null);
    try {
      const res = await fetch(`/api/tax/providers/${provider}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          cartItems: TEST_CART_ITEMS,
          shippingCost: TEST_SHIPPING_COST,
          shippingState: TEST_SHIPPING_STATE,
        }),
      });
      const data = await res.json();
      if (res.ok && data.taxAmount !== undefined) {
        setResult({
          success: true,
          message: `Success: Tax calculated ($${data.taxAmount.toFixed(2)})`,
        });
        addToast(`Tax test for ${provider} succeeded!`, "success");
        onResult && onResult(true, data);
      } else {
        setResult({
          success: false,
          message: data.error || "No tax calculated.",
        });
        addToast(`Tax test for ${provider} failed.`, "error");
        onResult && onResult(false, data);
      }
    } catch (err) {
      setResult({
        success: false,
        message: "Request failed. Check server logs.",
      });
      addToast(`Tax test for ${provider} failed.`, "error");
      onResult && onResult(false, null);
    }
    setLoading(false);
  };

  return (
    <div className="mt-2">
      <button
        type="button"
        className={`px-4 py-2 rounded text-white ${hasUnsaved || disabled ? "bg-slate-500 cursor-not-allowed" : "bg-sky-600 hover:bg-sky-700"}`}
        disabled={hasUnsaved || disabled || loading}
        title={
          hasUnsaved
            ? "Save settings before testing"
            : `Test ${provider} connection`
        }
        onClick={handleTest}
      >
        {loading
          ? "Testing..."
          : `Test ${provider.charAt(0).toUpperCase() + provider.slice(1)} Connection`}
      </button>
      {result && (
        <div
          className={
            result.success
              ? "text-green-400 text-xs mt-1"
              : "text-red-400 text-xs mt-1"
          }
        >
          {result.message}
        </div>
      )}
    </div>
  );
};
import React, { useState, useEffect, useMemo } from "react";
// --- Shipping Test Defaults ---
const TEST_FROM_ADDRESS = {
  firstName: "Test",
  lastName: "Sender",
  street1: "417 Montgomery St",
  city: "San Francisco",
  state: "CA",
  zip: "94104",
  country: "US",
  email: "test@example.com",
  phone: "555-555-5555",
};
const TEST_TO_ADDRESS = {
  firstName: "Test",
  lastName: "Recipient",
  street1: "1600 Amphitheatre Pkwy",
  city: "Mountain View",
  state: "CA",
  zip: "94043",
  country: "US",
  email: "test2@example.com",
  phone: "555-555-5555",
};
const TEST_PARCEL = { weight: 1, length: 10, width: 6, height: 2 };
// --- Shipping Test Button ---
const ShippingTestButton = ({ carrier, disabled, hasUnsaved, onResult }) => {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const { addToast } = useToast();

  const handleTest = async () => {
    if (hasUnsaved) {
      addToast("Please save your shipping settings before testing.", "warning");
      setResult(null);
      return;
    }
    setLoading(true);
    setResult(null);
    try {
      const res = await fetch("/api/shipping/rates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fromAddress: TEST_FROM_ADDRESS,
          toAddress: TEST_TO_ADDRESS,
          parcel: TEST_PARCEL,
          carriers: [carrier],
        }),
      });
      const data = await res.json();
      if (res.ok && data.rates && data.rates.length > 0) {
        setResult({
          success: true,
          message: `Success: ${data.rates.length} rates returned.`,
        });
        addToast(`Shipping test for ${carrier} succeeded!`, "success");
        onResult && onResult(true, data);
      } else {
        setResult({
          success: false,
          message: data.error || "No rates returned.",
        });
        addToast(`Shipping test for ${carrier} failed.`, "error");
        onResult && onResult(false, data);
      }
    } catch (err) {
      setResult({
        success: false,
        message: "Request failed. Check server logs.",
      });
      addToast(`Shipping test for ${carrier} failed.`, "error");
      onResult && onResult(false, null);
    }
    setLoading(false);
  };

  return (
    <div className="mt-2">
      <button
        type="button"
        className={`px-4 py-2 rounded text-white ${hasUnsaved || disabled ? "bg-slate-500 cursor-not-allowed" : "bg-sky-600 hover:bg-sky-700"}`}
        disabled={hasUnsaved || disabled || loading}
        title={
          hasUnsaved
            ? "Save settings before testing"
            : `Test ${carrier} connection`
        }
        onClick={handleTest}
      >
        {loading
          ? "Testing..."
          : `Test ${carrier.charAt(0).toUpperCase() + carrier.slice(1)} Connection`}
      </button>
      {result && (
        <div
          className={
            result.success
              ? "text-green-400 text-xs mt-1"
              : "text-red-400 text-xs mt-1"
          }
        >
          {result.message}
        </div>
      )}
    </div>
  );
};
import { useSiteSettings } from "../../context/SiteSettingsContext";
import { usePages } from "../../context/PagesContext";
import { useToast } from "../../hooks/useToast";
import { apiClient } from "../../services/apiClient";
import {
  SiteSettings,
  Menu,
  MenuItem,
  FooterItem,
  FooterColumn,
  TaxRule,
  ContactFormField,
} from "../../types";
import InvoiceTemplateEditor from "../../components/admin/InvoiceTemplateEditor";
import { useUnsavedChanges } from "../../context/UnsavedChangesContext";
import MenuEditor from "../../components/admin/MenuEditor"; // Correctly import the isolated component
import ImageUploadInput from "../../components/admin/ImageUploadInput";
import { US_STATES } from "../../services/taxService";
import { formatPhoneNumber, isValidPhoneNumber } from "../../utils/phoneNumber";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import {
  DndContext,
  closestCenter,
  PointerSensor,
  KeyboardSensor,
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
import { TrashIcon } from "../../components/Icons";

type SettingsTab =
  | "general"
  | "footer"
  | "menus"
  | "payment"
  | "shipping"
  | "tax"
  | "orders"
  | "email"
  | "support"
  | "segmentation"
  | "forms"
  | "terms";

// --- Draggable Item Component ---
const DraggableItem: React.FC<{
  item: FooterItem;
  isOverlay?: boolean;
  onDelete?: (itemId: string) => void;
}> = ({ item, isOverlay, onDelete }) => {
  return (
    <div
      className={`p-2 bg-slate-600 rounded-md text-white border border-slate-500 ${isOverlay ? "shadow-lg" : ""} flex justify-between items-center group`}
    >
      <span>{item.title}</span>
      {onDelete && !isOverlay && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onDelete(item.id);
          }}
          className="text-gray-400 hover:text-red-500 transition-colors shrink-0 ml-2"
          title="Delete item"
        >
          <TrashIcon className="w-4 h-4" />
        </button>
      )}
    </div>
  );
};

// --- Sortable Item Component ---
const SortableItem: React.FC<{
  item: FooterItem;
  onDelete?: (itemId: string) => void;
}> = ({ item, onDelete }) => {
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
      <DraggableItem item={item} onDelete={onDelete} />
    </div>
  );
};

// --- Droppable Column Component ---
const DroppableColumn: React.FC<{
  column: FooterColumn;
  children: React.ReactNode;
}> = ({ column, children }) => {
  const { setNodeRef } = useSortable({ id: column.id });

  return (
    <div
      ref={setNodeRef}
      className="bg-slate-900 p-4 rounded-lg min-h-50 flex flex-col gap-2"
    >
      <h3 className="text-lg font-semibold text-white capitalize mb-2">
        {column.id}
      </h3>
      <SortableContext
        items={column.items.map((i) => i.id)}
        strategy={verticalListSortingStrategy}
      >
        {children}
      </SortableContext>
    </div>
  );
};

// --- Terms and Conditions Editor Component ---
const TermsEditor: React.FC<{
  value: string;
  onChange: (value: string) => void;
}> = ({ value, onChange }) => {
  const editor = useEditor({
    extensions: [StarterKit],
    content: value,
    onUpdate: ({ editor }) => {
      onChange(editor.getHTML());
    },
  });

  const buttonClass = (isActive: boolean) =>
    `px-3 py-2 rounded ${isActive ? "bg-sky-600 text-white" : "bg-slate-700 text-gray-300 hover:bg-slate-600"} transition-colors`;

  if (!editor) return null;

  return (
    <div className="space-y-4">
      <div className="flex gap-2 flex-wrap p-3 bg-slate-900 rounded-t-lg border border-slate-700 border-b-0">
        <button
          onClick={() => editor.chain().focus().toggleBold().run()}
          className={buttonClass(editor.isActive("bold"))}
          title="Bold (Ctrl+B)"
        >
          <strong>B</strong>
        </button>
        <button
          onClick={() => editor.chain().focus().toggleItalic().run()}
          className={buttonClass(editor.isActive("italic"))}
          title="Italic (Ctrl+I)"
        >
          <em>I</em>
        </button>
        <div className="w-px bg-slate-600"></div>
        <button
          onClick={() =>
            editor.chain().focus().toggleHeading({ level: 2 }).run()
          }
          className={buttonClass(editor.isActive("heading", { level: 2 }))}
          title="Heading"
        >
          H2
        </button>
        <button
          onClick={() => editor.chain().focus().toggleBulletList().run()}
          className={buttonClass(editor.isActive("bulletList"))}
          title="Bullet List"
        >
          • List
        </button>
        <div className="w-px bg-slate-600"></div>
        <button
          onClick={() => editor.chain().focus().undo().run()}
          className={buttonClass(false)}
          title="Undo"
        >
          ↶
        </button>
        <button
          onClick={() => editor.chain().focus().redo().run()}
          className={buttonClass(false)}
          title="Redo"
        >
          ↷
        </button>
      </div>
      <div className="bg-slate-900 p-4 rounded-b-lg border border-slate-700 border-t-0">
        <div className="prose prose-invert max-w-none">
          <EditorContent
            editor={editor}
            className="bg-slate-800 text-white p-4 rounded min-h-96 focus:outline-none"
          />
        </div>
      </div>
    </div>
  );
};

// --- Form Field Editor Component ---
const FormFieldEditor: React.FC<{
  field: ContactFormField;
  index: number;
  onUpdate: (updates: Partial<ContactFormField>) => void;
  onDelete: () => void;
}> = ({ field, onUpdate, onDelete }) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: field.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="bg-slate-700 p-4 rounded-md border border-slate-600"
    >
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-3 flex-1">
          <button
            type="button"
            {...attributes}
            {...listeners}
            className="cursor-grab active:cursor-grabbing text-gray-400 hover:text-white"
            title="Drag to reorder"
          >
            ⋮⋮
          </button>
          <input
            type="checkbox"
            checked={field.enabled}
            onChange={(e) => onUpdate({ enabled: e.target.checked })}
            className="w-4 h-4"
            title="Enable/disable this field"
          />
          <select
            value={field.type}
            onChange={(e) =>
              onUpdate({ type: e.target.value as ContactFormField["type"] })
            }
            className="bg-slate-600 text-white px-2 py-1 rounded text-sm border border-slate-500"
          >
            <option value="text">Text</option>
            <option value="textarea">Textarea</option>
            <option value="email">Email</option>
            <option value="phone">Phone</option>
            <option value="fullName">Full Name</option>
            <option value="firstName">First Name</option>
            <option value="lastName">Last Name</option>
            <option value="address">Address</option>
            <option value="subject">Subject</option>
            <option value="message">Message</option>
            <option value="select">Select/Dropdown</option>
            <option value="checkbox">Checkbox</option>
          </select>
        </div>
        <div className="flex items-center gap-2">
          <label className="flex items-center gap-2 text-sm text-gray-300">
            <input
              type="checkbox"
              checked={field.required}
              onChange={(e) => onUpdate({ required: e.target.checked })}
              className="w-4 h-4"
            />
            Required
          </label>
          <button
            type="button"
            onClick={onDelete}
            className="text-gray-400 hover:text-red-500 transition-colors"
            title="Delete field"
          >
            <TrashIcon className="w-4 h-4" />
          </button>
        </div>
      </div>
      {field.enabled && (
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-gray-400 mb-1">Label</label>
              <input
                type="text"
                value={field.label}
                onChange={(e) => onUpdate({ label: e.target.value })}
                className="w-full p-2 bg-slate-600 border border-slate-500 rounded text-white text-sm"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-400 mb-1">
                Placeholder
              </label>
              <input
                type="text"
                value={field.placeholder}
                onChange={(e) => onUpdate({ placeholder: e.target.value })}
                className="w-full p-2 bg-slate-600 border border-slate-500 rounded text-white text-sm"
              />
            </div>
          </div>

          {field.type === "select" && (
            <div>
              <label className="block text-xs text-gray-400 mb-1">
                Options (comma-separated)
              </label>
              <input
                type="text"
                value={field.options?.join(", ") || ""}
                onChange={(e) =>
                  onUpdate({
                    options: e.target.value.split(",").map((o) => o.trim()),
                  })
                }
                placeholder="Option 1, Option 2, Option 3"
                className="w-full p-2 bg-slate-600 border border-slate-500 rounded text-white text-sm"
              />
            </div>
          )}
        </div>
      )}
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
  const [selectedFaviconFile, setSelectedFaviconFile] = useState<File | null>(
    null,
  );
  const [selectedLogoFile, setSelectedLogoFile] = useState<File | null>(null);
  const [activeDragItem, setActiveDragItem] = useState<FooterItem | null>(null);
  // Stripe connection test state
  const [stripeTested, setStripeTested] = useState<null | boolean>(null); // null = not tested, true = ok, false = failed
  const [stripeTestMessage, setStripeTestMessage] = useState<string>("");

  // --- State for Email Test Modal ---
  const [showEmailTestModal, setShowEmailTestModal] = useState(false);
  const [testEmailAddress, setTestEmailAddress] = useState("");
  const [testEmailLoading, setTestEmailLoading] = useState(false);

  // --- State for Menu Editor ---
  const [selectedMenuId, setSelectedMenuId] = useState<string | null>(null);
  const [currentMenu, setCurrentMenu] = useState<Menu | null>(null);
  const [originalMenu, setOriginalMenu] = useState<Menu | null>(null);

  // --- State for Tax Management ---
  const [taxRules, setTaxRules] = useState<TaxRule[]>(
    siteSettings.taxConfig?.rules || [],
  );
  const [enableTax, setEnableTax] = useState(
    siteSettings.taxConfig?.enableTaxCollection ?? true,
  );
  const [defaultTaxRate, setDefaultTaxRate] = useState(
    siteSettings.taxConfig?.defaultTaxRate ?? 0,
  );
  const [editingTaxId, setEditingTaxId] = useState<string | null>(null);
  const [taxFormData, setTaxFormData] = useState<Partial<TaxRule>>({
    name: "",
    states: [],
    taxRate: 0,
    exemptedProductIds: [],
    enabled: true,
    priority: 0,
  });
  const [commerceStatus, setCommerceStatus] = useState<any>(null);

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

  useEffect(() => {
    const loadCommerceStatus = async () => {
      try {
        const status = await apiClient.settings.getCommerceStatus();
        setCommerceStatus(status);
      } catch {
        setCommerceStatus(null);
      }
    };

    loadCommerceStatus();
  }, [siteSettings]);

  // Initialize default form fields if they don't exist
  useEffect(() => {
    if (
      !settings.defaultFormFields ||
      settings.defaultFormFields.length === 0
    ) {
      const defaultFields: ContactFormField[] = [
        {
          id: "f1",
          type: "fullName",
          label: "Full Name",
          placeholder: "John Doe",
          required: true,
          enabled: true,
        },
        {
          id: "f2",
          type: "email",
          label: "Email Address",
          placeholder: "john@example.com",
          required: true,
          enabled: true,
          validation: { pattern: "^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$" },
        },
        {
          id: "f3",
          type: "phone",
          label: "Phone Number",
          placeholder: "(555) 123-4567",
          required: false,
          enabled: true,
          validation: { pattern: "^[\\d\\s()+-]+$" },
        },
        {
          id: "f4",
          type: "subject",
          label: "Subject",
          placeholder: "How can we help?",
          required: true,
          enabled: true,
        },
        {
          id: "f5",
          type: "message",
          label: "Message",
          placeholder: "Your message here...",
          required: true,
          enabled: true,
          validation: { minLength: 10 },
        },
      ];
      setSettings((prev) => ({ ...prev, defaultFormFields: defaultFields }));
    }
  }, [settings.defaultFormFields]);

  // Load email config from dedicated table on mount
  useEffect(() => {
    const loadEmailConfig = async () => {
      try {
        const emailConfig = await apiClient.request<any>("/email-config");
        if (emailConfig && Object.keys(emailConfig).length > 0) {
          setSettings((prev) => ({
            ...prev,
            emailConfig: {
              ...prev.emailConfig,
              ...emailConfig,
            },
          }));
        }
      } catch (error) {
        console.log("No email config found, using defaults");
      }
    };
    loadEmailConfig();
  }, []);

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
      { id: "contactInfo", type: "contactInfo", title: "Contact Info" },
      { id: "socialLinks", type: "socialLinks", title: "Social Links" },
    ];
    const menuItems: FooterItem[] = menus.map((menu) => ({
      id: `menu_${menu.id}`,
      type: "menu",
      menuId: menu.id,
      title: `Menu: ${menu.name}`,
    }));
    return [...defaultItems, ...menuItems];
  }, [menus]);

  // Sensors for drag-and-drop (form fields)
  const formFieldSensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor),
  );

  const handleDragStart = (event: DragStartEvent) => {
    const { active } = event;
    const item =
      availableFooterItems.find((i) => i.id === active.id) ||
      settings.footerConfig?.columns
        .flatMap((c) => c.items)
        .find((i) => i.id === active.id);
    setActiveDragItem(item || null);
  };

  const handleDeleteFooterItem = (itemId: string) => {
    setSettings((prev) => {
      if (!prev || !prev.footerConfig) return prev;

      const newColumns = prev.footerConfig.columns.map((column) => ({
        ...column,
        items: column.items.filter((item) => item.id !== itemId),
      }));

      return { ...prev, footerConfig: { columns: newColumns } };
    });
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveDragItem(null);

    if (!over) return;

    const activeId = active.id.toString();
    const overId = over.id.toString();

    setSettings((prev) => {
      if (!prev || !prev.footerConfig) return prev;

      const newColumns = [...prev.footerConfig.columns];

      const activeContainer =
        findContainer(activeId, newColumns) || "available";
      const overContainer =
        findContainer(overId, newColumns) || findColumn(overId, newColumns)?.id;

      if (!activeContainer || !overContainer) return prev;

      let activeItem =
        findItem(activeId, newColumns) ||
        availableFooterItems.find((i) => i.id === activeId);
      if (!activeItem) return prev;

      // Moving an item
      if (activeContainer !== overContainer) {
        // Remove from old container
        if (activeContainer !== "available") {
          const oldColumn = newColumns.find((c) => c.id === activeContainer);
          if (oldColumn)
            oldColumn.items = oldColumn.items.filter((i) => i.id !== activeId);
        }

        // Add to new container
        if (overContainer !== "available") {
          const newColumn = newColumns.find((c) => c.id === overContainer);
          if (newColumn) {
            const overIndex = newColumn.items.findIndex((i) => i.id === overId);
            if (overIndex !== -1) {
              newColumn.items.splice(overIndex, 0, activeItem!);
            } else {
              newColumn.items.push(activeItem!);
            }
          }
        }
      } else {
        // Sorting within the same container
        const column = newColumns.find((c) => c.id === activeContainer);
        if (column) {
          const oldIndex = column.items.findIndex((i) => i.id === activeId);
          const newIndex = column.items.findIndex((i) => i.id === overId);
          if (oldIndex !== -1 && newIndex !== -1) {
            column.items = arrayMove(column.items, oldIndex, newIndex);
          }
        }
      }

      return { ...prev, footerConfig: { columns: newColumns } };
    });
  };

  const findContainer = (id: string, columns: FooterColumn[]) => {
    if (availableFooterItems.some((i) => i.id === id)) return "available";
    return columns.find((c) => c.items.some((i) => i.id === id))?.id;
  };

  const findColumn = (id: string, columns: FooterColumn[]) => {
    return columns.find((c) => c.id === id);
  };

  const findItem = (id: string, columns: FooterColumn[]) => {
    return columns.flatMap((c) => c.items).find((i) => i.id === id);
  };

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
  );

  const handleSaveSettings = async () => {
    try {
      let finalSettings = { ...settings };

      finalSettings.fromAddress = {
        firstName: "",
        lastName: "",
        street1: "",
        city: "",
        state: "",
        zip: "",
        email: "",
        phone: "",
        ...finalSettings.fromAddress,
        country:
          String(finalSettings.fromAddress?.country || "US").trim() || "US",
        street2: String(finalSettings.fromAddress?.street2 || "").trim(),
      };

      finalSettings.defaultParcel = {
        weight: Math.max(
          0.1,
          Number((finalSettings as any).defaultParcel?.weight) || 1,
        ),
        length: Math.max(
          1,
          Number((finalSettings as any).defaultParcel?.length) || 12,
        ),
        width: Math.max(
          1,
          Number((finalSettings as any).defaultParcel?.width) || 9,
        ),
        height: Math.max(
          1,
          Number((finalSettings as any).defaultParcel?.height) || 3,
        ),
      };

      const stripePublishableKey = String(
        (finalSettings.paymentApiKeys as any)?.stripePublishableKey || "",
      ).trim();
      const stripeSecretKey = String(
        finalSettings.paymentApiKeys?.stripe || "",
      ).trim();
      finalSettings.paymentApiKeys = {
        stripe: stripeSecretKey,
        stripePublishableKey,
        paypal: String(finalSettings.paymentApiKeys?.paypal || "").trim(),
        paypalSecret: String(
          (finalSettings.paymentApiKeys as any)?.paypalSecret || "",
        ).trim(),
        square: String(finalSettings.paymentApiKeys?.square || "").trim(),
        squareApplicationId: String(
          (finalSettings.paymentApiKeys as any)?.squareApplicationId || "",
        ).trim(),
        squareLocationId: String(
          (finalSettings.paymentApiKeys as any)?.squareLocationId || "",
        ).trim(),
        authorizeNet: String(
          finalSettings.paymentApiKeys?.authorizeNet || "",
        ).trim(),
        authorizeNetPublicKey: String(
          (finalSettings.paymentApiKeys as any)?.authorizeNetPublicKey || "",
        ).trim(),
      } as any;

      const selectedPaymentProvider = String(
        finalSettings.paymentProvider || "none",
      );
      // Map provider to required key for connection
      const requiredKeyMap: Record<string, string> = {
        stripe: "stripePublishableKey",
        paypal: "paypal",
        square: "squareApplicationId",
        authorizeNet: "authorizeNetPublicKey",
      };
      if (selectedPaymentProvider !== "none") {
        const requiredKey = requiredKeyMap[selectedPaymentProvider];
        const keyValue = (finalSettings.paymentApiKeys as any)?.[requiredKey];
        if (!keyValue || String(keyValue).trim() === "") {
          addToast(
            `Please enter the required API credential (${requiredKey}) for ${selectedPaymentProvider} before saving.`,
            "error",
          );
          return;
        }
      }

      const footerPhone = finalSettings.footerConfig?.contactPhone?.trim();
      const fromAddressPhone = finalSettings.fromAddress?.phone?.trim();

      if (footerPhone && !isValidPhoneNumber(footerPhone)) {
        addToast(
          "Footer contact phone must be in format: (555) 123-4567",
          "error",
        );
        return;
      }

      if (fromAddressPhone && !isValidPhoneNumber(fromAddressPhone)) {
        addToast(
          "Shipping from-address phone must be in format: (555) 123-4567",
          "error",
        );
        return;
      }

      if (selectedFaviconFile) {
        try {
          const data = await apiClient.upload.image(selectedFaviconFile, {
            target: "favicon",
          });
          if (data.success && data.imageUrl) {
            finalSettings.faviconUrl = data.imageUrl;
            addToast("Favicon uploaded successfully!", "success");
          } else {
            throw new Error("Upload failed");
          }
        } catch (error) {
          addToast("Favicon upload failed!", "error");
          return;
        }
      }

      if (selectedLogoFile) {
        try {
          const data = await apiClient.upload.image(selectedLogoFile, {
            target: "generic",
          });
          if (data.success && data.imageUrl) {
            finalSettings.headerLogoUrl = data.imageUrl;
            addToast("Header logo uploaded successfully!", "success");
          } else {
            throw new Error("Upload failed");
          }
        } catch (error) {
          addToast("Header logo upload failed!", "error");
          return;
        }
      }

      // Prevent saving blob: URLs to settings
      if (
        finalSettings.faviconUrl &&
        finalSettings.faviconUrl.startsWith("blob:")
      ) {
        finalSettings.faviconUrl = "";
      }
      if (
        finalSettings.headerLogoUrl &&
        finalSettings.headerLogoUrl.startsWith("blob:")
      ) {
        finalSettings.headerLogoUrl = "";
      }

      console.log("Attempting to save settings:", finalSettings);

      await updateSiteSettings(finalSettings);
      setSettings(finalSettings);

      const emailConfig = finalSettings.emailConfig;
      if (
        emailConfig?.provider &&
        emailConfig.provider !== "none" &&
        emailConfig.fromEmail &&
        emailConfig.fromName
      ) {
        try {
          await apiClient.emailConfig.save(emailConfig);
        } catch (emailSyncError) {
          console.warn(
            "Email config sync failed after settings save:",
            emailSyncError,
          );
          addToast(
            "Settings saved, but email provider sync failed. Re-check Email tab config.",
            "error",
          );
        }
      }

      try {
        const status = await apiClient.settings.getCommerceStatus();
        setCommerceStatus(status);
      } catch {
        setCommerceStatus(null);
      }

      addToast("Settings updated successfully!", "success");
      setSelectedFaviconFile(null);
      setSelectedLogoFile(null);
    } catch (error) {
      console.error("Failed to save settings:", error);
      addToast("Failed to save settings. Check console for details.", "error");
    }
  };

  const handleInputChange = (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
    >,
  ) => {
    const { name, value, type } = e.target;
    const parsedValue = type === "number" ? parseFloat(value) : value;

    // Handle footerConfig nested fields
    if (name.startsWith("footerContact")) {
      const fieldName = name.replace("footerContact", "").toLowerCase();
      setSettings((prev) => ({
        ...prev,
        footerConfig: {
          columns: prev.footerConfig?.columns || [],
          socialLinks: prev.footerConfig?.socialLinks || [],
          ...prev.footerConfig,
          [fieldName === "email"
            ? "contactEmail"
            : fieldName === "phone"
              ? "contactPhone"
              : "contactAddress"]: parsedValue,
        },
      }));
    } else {
      setSettings((prev) => ({ ...prev, [name]: parsedValue }));
    }
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
    const updatedLinks = settings.footerConfig?.socialLinks?.map((link) =>
      link.id === id ? { ...link, [field]: value } : link,
    );
    setSettings((prev) => ({
      ...prev,
      footerConfig: {
        columns: prev.footerConfig?.columns || [],
        ...prev.footerConfig,
        socialLinks: updatedLinks || [],
      },
    }));
  };

  const addSocialLink = () => {
    const newLink = {
      id: `social-${Date.now()}`,
      text: "",
      url: "",
    };
    setSettings((prev) => ({
      ...prev,
      footerConfig: {
        columns: prev.footerConfig?.columns || [],
        ...prev.footerConfig,
        socialLinks: [...(prev.footerConfig?.socialLinks || []), newLink],
      },
    }));
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
      className={`px-3 py-2 text-sm font-medium rounded-t-md transition-colors whitespace-nowrap ${activeTab === tab ? "bg-slate-800 text-white" : "bg-slate-900 text-gray-400 hover:text-white"}`}
    >
      {label}
    </button>
  );

  if (!siteSettings) return null;

  return (
    <div>
      <h1 className="text-3xl font-bold text-white mb-8">Site Settings</h1>

      <div className="flex flex-wrap gap-1 border-b border-slate-700 overflow-x-auto">
        <TabButton tab="general" label="General" />
        <TabButton tab="footer" label="Footer" />
        <TabButton tab="menus" label="Menus" />
        <TabButton tab="payment" label="Payment" />
        <TabButton tab="shipping" label="Shipping" />
        <TabButton tab="tax" label="Tax Rules" />
        <TabButton tab="orders" label="Orders" />
        <TabButton tab="email" label="Email Configuration" />
        <TabButton tab="support" label="Support" />
        <TabButton tab="segmentation" label="Segmentation" />
        <TabButton tab="forms" label="Form Fields" />
        <TabButton tab="terms" label="Terms & Conditions" />
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
              imageUrl={
                selectedFaviconFile
                  ? URL.createObjectURL(selectedFaviconFile)
                  : settings.faviconUrl || ""
              }
              onImageUrlChange={() => {
                setSelectedFaviconFile(null);
                setSettings((prev) => ({ ...prev!, faviconUrl: "" }));
              }}
              onFileSelect={async (file) => {
                setSelectedFaviconFile(file);
                try {
                  const data = await apiClient.upload.image(file, {
                    target: "favicon",
                  });
                  if (data.success && data.imageUrl) {
                    setSettings((prev) => ({
                      ...prev!,
                      faviconUrl: data.imageUrl,
                    }));
                    setSelectedFaviconFile(null);
                  } else {
                    throw new Error("Upload failed");
                  }
                } catch (err) {
                  setSettings((prev) => ({ ...prev!, faviconUrl: "" }));
                  setSelectedFaviconFile(null);
                  addToast("Favicon upload failed!", "error");
                }
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
              imageUrl={
                selectedLogoFile
                  ? URL.createObjectURL(selectedLogoFile)
                  : settings.headerLogoUrl || ""
              }
              onImageUrlChange={() => {
                setSelectedLogoFile(null);
                setSettings((prev) => ({ ...prev!, headerLogoUrl: "" }));
              }}
              onFileSelect={async (file) => {
                setSelectedLogoFile(file);
                try {
                  const data = await apiClient.upload.image(file, {
                    target: "generic",
                  });
                  if (data.success && data.imageUrl) {
                    setSettings((prev) => ({
                      ...prev!,
                      headerLogoUrl: data.imageUrl,
                    }));
                    setSelectedLogoFile(null);
                  } else {
                    throw new Error("Upload failed");
                  }
                } catch (err) {
                  setSettings((prev) => ({ ...prev!, headerLogoUrl: "" }));
                  setSelectedLogoFile(null);
                  addToast("Header logo upload failed!", "error");
                }
              }}
            />

            <div className="border-t border-slate-700 pt-6">
              <h3 className="text-lg font-semibold text-white mb-4">
                Font Settings
              </h3>
              <div>
                <label
                  htmlFor="globalFont"
                  className="block text-gray-300 text-sm font-bold mb-1"
                >
                  Site-Wide Default Font
                </label>
                <select
                  id="globalFont"
                  name="globalFont"
                  value={settings.globalFont || "Arial"}
                  onChange={handleInputChange}
                  className={inputClasses}
                >
                  <option value="Arial">Arial</option>
                  <option value="Helvetica">Helvetica</option>
                  <option value="Times New Roman">Times New Roman</option>
                  <option value="Georgia">Georgia</option>
                  <option value="Courier New">Courier New</option>
                  <option value="Verdana">Verdana</option>
                  <option value="Comic Sans MS">Comic Sans MS</option>
                  <option value="Impact">Impact</option>
                  <option value="Trebuchet MS">Trebuchet MS</option>
                </select>
                <p className="text-xs text-gray-400 mt-1">
                  This font applies to your entire site. Individual pages can
                  override this setting.
                </p>
              </div>
            </div>

            <div className="border-t border-slate-700 pt-6">
              <h3 className="text-lg font-semibold text-white mb-4">
                Review Settings
              </h3>
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
                <p className="text-xs text-gray-400 mt-1">
                  Shows the most recent approved reviews up to this limit
                </p>
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

        {activeTab === "footer" && (
          <div className="space-y-8">
            <div>
              <h2 className="text-2xl font-semibold text-white mb-6">
                Footer Configuration
              </h2>
            </div>

            {/* Contact Information Section */}
            <div className="bg-slate-800 p-6 rounded-lg border border-slate-700">
              <h3 className="text-lg font-semibold text-white mb-4">
                Contact Information
              </h3>
              <div className="space-y-4">
                <div>
                  <label
                    htmlFor="footerContactEmail"
                    className="block text-sm font-medium text-gray-400 mb-1"
                  >
                    Contact Email
                  </label>
                  <input
                    type="email"
                    id="footerContactEmail"
                    name="footerContactEmail"
                    value={settings.footerConfig?.contactEmail || ""}
                    onChange={handleInputChange}
                    placeholder="support@example.com"
                    className={inputClasses}
                  />
                </div>
                <div>
                  <label
                    htmlFor="footerContactPhone"
                    className="block text-sm font-medium text-gray-400 mb-1"
                  >
                    Contact Phone
                  </label>
                  <input
                    type="tel"
                    id="footerContactPhone"
                    name="footerContactPhone"
                    value={settings.footerConfig?.contactPhone || ""}
                    onChange={(e) => {
                      const formatted = formatPhoneNumber(e.target.value);
                      setSettings({
                        ...settings,
                        footerConfig: {
                          ...settings.footerConfig!,
                          contactPhone: formatted,
                        },
                      });
                    }}
                    placeholder="(555) 123-4567"
                    inputMode="numeric"
                    maxLength={14}
                    className={inputClasses}
                  />
                </div>
                <div>
                  <label
                    htmlFor="footerContactAddress"
                    className="block text-sm font-medium text-gray-400 mb-1"
                  >
                    Address
                  </label>
                  <input
                    type="text"
                    id="footerContactAddress"
                    name="footerContactAddress"
                    value={settings.footerConfig?.contactAddress || ""}
                    onChange={handleInputChange}
                    placeholder="123 Main St, City, ST 12345"
                    className={inputClasses}
                  />
                </div>
              </div>
            </div>

            {/* Social Links Section */}
            <div className="bg-slate-800 p-6 rounded-lg border border-slate-700">
              <h3 className="text-lg font-semibold text-white mb-4">
                Social Links
              </h3>
              <div className="space-y-3">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-2">
                  <label className="block text-sm font-medium text-gray-400">
                    Link Text
                  </label>
                  <label className="block text-sm font-medium text-gray-400">
                    Link URL
                  </label>
                </div>
                {settings.footerConfig?.socialLinks?.map((link) => (
                  <div
                    key={link.id}
                    className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-2 items-end"
                  >
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
                    <button
                      onClick={() => {
                        setSettings((prev) => ({
                          ...prev,
                          footerConfig: {
                            columns: prev.footerConfig?.columns || [],
                            ...prev.footerConfig,
                            socialLinks:
                              prev.footerConfig?.socialLinks?.filter(
                                (l) => l.id !== link.id,
                              ) || [],
                          },
                        }));
                      }}
                      className="text-gray-400 hover:text-red-500 transition-colors"
                      title="Delete link"
                    >
                      <TrashIcon className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
              <button
                onClick={addSocialLink}
                className="mt-4 px-4 py-2 bg-slate-700 text-white rounded hover:bg-slate-600 text-sm"
              >
                + Add Social Link
              </button>
            </div>

            {/* Footer Layout Section */}
            <div className="bg-slate-800 p-6 rounded-lg border border-slate-700">
              <h3 className="text-lg font-semibold text-white mb-4">
                Footer Layout & Content
              </h3>
              <p className="text-sm text-gray-400 mb-4">
                Drag items from "Available Items" to the footer columns (Left,
                Center, Right). Click the ✕ button to remove items.
              </p>

              <DndContext
                sensors={sensors}
                collisionDetection={closestCenter}
                onDragStart={handleDragStart}
                onDragEnd={handleDragEnd}
              >
                <div className="grid grid-cols-4 gap-4">
                  {/* Available Items */}
                  <div className="col-span-1">
                    <h4 className="text-md font-semibold text-white mb-2">
                      Available Items
                    </h4>
                    <div className="space-y-2 p-4 bg-slate-900 rounded-lg">
                      <SortableContext
                        items={availableFooterItems.map((i) => i.id)}
                        strategy={verticalListSortingStrategy}
                      >
                        {availableFooterItems
                          .filter(
                            (item) =>
                              !findItem(
                                item.id,
                                settings.footerConfig?.columns || [],
                              ),
                          )
                          .map((item) => (
                            <SortableItem
                              key={item.id}
                              item={item}
                              onDelete={handleDeleteFooterItem}
                            />
                          ))}
                      </SortableContext>
                    </div>
                  </div>

                  {/* Footer Columns */}
                  <div className="col-span-3 grid grid-cols-3 gap-4">
                    {settings.footerConfig?.columns.map((column) => (
                      <DroppableColumn key={column.id} column={column}>
                        {column.items.map((item) => (
                          <SortableItem
                            key={item.id}
                            item={item}
                            onDelete={handleDeleteFooterItem}
                          />
                        ))}
                      </DroppableColumn>
                    ))}
                  </div>
                </div>
                <DragOverlay>
                  {activeDragItem ? (
                    <DraggableItem item={activeDragItem} isOverlay />
                  ) : null}
                </DragOverlay>
              </DndContext>
            </div>

            {/* Save Button */}
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
            {commerceStatus?.payment && !commerceStatus.payment.available && (
              <div className="rounded-lg border border-amber-500/60 bg-amber-500/10 p-4 text-amber-100">
                <p className="font-semibold">Payment is not fully configured</p>
                <p className="text-sm mt-1">
                  {commerceStatus.payment.reason ||
                    "Customers will be offered a sales-team approval request flow until payment setup is completed."}
                </p>
              </div>
            )}
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
              <div className="space-y-3">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">
                    Stripe Publishable Key
                  </label>
                  <input
                    type="text"
                    value={
                      (settings.paymentApiKeys as any)?.stripePublishableKey ||
                      ""
                    }
                    onChange={(e) =>
                      handleApiKeyChange(
                        "paymentApiKeys",
                        "stripePublishableKey",
                        e.target.value,
                      )
                    }
                    placeholder="pk_test_************************"
                    className={inputClasses}
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Used by the checkout page. Starts with pk_test_ or pk_live_.
                  </p>
                  {!(settings.paymentApiKeys as any)?.stripePublishableKey && (
                    <p className="text-xs text-red-400 mt-1">
                      Publishable key is required for Stripe payments.
                    </p>
                  )}
                </div>
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
                  <p className="text-xs text-gray-500 mt-1">
                    Server-side only. Never exposed to the browser. Starts with
                    sk_test_ or sk_live_.
                  </p>
                  {!settings.paymentApiKeys?.stripe && (
                    <p className="text-xs text-red-400 mt-1">
                      Secret key is required for Stripe payments.
                    </p>
                  )}
                </div>
                <PaymentTestButton
                  provider="stripe"
                  hasUnsaved={hasSettingsUnsavedChanges}
                  onResult={async (success: boolean, data: any) => {
                    setStripeTested(success);
                    setStripeTestMessage(
                      data?.message ||
                        (success
                          ? "Stripe connection successful."
                          : "Stripe connection test failed."),
                    );

                    try {
                      const status =
                        await apiClient.settings.getCommerceStatus();
                      setCommerceStatus(status);
                    } catch {
                      // Keep existing status if refresh fails
                    }
                  }}
                />
              </div>
            )}

            {settings.paymentProvider === "paypal" && (
              <div className="space-y-3">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">
                    PayPal Client ID
                  </label>
                  <input
                    type="text"
                    value={settings.paymentApiKeys?.paypal || ""}
                    onChange={(e) =>
                      handleApiKeyChange(
                        "paymentApiKeys",
                        "paypal",
                        e.target.value,
                      )
                    }
                    placeholder="PayPal Client ID"
                    className={inputClasses}
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Public key used by the checkout page.
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">
                    PayPal Client Secret
                  </label>
                  <input
                    type="password"
                    value={(settings.paymentApiKeys as any)?.paypalSecret || ""}
                    onChange={(e) =>
                      handleApiKeyChange(
                        "paymentApiKeys",
                        "paypalSecret",
                        e.target.value,
                      )
                    }
                    placeholder="PayPal Client Secret"
                    className={inputClasses}
                  />
                </div>
                <PaymentTestButton
                  provider="paypal"
                  hasUnsaved={hasSettingsUnsavedChanges}
                />
              </div>
            )}

            {settings.paymentProvider === "square" && (
              <div className="space-y-3">
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
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">
                    Square Application ID
                  </label>
                  <input
                    type="text"
                    value={
                      (settings.paymentApiKeys as any)?.squareApplicationId ||
                      ""
                    }
                    onChange={(e) =>
                      handleApiKeyChange(
                        "paymentApiKeys",
                        "squareApplicationId",
                        e.target.value,
                      )
                    }
                    placeholder="sandbox-sq0idb-..."
                    className={inputClasses}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">
                    Square Location ID
                  </label>
                  <input
                    type="text"
                    value={
                      (settings.paymentApiKeys as any)?.squareLocationId || ""
                    }
                    onChange={(e) =>
                      handleApiKeyChange(
                        "paymentApiKeys",
                        "squareLocationId",
                        e.target.value,
                      )
                    }
                    placeholder="Location ID"
                    className={inputClasses}
                  />
                </div>
                <PaymentTestButton
                  provider="square"
                  hasUnsaved={hasSettingsUnsavedChanges}
                />
              </div>
            )}

            {settings.paymentProvider === "authorizeNet" && (
              <div className="space-y-3">
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
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">
                    Public Client Key
                  </label>
                  <input
                    type="text"
                    value={
                      (settings.paymentApiKeys as any)?.authorizeNetPublicKey ||
                      ""
                    }
                    onChange={(e) =>
                      handleApiKeyChange(
                        "paymentApiKeys",
                        "authorizeNetPublicKey",
                        e.target.value,
                      )
                    }
                    placeholder="Public Client Key"
                    className={inputClasses}
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Used by Accept.js in the browser.
                  </p>
                </div>
                <PaymentTestButton
                  provider="authorizeNet"
                  hasUnsaved={hasSettingsUnsavedChanges}
                />
              </div>
            )}

            <div className="flex justify-between items-center pt-4">
              <div>
                <span className="text-gray-400">Status: </span>
                {settings.paymentProvider === "stripe" ? (
                  stripeTested === true ? (
                    <span className="text-green-400 font-semibold">
                      Connected
                    </span>
                  ) : stripeTested === false ? (
                    <span className="text-red-400 font-semibold">
                      Not Connected
                    </span>
                  ) : (
                    <span className="text-yellow-400">Not Connected</span>
                  )
                ) : settings.paymentProvider !== "none" &&
                  settings.paymentApiKeys?.[
                    settings.paymentProvider as keyof typeof settings.paymentApiKeys
                  ] ? (
                  <span className="text-green-400 font-semibold">
                    Connected
                  </span>
                ) : (
                  <span className="text-yellow-400">Not Connected</span>
                )}
                {settings.paymentProvider === "stripe" && stripeTestMessage ? (
                  <div className="text-xs text-gray-400 mt-1">
                    {stripeTestMessage}
                  </div>
                ) : null}
              </div>
              <button onClick={handleSaveSettings} className={buttonClasses}>
                Save & Connect
              </button>
            </div>
          </div>
        )}

        {activeTab === "shipping" && (
          <div className="space-y-6">
            <h2 className="text-2xl font-semibold text-white mb-4">
              Shipping Configuration
            </h2>
            {commerceStatus?.shipping && !commerceStatus.shipping.available && (
              <div className="rounded-lg border border-amber-500/60 bg-amber-500/10 p-4 text-amber-100">
                <p className="font-semibold">
                  Shipping is not fully configured
                </p>
                <p className="text-sm mt-1">
                  {commerceStatus.shipping.reason ||
                    "Customers will be offered a sales-team approval request flow until shipping setup is completed."}
                </p>
              </div>
            )}

            {/* From Address */}
            <div className="bg-slate-700 p-6 rounded-lg border border-slate-600">
              <h3 className="text-lg font-semibold text-white mb-4">
                Sender Address
              </h3>
              <div className="grid grid-cols-2 gap-4">
                <input
                  type="text"
                  placeholder="First Name"
                  value={settings.fromAddress?.firstName || ""}
                  onChange={(e) =>
                    setSettings((prev) => ({
                      ...prev!,
                      fromAddress: {
                        lastName: "",
                        street1: "",
                        street2: "",
                        city: "",
                        state: "",
                        zip: "",
                        country: "US",
                        email: "",
                        phone: "",
                        ...prev!.fromAddress,
                        firstName: e.target.value,
                      },
                    }))
                  }
                  className={inputClasses}
                />
                <input
                  type="text"
                  placeholder="Last Name"
                  value={settings.fromAddress?.lastName || ""}
                  onChange={(e) =>
                    setSettings((prev) => ({
                      ...prev!,
                      fromAddress: {
                        firstName: "",
                        street1: "",
                        street2: "",
                        city: "",
                        state: "",
                        zip: "",
                        country: "US",
                        email: "",
                        phone: "",
                        ...prev!.fromAddress,
                        lastName: e.target.value,
                      },
                    }))
                  }
                  className={inputClasses}
                />
                <input
                  type="email"
                  placeholder="Email"
                  value={settings.fromAddress?.email || ""}
                  onChange={(e) =>
                    setSettings((prev) => ({
                      ...prev!,
                      fromAddress: {
                        firstName: "",
                        lastName: "",
                        street1: "",
                        street2: "",
                        city: "",
                        state: "",
                        zip: "",
                        country: "US",
                        phone: "",
                        ...prev!.fromAddress,
                        email: e.target.value,
                      },
                    }))
                  }
                  className={inputClasses}
                />
                <input
                  type="text"
                  placeholder="Street Address"
                  value={settings.fromAddress?.street1 || ""}
                  onChange={(e) =>
                    setSettings((prev) => ({
                      ...prev!,
                      fromAddress: {
                        firstName: "",
                        lastName: "",
                        street2: "",
                        city: "",
                        state: "",
                        zip: "",
                        country: "US",
                        email: "",
                        phone: "",
                        ...prev!.fromAddress,
                        street1: e.target.value,
                      },
                    }))
                  }
                  className={inputClasses}
                />
                <input
                  type="text"
                  placeholder="Street Address Line 2"
                  value={settings.fromAddress?.street2 || ""}
                  onChange={(e) =>
                    setSettings((prev) => ({
                      ...prev!,
                      fromAddress: {
                        firstName: "",
                        lastName: "",
                        street1: "",
                        city: "",
                        state: "",
                        zip: "",
                        country: "US",
                        email: "",
                        phone: "",
                        ...prev!.fromAddress,
                        street2: e.target.value,
                      },
                    }))
                  }
                  className={inputClasses}
                />
                <input
                  type="text"
                  placeholder="City"
                  value={settings.fromAddress?.city || ""}
                  onChange={(e) =>
                    setSettings((prev) => ({
                      ...prev!,
                      fromAddress: {
                        firstName: "",
                        lastName: "",
                        street1: "",
                        street2: "",
                        state: "",
                        zip: "",
                        country: "US",
                        email: "",
                        phone: "",
                        ...prev!.fromAddress,
                        city: e.target.value,
                      },
                    }))
                  }
                  className={inputClasses}
                />
                <select
                  value={settings.fromAddress?.state || ""}
                  onChange={(e) =>
                    setSettings((prev) => ({
                      ...prev!,
                      fromAddress: {
                        firstName: "",
                        lastName: "",
                        street1: "",
                        street2: "",
                        city: "",
                        zip: "",
                        country: "US",
                        email: "",
                        phone: "",
                        ...prev!.fromAddress,
                        state: e.target.value,
                      },
                    }))
                  }
                  className={inputClasses}
                >
                  <option value="">Select State</option>
                  {US_STATES.map((state) => (
                    <option key={state} value={state}>
                      {state}
                    </option>
                  ))}
                </select>
                <input
                  type="text"
                  placeholder="ZIP Code"
                  value={settings.fromAddress?.zip || ""}
                  onChange={(e) =>
                    setSettings((prev) => ({
                      ...prev!,
                      fromAddress: {
                        firstName: "",
                        lastName: "",
                        street1: "",
                        street2: "",
                        city: "",
                        state: "",
                        country: "US",
                        email: "",
                        phone: "",
                        ...prev!.fromAddress,
                        zip: e.target.value,
                      },
                    }))
                  }
                  className={inputClasses}
                />
                <input
                  type="tel"
                  placeholder="Phone Number"
                  value={settings.fromAddress?.phone || ""}
                  onChange={(e) =>
                    setSettings((prev) => ({
                      ...prev!,
                      fromAddress: {
                        firstName: "",
                        lastName: "",
                        street1: "",
                        street2: "",
                        city: "",
                        state: "",
                        zip: "",
                        country: "US",
                        email: "",
                        ...prev!.fromAddress,
                        phone: formatPhoneNumber(e.target.value),
                      },
                    }))
                  }
                  inputMode="numeric"
                  maxLength={14}
                  className={inputClasses}
                />
              </div>
            </div>

            {/* Default Parcel */}
            <div className="bg-slate-700 p-6 rounded-lg border border-slate-600">
              <h3 className="text-lg font-semibold text-white mb-4">
                Default Parcel Dimensions
              </h3>
              <p className="text-sm text-gray-400 mb-4">
                Used to quote live shipping rates during checkout.
              </p>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <input
                  type="number"
                  min="0.1"
                  step="0.1"
                  placeholder="Weight (lb)"
                  value={(settings as any).defaultParcel?.weight ?? ""}
                  onChange={(e) =>
                    setSettings((prev) => ({
                      ...prev!,
                      defaultParcel: {
                        weight: Number(e.target.value),
                        length:
                          Number((prev as any)?.defaultParcel?.length) || 12,
                        width: Number((prev as any)?.defaultParcel?.width) || 9,
                        height:
                          Number((prev as any)?.defaultParcel?.height) || 3,
                      },
                    }))
                  }
                  className={inputClasses}
                />
                <input
                  type="number"
                  min="1"
                  step="1"
                  placeholder="Length (in)"
                  value={(settings as any).defaultParcel?.length ?? ""}
                  onChange={(e) =>
                    setSettings((prev) => ({
                      ...prev!,
                      defaultParcel: {
                        weight:
                          Number((prev as any)?.defaultParcel?.weight) || 1,
                        length: Number(e.target.value),
                        width: Number((prev as any)?.defaultParcel?.width) || 9,
                        height:
                          Number((prev as any)?.defaultParcel?.height) || 3,
                      },
                    }))
                  }
                  className={inputClasses}
                />
                <input
                  type="number"
                  min="1"
                  step="1"
                  placeholder="Width (in)"
                  value={(settings as any).defaultParcel?.width ?? ""}
                  onChange={(e) =>
                    setSettings((prev) => ({
                      ...prev!,
                      defaultParcel: {
                        weight:
                          Number((prev as any)?.defaultParcel?.weight) || 1,
                        length:
                          Number((prev as any)?.defaultParcel?.length) || 12,
                        width: Number(e.target.value),
                        height:
                          Number((prev as any)?.defaultParcel?.height) || 3,
                      },
                    }))
                  }
                  className={inputClasses}
                />
                <input
                  type="number"
                  min="1"
                  step="1"
                  placeholder="Height (in)"
                  value={(settings as any).defaultParcel?.height ?? ""}
                  onChange={(e) =>
                    setSettings((prev) => ({
                      ...prev!,
                      defaultParcel: {
                        weight:
                          Number((prev as any)?.defaultParcel?.weight) || 1,
                        length:
                          Number((prev as any)?.defaultParcel?.length) || 12,
                        width: Number((prev as any)?.defaultParcel?.width) || 9,
                        height: Number(e.target.value),
                      },
                    }))
                  }
                  className={inputClasses}
                />
              </div>
            </div>

            {/* Carrier Configuration */}
            <div className="bg-slate-700 p-6 rounded-lg border border-slate-600">
              <h3 className="text-lg font-semibold text-white mb-4">
                Carrier Configuration
              </h3>

              {/* EasyPost */}
              <div className="mb-6 p-4 bg-slate-600 rounded-lg">
                <div className="flex items-center justify-between mb-3">
                  <label className="flex items-center space-x-3 flex-1">
                    <input
                      type="checkbox"
                      checked={
                        settings.shippingCarriers?.easypost?.enabled || false
                      }
                      onChange={(e) =>
                        setSettings((prev) => ({
                          ...prev!,
                          shippingCarriers: {
                            easypost: {
                              ...(prev!.shippingCarriers?.easypost || {
                                enabled: false,
                                apiKey: "",
                              }),
                              enabled: e.target.checked,
                            },
                            shippo: prev!.shippingCarriers?.shippo || {
                              enabled: false,
                              apiKey: "",
                            },
                            shipstation: prev!.shippingCarriers
                              ?.shipstation || {
                              enabled: false,
                              apiKey: "",
                              apiSecret: "",
                            },
                          },
                        }))
                      }
                      className="w-4 h-4"
                    />
                    <span className="text-white font-medium">
                      EasyPost (Multi-carrier)
                    </span>
                  </label>
                  <span className="text-xs text-gray-400">
                    USPS, UPS, FedEx, DHL
                  </span>
                </div>
                {settings.shippingCarriers?.easypost?.enabled && (
                  <>
                    <input
                      type="password"
                      placeholder="EasyPost API Key"
                      value={settings.shippingCarriers?.easypost?.apiKey || ""}
                      onChange={(e) =>
                        setSettings((prev) => ({
                          ...prev!,
                          shippingCarriers: {
                            easypost: {
                              ...(prev!.shippingCarriers?.easypost || {
                                enabled: false,
                                apiKey: "",
                              }),
                              apiKey: e.target.value,
                            },
                            shippo: prev!.shippingCarriers?.shippo || {
                              enabled: false,
                              apiKey: "",
                            },
                            shipstation: prev!.shippingCarriers
                              ?.shipstation || {
                              enabled: false,
                              apiKey: "",
                              apiSecret: "",
                            },
                          },
                        }))
                      }
                      className={inputClasses}
                    />
                    <ShippingTestButton
                      carrier="easypost"
                      hasUnsaved={hasSettingsUnsavedChanges}
                    />
                  </>
                )}
              </div>

              {/* Shippo */}
              <div className="mb-6 p-4 bg-slate-600 rounded-lg">
                <div className="flex items-center justify-between mb-3">
                  <label className="flex items-center space-x-3 flex-1">
                    <input
                      type="checkbox"
                      checked={
                        settings.shippingCarriers?.shippo?.enabled || false
                      }
                      onChange={(e) =>
                        setSettings((prev) => ({
                          ...prev!,
                          shippingCarriers: {
                            easypost: prev!.shippingCarriers?.easypost || {
                              enabled: false,
                              apiKey: "",
                            },
                            shippo: {
                              ...(prev!.shippingCarriers?.shippo || {
                                enabled: false,
                                apiKey: "",
                              }),
                              enabled: e.target.checked,
                            },
                            shipstation: prev!.shippingCarriers
                              ?.shipstation || {
                              enabled: false,
                              apiKey: "",
                              apiSecret: "",
                            },
                          },
                        }))
                      }
                      className="w-4 h-4"
                    />
                    <span className="text-white font-medium">
                      Shippo (Multi-carrier)
                    </span>
                  </label>
                  <span className="text-xs text-gray-400">
                    USPS, UPS, FedEx, DHL
                  </span>
                </div>
                {settings.shippingCarriers?.shippo?.enabled && (
                  <>
                    <input
                      type="password"
                      placeholder="Shippo API Key"
                      value={settings.shippingCarriers?.shippo?.apiKey || ""}
                      onChange={(e) =>
                        setSettings((prev) => ({
                          ...prev!,
                          shippingCarriers: {
                            easypost: prev!.shippingCarriers?.easypost || {
                              enabled: false,
                              apiKey: "",
                            },
                            shippo: {
                              ...(prev!.shippingCarriers?.shippo || {
                                enabled: false,
                                apiKey: "",
                              }),
                              apiKey: e.target.value,
                            },
                            shipstation: prev!.shippingCarriers
                              ?.shipstation || {
                              enabled: false,
                              apiKey: "",
                              apiSecret: "",
                            },
                          },
                        }))
                      }
                      className={inputClasses}
                    />
                    <ShippingTestButton
                      carrier="shippo"
                      hasUnsaved={hasSettingsUnsavedChanges}
                    />
                  </>
                )}
              </div>

              {/* ShipStation */}
              <div className="mb-6 p-4 bg-slate-600 rounded-lg">
                <div className="flex items-center justify-between mb-3">
                  <label className="flex items-center space-x-3 flex-1">
                    <input
                      type="checkbox"
                      checked={
                        settings.shippingCarriers?.shipstation?.enabled || false
                      }
                      onChange={(e) =>
                        setSettings((prev) => ({
                          ...prev!,
                          shippingCarriers: {
                            easypost: prev!.shippingCarriers?.easypost || {
                              enabled: false,
                              apiKey: "",
                            },
                            shippo: prev!.shippingCarriers?.shippo || {
                              enabled: false,
                              apiKey: "",
                            },
                            shipstation: {
                              ...(prev!.shippingCarriers?.shipstation || {
                                enabled: false,
                                apiKey: "",
                                apiSecret: "",
                              }),
                              enabled: e.target.checked,
                            },
                          },
                        }))
                      }
                      className="w-4 h-4"
                    />
                    <span className="text-white font-medium">
                      ShipStation (Multi-carrier)
                    </span>
                  </label>
                  <span className="text-xs text-gray-400">
                    USPS, UPS, FedEx, DHL
                  </span>
                </div>
                {settings.shippingCarriers?.shipstation?.enabled && (
                  <div className="space-y-3">
                    <input
                      type="password"
                      placeholder="ShipStation API Key"
                      value={
                        settings.shippingCarriers?.shipstation?.apiKey || ""
                      }
                      onChange={(e) =>
                        setSettings((prev) => ({
                          ...prev!,
                          shippingCarriers: {
                            easypost: prev!.shippingCarriers?.easypost || {
                              enabled: false,
                              apiKey: "",
                            },
                            shippo: prev!.shippingCarriers?.shippo || {
                              enabled: false,
                              apiKey: "",
                            },
                            shipstation: {
                              ...(prev!.shippingCarriers?.shipstation || {
                                enabled: false,
                                apiKey: "",
                                apiSecret: "",
                              }),
                              apiKey: e.target.value,
                            },
                          },
                        }))
                      }
                      className={inputClasses}
                    />
                    <input
                      type="password"
                      placeholder="ShipStation API Secret"
                      value={
                        settings.shippingCarriers?.shipstation?.apiSecret || ""
                      }
                      onChange={(e) =>
                        setSettings((prev) => ({
                          ...prev!,
                          shippingCarriers: {
                            easypost: prev!.shippingCarriers?.easypost || {
                              enabled: false,
                              apiKey: "",
                            },
                            shippo: prev!.shippingCarriers?.shippo || {
                              enabled: false,
                              apiKey: "",
                            },
                            shipstation: {
                              ...(prev!.shippingCarriers?.shipstation || {
                                enabled: false,
                                apiKey: "",
                                apiSecret: "",
                              }),
                              apiSecret: e.target.value,
                            },
                          },
                        }))
                      }
                      className={inputClasses}
                    />
                    <ShippingTestButton
                      carrier="shipstation"
                      hasUnsaved={hasSettingsUnsavedChanges}
                    />
                  </div>
                )}
              </div>

              {/* Default Carrier */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Default Shipping Carrier
                </label>
                <select
                  value={settings.defaultShippingCarrier || "easypost"}
                  onChange={(e) =>
                    setSettings((prev) => ({
                      ...prev!,
                      defaultShippingCarrier: e.target.value as any,
                    }))
                  }
                  className={inputClasses}
                >
                  <option value="easypost">EasyPost</option>
                  <option value="shippo">Shippo</option>
                  <option value="shipstation">ShipStation</option>
                </select>
              </div>
            </div>

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
            <h2 className="text-2xl font-semibold text-white mb-4">
              Tax Configuration
            </h2>
            {commerceStatus?.tax && !commerceStatus.tax.available && (
              <div className="rounded-lg border border-amber-500/60 bg-amber-500/10 p-4 text-amber-100">
                <p className="font-semibold">Tax is not fully configured</p>
                <p className="text-sm mt-1">
                  {commerceStatus.tax.reason ||
                    "Customers will be offered a sales-team approval request flow until tax setup is completed."}
                </p>
              </div>
            )}

            {/* Global Settings */}
            <div className="bg-slate-700 p-6 rounded-lg border border-slate-600">
              <h3 className="text-xl font-semibold text-white mb-4">
                Global Settings
              </h3>

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
                  <label className="block text-white mb-2">Tax Provider</label>
                  <select
                    value={settings.taxConfig?.provider || "stripe"}
                    onChange={(e) =>
                      setSettings({
                        ...settings,
                        taxConfig: {
                          ...settings.taxConfig!,
                          provider: e.target.value as any,
                        },
                      })
                    }
                    className={inputClasses}
                  >
                    <option value="stripe">Stripe Tax (Recommended)</option>
                    <option value="taxjar">TaxJar</option>
                    <option value="avalara">Avalara AvaTax</option>
                    <option value="taxcloud">TaxCloud</option>
                    <option value="zamp">Zamp</option>
                    <option value="anrok">Anrok</option>
                    <option value="manual">Manual Rules</option>
                  </select>
                  <p className="text-sm text-gray-400 mt-1">
                    Select your preferred tax calculation service
                  </p>
                </div>

                {/* Stripe Tax Configuration */}
                {settings.taxConfig?.provider === "stripe" && (
                  <div>
                    <label className="block text-white mb-2">
                      Stripe API Key
                    </label>
                    <input
                      type="password"
                      value={
                        settings.taxConfig?.credentials?.stripeApiKey || ""
                      }
                      onChange={(e) =>
                        setSettings({
                          ...settings,
                          taxConfig: {
                            ...settings.taxConfig!,
                            credentials: {
                              ...settings.taxConfig?.credentials,
                              stripeApiKey: e.target.value,
                            },
                          },
                        })
                      }
                      className={inputClasses}
                      placeholder="sk_live_..."
                    />
                    <p className="text-sm text-gray-400 mt-1">
                      Get your API key from{" "}
                      <a
                        href="https://dashboard.stripe.com/apikeys"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sky-400 hover:underline"
                      >
                        Stripe Dashboard
                      </a>
                    </p>
                    <TaxTestButton
                      provider="stripe"
                      hasUnsaved={hasSettingsUnsavedChanges}
                    />
                  </div>
                )}

                {/* TaxJar Configuration */}
                {settings.taxConfig?.provider === "taxjar" && (
                  <div>
                    <label className="block text-white mb-2">
                      TaxJar API Key
                    </label>
                    <input
                      type="password"
                      value={
                        settings.taxConfig?.credentials?.taxjarApiKey || ""
                      }
                      onChange={(e) =>
                        setSettings({
                          ...settings,
                          taxConfig: {
                            ...settings.taxConfig!,
                            credentials: {
                              ...settings.taxConfig?.credentials,
                              taxjarApiKey: e.target.value,
                            },
                          },
                        })
                      }
                      className={inputClasses}
                      placeholder="token_..."
                    />
                    <p className="text-sm text-gray-400 mt-1">
                      Get your API key from{" "}
                      <a
                        href="https://app.taxjar.com/api_sign_up/basic"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sky-400 hover:underline"
                      >
                        TaxJar Dashboard
                      </a>
                    </p>
                    <TaxTestButton
                      provider="taxjar"
                      hasUnsaved={hasSettingsUnsavedChanges}
                    />
                  </div>
                )}

                {/* Avalara Configuration */}
                {settings.taxConfig?.provider === "avalara" && (
                  <div className="space-y-3">
                    <TaxTestButton
                      provider="avalara"
                      hasUnsaved={hasSettingsUnsavedChanges}
                    />
                    <div>
                      <label className="block text-white mb-2">
                        Account ID
                      </label>
                      <input
                        type="text"
                        value={
                          settings.taxConfig?.credentials?.avalaraAccountId ||
                          ""
                        }
                        onChange={(e) =>
                          setSettings({
                            ...settings,
                            taxConfig: {
                              ...settings.taxConfig!,
                              credentials: {
                                ...settings.taxConfig?.credentials,
                                avalaraAccountId: e.target.value,
                              },
                            },
                          })
                        }
                        className={inputClasses}
                        placeholder="Your Account ID"
                      />
                    </div>
                    <div>
                      <label className="block text-white mb-2">
                        License Key
                      </label>
                      <input
                        type="password"
                        value={
                          settings.taxConfig?.credentials?.avalaraLicenseKey ||
                          ""
                        }
                        onChange={(e) =>
                          setSettings({
                            ...settings,
                            taxConfig: {
                              ...settings.taxConfig!,
                              credentials: {
                                ...settings.taxConfig?.credentials,
                                avalaraLicenseKey: e.target.value,
                              },
                            },
                          })
                        }
                        className={inputClasses}
                        placeholder="Your License Key"
                      />
                    </div>
                    <div>
                      <label className="block text-white mb-2">
                        Environment
                      </label>
                      <select
                        value={
                          settings.taxConfig?.credentials?.avalaraEnvironment ||
                          "sandbox"
                        }
                        onChange={(e) =>
                          setSettings({
                            ...settings,
                            taxConfig: {
                              ...settings.taxConfig!,
                              credentials: {
                                ...settings.taxConfig?.credentials,
                                avalaraEnvironment: e.target.value as
                                  | "sandbox"
                                  | "production",
                              },
                            },
                          })
                        }
                        className={inputClasses}
                      >
                        <option value="sandbox">Sandbox (Testing)</option>
                        <option value="production">Production</option>
                      </select>
                    </div>
                    <p className="text-sm text-gray-400 mt-1">
                      Get credentials from{" "}
                      <a
                        href="https://developer.avalara.com/"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sky-400 hover:underline"
                      >
                        Avalara Dashboard
                      </a>
                    </p>
                  </div>
                )}

                {/* TaxCloud Configuration */}
                {settings.taxConfig?.provider === "taxcloud" && (
                  <div className="space-y-3">
                    <TaxTestButton
                      provider="taxcloud"
                      hasUnsaved={hasSettingsUnsavedChanges}
                    />
                    <div>
                      <label className="block text-white mb-2">API Key</label>
                      <input
                        type="password"
                        value={
                          settings.taxConfig?.credentials?.taxcloudApiKey || ""
                        }
                        onChange={(e) =>
                          setSettings({
                            ...settings,
                            taxConfig: {
                              ...settings.taxConfig!,
                              credentials: {
                                ...settings.taxConfig?.credentials,
                                taxcloudApiKey: e.target.value,
                              },
                            },
                          })
                        }
                        className={inputClasses}
                        placeholder="Your API Key"
                      />
                    </div>
                    <div>
                      <label className="block text-white mb-2">User ID</label>
                      <input
                        type="text"
                        value={
                          settings.taxConfig?.credentials?.taxcloudUserId || ""
                        }
                        onChange={(e) =>
                          setSettings({
                            ...settings,
                            taxConfig: {
                              ...settings.taxConfig!,
                              credentials: {
                                ...settings.taxConfig?.credentials,
                                taxcloudUserId: e.target.value,
                              },
                            },
                          })
                        }
                        className={inputClasses}
                        placeholder="Your User ID"
                      />
                    </div>
                    <p className="text-sm text-gray-400 mt-1">
                      Get credentials from{" "}
                      <a
                        href="https://taxcloud.net/account"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sky-400 hover:underline"
                      >
                        TaxCloud Account
                      </a>
                    </p>
                  </div>
                )}

                {/* Zamp Configuration */}
                {settings.taxConfig?.provider === "zamp" && (
                  <div>
                    <TaxTestButton
                      provider="zamp"
                      hasUnsaved={hasSettingsUnsavedChanges}
                    />
                    <label className="block text-white mb-2">
                      Zamp API Key
                    </label>
                    <input
                      type="password"
                      value={settings.taxConfig?.credentials?.zampApiKey || ""}
                      onChange={(e) =>
                        setSettings({
                          ...settings,
                          taxConfig: {
                            ...settings.taxConfig!,
                            credentials: {
                              ...settings.taxConfig?.credentials,
                              zampApiKey: e.target.value,
                            },
                          },
                        })
                      }
                      className={inputClasses}
                      placeholder="Your API Key"
                    />
                    <p className="text-sm text-gray-400 mt-1">
                      Get your API key from{" "}
                      <a
                        href="https://www.zamp.com/"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sky-400 hover:underline"
                      >
                        Zamp Dashboard
                      </a>
                    </p>
                  </div>
                )}

                {/* Anrok Configuration */}
                {settings.taxConfig?.provider === "anrok" && (
                  <div>
                    <TaxTestButton
                      provider="anrok"
                      hasUnsaved={hasSettingsUnsavedChanges}
                    />
                    <label className="block text-white mb-2">
                      Anrok API Key
                    </label>
                    <input
                      type="password"
                      value={settings.taxConfig?.credentials?.anrokApiKey || ""}
                      onChange={(e) =>
                        setSettings({
                          ...settings,
                          taxConfig: {
                            ...settings.taxConfig!,
                            credentials: {
                              ...settings.taxConfig?.credentials,
                              anrokApiKey: e.target.value,
                            },
                          },
                        })
                      }
                      className={inputClasses}
                      placeholder="Your API Key"
                    />
                    <p className="text-sm text-gray-400 mt-1">
                      Get your API key from{" "}
                      <a
                        href="https://www.anrok.com/"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sky-400 hover:underline"
                      >
                        Anrok Dashboard
                      </a>
                    </p>
                  </div>
                )}

                <div>
                  <label className="block text-white mb-2">
                    Default Tax Rate (%) - Fallback
                  </label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    step="0.01"
                    value={defaultTaxRate}
                    onChange={(e) =>
                      setDefaultTaxRate(parseFloat(e.target.value))
                    }
                    className={inputClasses}
                  />
                  <p className="text-sm text-gray-400 mt-1">
                    Used when API is unavailable or no rule matches
                  </p>
                </div>

                <button
                  onClick={() => {
                    const updatedSettings = {
                      ...settings,
                      taxConfig: {
                        provider: settings.taxConfig?.provider || "stripe",
                        enableTaxCollection: enableTax,
                        defaultTaxRate,
                        taxIncludedInPrice:
                          settings.taxConfig?.taxIncludedInPrice ?? false,
                        credentials: settings.taxConfig?.credentials,
                        rules: taxRules,
                      },
                    };
                    setSettings(updatedSettings);
                    updateSiteSettings(updatedSettings);
                    addToast("Tax settings saved", "success");
                  }}
                  className={buttonClasses}
                >
                  Save Global Settings
                </button>
              </div>
            </div>

            {/* Add/Edit Rule Form */}
            {settings.taxConfig?.provider === "manual" && (
              <div className="bg-slate-700 p-6 rounded-lg border border-slate-600">
                <h3 className="text-xl font-semibold text-white mb-4">
                  {editingTaxId ? "Edit Tax Rule" : "Add New Tax Rule"}
                </h3>
                <p className="text-sm text-gray-400 mb-4">
                  Manual rules only apply when using Manual tax provider. Stripe
                  Tax handles this automatically.
                </p>

                <div className="space-y-4">
                  <div>
                    <label className="block text-white mb-2">Rule Name</label>
                    <input
                      type="text"
                      placeholder="e.g., California Sales Tax"
                      value={taxFormData.name || ""}
                      onChange={(e) =>
                        setTaxFormData({ ...taxFormData, name: e.target.value })
                      }
                      className={inputClasses}
                    />
                  </div>

                  <div>
                    <label className="block text-white mb-2">
                      Tax Rate (%)
                    </label>
                    <input
                      type="number"
                      min="0"
                      max="100"
                      step="0.01"
                      value={taxFormData.taxRate || 0}
                      onChange={(e) =>
                        setTaxFormData({
                          ...taxFormData,
                          taxRate: parseFloat(e.target.value),
                        })
                      }
                      className={inputClasses}
                    />
                  </div>

                  <div>
                    <label className="block text-white mb-2">
                      Priority (higher = applies first)
                    </label>
                    <input
                      type="number"
                      min="0"
                      value={taxFormData.priority || 0}
                      onChange={(e) =>
                        setTaxFormData({
                          ...taxFormData,
                          priority: parseInt(e.target.value),
                        })
                      }
                      className={inputClasses}
                    />
                  </div>

                  <div>
                    <label className="block text-white mb-2">
                      States (click to select)
                    </label>
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
                              ? "bg-sky-500 text-white"
                              : "bg-slate-500 text-gray-300 hover:bg-slate-400"
                          }`}
                        >
                          {state}
                        </button>
                      ))}
                    </div>
                    <p className="text-sm text-gray-400 mt-2">
                      Selected:{" "}
                      {(taxFormData.states || []).join(", ") || "None"}
                    </p>
                  </div>

                  <label className="flex items-center space-x-3">
                    <input
                      type="checkbox"
                      checked={taxFormData.enabled !== false}
                      onChange={(e) =>
                        setTaxFormData({
                          ...taxFormData,
                          enabled: e.target.checked,
                        })
                      }
                      className="w-4 h-4"
                    />
                    <span className="text-white">Enabled</span>
                  </label>

                  <div className="flex space-x-2">
                    <button
                      onClick={() => {
                        if (
                          !taxFormData.name ||
                          (taxFormData.states || []).length === 0
                        ) {
                          addToast(
                            "Rule name and at least one state are required",
                            "error",
                          );
                          return;
                        }

                        const newRule: TaxRule = {
                          id: editingTaxId || Date.now().toString(),
                          name: taxFormData.name || "",
                          states: taxFormData.states || [],
                          taxRate: taxFormData.taxRate || 0,
                          exemptedProductIds:
                            taxFormData.exemptedProductIds || [],
                          enabled: taxFormData.enabled !== false,
                          priority: taxFormData.priority || 0,
                        };

                        if (editingTaxId) {
                          setTaxRules(
                            taxRules.map((r) =>
                              r.id === editingTaxId ? newRule : r,
                            ),
                          );
                          setEditingTaxId(null);
                          addToast("Tax rule updated", "success");
                        } else {
                          setTaxRules([...taxRules, newRule]);
                          addToast("Tax rule added", "success");
                        }

                        setTaxFormData({
                          name: "",
                          states: [],
                          taxRate: 0,
                          exemptedProductIds: [],
                          enabled: true,
                          priority: 0,
                        });
                      }}
                      className={buttonClasses}
                    >
                      {editingTaxId ? "Update Rule" : "Add Rule"}
                    </button>
                    {editingTaxId && (
                      <button
                        onClick={() => {
                          setEditingTaxId(null);
                          setTaxFormData({
                            name: "",
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
            )}

            {/* Tax Rules List */}
            {settings.taxConfig?.provider === "manual" && (
              <div className="bg-slate-700 p-6 rounded-lg border border-slate-600">
                <h3 className="text-xl font-semibold text-white mb-4">
                  Manual Tax Rules
                </h3>

                {taxRules.length === 0 ? (
                  <p className="text-gray-400">No tax rules configured yet.</p>
                ) : (
                  <div className="space-y-4">
                    {taxRules.map((rule) => (
                      <div
                        key={rule.id}
                        className="bg-slate-600 p-4 rounded-lg border border-slate-500"
                      >
                        <div className="flex justify-between items-start mb-2">
                          <div>
                            <h4 className="text-white font-semibold">
                              {rule.name}
                            </h4>
                            <p className="text-gray-400 text-sm">
                              Rate: {rule.taxRate}% | Priority: {rule.priority}{" "}
                              | Status:{" "}
                              <span
                                className={
                                  rule.enabled
                                    ? "text-green-400"
                                    : "text-red-400"
                                }
                              >
                                {rule.enabled ? "Enabled" : "Disabled"}
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
                                setTaxRules(
                                  taxRules.filter((r) => r.id !== rule.id),
                                );
                                addToast("Tax rule deleted", "success");
                              }}
                              className="text-gray-400 hover:text-red-500 transition-colors"
                              title="Delete tax rule"
                            >
                              <TrashIcon className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                        <p className="text-gray-300 text-sm">
                          States: {rule.states.join(", ")}
                        </p>
                      </div>
                    ))}
                  </div>
                )}

                <button
                  onClick={() => {
                    const updatedSettings = {
                      ...settings,
                      taxConfig: {
                        provider: settings.taxConfig?.provider || "stripe",
                        enableTaxCollection: enableTax,
                        defaultTaxRate,
                        taxIncludedInPrice:
                          settings.taxConfig?.taxIncludedInPrice ?? false,
                        credentials: settings.taxConfig?.credentials,
                        rules: taxRules,
                      },
                    };
                    setSettings(updatedSettings);
                    updateSiteSettings(updatedSettings);
                    addToast("All tax settings saved", "success");
                  }}
                  className={`mt-4 ${buttonClasses}`}
                >
                  Save All Tax Rules
                </button>
              </div>
            )}
          </div>
        )}

        {activeTab === "orders" && (
          <div className="space-y-6">
            <h2 className="text-2xl font-semibold text-white mb-4">
              Order Configuration
            </h2>

            <div className="bg-slate-700 p-6 rounded-lg border border-slate-600">
              <h3 className="text-xl font-semibold text-white mb-4">
                Order Number Format
              </h3>

              <div className="space-y-4">
                <div>
                  <label
                    htmlFor="orderPrefix"
                    className="block text-gray-300 text-sm font-bold mb-1"
                  >
                    Order Prefix
                  </label>
                  <input
                    type="text"
                    id="orderPrefix"
                    maxLength={10}
                    value={settings.orderPrefix || "AGIS"}
                    onChange={(e) =>
                      setSettings((prev) => ({
                        ...prev!,
                        orderPrefix: e.target.value.toUpperCase(),
                      }))
                    }
                    className={inputClasses}
                    placeholder="e.g., AGIS, ORD, INV"
                  />
                  <p className="text-sm text-gray-400 mt-1">
                    Maximum 10 characters. Used at the beginning of order
                    numbers.
                  </p>
                </div>

                <div>
                  <label
                    htmlFor="orderNumberLength"
                    className="block text-gray-300 text-sm font-bold mb-1"
                  >
                    Order Number Length
                  </label>
                  <input
                    type="number"
                    id="orderNumberLength"
                    min={1}
                    max={15}
                    value={settings.orderNumberLength || 10}
                    onChange={(e) =>
                      setSettings((prev) => ({
                        ...prev!,
                        orderNumberLength: parseInt(e.target.value, 10),
                      }))
                    }
                    className={inputClasses}
                  />
                  <p className="text-sm text-gray-400 mt-1">
                    Number of digits used in order numbers (1-15). Currently:{" "}
                    {settings.orderPrefix || "AGIS"}-
                    {String(12345).padStart(
                      settings.orderNumberLength || 10,
                      "0",
                    )}
                  </p>
                </div>

                <div className="bg-slate-600 p-4 rounded-md border border-slate-500">
                  <p className="text-white font-semibold mb-2">Preview:</p>
                  <p className="text-gray-300">
                    {settings.orderPrefix || "AGIS"}-
                    {String(
                      Math.floor(
                        Math.random() *
                          Math.pow(10, settings.orderNumberLength || 10),
                      ),
                    ).padStart(settings.orderNumberLength || 10, "0")}
                  </p>
                </div>

                <button
                  onClick={() => {
                    updateSiteSettings(settings);
                    addToast("Order settings saved", "success");
                  }}
                  className={`mt-4 ${buttonClasses}`}
                >
                  Save Order Settings
                </button>
              </div>
            </div>

            <div className="bg-slate-700 p-6 rounded-lg border border-slate-600">
              <h3 className="text-xl font-semibold text-white mb-4">
                Invoice / Receipt Template
              </h3>
              <InvoiceTemplateEditor
                template={settings.invoiceTemplate}
                siteLogoUrl={settings.headerLogoUrl}
                onTemplateChange={(template) =>
                  setSettings((prev) => ({
                    ...prev!,
                    invoiceTemplate: template,
                  }))
                }
              />
              <button
                onClick={() => {
                  updateSiteSettings({
                    invoiceTemplate: settings.invoiceTemplate,
                  });
                  addToast("Invoice template saved", "success");
                }}
                className={`mt-4 ${buttonClasses}`}
              >
                Save Invoice Template
              </button>
            </div>
          </div>
        )}

        {activeTab === "email" && (
          <div className="space-y-6">
            <h2 className="text-2xl font-semibold text-white mb-4">
              Email Configuration
            </h2>

            <div className="bg-blue-900 bg-opacity-30 border border-blue-700 rounded-lg p-4 mb-6">
              <p className="text-blue-200 text-sm">
                <strong>Security Note:</strong> Passwords and API keys are
                encrypted in the database. Sensitive fields like SMTP passwords
                and API keys are never logged or displayed in plain text.
              </p>
            </div>

            <div>
              <label className="block text-gray-300 text-sm font-bold mb-2">
                Email Provider
              </label>
              <select
                value={settings.emailConfig?.provider || "none"}
                onChange={(e) => {
                  const newSettings = { ...settings };
                  if (!newSettings.emailConfig) {
                    newSettings.emailConfig = {
                      provider: "none",
                      fromEmail: "",
                      fromName: "",
                    };
                  }
                  newSettings.emailConfig.provider = e.target.value as any;
                  setSettings(newSettings);
                }}
                className={inputClasses}
              >
                <option value="none">Disabled (No Email Sending)</option>
                <option value="smtp">SMTP Server</option>
                <option value="sendgrid">SendGrid</option>
                <option value="mailgun">Mailgun</option>
              </select>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-gray-300 text-sm font-bold mb-2">
                  From Email Address *
                </label>
                <input
                  type="email"
                  value={settings.emailConfig?.fromEmail || ""}
                  onChange={(e) => {
                    const newSettings = { ...settings };
                    if (!newSettings.emailConfig) {
                      newSettings.emailConfig = {
                        provider: "none",
                        fromEmail: "",
                        fromName: "",
                      };
                    }
                    newSettings.emailConfig.fromEmail = e.target.value;
                    setSettings(newSettings);
                  }}
                  placeholder="noreply@example.com"
                  className={inputClasses}
                />
              </div>

              <div>
                <label className="block text-gray-300 text-sm font-bold mb-2">
                  From Name *
                </label>
                <input
                  type="text"
                  value={settings.emailConfig?.fromName || ""}
                  onChange={(e) => {
                    const newSettings = { ...settings };
                    if (!newSettings.emailConfig) {
                      newSettings.emailConfig = {
                        provider: "none",
                        fromEmail: "",
                        fromName: "",
                      };
                    }
                    newSettings.emailConfig.fromName = e.target.value;
                    setSettings(newSettings);
                  }}
                  placeholder="My Store"
                  className={inputClasses}
                />
              </div>
            </div>

            {settings.emailConfig?.provider === "smtp" && (
              <div className="bg-slate-700 p-4 rounded-lg space-y-4">
                <h3 className="text-lg font-semibold text-white">
                  SMTP Configuration
                </h3>

                <div className="bg-blue-900 bg-opacity-30 border border-blue-700 rounded-lg p-3 mb-4">
                  <p className="text-blue-200 text-sm mb-2">
                    <strong>📧 Common SMTP Providers:</strong>
                  </p>
                  <ul className="text-blue-200 text-sm space-y-1 ml-4">
                    <li>
                      <strong>Zoho:</strong> smtp.zoho.com | Port 465 (SSL ✓) or
                      587 (SSL ✗)
                    </li>
                    <li>
                      <strong>Gmail:</strong> smtp.gmail.com | Port 465 (SSL ✓)
                      or 587 (SSL ✗)
                    </li>
                    <li>
                      <strong>Outlook:</strong> smtp-mail.outlook.com | Port 587
                      (SSL ✗)
                    </li>
                  </ul>
                  <p className="text-blue-200 text-xs mt-2">
                    <strong>Note:</strong> Many cloud platforms block SMTP. If
                    testing fails with timeout, use SendGrid or Mailgun instead.
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-gray-300 text-sm font-bold mb-2">
                      SMTP Host *
                    </label>
                    <input
                      type="text"
                      value={settings.emailConfig.smtpHost || ""}
                      onChange={(e) => {
                        const newSettings = { ...settings };
                        newSettings.emailConfig!.smtpHost = e.target.value;
                        setSettings(newSettings);
                      }}
                      placeholder="smtp.zoho.com"
                      className={inputClasses}
                    />
                    <p className="text-xs text-gray-400 mt-1">
                      E.g., smtp.zoho.com, smtp.gmail.com
                    </p>
                  </div>

                  <div>
                    <label className="block text-gray-300 text-sm font-bold mb-2">
                      SMTP Port *
                    </label>
                    <input
                      type="number"
                      value={settings.emailConfig.smtpPort || 587}
                      onChange={(e) => {
                        const newSettings = { ...settings };
                        newSettings.emailConfig!.smtpPort = parseInt(
                          e.target.value,
                        );
                        setSettings(newSettings);
                      }}
                      placeholder="587"
                      className={inputClasses}
                    />
                    <p className="text-xs text-gray-400 mt-1">
                      465 (SSL) or 587 (TLS)
                    </p>
                  </div>
                </div>

                <div className="flex items-center">
                  <input
                    type="checkbox"
                    checked={settings.emailConfig.smtpSecure || false}
                    onChange={(e) => {
                      const newSettings = { ...settings };
                      newSettings.emailConfig!.smtpSecure = e.target.checked;
                      setSettings(newSettings);
                    }}
                    id="smtpSecure"
                    className="mr-3"
                  />
                  <label htmlFor="smtpSecure" className="text-gray-300">
                    Use TLS/SSL (Secure Connection)
                  </label>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-gray-300 text-sm font-bold mb-2">
                      SMTP Username *
                    </label>
                    <input
                      type="text"
                      value={settings.emailConfig.smtpUsername || ""}
                      onChange={(e) => {
                        const newSettings = { ...settings };
                        newSettings.emailConfig!.smtpUsername = e.target.value;
                        setSettings(newSettings);
                      }}
                      placeholder="your-email@zoho.com"
                      className={inputClasses}
                    />
                    <p className="text-xs text-gray-400 mt-1">
                      Usually your full email address
                    </p>
                  </div>

                  <div>
                    <label className="block text-gray-300 text-sm font-bold mb-2">
                      SMTP Password *
                    </label>
                    <input
                      type="password"
                      value={settings.emailConfig?.smtpPassword || ""}
                      onChange={(e) => {
                        const newSettings = { ...settings };
                        newSettings.emailConfig!.smtpPassword = e.target.value;
                        setSettings(newSettings);
                      }}
                      placeholder="••••••••"
                      className={inputClasses}
                    />
                    <p className="text-xs text-gray-400 mt-1">
                      Password is encrypted in the database for security
                    </p>
                  </div>
                </div>
              </div>
            )}

            {settings.emailConfig?.provider === "sendgrid" && (
              <div className="bg-slate-700 p-4 rounded-lg space-y-4">
                <h3 className="text-lg font-semibold text-white">
                  SendGrid Configuration
                </h3>

                <div className="bg-green-900 bg-opacity-30 border border-green-700 rounded-lg p-3 mb-4">
                  <p className="text-green-200 text-sm">
                    <strong>✓ Cloud-Friendly:</strong> SendGrid works on all
                    platforms. Get a free API key at{" "}
                    <a
                      href="https://sendgrid.com"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="underline hover:text-green-100"
                    >
                      sendgrid.com
                    </a>{" "}
                    (100 free emails/day)
                  </p>
                </div>

                <div>
                  <label className="block text-gray-300 text-sm font-bold mb-2">
                    SendGrid API Key *
                  </label>
                  <input
                    type="password"
                    onChange={(e) => {
                      const newSettings = { ...settings };
                      newSettings.emailConfig!.sendgridApiKey = e.target.value;
                      setSettings(newSettings);
                    }}
                    placeholder="SG.xxxxxxxxxxxx"
                    className={inputClasses}
                  />
                  <p className="text-xs text-gray-400 mt-1">
                    API key is encrypted in the database for security
                  </p>
                </div>
              </div>
            )}

            {settings.emailConfig?.provider === "mailgun" && (
              <div className="bg-slate-700 p-4 rounded-lg space-y-4">
                <h3 className="text-lg font-semibold text-white">
                  Mailgun Configuration
                </h3>

                <div className="bg-green-900 bg-opacity-30 border border-green-700 rounded-lg p-3 mb-4">
                  <p className="text-green-200 text-sm">
                    <strong>✓ Cloud-Friendly:</strong> Mailgun works on all
                    platforms. Get your domain and API key at{" "}
                    <a
                      href="https://mailgun.com"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="underline hover:text-green-100"
                    >
                      mailgun.com
                    </a>{" "}
                    (5,000 free emails/month)
                  </p>
                </div>

                <div>
                  <label className="block text-gray-300 text-sm font-bold mb-2">
                    Mailgun Domain *
                  </label>
                  <input
                    type="text"
                    value={settings.emailConfig.mailgunDomain || ""}
                    onChange={(e) => {
                      const newSettings = { ...settings };
                      newSettings.emailConfig!.mailgunDomain = e.target.value;
                      setSettings(newSettings);
                    }}
                    placeholder="mg.example.com"
                    className={inputClasses}
                  />
                </div>

                <div>
                  <label className="block text-gray-300 text-sm font-bold mb-2">
                    Mailgun API Key *
                  </label>
                  <input
                    type="password"
                    onChange={(e) => {
                      const newSettings = { ...settings };
                      newSettings.emailConfig!.mailgunApiKey = e.target.value;
                      setSettings(newSettings);
                    }}
                    placeholder="key-xxxxxxxxxxxx"
                    className={inputClasses}
                  />
                  <p className="text-xs text-gray-400 mt-1">
                    API key is encrypted in the database for security
                  </p>
                </div>
              </div>
            )}

            <div className="flex gap-4">
              <button
                onClick={() => {
                  updateSiteSettings(settings);
                  addToast("Email configuration saved", "success");
                }}
                className={buttonClasses}
              >
                Save Email Configuration
              </button>

              {settings.emailConfig?.provider !== "none" && (
                <button
                  onClick={() => {
                    setTestEmailAddress("");
                    setShowEmailTestModal(true);
                  }}
                  className="bg-slate-600 text-white font-bold py-2 px-6 rounded-lg hover:bg-slate-700"
                >
                  Test Configuration
                </button>
              )}
            </div>
          </div>
        )}

        {/* Email Test Modal */}
        {showEmailTestModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-slate-800 border border-slate-700 rounded-lg p-6 max-w-lg w-full">
              <h3 className="text-lg font-semibold text-white mb-4">
                Send Test Email
              </h3>

              {settings.emailConfig?.provider === "smtp" && (
                <div className="bg-slate-700 p-4 rounded mb-4 text-sm">
                  <h4 className="text-white font-semibold mb-2">
                    Current Configuration:
                  </h4>
                  <div className="text-gray-300 space-y-1">
                    <div className="flex justify-between">
                      <span>Host:</span>
                      <span className="font-mono">
                        {settings.emailConfig.smtpHost || "Not set"}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span>Port:</span>
                      <span className="font-mono">
                        {settings.emailConfig.smtpPort || 587}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span>SSL/TLS:</span>
                      <span
                        className={
                          settings.emailConfig.smtpSecure
                            ? "text-green-400"
                            : "text-yellow-400"
                        }
                      >
                        {settings.emailConfig.smtpSecure
                          ? "✓ Enabled (SSL)"
                          : "✗ Disabled (STARTTLS)"}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span>Username:</span>
                      <span className="font-mono truncate ml-2">
                        {settings.emailConfig.smtpUsername || "Not set"}
                      </span>
                    </div>
                  </div>
                  {((settings.emailConfig.smtpPort === 465 &&
                    !settings.emailConfig.smtpSecure) ||
                    (settings.emailConfig.smtpPort === 587 &&
                      settings.emailConfig.smtpSecure)) && (
                    <div className="mt-3 p-2 bg-red-900 bg-opacity-40 border border-red-700 rounded text-xs text-red-200">
                      ⚠️ Port and SSL/TLS mismatch detected! Port 465 needs SSL
                      enabled, port 587 needs SSL disabled.
                    </div>
                  )}
                </div>
              )}

              <p className="text-gray-300 text-sm mb-4">
                Enter the email address where you would like to receive the test
                email.
              </p>
              <input
                type="email"
                value={testEmailAddress}
                onChange={(e) => setTestEmailAddress(e.target.value)}
                placeholder="test@example.com"
                className="w-full p-2 bg-slate-900 border border-slate-600 rounded text-white mb-4"
              />
              <div className="flex gap-2">
                <button
                  onClick={() => {
                    setShowEmailTestModal(false);
                    setTestEmailAddress("");
                  }}
                  disabled={testEmailLoading}
                  className="flex-1 px-4 py-2 bg-slate-700 text-white rounded hover:bg-slate-600 disabled:opacity-50"
                >
                  Cancel
                </button>

                {settings.emailConfig?.provider === "smtp" && (
                  <button
                    onClick={async () => {
                      const host = settings.emailConfig?.smtpHost;
                      const port = settings.emailConfig?.smtpPort || 587;

                      if (!host) {
                        addToast("SMTP host not configured", "error");
                        return;
                      }

                      setTestEmailLoading(true);
                      try {
                        console.log(
                          `Testing network connectivity to ${host}:${port}...`,
                        );
                        const result = await apiClient.request<{
                          success: boolean;
                          error?: string;
                          help?: string;
                          reachable?: boolean;
                        }>("/email-config/test-connectivity", {
                          method: "POST",
                          body: JSON.stringify({ host, port }),
                        });

                        if (result?.success) {
                          addToast(
                            `✓ Network connection successful to ${host}:${port}`,
                            "success",
                          );
                        } else {
                          addToast(
                            result?.error || "Network connection failed",
                            "error",
                          );
                          if (result?.help) {
                            setTimeout(() => {
                              addToast(`💡 ${result.help}`, "info", 15000);
                            }, 500);
                          }
                        }
                      } catch (error: any) {
                        console.error("Network test error:", error);
                        addToast(
                          error?.message || "Network test failed",
                          "error",
                        );
                      } finally {
                        setTestEmailLoading(false);
                      }
                    }}
                    disabled={testEmailLoading}
                    className="flex-1 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
                  >
                    {testEmailLoading ? "Testing..." : "Test Network"}
                  </button>
                )}

                <button
                  onClick={async () => {
                    if (!testEmailAddress.trim()) {
                      addToast("Please enter an email address", "error");
                      return;
                    }

                    setTestEmailLoading(true);
                    try {
                      // Persist current email config for runtime flows (password reset, order emails)
                      const emailConfig = settings.emailConfig;
                      if (
                        emailConfig?.provider &&
                        emailConfig.provider !== "none" &&
                        emailConfig.fromEmail &&
                        emailConfig.fromName
                      ) {
                        await apiClient.emailConfig.save(emailConfig);
                      }

                      // Keep site settings in sync as well
                      await updateSiteSettings(settings);

                      console.log(
                        "Sending test email request to:",
                        testEmailAddress,
                      );
                      console.log("Email config being sent:", {
                        provider: settings.emailConfig?.provider,
                        fromEmail: settings.emailConfig?.fromEmail,
                      });
                      const result = await apiClient.emailConfig.test({
                        emailConfig: settings.emailConfig,
                        testEmail: testEmailAddress,
                      });
                      console.log("Test email response:", result);
                      if (result?.success) {
                        addToast(
                          `Test email sent to ${testEmailAddress}`,
                          "success",
                        );
                        setShowEmailTestModal(false);
                        setTestEmailAddress("");
                      } else {
                        const errorDetail =
                          result?.error ||
                          result?.details ||
                          result?.message ||
                          "Unknown error";
                        console.error("Test failed with details:", errorDetail);
                        console.error("Full error response:", result);

                        // Show the main error
                        addToast(errorDetail, "error");

                        // If there's a helpful tip, show it in a second toast
                        if (result?.help) {
                          setTimeout(() => {
                            addToast(
                              `💡 ${result.help}`,
                              "info",
                              10000, // Show for 10 seconds
                            );
                          }, 500);
                        }
                      }
                    } catch (error) {
                      console.error("Test email error:", error);
                      const errorMsg =
                        error instanceof Error ? error.message : String(error);
                      console.error("Error details:", errorMsg);
                      addToast(
                        `Error: ${error instanceof Error ? error.message : "Failed to send test email"}`,
                        "error",
                      );
                    } finally {
                      setTestEmailLoading(false);
                    }
                  }}
                  disabled={testEmailLoading || !testEmailAddress.trim()}
                  className="flex-1 px-4 py-2 bg-sky-600 text-white rounded hover:bg-sky-700 disabled:opacity-50"
                >
                  {testEmailLoading ? "Sending..." : "Send Test Email"}
                </button>
              </div>
            </div>
          </div>
        )}

        {activeTab === "support" && (
          <div className="space-y-6">
            <h2 className="text-2xl font-semibold text-white mb-4">
              Support Configuration
            </h2>

            <div className="bg-blue-900 bg-opacity-30 border border-blue-700 rounded-lg p-4 mb-6">
              <p className="text-blue-200 text-sm">
                <strong>Support Email:</strong> This email address will receive
                all customer support tickets and inquiries.
              </p>
            </div>

            <div>
              <label className="block text-gray-300 text-sm font-bold mb-2">
                Support Email Address *
              </label>
              <input
                type="email"
                value={settings.supportEmail || ""}
                onChange={(e) => {
                  setSettings({
                    ...settings,
                    supportEmail: e.target.value,
                  });
                }}
                placeholder="support@example.com"
                className={inputClasses}
              />
              <p className="text-gray-500 text-sm mt-1">
                This is where customer support tickets and inquiries will be
                sent.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-gray-300 text-sm font-bold mb-2">
                  Support Email Subject Prefix
                </label>
                <input
                  type="text"
                  value={settings.supportSubjectPrefix || ""}
                  onChange={(e) => {
                    setSettings({
                      ...settings,
                      supportSubjectPrefix: e.target.value,
                    });
                  }}
                  placeholder="e.g., Support Request"
                  className={inputClasses}
                />
                <p className="text-gray-500 text-sm mt-1">
                  This prefix will appear at the start of all support ticket
                  subject lines.
                </p>
              </div>

              <div>
                <label className="block text-gray-300 text-sm font-bold mb-2">
                  Support Ticket Suffix
                </label>
                <input
                  type="text"
                  value={settings.supportTicketSuffix || ""}
                  onChange={(e) => {
                    setSettings({
                      ...settings,
                      supportTicketSuffix: e.target.value,
                    });
                  }}
                  placeholder="e.g., SUP-001-001"
                  className={inputClasses}
                />
                <p className="text-gray-500 text-sm mt-1">
                  This suffix will appear at the end of all support ticket
                  subject lines.
                </p>
              </div>
            </div>

            <div className="bg-slate-700 p-4 rounded-lg mt-4">
              <h3 className="text-sm font-semibold text-white mb-2">
                Subject Line Format Preview
              </h3>
              <p className="text-gray-300 text-sm mb-2">
                {settings.supportSubjectPrefix || "[Subject Prefix]"} |
                [Subject] | Order: {"[Selected Order]"} | [Date] |{" "}
                {settings.supportTicketSuffix || "[Suffix]"}
              </p>
              <p className="text-gray-400 text-xs">
                Example: {settings.supportSubjectPrefix || "Support Request"} |
                Customization Help | Order: AGIS-0000000001 | 1/30/2026 |{" "}
                {settings.supportTicketSuffix || "SUP-001-001"}
              </p>
            </div>

            <div className="flex gap-3 pt-4">
              <button
                onClick={() => handleSaveSettings()}
                className="bg-sky-600 text-white font-bold py-2 px-6 rounded-lg hover:bg-sky-700"
              >
                Save Support Settings
              </button>
            </div>
          </div>
        )}

        {activeTab === "segmentation" && (
          <div className="space-y-6">
            <div>
              <h2 className="text-2xl font-semibold text-white mb-2">
                Customer Segmentation
              </h2>
              <p className="text-sm text-gray-400 mb-4">
                Define customer segments based on spending, order frequency, and
                inactivity. Segments are applied automatically to customers in
                analytics.
              </p>
            </div>

            {/* Segment Rules */}
            <div className="space-y-4">
              {(settings.segmentRules && settings.segmentRules.length > 0
                ? settings.segmentRules
                : []
              ).map((rule, index) => (
                <div
                  key={rule?.id || index}
                  className="bg-slate-700 p-6 rounded-lg border border-slate-600"
                >
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold text-white">
                      Segment {index + 1}: {rule?.name || "Unnamed"}
                    </h3>
                    <div className="flex items-center gap-2">
                      <label className="flex items-center space-x-2">
                        <input
                          type="checkbox"
                          checked={rule?.enabled ?? false}
                          onChange={(e) => {
                            const updated = [...(settings.segmentRules || [])];
                            updated[index] = {
                              ...updated[index],
                              enabled: e.target.checked,
                            };
                            setSettings({ ...settings, segmentRules: updated });
                          }}
                          className="w-4 h-4"
                        />
                        <span className="text-sm text-gray-300">Enabled</span>
                      </label>
                      <button
                        onClick={() => {
                          const updated = (settings.segmentRules || []).filter(
                            (_, i) => i !== index,
                          );
                          setSettings({ ...settings, segmentRules: updated });
                          addToast("Segment removed", "info");
                        }}
                        className="text-gray-400 hover:text-red-500 transition-colors shrink-0"
                        title="Delete segment"
                      >
                        <TrashIcon className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">
                        Segment Name
                      </label>
                      <input
                        type="text"
                        value={rule?.name || ""}
                        onChange={(e) => {
                          const updated = [...(settings.segmentRules || [])];
                          updated[index] = {
                            ...updated[index],
                            name: e.target.value,
                          };
                          setSettings({ ...settings, segmentRules: updated });
                        }}
                        placeholder="e.g., VIP, At-Risk, Standard"
                        className={inputClasses}
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">
                        Priority (1 = highest)
                      </label>
                      <input
                        type="number"
                        value={rule?.priority ?? 1}
                        onChange={(e) => {
                          const updated = [...(settings.segmentRules || [])];
                          updated[index] = {
                            ...updated[index],
                            priority: parseInt(e.target.value) || 1,
                          };
                          setSettings({ ...settings, segmentRules: updated });
                        }}
                        min="1"
                        className={inputClasses}
                      />
                      <p className="text-gray-500 text-xs mt-1">
                        Lower numbers match first. First matching rule wins.
                      </p>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">
                        Minimum Total Spent ($)
                      </label>
                      <input
                        type="number"
                        value={rule?.minTotalSpent ?? ""}
                        onChange={(e) => {
                          const updated = [...(settings.segmentRules || [])];
                          updated[index] = {
                            ...updated[index],
                            minTotalSpent: e.target.value
                              ? parseFloat(e.target.value)
                              : undefined,
                          };
                          setSettings({ ...settings, segmentRules: updated });
                        }}
                        placeholder="Leave blank to skip this check"
                        className={inputClasses}
                      />
                      <p className="text-gray-500 text-xs mt-1">
                        Customer must have spent at least this much total
                      </p>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">
                        Minimum Order Count
                      </label>
                      <input
                        type="number"
                        value={rule?.minOrderCount ?? ""}
                        onChange={(e) => {
                          const updated = [...(settings.segmentRules || [])];
                          updated[index] = {
                            ...updated[index],
                            minOrderCount: e.target.value
                              ? parseInt(e.target.value)
                              : undefined,
                          };
                          setSettings({ ...settings, segmentRules: updated });
                        }}
                        placeholder="Leave blank to skip this check"
                        className={inputClasses}
                      />
                      <p className="text-gray-500 text-xs mt-1">
                        Customer must have placed at least this many orders
                      </p>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">
                        Max Days Since Order (for At-Risk)
                      </label>
                      <input
                        type="number"
                        value={rule?.maxDaysSinceOrder ?? ""}
                        onChange={(e) => {
                          const updated = [...(settings.segmentRules || [])];
                          updated[index] = {
                            ...updated[index],
                            maxDaysSinceOrder: e.target.value
                              ? parseInt(e.target.value)
                              : undefined,
                          };
                          setSettings({ ...settings, segmentRules: updated });
                        }}
                        placeholder="Leave blank to skip this check"
                        className={inputClasses}
                      />
                      <p className="text-gray-500 text-xs mt-1">
                        Customer qualifies if they haven't ordered in at least
                        this many days
                      </p>
                    </div>
                  </div>

                  <div className="mt-4 p-3 bg-slate-600 rounded text-sm text-gray-300">
                    <strong>Rule Logic:</strong> A customer is assigned to this
                    segment if:
                    <ul className="mt-2 space-y-1 list-disc list-inside">
                      {rule?.minTotalSpent !== undefined && (
                        <li>
                          Total spending ≥ ${rule.minTotalSpent.toFixed(2)}
                        </li>
                      )}
                      {rule?.minOrderCount !== undefined && (
                        <li>Number of orders ≥ {rule.minOrderCount}</li>
                      )}
                      {rule?.maxDaysSinceOrder !== undefined && (
                        <li>No orders for ≥ {rule.maxDaysSinceOrder} days</li>
                      )}
                      {!rule?.minTotalSpent &&
                        !rule?.minOrderCount &&
                        !rule?.maxDaysSinceOrder && (
                          <li>No conditions set (applies to all customers)</li>
                        )}
                    </ul>
                  </div>
                </div>
              ))}
            </div>

            <button
              onClick={() => {
                const newSegment = {
                  id: `segment_${Date.now()}`,
                  name: "New Segment",
                  priority: ((settings.segmentRules || []).length || 0) + 1,
                  enabled: true,
                };
                setSettings({
                  ...settings,
                  segmentRules: [...(settings.segmentRules || []), newSegment],
                });
                addToast("New segment added", "success");
              }}
              className="px-4 py-2 bg-slate-600 text-white rounded-lg hover:bg-slate-500 text-sm font-medium"
            >
              + Add Segment
            </button>

            <div className="bg-slate-700 p-4 rounded-lg border border-slate-600">
              <h3 className="text-sm font-semibold text-white mb-3">
                How Segmentation Works
              </h3>
              <ul className="text-sm text-gray-400 space-y-2">
                <li>
                  • Segments are evaluated by priority (lowest number first)
                </li>
                <li>• A customer is assigned to the first matching segment</li>
                <li>
                  • All conditions in a segment must be met for the customer to
                  match
                </li>
                <li>• Conditions left blank are ignored (not required)</li>
                <li>
                  • Segments are recalculated and stored when customers are
                  loaded in analytics
                </li>
              </ul>
            </div>

            <div className="flex justify-end">
              <button
                onClick={handleSaveSettings}
                className={buttonClasses}
                disabled={!hasSettingsUnsavedChanges}
              >
                Save Segmentation Settings
              </button>
            </div>
          </div>
        )}

        {activeTab === "forms" && (
          <div className="space-y-6">
            <div>
              <h2 className="text-2xl font-semibold text-white mb-2">
                Default Contact Form Fields
              </h2>
              <p className="text-sm text-gray-400 mb-4">
                Configure the default fields that appear on all contact forms.
                These fields will be used automatically when creating new
                contact pages.
              </p>
            </div>

            <div className="bg-blue-500 bg-opacity-10 border border-blue-500 border-opacity-30 rounded-md p-4 mb-6">
              <p className="text-blue-200 text-sm">
                💡 <strong>Professional Setup:</strong> Define your core form
                fields here (name, email, phone, subject, message). Each contact
                page will start with these defaults. You can then customize
                individual forms in the page editor.
              </p>
            </div>

            <DndContext
              sensors={formFieldSensors}
              collisionDetection={closestCenter}
              onDragEnd={(event) => {
                const { active, over } = event;
                if (over && active.id !== over.id) {
                  const fields = [...(settings.defaultFormFields || [])];
                  const oldIndex = fields.findIndex((f) => f.id === active.id);
                  const newIndex = fields.findIndex((f) => f.id === over.id);
                  const reordered = arrayMove(fields, oldIndex, newIndex);
                  setSettings({
                    ...settings,
                    defaultFormFields: reordered,
                  });
                }
              }}
            >
              <SortableContext
                items={(settings.defaultFormFields || []).map((f) => f.id)}
                strategy={verticalListSortingStrategy}
              >
                <div className="space-y-3">
                  {(settings.defaultFormFields || []).map((field, index) => (
                    <FormFieldEditor
                      key={field.id}
                      field={field}
                      index={index}
                      onUpdate={(updates) => {
                        const fields = [...(settings.defaultFormFields || [])];
                        const idx = fields.findIndex((f) => f.id === field.id);
                        if (idx >= 0) {
                          fields[idx] = { ...fields[idx], ...updates };
                          setSettings({
                            ...settings,
                            defaultFormFields: fields,
                          });
                        }
                      }}
                      onDelete={() => {
                        const fields = (
                          settings.defaultFormFields || []
                        ).filter((f) => f.id !== field.id);
                        setSettings({ ...settings, defaultFormFields: fields });
                      }}
                    />
                  ))}
                </div>
              </SortableContext>
            </DndContext>

            <button
              onClick={() => {
                const newField: ContactFormField = {
                  id: `field_${Date.now()}`,
                  type: "text",
                  label: "Custom Field",
                  placeholder: "Enter value",
                  required: false,
                  enabled: true,
                };
                setSettings({
                  ...settings,
                  defaultFormFields: [
                    ...(settings.defaultFormFields || []),
                    newField,
                  ],
                });
              }}
              className="px-4 py-2 bg-sky-600 text-white rounded-lg hover:bg-sky-500 text-sm font-medium"
            >
              + Add Custom Field
            </button>

            <div className="bg-slate-700 p-4 rounded-lg border border-slate-600">
              <h3 className="text-sm font-semibold text-white mb-3">
                Recommended Default Fields
              </h3>
              <div className="grid grid-cols-2 gap-4 text-sm text-gray-400">
                <div>
                  <strong className="text-white">Core Fields:</strong>
                  <ul className="mt-2 space-y-1 list-disc list-inside">
                    <li>Full Name (required)</li>
                    <li>Email Address (required)</li>
                    <li>Phone Number (optional)</li>
                  </ul>
                </div>
                <div>
                  <strong className="text-white">Message Fields:</strong>
                  <ul className="mt-2 space-y-1 list-disc list-inside">
                    <li>Subject (helps categorize inquiries)</li>
                    <li>Message/Description (multiline text)</li>
                  </ul>
                </div>
              </div>
              <p className="mt-3 text-xs text-gray-500">
                Phone numbers are automatically formatted as (###) ###-#### on
                the frontend.
              </p>
            </div>

            <div className="flex justify-end">
              <button
                onClick={handleSaveSettings}
                className={buttonClasses}
                disabled={!hasSettingsUnsavedChanges}
              >
                Save Form Field Settings
              </button>
            </div>
          </div>
        )}

        {activeTab === "terms" && (
          <div className="space-y-6">
            <div>
              <h2 className="text-2xl font-semibold text-white mb-2">
                Terms and Conditions
              </h2>
              <p className="text-sm text-gray-400 mb-4">
                Edit the terms and conditions that customers must agree to
                during registration.
              </p>
            </div>

            <TermsEditor
              value={settings.termsAndConditionsContent || ""}
              onChange={(value) =>
                setSettings((prev) => ({
                  ...prev,
                  termsAndConditionsContent: value,
                }))
              }
            />

            <div className="bg-blue-500 bg-opacity-10 border border-blue-500 border-opacity-30 rounded-md p-4">
              <p className="text-blue-200 text-sm">
                💡 Tip: Use the toolbar to format your text. This rich editor
                supports bold, italic, headings, and bullet lists. The formatted
                content will be displayed on the Terms and Conditions page.
              </p>
            </div>

            <div className="flex justify-end gap-3">
              <button
                onClick={() => window.open("/terms", "_blank")}
                className="px-4 py-2 bg-slate-700 text-white rounded hover:bg-slate-600 transition-colors"
              >
                Preview Terms Page
              </button>
              <button
                onClick={handleSaveSettings}
                className={buttonClasses}
                disabled={!hasSettingsUnsavedChanges}
              >
                Save Terms and Conditions
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default SettingsManagement;
