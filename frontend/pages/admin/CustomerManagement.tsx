import React, { useState, useEffect, useMemo } from "react";
import { EditIcon, TrashIcon } from "../../components/Icons";
import { useToast } from "../../hooks/useToast";
import { useSiteSettings } from "../../context/SiteSettingsContext";
import { useAdmin } from "../../context/AdminContext";
import { generateInvoiceHTML } from "../../services/pdfInvoiceGenerator";
import Pagination from "../../components/Pagination";
import { apiClient } from "../../services/apiClient";
import ContactCustomerModal from "../../components/admin/ContactCustomerModal";
import { formatPhoneNumber, isValidPhoneNumber } from "../../utils/phoneNumber";

interface Customer {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  isActive: boolean;
  orderCount: number;
  totalSpent: number;
  lastOrderDate?: string;
  averageOrderValue: number;
  createdAt: string;
  lastLogin?: string;
  orders?: Array<{
    id: string;
    orderNumber: string;
    date: string;
    total: number;
    status: string;
    trackingNumber?: string;
    items: Array<{
      product: {
        id: string;
        name: string;
        price: number;
      };
      quantity: number;
    }>;
  }>;
}

interface QuoteLineItemForm {
  name: string;
  description: string;
  quantity: number;
  unitPrice: number;
  options: Array<{
    name: string;
    priceDelta: number;
  }>;
  requiresPhotoUpload: boolean;
}

interface CustomQuote {
  id: string;
  quoteNumber: string;
  status:
    | "draft"
    | "sent"
    | "accepted"
    | "expired"
    | "cancelled"
    | "rejected"
    | "change_requested";
  notes?: string;
  lineItems: Array<{
    name: string;
    description?: string;
    quantity: number;
    unitPrice: number;
    options?: Array<{
      name: string;
      priceDelta: number;
    }>;
    requiresPhotoUpload?: boolean;
  }>;
  subtotal: number;
  taxAmount: number;
  shippingCost: number;
  total: number;
  createdAt: string;
  sentAt?: string;
  acceptedAt?: string;
  rejectedAt?: string;
  changeRequestedAt?: string;
  changeRequestNote?: string;
  expirationDate?: string;
}

const CustomerManagement: React.FC = () => {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [filteredCustomers, setFilteredCustomers] = useState<Customer[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [sortBy, setSortBy] = useState<
    "name" | "email" | "totalSpent" | "createdAt"
  >("name");
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(
    null,
  );
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
  });
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [selectedOrderDetail, setSelectedOrderDetail] = useState<any | null>(
    null,
  );
  const [customerQuotes, setCustomerQuotes] = useState<CustomQuote[]>([]);
  const [isQuoteModalOpen, setIsQuoteModalOpen] = useState(false);
  const [isSendingQuote, setIsSendingQuote] = useState(false);
  const [editingQuoteId, setEditingQuoteId] = useState<string | null>(null);
  const [quoteForm, setQuoteForm] = useState({
    notes: "",
    taxAmount: 0,
    shippingCost: 0,
    expirationDays: 30,
    lineItems: [
      {
        name: "",
        description: "",
        quantity: 1,
        unitPrice: 0,
        options: [],
        requiresPhotoUpload: false,
      },
    ] as QuoteLineItemForm[],
  });
  const [orderSearchTerm, setOrderSearchTerm] = useState("");
  const [orderSortBy, setOrderSortBy] = useState<
    "date-desc" | "date-asc" | "amount-desc" | "amount-asc"
  >("date-desc");
  const [orderCurrentPage, setOrderCurrentPage] = useState(1);
  const [orderItemsPerPage, setOrderItemsPerPage] = useState(10);
  const [quoteFilterDateRange, setQuoteFilterDateRange] =
    useState<string>("last 30 days");
  const [quoteSearchTerm, setQuoteSearchTerm] = useState("");
  const [quoteSortBy, setQuoteSortBy] = useState<
    "date-desc" | "date-asc" | "amount-desc" | "amount-asc"
  >("date-desc");
  const [quoteCurrentPage, setQuoteCurrentPage] = useState(1);
  const [quoteItemsPerPage, setQuoteItemsPerPage] = useState(10);
  const { addToast } = useToast();
  const { siteSettings } = useSiteSettings();
  const { sendPasswordResetEmail } = useAdmin();
  const [isContactModalOpen, setIsContactModalOpen] = useState(false);

  const toNumber = (value: unknown, fallback = 0) => {
    const num = Number(value);
    return Number.isFinite(num) ? num : fallback;
  };

  const orderStats = useMemo(() => {
    if (!selectedCustomer) {
      return {
        count: 0,
        totalSpent: 0,
        averageOrderValue: 0,
        lastOrderDate: undefined as string | undefined,
      };
    }

    const orders = Array.isArray(selectedCustomer.orders)
      ? selectedCustomer.orders
      : [];
    const count = orders.length || toNumber(selectedCustomer.orderCount, 0);
    const totalSpentFromOrders = orders.reduce(
      (sum, order) => sum + toNumber(order.total, 0),
      0,
    );
    const totalSpent = Number.isFinite(Number(selectedCustomer.totalSpent))
      ? toNumber(selectedCustomer.totalSpent, totalSpentFromOrders)
      : totalSpentFromOrders;
    const averageOrderValue = count > 0 ? totalSpent / count : 0;
    const lastOrderDate = orders
      .map((order) => order.date)
      .filter(Boolean)
      .sort((a, b) => new Date(b).getTime() - new Date(a).getTime())[0];

    return {
      count,
      totalSpent,
      averageOrderValue,
      lastOrderDate,
    };
  }, [selectedCustomer]);

  const quoteYearOptions = useMemo(() => {
    const orderYears = (selectedCustomer?.orders || [])
      .map((order) => new Date(order.date).getFullYear())
      .filter((year) => Number.isFinite(year));
    const quoteYears = customerQuotes
      .map((quote) => new Date(quote.createdAt).getFullYear())
      .filter((year) => Number.isFinite(year));

    const years = Array.from(new Set([...orderYears, ...quoteYears]));
    return years.sort((a, b) => b - a);
  }, [customerQuotes, selectedCustomer]);

  useEffect(() => {
    const loadCustomers = async () => {
      try {
        setIsLoading(true);
        const data = await apiClient.customers.getAll();
        setCustomers(data || []);
        setFilteredCustomers(data || []);
      } catch (error) {
        console.error("Failed to fetch customers:", error);
        addToast("Failed to load customers from server", "error");
        setCustomers([]);
        setFilteredCustomers([]);
      } finally {
        setIsLoading(false);
      }
    };
    loadCustomers();
  }, [addToast]);

  useEffect(() => {
    let filtered = customers.filter(
      (c) =>
        `${c.firstName} ${c.lastName}`
          .toLowerCase()
          .includes(searchTerm.toLowerCase()) ||
        c.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
        c.phone.includes(searchTerm),
    );
    filtered.sort((a, b) => {
      switch (sortBy) {
        case "email":
          return a.email.localeCompare(b.email);
        case "totalSpent":
          return b.totalSpent - a.totalSpent;
        case "createdAt":
          return (
            new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
          );
        case "name":
        default:
          return `${a.firstName} ${a.lastName}`.localeCompare(
            `${b.firstName} ${b.lastName}`,
          );
      }
    });
    setFilteredCustomers(filtered);
    setCurrentPage(1);
  }, [searchTerm, sortBy, customers]);

  const getQuoteDateRange = (): { start: Date; end: Date } => {
    const now = new Date();
    const end = new Date(now);
    let start = new Date(now);

    if (quoteFilterDateRange === "last 30 days") {
      start.setDate(now.getDate() - 30);
    } else if (quoteFilterDateRange === "past 3 months") {
      start.setMonth(now.getMonth() - 3);
    } else {
      const year = parseInt(quoteFilterDateRange, 10);
      if (!Number.isNaN(year)) {
        start = new Date(year, 0, 1, 0, 0, 0, 0);
        end.setFullYear(year, 11, 31);
        end.setHours(23, 59, 59, 999);
      }
    }

    return { start, end };
  };

  const getFilteredQuotes = (): CustomQuote[] => {
    const { start, end } = getQuoteDateRange();
    let filtered = customerQuotes.filter((quote) => {
      const quoteDate = new Date(quote.createdAt);
      return quoteDate >= start && quoteDate <= end;
    });
    if (quoteSearchTerm) {
      filtered = filtered.filter((quote) =>
        quote.quoteNumber.toLowerCase().includes(quoteSearchTerm.toLowerCase()),
      );
    }
    return [...filtered].sort((a, b) => {
      switch (quoteSortBy) {
        case "date-desc":
          return (
            new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
          );
        case "date-asc":
          return (
            new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
          );
        case "amount-desc":
          return Number(b.total) - Number(a.total);
        case "amount-asc":
          return Number(a.total) - Number(b.total);
        default:
          return 0;
      }
    });
  };

  const handleOpenModal = (customer?: Customer) => {
    if (customer) {
      setEditingCustomer(customer);
      setFormData({
        firstName: customer.firstName,
        lastName: customer.lastName,
        email: customer.email,
        phone: customer.phone,
      });
    } else {
      setEditingCustomer(null);
      setFormData({ firstName: "", lastName: "", email: "", phone: "" });
    }
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingCustomer(null);
    setSelectedCustomer(null);
    setFormData({ firstName: "", lastName: "", email: "", phone: "" });
  };

  const handleSave = async () => {
    if (
      !formData.firstName.trim() ||
      !formData.lastName.trim() ||
      !formData.email.trim()
    ) {
      addToast("First name, last name, and email are required", "error");
      return;
    }
    if (formData.phone && !isValidPhoneNumber(formData.phone)) {
      addToast("Phone must be in format: (555) 123-4567", "error");
      return;
    }
    try {
      // Calculate full name for backend
      const name = `${formData.firstName.trim()} ${formData.lastName.trim()}`;

      if (editingCustomer) {
        await apiClient.customers.update(editingCustomer.id, {
          ...formData,
          name,
        });
        addToast("Customer updated successfully", "success");
      } else {
        await apiClient.customers.create({
          ...formData,
          name,
        });
        addToast("Customer created successfully", "success");
      }
      const updated = await apiClient.customers.getAll();
      setCustomers(updated);
      setFilteredCustomers(updated);
      handleCloseModal();
    } catch (error) {
      addToast(
        `Failed to save customer: ${error instanceof Error ? error.message : "Unknown error"}`,
        "error",
      );
    }
  };

  const handleToggleActive = async (customer: Customer) => {
    try {
      await apiClient.customers.toggleActive(customer.id);
      const updated = await apiClient.customers.getAll();
      setCustomers(updated);
      addToast(
        `Customer ${customer.isActive ? "deactivated" : "activated"} successfully`,
        "success",
      );
    } catch (error) {
      addToast(
        `Failed to toggle customer status: ${error instanceof Error ? error.message : "Unknown error"}`,
        "error",
      );
    }
  };

  const handleDelete = async (customer: Customer) => {
    try {
      await apiClient.customers.delete(customer.id);
      const updated = await apiClient.customers.getAll();
      setCustomers(updated);
      setDeleteConfirm(null);
      addToast("Customer deleted successfully", "success");
    } catch (error) {
      addToast(
        `Failed to delete customer: ${error instanceof Error ? error.message : "Unknown error"}`,
        "error",
      );
      setDeleteConfirm(null);
    }
  };

  const handleSendPasswordReset = async (customer: Customer) => {
    try {
      const result = await sendPasswordResetEmail(customer.id);
      if (result.success) {
        addToast(`Password reset email sent to ${customer.email}`, "success");
      } else {
        addToast(result.error || "Failed to send password reset", "error");
      }
    } catch (error) {
      addToast(
        `Failed to send password reset: ${error instanceof Error ? error.message : "Unknown error"}`,
        "error",
      );
    }
  };

  const exportOrdersAsCSV = (customer: Customer) => {
    // Create CSV header
    const headers = [
      "Order Number",
      "Order Date",
      "Total Amount",
      "Order Status",
      "Items Count",
    ];
    const csvContent = [
      headers.join(","),
      `Customer: ${customer.firstName} ${customer.lastName}`,
      `Email: ${customer.email}`,
      `Phone: ${customer.phone}`,
      `Generated: ${new Date().toLocaleString()}`,
      "", // blank line
    ];

    // Add order summary
    csvContent.push(`Total Orders: ${customer.orderCount}`);
    csvContent.push(`Total Spent: $${customer.totalSpent.toFixed(2)}`);
    csvContent.push(
      `Average Order Value: $${customer.averageOrderValue.toFixed(2)}`,
    );
    csvContent.push(""); // blank line
    csvContent.push(headers.join(","));

    // Note: In a real implementation, you would fetch actual order data from the API
    // For now, this provides the structure for export
    csvContent.push(
      `"Order data available via detailed order history in database"`,
    );

    // Create blob and download
    const blob = new Blob([csvContent.join("\n")], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `orders_${customer.email}_${new Date().toISOString().split("T")[0]}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
    addToast("Orders exported successfully", "success");
  };

  const handleViewCustomer = async (customer: Customer) => {
    try {
      // Fetch full customer details including orders
      const fullCustomer = await apiClient.customers.getById(customer.id);
      setSelectedCustomer(fullCustomer);
      try {
        const quotes = await apiClient.quotes.getForAdminCustomer(customer.id);
        setCustomerQuotes(Array.isArray(quotes) ? quotes : []);
      } catch (quoteError) {
        console.error("Failed to load customer quotes:", quoteError);
        setCustomerQuotes([]);
      }
      setOrderSearchTerm("");
      setOrderSortBy("date-desc");
      setOrderCurrentPage(1);
      setQuoteFilterDateRange("last 30 days");
      setQuoteSearchTerm("");
      setQuoteSortBy("date-desc");
      setQuoteCurrentPage(1);
    } catch (error) {
      console.error("Failed to load customer details:", error);
      addToast("Failed to load customer details", "error");
      // Fall back to the customer data we already have
      setSelectedCustomer(customer);
      try {
        const quotes = await apiClient.quotes.getForAdminCustomer(customer.id);
        setCustomerQuotes(Array.isArray(quotes) ? quotes : []);
      } catch {
        setCustomerQuotes([]);
      }
      setOrderSearchTerm("");
      setOrderSortBy("date-desc");
      setOrderCurrentPage(1);
      setQuoteFilterDateRange("last 30 days");
      setQuoteSearchTerm("");
      setQuoteSortBy("date-desc");
      setQuoteCurrentPage(1);
    }
  };

  const openQuoteModal = (quoteToEdit?: CustomQuote) => {
    if (!selectedCustomer) return;
    if (quoteToEdit) {
      const safeLineItems = Array.isArray(quoteToEdit.lineItems)
        ? quoteToEdit.lineItems
        : [];
      setEditingQuoteId(quoteToEdit.id);
      setQuoteForm({
        notes: quoteToEdit.notes || "",
        taxAmount: Number(quoteToEdit.taxAmount || 0),
        shippingCost: Number(quoteToEdit.shippingCost || 0),
        expirationDays: 30,
        lineItems:
          safeLineItems.length > 0
            ? safeLineItems.map((item) => ({
                name: item.name,
                description: item.description || "",
                quantity: item.quantity,
                unitPrice: item.unitPrice,
                options: Array.isArray(item.options)
                  ? item.options.map((option) => ({
                      name: option.name || "",
                      priceDelta: Number(option.priceDelta || 0),
                    }))
                  : [],
                requiresPhotoUpload: item.requiresPhotoUpload ?? false,
              }))
            : [
                {
                  name: "",
                  description: "",
                  quantity: 1,
                  unitPrice: 0,
                  options: [],
                  requiresPhotoUpload: false,
                },
              ],
      });
    } else {
      setEditingQuoteId(null);
      setQuoteForm({
        notes: "",
        taxAmount: 0,
        shippingCost: 0,
        expirationDays: 30,
        shippingCost: 0,
        lineItems: [
          {
            name: "",
            description: "",
            quantity: 1,
            unitPrice: 0,
            options: [],
            requiresPhotoUpload: false,
          },
        ],
      });
    }
    setIsQuoteModalOpen(true);
  };

  const closeQuoteModal = () => {
    setIsQuoteModalOpen(false);
    setIsSendingQuote(false);
    setEditingQuoteId(null);
  };

  const updateQuoteLineItem = (
    index: number,
    field: keyof QuoteLineItemForm,
    value: string | number | boolean,
  ) => {
    setQuoteForm((prev) => ({
      ...prev,
      lineItems: prev.lineItems.map((item, idx) =>
        idx === index
          ? {
              ...item,
              [field]:
                field === "quantity" || field === "unitPrice"
                  ? Number(value)
                  : field === "requiresPhotoUpload"
                    ? Boolean(value)
                    : String(value),
            }
          : item,
      ),
    }));
  };

  const addQuoteLineItem = () => {
    setQuoteForm((prev) => ({
      ...prev,
      lineItems: [
        ...prev.lineItems,
        {
          name: "",
          description: "",
          quantity: 1,
          unitPrice: 0,
          options: [],
          requiresPhotoUpload: false,
        },
      ],
    }));
  };

  const addQuoteLineItemOption = (lineItemIndex: number) => {
    setQuoteForm((prev) => ({
      ...prev,
      lineItems: prev.lineItems.map((item, idx) =>
        idx === lineItemIndex
          ? {
              ...item,
              options: [...(item.options || []), { name: "", priceDelta: 0 }],
            }
          : item,
      ),
    }));
  };

  const updateQuoteLineItemOption = (
    lineItemIndex: number,
    optionIndex: number,
    field: "name" | "priceDelta",
    value: string,
  ) => {
    setQuoteForm((prev) => ({
      ...prev,
      lineItems: prev.lineItems.map((item, idx) => {
        if (idx !== lineItemIndex) return item;
        return {
          ...item,
          options: (item.options || []).map((option, optIdx) =>
            optIdx === optionIndex
              ? {
                  ...option,
                  [field]: field === "priceDelta" ? Number(value || 0) : value,
                }
              : option,
          ),
        };
      }),
    }));
  };

  const removeQuoteLineItemOption = (
    lineItemIndex: number,
    optionIndex: number,
  ) => {
    setQuoteForm((prev) => ({
      ...prev,
      lineItems: prev.lineItems.map((item, idx) =>
        idx === lineItemIndex
          ? {
              ...item,
              options: (item.options || []).filter(
                (_, optIdx) => optIdx !== optionIndex,
              ),
            }
          : item,
      ),
    }));
  };

  const removeQuoteLineItem = (index: number) => {
    setQuoteForm((prev) => ({
      ...prev,
      lineItems:
        prev.lineItems.length > 1
          ? prev.lineItems.filter((_, idx) => idx !== index)
          : prev.lineItems,
    }));
  };

  const sendQuoteToCustomer = async () => {
    if (!selectedCustomer || isSendingQuote) return;

    const validLineItems = quoteForm.lineItems
      .map((item) => ({
        name: item.name.trim(),
        description: item.description.trim() || undefined,
        quantity: Number(item.quantity),
        unitPrice: Number(item.unitPrice),
        options: (item.options || [])
          .map((option) => ({
            name: String(option.name || "").trim(),
            priceDelta: Number(option.priceDelta || 0),
          }))
          .filter((option) => option.name),
        requiresPhotoUpload: Boolean(item.requiresPhotoUpload),
      }))
      .filter((item) => item.name && item.quantity > 0 && item.unitPrice >= 0);

    if (validLineItems.length === 0) {
      addToast("Please add at least one valid quote line item", "error");
      return;
    }

    try {
      setIsSendingQuote(true);
      if (editingQuoteId) {
        const updated = await apiClient.quotes.updateForAdmin(editingQuoteId, {
          notes: quoteForm.notes.trim() || undefined,
          taxAmount: Number(quoteForm.taxAmount) || 0,
          shippingCost: Number(quoteForm.shippingCost) || 0,
          expirationDays: Number(quoteForm.expirationDays) || 30,
          lineItems: validLineItems,
        });
        setCustomerQuotes((prev) =>
          prev.map((q) => (q.id === editingQuoteId ? updated : q)),
        );
        addToast("Quote updated and re-sent to customer", "success");
      } else {
        const created = await apiClient.quotes.createForCustomer(
          selectedCustomer.id,
          {
            notes: quoteForm.notes.trim() || undefined,
            taxAmount: Number(quoteForm.taxAmount) || 0,
            shippingCost: Number(quoteForm.shippingCost) || 0,
            expirationDays: Number(quoteForm.expirationDays) || 30,
            lineItems: validLineItems,
          },
        );
        setCustomerQuotes((prev) => [created, ...prev]);
        addToast("Custom quote sent to customer", "success");
      }
      closeQuoteModal();
    } catch (error) {
      addToast(
        `Failed to send quote: ${error instanceof Error ? error.message : "Unknown error"}`,
        "error",
      );
      setIsSendingQuote(false);
    }
  };

  const filterAndSortOrders = (orders: any[]) => {
    if (!orders) return [];

    const { start, end } = getQuoteDateRange();

    // Filter by search term
    let filtered = orders.filter((order) =>
      order.orderNumber.toLowerCase().includes(orderSearchTerm.toLowerCase()),
    );

    // Shared date-range filter for orders and quotes
    filtered = filtered.filter((order) => {
      const orderDate = new Date(order.date);
      return orderDate >= start && orderDate <= end;
    });

    // Sort orders
    const sorted = [...filtered].sort((a, b) => {
      switch (orderSortBy) {
        case "date-desc":
          return new Date(b.date).getTime() - new Date(a.date).getTime();
        case "date-asc":
          return new Date(a.date).getTime() - new Date(b.date).getTime();
        case "amount-desc":
          return b.total - a.total;
        case "amount-asc":
          return a.total - b.total;
        default:
          return 0;
      }
    });

    return sorted;
  };

  const getPaginatedOrders = (orders: any[]) => {
    const filtered = filterAndSortOrders(orders);
    const startIndex = (orderCurrentPage - 1) * orderItemsPerPage;
    const endIndex = startIndex + orderItemsPerPage;
    return {
      paginatedOrders: filtered.slice(startIndex, endIndex),
      totalOrders: filtered.length,
    };
  };

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleSelectAllPage = (pageCustomers: Customer[]) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      const pageFullySelected = pageCustomers.every((c) => next.has(c.id));
      if (pageFullySelected) {
        pageCustomers.forEach((c) => next.delete(c.id));
      } else {
        pageCustomers.forEach((c) => next.add(c.id));
      }
      return next;
    });
  };

  const clearSelection = () => setSelectedIds(new Set());

  const bulkResetPasswords = async () => {
    const count = selectedIds.size;
    if (count === 0) return;
    try {
      let successCount = 0;
      let failCount = 0;

      // Send password reset emails for all selected customers
      const promises = Array.from(selectedIds).map(async (customerId) => {
        try {
          const result = await sendPasswordResetEmail(customerId);
          if (result.success) {
            successCount++;
          } else {
            failCount++;
          }
        } catch {
          failCount++;
        }
      });

      await Promise.all(promises);

      if (successCount > 0 && failCount === 0) {
        addToast(
          `Password reset emails sent to ${successCount} customer${successCount > 1 ? "s" : ""}`,
          "success",
        );
      } else if (successCount > 0 && failCount > 0) {
        addToast(`Sent ${successCount} emails, ${failCount} failed`, "warning");
      } else {
        addToast("Failed to send password reset emails", "error");
      }

      clearSelection();
    } catch (error) {
      addToast(
        `Bulk reset failed: ${error instanceof Error ? error.message : "Unknown error"}`,
        "error",
      );
    }
  };

  const bulkCopyEmails = async () => {
    const emails = customers
      .filter((c) => selectedIds.has(c.id))
      .map((c) => c.email);
    if (emails.length === 0) return;
    try {
      await navigator.clipboard.writeText(emails.join(", "));
      addToast(`Copied ${emails.length} emails to clipboard`, "success");
    } catch (error) {
      addToast("Failed to copy emails", "error");
    }
  };

  const bulkEmailSelected = () => {
    const emails = customers
      .filter((c) => selectedIds.has(c.id))
      .map((c) => c.email);
    if (emails.length === 0) return;
    const mailto = `mailto:?bcc=${encodeURIComponent(emails.join(","))}`;
    window.location.href = mailto;
  };

  const handleExportCSV = () => {
    const headers = [
      "First Name",
      "Last Name",
      "Email",
      "Phone",
      "Orders",
      "Total Spent",
      "Avg Order",
      "Last Order",
      "Active",
    ];
    const rows = filteredCustomers.map((c) => [
      c.firstName,
      c.lastName,
      c.email,
      c.phone,
      String(c.orderCount),
      Number(c.totalSpent).toFixed(2),
      Number(c.averageOrderValue).toFixed(2),
      c.lastOrderDate
        ? new Date(c.lastOrderDate).toISOString().split("T")[0]
        : "",
      c.isActive ? "Yes" : "No",
    ]);
    const csv = [
      headers.join(","),
      ...rows.map((r) =>
        r.map((v) => `"${String(v).replace(/"/g, '\"')}"`).join(","),
      ),
    ].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `customers_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    addToast("Exported filtered customers to CSV", "success");
  };

  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex =
    itemsPerPage === filteredCustomers.length
      ? filteredCustomers.length
      : startIndex + itemsPerPage;
  const paginatedCustomers =
    itemsPerPage === filteredCustomers.length
      ? filteredCustomers
      : filteredCustomers.slice(
          startIndex,
          Math.min(endIndex, filteredCustomers.length),
        );

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        Loading customers...
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center gap-3">
        <h1 className="text-3xl font-bold text-white">Customers</h1>
        <div className="flex items-center gap-2">
          {selectedIds.size > 0 && (
            <span className="px-2 py-1 bg-slate-700 text-gray-200 rounded">
              Selected: {selectedIds.size}
            </span>
          )}
          <button
            onClick={handleExportCSV}
            className="px-3 py-2 bg-slate-700 text-white rounded-lg hover:bg-slate-600 transition-colors"
          >
            Export CSV
          </button>
          <button
            onClick={() => handleOpenModal()}
            className="px-4 py-2 bg-sky-600 text-white rounded-lg hover:bg-sky-700 transition-colors"
          >
            + Add Customer
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-slate-800 p-4 rounded-lg">
          <input
            type="text"
            placeholder="Search by name, email, or phone..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full px-4 py-2 rounded bg-slate-700 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-sky-500"
          />
        </div>

        <div className="bg-slate-800 p-4 rounded-lg">
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as any)}
            className="w-full px-4 py-2 rounded bg-slate-700 text-white focus:outline-none focus:ring-2 focus:ring-sky-500"
          >
            <option value="name">Sort by Name</option>
            <option value="email">Sort by Email</option>
            <option value="totalSpent">Sort by Total Spent</option>
            <option value="createdAt">Sort by Date Joined</option>
          </select>
        </div>
      </div>

      {filteredCustomers.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-gray-400">No customers found</p>
        </div>
      ) : (
        <>
          <div className="bg-slate-800 rounded-lg overflow-hidden overflow-x-auto">
            <div className="flex items-center gap-2 p-3 border-b border-slate-700">
              <input
                type="checkbox"
                checked={paginatedCustomers.every((c) => selectedIds.has(c.id))}
                onChange={() => toggleSelectAllPage(paginatedCustomers)}
                className="w-4 h-4 accent-sky-600"
                title="Select all on page"
              />
              <span className="text-gray-300 text-sm">Select page</span>
              <div className="ml-auto flex items-center gap-2">
                <button
                  onClick={bulkResetPasswords}
                  disabled={selectedIds.size === 0}
                  className={`px-3 py-1 rounded text-xs font-semibold transition-colors ${selectedIds.size === 0 ? "bg-slate-700 text-slate-400 cursor-not-allowed" : "bg-purple-900 text-purple-200 hover:bg-purple-800"}`}
                >
                  Bulk Reset PW
                </button>
                <button
                  onClick={bulkCopyEmails}
                  disabled={selectedIds.size === 0}
                  className={`px-3 py-1 rounded text-xs font-semibold transition-colors ${selectedIds.size === 0 ? "bg-slate-700 text-slate-400 cursor-not-allowed" : "bg-slate-700 text-white hover:bg-slate-600"}`}
                >
                  Copy Emails
                </button>
                <button
                  onClick={bulkEmailSelected}
                  disabled={selectedIds.size === 0}
                  className={`px-3 py-1 rounded text-xs font-semibold transition-colors ${selectedIds.size === 0 ? "bg-slate-700 text-slate-400 cursor-not-allowed" : "bg-blue-900 text-blue-200 hover:bg-blue-800"}`}
                >
                  Email Selected
                </button>
                <button
                  onClick={clearSelection}
                  disabled={selectedIds.size === 0}
                  className={`px-3 py-1 rounded text-xs font-semibold transition-colors ${selectedIds.size === 0 ? "bg-slate-700 text-slate-400 cursor-not-allowed" : "bg-slate-700 text-white hover:bg-slate-600"}`}
                >
                  Clear
                </button>
              </div>
            </div>
            <table className="w-full">
              <thead>
                <tr className="bg-slate-700">
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-300">
                    Select
                  </th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-300">
                    Name
                  </th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-300">
                    Email
                  </th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-300">
                    Phone
                  </th>
                  <th className="px-6 py-3 text-center text-sm font-semibold text-gray-300">
                    Orders
                  </th>
                  <th className="px-6 py-3 text-center text-sm font-semibold text-gray-300">
                    Avg Order
                  </th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-300">
                    Total Spent
                  </th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-300">
                    Last Order
                  </th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-300">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-300">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {paginatedCustomers.map((customer) => (
                  <tr
                    key={customer.id}
                    className="border-t border-slate-700 hover:bg-slate-700/50 cursor-pointer"
                    onClick={() => handleViewCustomer(customer)}
                  >
                    <td
                      className="px-4 py-4"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <input
                        type="checkbox"
                        checked={selectedIds.has(customer.id)}
                        onChange={() => toggleSelect(customer.id)}
                        className="w-4 h-4 accent-sky-600"
                        title="Select customer"
                      />
                    </td>
                    <td className="px-6 py-4 text-white font-medium">
                      {customer.firstName} {customer.lastName}
                    </td>
                    <td className="px-6 py-4 text-gray-300">
                      {customer.email}
                    </td>
                    <td className="px-6 py-4 text-gray-300">
                      {customer.phone}
                    </td>
                    <td className="px-6 py-4 text-gray-300 text-center">
                      {customer.orderCount}
                    </td>
                    <td className="px-6 py-4 text-gray-300 text-center">
                      ${Number(customer.averageOrderValue).toFixed(2)}
                    </td>
                    <td className="px-6 py-4 text-gray-300 font-medium">
                      ${Number(customer.totalSpent).toFixed(2)}
                    </td>
                    <td className="px-6 py-4 text-gray-400 text-sm">
                      {customer.lastOrderDate
                        ? new Date(customer.lastOrderDate).toLocaleDateString()
                        : "Never"}
                    </td>
                    <td className="px-6 py-4">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleToggleActive(customer);
                        }}
                        className={`px-3 py-1 rounded text-xs font-semibold transition-colors ${customer.isActive ? "bg-green-900 text-green-200 hover:bg-green-800" : "bg-red-900 text-red-200 hover:bg-red-800"}`}
                      >
                        {customer.isActive ? "Active" : "Inactive"}
                      </button>
                    </td>
                    <td className="px-6 py-4">
                      <div
                        className="flex items-center gap-2"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <button
                          onClick={() => handleSendPasswordReset(customer)}
                          className="px-2 py-1 bg-purple-900 text-purple-200 hover:bg-purple-800 rounded text-xs font-semibold transition-colors whitespace-nowrap"
                          title="Send password reset email"
                        >
                          Reset PW
                        </button>
                        <button
                          onClick={() => handleOpenModal(customer)}
                          className="text-blue-400 hover:text-blue-300 transition-colors"
                          title="Edit customer"
                        >
                          <EditIcon className="w-5 h-5" />
                        </button>
                        <button
                          onClick={() => setDeleteConfirm(customer.id)}
                          className="text-red-400 hover:text-red-300 transition-colors"
                          title="Delete customer"
                        >
                          <TrashIcon className="w-5 h-5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <Pagination
            currentPage={currentPage}
            itemsPerPage={itemsPerPage}
            totalItems={filteredCustomers.length}
            onPageChange={setCurrentPage}
            onItemsPerPageChange={setItemsPerPage}
          />
        </>
      )}

      {isModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-slate-800 p-6 rounded-lg max-w-md w-full">
            <h2 className="text-xl font-bold text-white mb-4">
              {editingCustomer ? "Edit Customer" : "Add New Customer"}
            </h2>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    First Name *
                  </label>
                  <input
                    type="text"
                    value={formData.firstName}
                    onChange={(e) =>
                      setFormData({ ...formData, firstName: e.target.value })
                    }
                    placeholder="Enter first name"
                    className="w-full px-4 py-2 rounded bg-slate-700 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-sky-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Last Name *
                  </label>
                  <input
                    type="text"
                    value={formData.lastName}
                    onChange={(e) =>
                      setFormData({ ...formData, lastName: e.target.value })
                    }
                    placeholder="Enter last name"
                    className="w-full px-4 py-2 rounded bg-slate-700 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-sky-500"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Email *
                </label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) =>
                    setFormData({ ...formData, email: e.target.value })
                  }
                  placeholder="Enter email address"
                  className="w-full px-4 py-2 rounded bg-slate-700 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-sky-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Phone
                </label>
                <input
                  type="tel"
                  value={formData.phone}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      phone: formatPhoneNumber(e.target.value),
                    })
                  }
                  placeholder="(555) 123-4567"
                  inputMode="numeric"
                  maxLength={14}
                  className="w-full px-4 py-2 rounded bg-slate-700 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-sky-500"
                />
                <p className="text-xs text-gray-400 mt-1">
                  Format: (XXX) XXX-XXXX
                </p>
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button
                onClick={handleCloseModal}
                className="flex-1 px-4 py-2 bg-slate-700 text-white rounded-lg hover:bg-slate-600 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                className="flex-1 px-4 py-2 bg-sky-600 text-white rounded-lg hover:bg-sky-700 transition-colors"
              >
                {editingCustomer ? "Update" : "Create"}
              </button>
            </div>
          </div>
        </div>
      )}

      {selectedCustomer && !isModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-start justify-center z-50 p-4 overflow-y-auto">
          <div className="bg-slate-800 p-6 rounded-lg max-w-4xl w-full my-8">
            <div className="flex justify-between items-start mb-6">
              <div>
                <h2 className="text-2xl font-bold text-white">
                  {selectedCustomer.firstName} {selectedCustomer.lastName}
                </h2>
                <p className="text-gray-400">{selectedCustomer.email}</p>
              </div>
              <button
                onClick={() => setSelectedCustomer(null)}
                className="text-gray-400 hover:text-white text-2xl"
              >
                ×
              </button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
              <div className="bg-slate-700 p-4 rounded-lg">
                <div className="text-sm text-gray-400 mb-1">Total Orders</div>
                <div className="text-2xl font-bold text-white">
                  {orderStats.count}
                </div>
              </div>
              <div className="bg-slate-700 p-4 rounded-lg">
                <div className="text-sm text-gray-400 mb-1">Total Spent</div>
                <div className="text-2xl font-bold text-green-400">
                  ${orderStats.totalSpent.toFixed(2)}
                </div>
              </div>
              <div className="bg-slate-700 p-4 rounded-lg">
                <div className="text-sm text-gray-400 mb-1">
                  Avg Order Value
                </div>
                <div className="text-2xl font-bold text-blue-400">
                  ${orderStats.averageOrderValue.toFixed(2)}
                </div>
              </div>
              <div className="bg-slate-700 p-4 rounded-lg">
                <div className="text-sm text-gray-400 mb-1">Customer Since</div>
                <div className="text-lg font-bold text-white">
                  {new Date(selectedCustomer.createdAt).toLocaleDateString()}
                </div>
              </div>
            </div>
            <div className="bg-slate-700 p-4 rounded-lg mb-6">
              <h3 className="text-lg font-semibold text-white mb-3">
                Contact Information
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <div className="text-sm text-gray-400">Email</div>
                  <div className="text-white">{selectedCustomer.email}</div>
                </div>
                <div>
                  <div className="text-sm text-gray-400">Phone</div>
                  <div className="text-white">{selectedCustomer.phone}</div>
                </div>
                <div>
                  <div className="text-sm text-gray-400">Last Login</div>
                  <div className="text-white">
                    {selectedCustomer.lastLogin
                      ? new Date(selectedCustomer.lastLogin).toLocaleString()
                      : "Never"}
                  </div>
                </div>
                <div>
                  <div className="text-sm text-gray-400">Last Order</div>
                  <div className="text-white">
                    {orderStats.lastOrderDate
                      ? new Date(orderStats.lastOrderDate).toLocaleDateString()
                      : "No orders yet"}
                  </div>
                </div>
              </div>
            </div>
            <div className="bg-slate-700 p-4 rounded-lg mb-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-white">
                  Order History
                </h3>
                {orderStats.count > 0 && (
                  <button
                    onClick={() => exportOrdersAsCSV(selectedCustomer)}
                    className="px-3 py-1 bg-green-600 text-white text-sm rounded hover:bg-green-700 transition-colors"
                  >
                    ↓ Export CSV
                  </button>
                )}
              </div>
              {orderStats.count === 0 ||
              !selectedCustomer.orders ||
              selectedCustomer.orders.length === 0 ? (
                <div className="text-center py-8 border-2 border-dashed border-slate-600 rounded">
                  <p className="text-gray-400">No orders yet</p>
                </div>
              ) : (
                <>
                  {/* Search and Sort Controls */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-4">
                    <div>
                      <input
                        type="text"
                        placeholder="Search order number..."
                        value={orderSearchTerm}
                        onChange={(e) => {
                          setOrderSearchTerm(e.target.value);
                          setOrderCurrentPage(1);
                        }}
                        className="w-full px-3 py-2 bg-slate-800 text-white rounded border border-slate-600 focus:outline-none focus:ring-2 focus:ring-sky-500 text-sm"
                      />
                    </div>
                    <div>
                      <select
                        value={orderSortBy}
                        onChange={(e) => setOrderSortBy(e.target.value as any)}
                        className="w-full px-3 py-2 bg-slate-800 text-white rounded border border-slate-600 focus:outline-none focus:ring-2 focus:ring-sky-500 text-sm"
                      >
                        <option value="date-desc">Newest First</option>
                        <option value="date-asc">Oldest First</option>
                        <option value="amount-desc">Highest Amount</option>
                        <option value="amount-asc">Lowest Amount</option>
                      </select>
                    </div>
                    <div>
                      <select
                        value={quoteFilterDateRange}
                        onChange={(e) => {
                          setQuoteFilterDateRange(e.target.value);
                          setOrderCurrentPage(1);
                          setQuoteCurrentPage(1);
                        }}
                        className="w-full px-3 py-2 bg-slate-800 text-white rounded border border-slate-600 focus:outline-none focus:ring-2 focus:ring-sky-500 text-sm"
                      >
                        <option value="last 30 days">Last 30 Days</option>
                        <option value="past 3 months">Past 3 Months</option>
                        {quoteYearOptions.length > 0 && (
                          <option disabled>-----</option>
                        )}
                        {quoteYearOptions.map((year) => (
                          <option key={year} value={String(year)}>
                            {year}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {(() => {
                    const { paginatedOrders, totalOrders } = getPaginatedOrders(
                      selectedCustomer.orders,
                    );

                    return paginatedOrders.length === 0 ? (
                      <div className="text-center py-8 border-2 border-dashed border-slate-600 rounded">
                        <p className="text-gray-400">
                          No orders match your search
                        </p>
                      </div>
                    ) : (
                      <>
                        <div className="space-y-2 mb-4">
                          {paginatedOrders.map((order) => (
                            <div
                              key={order.id}
                              className="bg-slate-800 p-3 rounded border border-slate-600 hover:border-sky-500 transition-all cursor-pointer hover:shadow-lg"
                              onClick={() => setSelectedOrderDetail(order)}
                            >
                              <div className="flex justify-between items-start mb-2">
                                <div>
                                  <div className="flex items-center gap-2">
                                    <h4 className="text-white font-semibold">
                                      Order #{order.orderNumber}
                                    </h4>
                                    <span
                                      className={`px-2 py-0.5 rounded text-xs font-medium capitalize ${
                                        order.status === "pending"
                                          ? "bg-yellow-900 text-yellow-200"
                                          : order.status === "processing"
                                            ? "bg-blue-900 text-blue-200"
                                            : order.status === "shipped"
                                              ? "bg-purple-900 text-purple-200"
                                              : order.status === "delivered"
                                                ? "bg-green-900 text-green-200"
                                                : "bg-red-900 text-red-200"
                                      }`}
                                    >
                                      {order.status}
                                    </span>
                                  </div>
                                  <p className="text-xs text-gray-400">
                                    {new Date(order.date).toLocaleDateString()}
                                  </p>
                                </div>
                                <div className="text-right">
                                  <p className="text-white font-bold text-lg">
                                    ${Number(order.total).toFixed(2)}
                                  </p>
                                  <p className="text-xs text-gray-400">
                                    {order.items.length} item
                                    {order.items.length !== 1 ? "s" : ""}
                                  </p>
                                </div>
                              </div>
                              <div className="border-t border-slate-600 pt-2 mt-2">
                                <div className="space-y-1">
                                  {order.items.map((item: any, idx: number) => {
                                    const productName =
                                      item.name ||
                                      item.productName ||
                                      item.product?.name ||
                                      "Unknown Product";
                                    const productPrice =
                                      item.price ||
                                      item.product?.price ||
                                      item.basePrice ||
                                      0;
                                    return (
                                      <div
                                        key={idx}
                                        className="flex justify-between text-xs"
                                      >
                                        <span className="text-gray-300">
                                          {productName} × {item.quantity}
                                        </span>
                                        <span className="text-gray-400">
                                          $
                                          {(
                                            productPrice * item.quantity
                                          ).toFixed(2)}
                                        </span>
                                      </div>
                                    );
                                  })}
                                </div>
                              </div>
                              {order.trackingNumber && (
                                <div className="mt-2 pt-2 border-t border-slate-600">
                                  <p className="text-xs text-gray-400">
                                    Tracking:{" "}
                                    <span className="text-sky-400 font-mono">
                                      {order.trackingNumber}
                                    </span>
                                  </p>
                                </div>
                              )}
                            </div>
                          ))}
                        </div>

                        {/* Pagination */}
                        {totalOrders > orderItemsPerPage && (
                          <div className="mt-4 pt-4 border-t border-slate-600">
                            <Pagination
                              currentPage={orderCurrentPage}
                              totalItems={totalOrders}
                              itemsPerPage={orderItemsPerPage}
                              onPageChange={setOrderCurrentPage}
                              onItemsPerPageChange={(value) => {
                                setOrderItemsPerPage(value);
                                setOrderCurrentPage(1);
                              }}
                            />
                          </div>
                        )}
                      </>
                    );
                  })()}
                </>
              )}
            </div>
            <div className="bg-slate-700 p-4 rounded-lg mb-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-white">
                  Custom Quotes
                </h3>
                <button
                  onClick={openQuoteModal}
                  className="px-3 py-1 bg-sky-600 text-white text-sm rounded hover:bg-sky-700 transition-colors"
                >
                  + Create Quote
                </button>
              </div>

              {customerQuotes.length === 0 ? (
                <div className="text-center py-8 border-2 border-dashed border-slate-600 rounded">
                  <p className="text-gray-400">No quotes sent yet</p>
                </div>
              ) : (
                <>
                  {/* Search and Sort Controls */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-4">
                    <div>
                      <input
                        type="text"
                        placeholder="Search quote number..."
                        value={quoteSearchTerm}
                        onChange={(e) => {
                          setQuoteSearchTerm(e.target.value);
                          setQuoteCurrentPage(1);
                        }}
                        className="w-full px-3 py-2 bg-slate-800 text-white rounded border border-slate-600 focus:outline-none focus:ring-2 focus:ring-sky-500 text-sm"
                      />
                    </div>
                    <div>
                      <select
                        value={quoteSortBy}
                        onChange={(e) => {
                          setQuoteSortBy(e.target.value as any);
                          setQuoteCurrentPage(1);
                        }}
                        className="w-full px-3 py-2 bg-slate-800 text-white rounded border border-slate-600 focus:outline-none focus:ring-2 focus:ring-sky-500 text-sm"
                      >
                        <option value="date-desc">Newest First</option>
                        <option value="date-asc">Oldest First</option>
                        <option value="amount-desc">Highest Amount</option>
                        <option value="amount-asc">Lowest Amount</option>
                      </select>
                    </div>
                    <div>
                      <select
                        value={quoteFilterDateRange}
                        onChange={(e) => {
                          setQuoteFilterDateRange(e.target.value);
                          setOrderCurrentPage(1);
                          setQuoteCurrentPage(1);
                        }}
                        className="w-full px-3 py-2 bg-slate-800 text-white rounded border border-slate-600 focus:outline-none focus:ring-2 focus:ring-sky-500 text-sm"
                      >
                        <option value="last 30 days">Last 30 Days</option>
                        <option value="past 3 months">Past 3 Months</option>
                        {quoteYearOptions.length > 0 && (
                          <option disabled>-----</option>
                        )}
                        {quoteYearOptions.map((year) => (
                          <option key={year} value={String(year)}>
                            {year}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {(() => {
                    const filteredQuotes = getFilteredQuotes();
                    const paginatedQuotes =
                      quoteItemsPerPage === -1
                        ? filteredQuotes
                        : filteredQuotes.slice(
                            (quoteCurrentPage - 1) * quoteItemsPerPage,
                            quoteCurrentPage * quoteItemsPerPage,
                          );

                    if (filteredQuotes.length === 0) {
                      return (
                        <div className="text-center py-8 border-2 border-dashed border-slate-600 rounded">
                          <p className="text-gray-400">
                            No quotes found in this date range
                          </p>
                        </div>
                      );
                    }

                    return (
                      <>
                        <div className="space-y-2">
                          {paginatedQuotes.map((quote) => (
                            <div
                              key={quote.id}
                              className={`bg-slate-800 p-3 rounded border ${
                                quote.status === "change_requested"
                                  ? "border-amber-600/60"
                                  : "border-slate-600"
                              }`}
                            >
                              <div className="flex items-start justify-between gap-2">
                                <div className="min-w-0">
                                  <p className="text-white font-semibold">
                                    {quote.quoteNumber}
                                  </p>
                                  <p className="text-xs text-gray-400">
                                    {new Date(quote.createdAt).toLocaleString()}{" "}
                                    • {quote.lineItems.length} item
                                    {quote.lineItems.length !== 1 ? "s" : ""}
                                  </p>
                                  {quote.expirationDate && (
                                    <p className={`text-xs mt-1 ${new Date(quote.expirationDate) < new Date() ? "text-red-400" : "text-green-400"}`}>
                                      {new Date(quote.expirationDate) < new Date() ? "Expired " : "Expires "}
                                      {new Date(quote.expirationDate).toLocaleDateString()}
                                    </p>
                                  )}
                                  {quote.status === "change_requested" &&
                                    quote.changeRequestNote && (
                                      <div className="mt-2 rounded border border-amber-700/40 bg-amber-900/20 p-2">
                                        <p className="text-xs font-semibold text-amber-300 mb-0.5">
                                          Customer change request:
                                        </p>
                                        <p className="text-xs text-amber-100">
                                          {quote.changeRequestNote}
                                        </p>
                                      </div>
                                    )}
                                </div>
                                <div className="text-right shrink-0">
                                  <p className="text-white font-bold">
                                    ${Number(quote.total).toFixed(2)}
                                  </p>
                                  <span
                                    className={`inline-block px-2 py-0.5 rounded text-xs capitalize ${
                                      quote.status === "accepted"
                                        ? "bg-green-900 text-green-200"
                                        : quote.status === "sent"
                                          ? "bg-blue-900 text-blue-200"
                                          : quote.status === "change_requested"
                                            ? "bg-amber-900 text-amber-200"
                                            : quote.status === "rejected"
                                              ? "bg-red-900 text-red-200"
                                              : "bg-slate-700 text-gray-300"
                                    }`}
                                  >
                                    {quote.status === "change_requested"
                                      ? "Change Requested"
                                      : quote.status}
                                  </span>
                                  {quote.status === "change_requested" && (
                                    <button
                                      onClick={() => openQuoteModal(quote)}
                                      className="mt-2 block w-full px-2 py-1 text-xs bg-amber-700 text-white rounded hover:bg-amber-600 transition-colors"
                                    >
                                      Edit &amp; Re-send
                                    </button>
                                  )}
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                        <div className="mt-4 pt-4 border-t border-slate-600">
                          <Pagination
                            currentPage={quoteCurrentPage}
                            totalItems={filteredQuotes.length}
                            itemsPerPage={quoteItemsPerPage}
                            onPageChange={setQuoteCurrentPage}
                            onItemsPerPageChange={(value) => {
                              setQuoteItemsPerPage(value);
                              setQuoteCurrentPage(1);
                            }}
                          />
                        </div>
                      </>
                    );
                  })()}
                </>
              )}
            </div>
            <div className="flex gap-3">
              <button
                onClick={openQuoteModal}
                className="px-4 py-2 bg-sky-700 text-sky-100 hover:bg-sky-600 rounded-lg transition-colors"
              >
                Create Quote
              </button>
              <button
                onClick={() => handleSendPasswordReset(selectedCustomer)}
                className="px-4 py-2 bg-purple-900 text-purple-200 hover:bg-purple-800 rounded-lg transition-colors"
              >
                Send Password Reset
              </button>
              <button
                onClick={() => {
                  setSelectedCustomer(null);
                  handleOpenModal(selectedCustomer!);
                }}
                className="px-4 py-2 bg-blue-900 text-blue-200 hover:bg-blue-800 rounded-lg transition-colors"
              >
                Edit Customer
              </button>
              <button
                onClick={() => setSelectedCustomer(null)}
                className="flex-1 px-4 py-2 bg-slate-600 text-white rounded-lg hover:bg-slate-500 transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {isQuoteModalOpen && selectedCustomer && (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-60 p-4">
          <div className="bg-slate-800 p-6 rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto border border-slate-700">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-white">
                {editingQuoteId
                  ? "Edit & Re-send Quote"
                  : "Create Custom Quote"}{" "}
                for {selectedCustomer.firstName} {selectedCustomer.lastName}
              </h2>
              <button
                onClick={closeQuoteModal}
                className="text-gray-400 hover:text-white text-2xl"
              >
                ×
              </button>
            </div>

            <div className="space-y-3 mb-4">
              {quoteForm.lineItems.map((item, index) => (
                <div
                  key={index}
                  className="rounded-lg border border-slate-600 bg-slate-700 p-4 space-y-4"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-300">
                        Line Item {index + 1}
                      </p>
                      <p className="mt-1 text-sm text-slate-400">
                        Define the quoted work and whether the customer must
                        upload a reference photo.
                      </p>
                    </div>
                    <button
                      onClick={() => removeQuoteLineItem(index)}
                      disabled={quoteForm.lineItems.length === 1}
                      className="inline-flex items-center gap-2 rounded-md bg-red-700 px-3 py-2 text-sm font-medium text-white hover:bg-red-600 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      <TrashIcon className="h-4 w-4" />
                      Remove
                    </button>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
                    <div className="md:col-span-4">
                      <label className="mb-1 block text-sm font-medium text-slate-200">
                        Item name
                      </label>
                      <input
                        type="text"
                        value={item.name}
                        onChange={(e) =>
                          updateQuoteLineItem(index, "name", e.target.value)
                        }
                        placeholder="Item name"
                        className="w-full px-3 py-2 bg-slate-800 text-white rounded border border-slate-600"
                      />
                    </div>
                    <div className="md:col-span-4">
                      <label className="mb-1 block text-sm font-medium text-slate-200">
                        Description
                      </label>
                      <input
                        type="text"
                        value={item.description}
                        onChange={(e) =>
                          updateQuoteLineItem(
                            index,
                            "description",
                            e.target.value,
                          )
                        }
                        placeholder="Description (optional)"
                        className="w-full px-3 py-2 bg-slate-800 text-white rounded border border-slate-600"
                      />
                    </div>
                    <div className="md:col-span-2">
                      <label className="mb-1 block text-sm font-medium text-slate-200">
                        Quantity
                      </label>
                      <input
                        type="number"
                        min={1}
                        value={item.quantity}
                        onChange={(e) =>
                          updateQuoteLineItem(index, "quantity", e.target.value)
                        }
                        placeholder="Qty"
                        className="w-full px-3 py-2 bg-slate-800 text-white rounded border border-slate-600"
                      />
                    </div>
                    <div className="md:col-span-2">
                      <label className="mb-1 block text-sm font-medium text-slate-200">
                        Unit price
                      </label>
                      <input
                        type="number"
                        min={0}
                        step="0.01"
                        value={item.unitPrice}
                        onChange={(e) =>
                          updateQuoteLineItem(
                            index,
                            "unitPrice",
                            e.target.value,
                          )
                        }
                        placeholder="Price"
                        className="w-full px-3 py-2 bg-slate-800 text-white rounded border border-slate-600"
                      />
                    </div>
                  </div>

                  <div className="rounded-md border border-slate-500 bg-slate-800/70 p-3">
                    <div className="flex items-center justify-between gap-2 mb-2">
                      <p className="text-sm font-medium text-white">
                        Line Item Options
                      </p>
                      <button
                        type="button"
                        onClick={() => addQuoteLineItemOption(index)}
                        className="px-2 py-1 text-xs bg-slate-700 text-sky-300 rounded hover:bg-slate-600"
                      >
                        + Add Option
                      </button>
                    </div>

                    {(item.options || []).length === 0 ? (
                      <p className="text-xs text-slate-400">
                        No options yet. Add options like Size, Color, Material,
                        or Finish.
                      </p>
                    ) : (
                      <div className="space-y-2">
                        {(item.options || []).map((option, optionIndex) => (
                          <div
                            key={optionIndex}
                            className="grid grid-cols-1 md:grid-cols-12 gap-2 items-end"
                          >
                            <div className="md:col-span-7">
                              <label className="mb-1 block text-xs font-medium text-slate-300">
                                Option name
                              </label>
                              <input
                                type="text"
                                value={option.name}
                                onChange={(e) =>
                                  updateQuoteLineItemOption(
                                    index,
                                    optionIndex,
                                    "name",
                                    e.target.value,
                                  )
                                }
                                placeholder="e.g. Extra Large, Gloss Finish"
                                className="w-full px-3 py-2 bg-slate-900 text-white rounded border border-slate-600"
                              />
                            </div>
                            <div className="md:col-span-4">
                              <label className="mb-1 block text-xs font-medium text-slate-300">
                                Price delta
                              </label>
                              <input
                                type="number"
                                step="0.01"
                                value={option.priceDelta}
                                onChange={(e) =>
                                  updateQuoteLineItemOption(
                                    index,
                                    optionIndex,
                                    "priceDelta",
                                    e.target.value,
                                  )
                                }
                                placeholder="0.00"
                                className="w-full px-3 py-2 bg-slate-900 text-white rounded border border-slate-600"
                              />
                            </div>
                            <div className="md:col-span-1">
                              <button
                                type="button"
                                onClick={() =>
                                  removeQuoteLineItemOption(index, optionIndex)
                                }
                                className="w-full px-2 py-2 bg-red-800 text-white rounded hover:bg-red-700"
                                title="Remove option"
                              >
                                ×
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  <label className="flex items-start gap-3 rounded-md border border-slate-500 bg-slate-800 px-3 py-3 text-sm text-slate-200">
                    <input
                      type="checkbox"
                      checked={item.requiresPhotoUpload}
                      onChange={(e) =>
                        updateQuoteLineItem(
                          index,
                          "requiresPhotoUpload",
                          e.target.checked,
                        )
                      }
                      className="mt-0.5 h-4 w-4 shrink-0 accent-sky-600"
                    />
                    <span>
                      <span className="block font-medium text-white">
                        Require customer photo upload
                      </span>
                      <span className="block text-xs text-slate-400">
                        Prevents this quote from being added to cart until the
                        customer uploads a reference image.
                      </span>
                    </span>
                  </label>
                </div>
              ))}

              <button
                onClick={addQuoteLineItem}
                className="px-3 py-2 bg-slate-700 text-white rounded hover:bg-slate-600"
              >
                + Add Line Item
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-4">
              <div>
                <label className="block text-sm text-gray-300 mb-1">Tax</label>
                <input
                  type="number"
                  min={0}
                  step="0.01"
                  value={quoteForm.taxAmount}
                  onChange={(e) =>
                    setQuoteForm((prev) => ({
                      ...prev,
                      taxAmount: Number(e.target.value),
                    }))
                  }
                  className="w-full px-3 py-2 bg-slate-700 text-white rounded border border-slate-600"
                />
              </div>
              <div>
                <label className="block text-sm text-gray-300 mb-1">
                  Shipping
                </label>
                <input
                  type="number"
                  min={0}
                  step="0.01"
                  value={quoteForm.shippingCost}
                  onChange={(e) =>
                    setQuoteForm((prev) => ({
                      ...prev,
                      shippingCost: Number(e.target.value),
                    }))
                  }
                  className="w-full px-3 py-2 bg-slate-700 text-white rounded border border-slate-600"
                />
              </div>
              <div>
                <label className="block text-sm text-gray-300 mb-1">
                  Quote Total
                </label>
                <div className="px-3 py-2 bg-slate-900 text-white rounded border border-slate-600 font-semibold">
                  $
                  {(
                    quoteForm.lineItems.reduce((sum, line) => {
                      const optionsTotal = (line.options || []).reduce(
                        (optionSum, option) =>
                          optionSum + Number(option.priceDelta || 0),
                        0,
                      );
                      return (
                        sum +
                        Number(line.quantity || 0) *
                          (Number(line.unitPrice || 0) + optionsTotal)
                      );
                    }, 0) +
                    Number(quoteForm.taxAmount || 0) +
                    Number(quoteForm.shippingCost || 0)
                  ).toFixed(2)}
                </div>
              </div>
            </div>

            <div className="mb-4">
              <label className="block text-sm text-gray-300 mb-1">
                Quote Expires In (days)
              </label>
              <div className="flex gap-2">
                <select
                  value={quoteForm.expirationDays}
                  onChange={(e) =>
                    setQuoteForm((prev) => ({
                      ...prev,
                      expirationDays: Number(e.target.value),
                    }))
                  }
                  className="flex-1 px-3 py-2 bg-slate-700 text-white rounded border border-slate-600"
                >
                  <option value={7}>7 days</option>
                  <option value={14}>14 days</option>
                  <option value={30}>30 days</option>
                  <option value={60}>60 days</option>
                  <option value={90}>90 days</option>
                </select>
                {quoteForm.expirationDays && (
                  <div className="px-3 py-2 bg-slate-900 text-white rounded border border-slate-600 text-sm whitespace-nowrap">
                    {new Date(Date.now() + quoteForm.expirationDays * 24 * 60 * 60 * 1000).toLocaleDateString()}
                  </div>
                )}
              </div>
            </div>

            <div className="mb-4">
              <label className="block text-sm text-gray-300 mb-1">Notes</label>
              <textarea
                value={quoteForm.notes}
                onChange={(e) =>
                  setQuoteForm((prev) => ({ ...prev, notes: e.target.value }))
                }
                rows={3}
                placeholder="Optional message for the customer"
                className="w-full px-3 py-2 bg-slate-700 text-white rounded border border-slate-600"
              />
            </div>

            <div className="flex gap-3">
              <button
                onClick={closeQuoteModal}
                className="flex-1 px-4 py-2 bg-slate-700 text-white rounded hover:bg-slate-600"
              >
                Cancel
              </button>
              <button
                onClick={sendQuoteToCustomer}
                disabled={isSendingQuote}
                className="flex-1 px-4 py-2 bg-sky-600 text-white rounded hover:bg-sky-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSendingQuote
                  ? "Sending..."
                  : editingQuoteId
                    ? "Update & Re-send Quote"
                    : "Send Quote to Customer"}
              </button>
            </div>
          </div>
        </div>
      )}

      {deleteConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-slate-800 p-6 rounded-lg max-w-sm w-full">
            <h2 className="text-xl font-bold text-white mb-4">
              Confirm Delete
            </h2>
            <p className="text-gray-300 mb-6">
              Are you sure you want to delete this customer? This action cannot
              be undone.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setDeleteConfirm(null)}
                className="flex-1 px-4 py-2 bg-slate-700 text-white rounded-lg hover:bg-slate-600 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  const customer = customers.find(
                    (c) => c.id === deleteConfirm,
                  );
                  if (customer) {
                    handleDelete(customer);
                  }
                }}
                className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Order Detail Modal */}
      {selectedOrderDetail && (
        <div className="fixed inset-0 bg-black bg-opacity-70 flex items-start justify-center z-60 p-4 overflow-y-auto">
          <div className="bg-slate-800 rounded-lg max-w-3xl w-full my-8 border-2 border-sky-600">
            <div className="p-6">
              <div className="flex justify-between items-start mb-6">
                <div>
                  <h2 className="text-2xl font-bold text-white">
                    Order #{selectedOrderDetail.orderNumber}
                  </h2>
                  <p className="text-gray-400">
                    {new Date(selectedOrderDetail.date).toLocaleString()}
                  </p>
                </div>
                <button
                  onClick={() => setSelectedOrderDetail(null)}
                  className="text-gray-400 hover:text-white text-3xl font-bold leading-none -mt-2"
                >
                  ×
                </button>
              </div>

              {/* Order Status */}
              <div className="bg-slate-700 p-4 rounded-lg mb-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-400 mb-1">Status</p>
                    <span
                      className={`inline-block px-4 py-2 rounded-lg text-sm font-bold capitalize ${
                        selectedOrderDetail.status === "pending"
                          ? "bg-yellow-900 text-yellow-200"
                          : selectedOrderDetail.status === "processing"
                            ? "bg-blue-900 text-blue-200"
                            : selectedOrderDetail.status === "shipped"
                              ? "bg-purple-900 text-purple-200"
                              : selectedOrderDetail.status === "delivered"
                                ? "bg-green-900 text-green-200"
                                : "bg-red-900 text-red-200"
                      }`}
                    >
                      {selectedOrderDetail.status}
                    </span>
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-gray-400 mb-1">Total Amount</p>
                    <p className="text-3xl font-bold text-white">
                      ${Number(selectedOrderDetail.total).toFixed(2)}
                    </p>
                  </div>
                </div>
                {selectedOrderDetail.trackingNumber && (
                  <div className="mt-4 pt-4 border-t border-slate-600">
                    <p className="text-sm text-gray-400">Tracking Number</p>
                    <p className="text-sky-400 font-mono text-lg font-semibold">
                      {selectedOrderDetail.trackingNumber}
                    </p>
                  </div>
                )}
              </div>

              {/* Order Items */}
              <div className="bg-slate-700 p-4 rounded-lg mb-6">
                <h3 className="text-lg font-semibold text-white mb-4">
                  Order Items
                </h3>
                <div className="space-y-4">
                  {selectedOrderDetail.items.map((item: any, idx: number) => {
                    const productName =
                      item.name ||
                      item.productName ||
                      item.product?.name ||
                      "Unknown Product";
                    const basePrice =
                      item.basePrice || item.price || item.product?.price || 0;
                    const totalItemPrice = basePrice * item.quantity;
                    const hasOptions =
                      item.optionsBreakdown && item.optionsBreakdown.length > 0;
                    const customTextCost = item.customTextCost || 0;
                    const customUploadImageUrl =
                      item.customization?.type === "upload"
                        ? item.customization.value
                        : undefined;
                    const customUploadFileName =
                      item.customization?.type === "upload"
                        ? item.customization.fileName
                        : undefined;
                    const customGalleryImageUrl =
                      item.customization?.type === "gallery"
                        ? item.customization.value
                        : undefined;

                    return (
                      <div
                        key={idx}
                        className="bg-slate-800 rounded border border-slate-600 overflow-hidden"
                      >
                        <div className="grid grid-cols-1 md:grid-cols-[220px_1fr] gap-4 p-4">
                          <div className="space-y-3">
                            {item.productImage && (
                              <div>
                                <div className="text-xs text-gray-400 mb-1">
                                  Product Image
                                </div>
                                <img
                                  src={item.productImage}
                                  alt={productName}
                                  className="w-full h-32 object-cover rounded border border-slate-600"
                                  onError={(e) => {
                                    (e.target as HTMLImageElement).src =
                                      "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'%3E%3Crect fill='%23475569' width='100' height='100'/%3E%3Ctext x='50' y='50' font-size='12' fill='%239ca3af' text-anchor='middle' dy='.3em'%3ENo Image%3C/text%3E%3C/svg%3E";
                                  }}
                                />
                              </div>
                            )}
                            {customUploadImageUrl && (
                              <div>
                                <div className="text-xs text-gray-400 mb-1">
                                  Custom Upload
                                  {customUploadFileName
                                    ? ` • ${customUploadFileName}`
                                    : ""}
                                </div>
                                <img
                                  src={customUploadImageUrl}
                                  alt={customUploadFileName || "Custom upload"}
                                  className="w-full h-32 object-cover rounded border border-slate-600"
                                  onError={(e) => {
                                    (e.target as HTMLImageElement).src =
                                      "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'%3E%3Crect fill='%23475569' width='100' height='100'/%3E%3Ctext x='50' y='50' font-size='12' fill='%239ca3af' text-anchor='middle' dy='.3em'%3ENo Image%3C/text%3E%3C/svg%3E";
                                  }}
                                />
                                <a
                                  href={customUploadImageUrl}
                                  download={
                                    customUploadFileName ||
                                    `${productName}-custom-upload.png`
                                  }
                                  className="mt-2 inline-flex items-center gap-1 rounded-md border border-slate-600 bg-slate-700 px-2 py-1 text-xs text-sky-300 hover:bg-slate-600 hover:text-sky-200"
                                >
                                  Download original
                                </a>
                              </div>
                            )}
                            {customGalleryImageUrl && (
                              <div>
                                <div className="text-xs text-gray-400 mb-1">
                                  Custom Selection
                                </div>
                                <img
                                  src={customGalleryImageUrl}
                                  alt="Custom selection"
                                  className="w-full h-32 object-cover rounded border border-slate-600"
                                  onError={(e) => {
                                    (e.target as HTMLImageElement).src =
                                      "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'%3E%3Crect fill='%23475569' width='100' height='100'/%3E%3Ctext x='50' y='50' font-size='12' fill='%239ca3af' text-anchor='middle' dy='.3em'%3ENo Image%3C/text%3E%3C/svg%3E";
                                  }}
                                />
                              </div>
                            )}
                          </div>
                          <div className="flex-1">
                            <p className="text-white font-semibold text-lg mb-1">
                              {productName}
                            </p>
                            <div className="text-sm text-gray-400 space-y-1">
                              <div className="flex justify-between">
                                <span>Base Price:</span>
                                <span>${Number(basePrice).toFixed(2)}</span>
                              </div>
                              {hasOptions && (
                                <div className="ml-2 border-l border-slate-600 pl-2 space-y-1">
                                  <div className="font-semibold text-gray-300">
                                    Options:
                                  </div>
                                  {item.optionsBreakdown.map(
                                    (option: any, optIdx: number) => (
                                      <div
                                        key={optIdx}
                                        className="flex justify-between text-gray-400"
                                      >
                                        <span>{option.label}</span>
                                        <span>
                                          +$
                                          {Number(option.priceDelta).toFixed(2)}
                                        </span>
                                      </div>
                                    ),
                                  )}
                                </div>
                              )}
                              {item.customText && (
                                <div className="ml-2 border-l border-slate-600 pl-2">
                                  <div className="font-semibold text-gray-300">
                                    Custom Text:
                                  </div>
                                  <div className="text-gray-400">
                                    "{item.customText}"
                                  </div>
                                  {customTextCost > 0 && (
                                    <div className="flex justify-between text-gray-400 mt-1">
                                      <span>Text Cost:</span>
                                      <span>
                                        +${Number(customTextCost).toFixed(2)}
                                      </span>
                                    </div>
                                  )}
                                </div>
                              )}
                              {item.selectedOptions && (
                                <div className="text-gray-400">
                                  <span className="font-semibold text-gray-300">
                                    Selections:
                                  </span>{" "}
                                  {item.selectedOptions}
                                </div>
                              )}
                              <div className="flex justify-between font-semibold text-white pt-2 border-t border-slate-600 mt-2">
                                <span>Qty: {item.quantity}</span>
                                <span>
                                  ${Number(totalItemPrice).toFixed(2)}
                                </span>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Order Summary */}
              <div className="bg-slate-700 p-4 rounded-lg mb-6">
                <h3 className="text-lg font-semibold text-white mb-3">
                  Order Summary
                </h3>
                <div className="space-y-2">
                  <div className="flex justify-between text-gray-300">
                    <span>Subtotal</span>
                    <span>
                      $
                      {toNumber(
                        selectedOrderDetail.orderData?.subtotal ??
                          selectedOrderDetail.subtotal ??
                          0,
                      ).toFixed(2)}
                    </span>
                  </div>
                  <div className="flex justify-between text-gray-300">
                    <span>Tax</span>
                    <span>
                      $
                      {toNumber(
                        selectedOrderDetail.orderData?.tax ??
                          selectedOrderDetail.taxAmount ??
                          0,
                      ).toFixed(2)}
                    </span>
                  </div>
                  <div className="flex justify-between text-gray-300">
                    <span>Shipping</span>
                    <span>
                      $
                      {toNumber(
                        selectedOrderDetail.orderData?.shipping ??
                          selectedOrderDetail.shippingCost ??
                          0,
                      ).toFixed(2)}
                    </span>
                  </div>
                  <div className="border-t border-slate-600 pt-2 flex justify-between text-white font-bold text-lg">
                    <span>Total</span>
                    <span>
                      $
                      {toNumber(
                        selectedOrderDetail.orderData?.total ??
                          selectedOrderDetail.total ??
                          0,
                      ).toFixed(2)}
                    </span>
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className="flex gap-3">
                <button
                  onClick={() => setIsContactModalOpen(true)}
                  className="flex-1 px-4 py-2 bg-sky-600 text-white rounded-lg hover:bg-sky-700 transition-colors"
                >
                  📧 Contact Customer
                </button>
                <button
                  onClick={() => {
                    try {
                      const order = selectedOrderDetail;
                      const customer = selectedCustomer;
                      if (!customer) {
                        addToast("Customer details not available", "error");
                        return;
                      }
                      const invoiceWindow = window.open(
                        "",
                        "_blank",
                        "width=900,height=1100",
                      );
                      if (!invoiceWindow) {
                        addToast(
                          "Pop-up blocked. Please allow pop-ups to print the invoice.",
                          "error",
                        );
                        return;
                      }
                      const items = (order.items || []).map(
                        (item: any, idx: number) => {
                          const name =
                            item.product?.name ||
                            item.productName ||
                            item.name ||
                            `Item ${idx + 1}`;
                          const price = toNumber(
                            item.product?.price ?? item.price ?? 0,
                            0,
                          );
                          const quantity = toNumber(item.quantity, 1);

                          // Build selected options string if available
                          let selectedOptionsText = "";
                          if (typeof item.selectedOptions === "string") {
                            selectedOptionsText = item.selectedOptions;
                          }

                          return {
                            id: String(item.id || idx),
                            name,
                            quantity,
                            price,
                            total: price * quantity,
                            selectedOptions: selectedOptionsText || undefined,
                            customText: item.customText,
                            customTextCost: item.customTextCost,
                            customization: item.customization,
                            customImageCost: item.customImageCost,
                            optionsBreakdown: item.optionsBreakdown,
                          };
                        },
                      );

                      const orderData = order.orderData || {};
                      const shipping =
                        orderData.shippingAddress ||
                        order.shippingAddress ||
                        {};

                      const invoiceHtml = generateInvoiceHTML(
                        {
                          orderNumber: order.orderNumber,
                          orderDate: order.date,
                          storeName:
                            `${siteSettings?.logoText || "Your"} ${siteSettings?.logoTextAccent || "Store"}`.trim(),
                          customerName:
                            `${customer.firstName || ""} ${customer.lastName || ""}`.trim(),
                          customerEmail: customer.email,
                          customerPhone: customer.phone,
                          shippingAddress: {
                            street:
                              shipping.street ||
                              shipping.streetAddress ||
                              shipping.street1 ||
                              "",
                            city: shipping.city || "",
                            state: shipping.state || "",
                            zip: shipping.zip || shipping.zipCode || "",
                            country: shipping.country || "USA",
                          },
                          items,
                          subtotal: toNumber(
                            order.subtotal ?? orderData.subtotal ?? 0,
                            0,
                          ),
                          tax: toNumber(
                            order.taxAmount ?? orderData.tax ?? 0,
                            0,
                          ),
                          shipping: toNumber(
                            order.shippingCost ?? orderData.shipping ?? 0,
                            0,
                          ),
                          total: toNumber(
                            order.total ?? orderData.total ?? 0,
                            0,
                          ),
                          trackingNumber: order.trackingNumber,
                          paymentMethod: "Credit Card",
                          notes: `Order Status: ${order.status || "pending"}`,
                        },
                        siteSettings?.invoiceTemplate,
                      );

                      invoiceWindow.document.open();
                      invoiceWindow.document.write(invoiceHtml);
                      invoiceWindow.document.close();
                      invoiceWindow.focus();
                      invoiceWindow.print();
                    } catch (error) {
                      console.error("Failed to print invoice:", error);
                      addToast("Failed to print invoice", "error");
                    }
                  }}
                  className="flex-1 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
                >
                  📄 Print Invoice
                </button>
                <button
                  onClick={() => setSelectedOrderDetail(null)}
                  className="px-6 py-2 bg-slate-600 text-white rounded-lg hover:bg-slate-500 transition-colors"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <ContactCustomerModal
        isOpen={isContactModalOpen}
        onClose={() => setIsContactModalOpen(false)}
        customer={selectedCustomer}
        orderId={selectedOrderDetail?.id}
        orderNumber={selectedOrderDetail?.orderNumber}
        orderDate={selectedOrderDetail?.date}
      />
    </div>
  );
};

export default CustomerManagement;
