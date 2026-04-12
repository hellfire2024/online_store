import React, { useState, useEffect, useMemo } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useCustomerAuth } from "../context/CustomerAuthContext";
import { useSiteSettings } from "../context/SiteSettingsContext";
import { useToast } from "../hooks/useToast";
import apiClient from "../services/apiClient";
import Pagination from "../components/Pagination";

interface SupportTicket {
  id: string;
  ticketNumber: string;
  subject: string;
  message: string;
  orderId?: string;
  status: "open" | "in_progress" | "resolved" | "closed";
  priority: "low" | "medium" | "high";
  createdAt: string;
  updatedAt: string;
  replies: Array<{
    id: string;
    author: "customer" | "support";
    message: string;
    timestamp: string;
  }>;
}

const SupportTicketsPage: React.FC = () => {
  const { isAuthenticated, isLoading: authLoading, customer } = useCustomerAuth();
  const { siteSettings } = useSiteSettings();
  const navigate = useNavigate();
  const location = useLocation();
  const { addToast } = useToast();

  const [activeTab, setActiveTab] = useState<"create" | "tickets">("create");
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [selectedTicket, setSelectedTicket] = useState<SupportTicket | null>(
    null,
  );
  const [formData, setFormData] = useState({
    subject: "",
    message: "",
    orderId: "",
    priority: "medium",
  });
  const [replyMessage, setReplyMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [ticketSearch, setTicketSearch] = useState("");
  const [ticketCurrentPage, setTicketCurrentPage] = useState(1);
  const [ticketItemsPerPage, setTicketItemsPerPage] = useState(25);

  const filteredTickets = useMemo(() => {
    const query = ticketSearch.trim().toLowerCase();
    if (!query) return tickets;

    return tickets.filter((ticket) => {
      const replyText = ticket.replies.map((r) => r.message).join(" ");
      const haystack = [
        ticket.ticketNumber,
        ticket.subject,
        ticket.message,
        ticket.orderId || "",
        ticket.status,
        ticket.priority,
        replyText,
      ]
        .join(" ")
        .toLowerCase();

      return haystack.includes(query);
    });
  }, [tickets, ticketSearch]);

  const paginatedTickets = useMemo(() => {
    if (ticketItemsPerPage === -1) return filteredTickets;

    const start = (ticketCurrentPage - 1) * ticketItemsPerPage;
    const end = start + ticketItemsPerPage;
    return filteredTickets.slice(start, end);
  }, [filteredTickets, ticketCurrentPage, ticketItemsPerPage]);

  const ensureCustomerToken = (): boolean => {
    try {
      const storedToken = localStorage.getItem("auth_token");
      if (!storedToken) {
        return false;
      }

      if (apiClient.getToken() !== storedToken) {
        apiClient.setToken(storedToken);
      }

      return true;
    } catch (_error) {
      return false;
    }
  };

  useEffect(() => {
    const state = location.state as
      | {
          orderId?: string;
          orderNumber?: string;
          orderDate?: string;
          subject?: string;
          message?: string;
        }
      | undefined;

    if (state && (state.orderId || state.subject || state.message)) {
      setActiveTab("create");
      setFormData((prev) => ({
        ...prev,
        orderId: state.orderId ?? prev.orderId,
        subject:
          state.subject ??
          (state.orderNumber
            ? `Order ${state.orderNumber} support request`
            : prev.subject),
        message: state.message ?? prev.message,
      }));
    }
  }, [location.state]);

  useEffect(() => {
    // CRITICAL: Guard prevents ALL execution if not authenticated
    // This must execute BEFORE any async operations
    if (!isAuthenticated || !customer?.id) {
      // Clear state and return – no API calls until auth resolves
      setTickets([]);
      setIsLoading(false);
      return; // ← MUST EXIT before defining async function
    }

    // Only runs if both isAuthenticated AND customer.id exist
    const loadTickets = async () => {
      try {
        if (!ensureCustomerToken()) {
          setTickets([]);
          return;
        }

        setIsLoading(true);
        const apiTickets = await apiClient.tickets.getForCustomer(customer.id);
        setTickets(Array.isArray(apiTickets) ? apiTickets : []);
      } catch (error) {
        console.error("Failed to load tickets:", error);
        addToast("Failed to load support tickets", "error");
        setTickets([]);
      } finally {
        setIsLoading(false);
      }
    };

    loadTickets();
  }, [isAuthenticated, customer?.id, addToast]);

  // Redirect to login as soon as auth is resolved and user is not logged in
  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      navigate("/login", {
        replace: true,
        state: { from: location.pathname },
      });
    }
  }, [authLoading, isAuthenticated, navigate, location.pathname]);

  useEffect(() => {
    setTicketCurrentPage(1);
  }, [ticketSearch]);

  useEffect(() => {
    if (
      selectedTicket &&
      !filteredTickets.some((ticket) => ticket.id === selectedTicket.id)
    ) {
      setSelectedTicket(null);
    }
  }, [filteredTickets, selectedTicket]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;

    if (!formData.subject.trim() || !formData.message.trim()) {
      addToast("Subject and message are required", "error");
      return;
    }

    if (!customer) {
      addToast("Please sign in to submit a ticket", "error");
      return;
    }

    if (!ensureCustomerToken()) {
      addToast("Session expired. Please sign in again", "error");
      return;
    }

    const ticketNumber = `TKT-${new Date().getFullYear()}-${String(Date.now()).slice(-6)}`;
    let createdTicket: SupportTicket | null = null;

    try {
      setIsSubmitting(true);
      createdTicket = await apiClient.tickets.create({
        ticketNumber,
        customerId: customer.id,
        customerName: customer.name,
        customerEmail: customer.email,
        subject: formData.subject,
        message: formData.message,
        orderId: formData.orderId || null,
        priority: formData.priority,
      });
    } catch (error) {
      console.error("Error creating ticket:", error);
      if (
        (error as any)?.status === 401 ||
        (error as any)?.response?.status === 401
      ) {
        addToast("Session expired. Please sign in again.", "error");
        navigate("/login", { replace: true, state: { from: location.pathname } });
      } else {
        addToast("Failed to create support ticket", "error");
      }
      return;
    } finally {
      setIsSubmitting(false);
    }

    if (createdTicket) {
      setTickets((prev) => [createdTicket as SupportTicket, ...prev]);
    }
    setFormData({ subject: "", message: "", orderId: "", priority: "medium" });
    addToast("Support ticket created successfully", "success");
    setActiveTab("tickets");

    // Send email to support in the background so UI is not blocked.
    void (async () => {
      try {
        const ticketDate = new Date().toLocaleDateString();

        // Build subject line with order info if available
        let orderInfo = "";
        if (formData.orderId) {
          const selectedOrder = customer?.orders.find(
            (o) => o.id === formData.orderId,
          );
          orderInfo = selectedOrder
            ? ` | Order: ${selectedOrder.orderNumber}`
            : "";
        }

        const subjectPrefix =
          siteSettings?.supportSubjectPrefix || "Support Request";
        const ticketSuffix = siteSettings?.supportTicketSuffix || "SUP-001-001";
        const emailSubject = `${subjectPrefix} | ${formData.subject}${orderInfo} | ${ticketDate} | ${ticketSuffix}`;
        const supportEmail =
          siteSettings?.supportEmail || "support@adaptivegis.com";

        const response = await apiClient.tickets.sendEmail({
          to: supportEmail,
          subject: emailSubject,
          ticketNumber: createdTicket?.ticketNumber || ticketNumber,
          orderId: formData.orderId,
          priority: formData.priority,
          message: formData.message,
          customerInfo: {
            subject: formData.subject,
            date: ticketDate,
          },
        });

        if (response?.success) {
          console.log("Support ticket email sent successfully");
        } else {
          console.warn("Failed to send support ticket email");
        }
      } catch (error) {
        console.error("Error sending support ticket email:", error);
      }
    })();
  };

  const handleReply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTicket || !replyMessage.trim()) return;

    try {
      const reply = await apiClient.tickets.addReply(
        selectedTicket.id,
        "customer",
        replyMessage,
      );

      const updated = tickets.map((t) => {
        if (t.id === selectedTicket.id) {
          return {
            ...t,
            replies: [...t.replies, reply],
            updatedAt: new Date().toISOString(),
          };
        }
        return t;
      });

      setTickets(updated);
      setSelectedTicket(
        updated.find((t) => t.id === selectedTicket.id) || null,
      );
      setReplyMessage("");
      addToast("Reply sent", "success");
    } catch (error) {
      console.error("Failed to send reply:", error);
      const status = (error as any)?.status || (error as any)?.response?.status;
      if (status === 401 || status === 403) {
        addToast("Session expired. Please sign in again.", "error");
        navigate("/login", { replace: true, state: { from: location.pathname } });
      } else {
        addToast("Failed to send reply", "error");
      }
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "open":
        return "bg-blue-900 text-blue-200";
      case "in_progress":
        return "bg-yellow-900 text-yellow-200";
      case "resolved":
        return "bg-green-900 text-green-200";
      case "closed":
        return "bg-gray-900 text-gray-200";
      default:
        return "bg-slate-900 text-slate-200";
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "high":
        return "bg-red-900 text-red-200";
      case "medium":
        return "bg-orange-900 text-orange-200";
      case "low":
        return "bg-gray-900 text-gray-200";
      default:
        return "bg-slate-900 text-slate-200";
    }
  };

  if (authLoading) {
    return (
      <div className="max-w-6xl mx-auto p-6 py-12 text-center">
        <p className="text-gray-400">Loading...</p>
      </div>
    );
  }

  if (!isAuthenticated) {
    // Redirect effect above will fire; render nothing while it navigates
    return null;
  }

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-6">
      <h1 className="text-3xl font-bold text-white">Support Center</h1>

      <div className="flex gap-2 border-b border-slate-700">
        <button
          onClick={() => setActiveTab("create")}
          className={`px-6 py-3 font-semibold transition-colors ${
            activeTab === "create"
              ? "border-b-2 border-sky-500 text-white"
              : "text-gray-400 hover:text-white"
          }`}
        >
          Create Ticket
        </button>
        <button
          onClick={() => setActiveTab("tickets")}
          className={`px-6 py-3 font-semibold transition-colors ${
            activeTab === "tickets"
              ? "border-b-2 border-sky-500 text-white"
              : "text-gray-400 hover:text-white"
          }`}
        >
          My Tickets ({tickets.length})
        </button>
      </div>

      {activeTab === "create" ? (
        <form
          onSubmit={handleSubmit}
          className="bg-slate-800 p-6 rounded-lg space-y-4"
        >
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Subject *
            </label>
            <input
              type="text"
              value={formData.subject}
              onChange={(e) =>
                setFormData({ ...formData, subject: e.target.value })
              }
              placeholder="Brief description of your issue"
              className="w-full px-4 py-2 rounded bg-slate-700 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-sky-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Related Order (Optional)
            </label>
            {customer?.orders && customer.orders.length > 0 ? (
              <select
                value={formData.orderId}
                onChange={(e) =>
                  setFormData({ ...formData, orderId: e.target.value })
                }
                className="w-full px-4 py-2 rounded bg-slate-700 text-white focus:outline-none focus:ring-2 focus:ring-sky-500"
              >
                <option value="">
                  Select an order (or leave blank for general inquiry)
                </option>
                {customer.orders.map((order) => (
                  <option key={order.id} value={order.id}>
                    {order.orderNumber} -{" "}
                    {new Date(order.date).toLocaleDateString()} ({order.status})
                  </option>
                ))}
              </select>
            ) : (
              <input
                type="text"
                value={formData.orderId}
                onChange={(e) =>
                  setFormData({ ...formData, orderId: e.target.value })
                }
                placeholder="e.g., AGIS-0000000001 or leave blank"
                className="w-full px-4 py-2 rounded bg-slate-700 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-sky-500"
              />
            )}
            <p className="text-xs text-gray-500 mt-1">
              Leave blank to submit a general support request without relating
              to an order.
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Priority
            </label>
            <select
              value={formData.priority}
              onChange={(e) =>
                setFormData({ ...formData, priority: e.target.value })
              }
              className="w-full px-4 py-2 rounded bg-slate-700 text-white focus:outline-none focus:ring-2 focus:ring-sky-500"
            >
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Message *
            </label>
            <textarea
              value={formData.message}
              onChange={(e) =>
                setFormData({ ...formData, message: e.target.value })
              }
              placeholder="Describe your issue in detail..."
              rows={6}
              className="w-full px-4 py-2 rounded bg-slate-700 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-sky-500"
            />
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="px-6 py-2 bg-sky-600 text-white rounded hover:bg-sky-700 transition-colors disabled:opacity-70 disabled:cursor-not-allowed"
          >
            {isSubmitting ? "Submitting..." : "Submit Ticket"}
          </button>
        </form>
      ) : (
        <div className="space-y-4">
          <div className="bg-slate-800 p-4 rounded-lg border border-slate-700">
            <div className="grid grid-cols-1 md:grid-cols-[1fr_auto] gap-3 items-end">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Search Tickets
                </label>
                <input
                  type="text"
                  value={ticketSearch}
                  onChange={(e) => setTicketSearch(e.target.value)}
                  placeholder="Search by ticket number, subject, message, status, priority..."
                  className="w-full px-4 py-2 rounded bg-slate-700 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-sky-500"
                />
              </div>
              <div className="text-sm text-gray-400 md:text-right">
                Showing {paginatedTickets.length} of {filteredTickets.length}{" "}
                tickets
              </div>
            </div>
          </div>

          {isLoading ? (
            <div className="text-center py-12 bg-slate-800 rounded-lg">
              <p className="text-gray-400">Loading tickets...</p>
            </div>
          ) : tickets.length === 0 ? (
            <div className="text-center py-12 bg-slate-800 rounded-lg">
              <p className="text-gray-400">No support tickets yet</p>
            </div>
          ) : filteredTickets.length === 0 ? (
            <div className="text-center py-12 bg-slate-800 rounded-lg">
              <p className="text-gray-400">No tickets match your search</p>
            </div>
          ) : (
            <>
              <div className="grid gap-4">
                {paginatedTickets.map((ticket) => (
                  <div
                    key={ticket.id}
                    className="bg-slate-800 p-4 rounded-lg cursor-pointer hover:bg-slate-700/50 transition"
                    onClick={() =>
                      setSelectedTicket(
                        selectedTicket?.id === ticket.id ? null : ticket,
                      )
                    }
                  >
                    <div className="flex justify-between items-start mb-2">
                      <div className="flex-1">
                        <h3 className="text-lg font-semibold text-white">
                          {ticket.ticketNumber}
                        </h3>
                        <p className="text-gray-300">{ticket.subject}</p>
                        <p className="text-gray-400 text-sm mt-1">
                          {new Date(ticket.createdAt).toLocaleDateString()}
                        </p>
                      </div>
                      <div className="flex gap-2">
                        <span
                          className={`px-3 py-1 rounded text-xs font-semibold ${getStatusColor(ticket.status)}`}
                        >
                          {ticket.status.replace("_", " ")}
                        </span>
                        <span
                          className={`px-3 py-1 rounded text-xs font-semibold ${getPriorityColor(ticket.priority)}`}
                        >
                          {ticket.priority}
                        </span>
                      </div>
                    </div>

                    {selectedTicket?.id === ticket.id && (
                      <div
                        className="mt-4 pt-4 border-t border-slate-600 space-y-4"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <div className="flex justify-between items-center mb-3">
                          <h4 className="font-semibold text-white">
                            Conversation
                          </h4>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedTicket(null);
                            }}
                            className="text-sm px-3 py-1 text-gray-400 hover:text-white hover:bg-slate-700 rounded transition-colors"
                          >
                            Back to List
                          </button>
                        </div>

                        <div className="space-y-3 max-h-96 overflow-y-auto">
                          {ticket.replies.map((reply, idx) => (
                            <div
                              key={idx}
                              className={`p-3 rounded ${reply.author === "support" ? "bg-sky-900/30" : "bg-slate-700/50"}`}
                            >
                              <p className="text-xs text-gray-400 mb-1">
                                {reply.author === "support"
                                  ? "Support Team"
                                  : "You"}{" "}
                                • {new Date(reply.timestamp).toLocaleString()}
                              </p>
                              <p className="text-white text-sm">
                                {reply.message}
                              </p>
                            </div>
                          ))}
                        </div>

                        {ticket.status !== "closed" && (
                          <form
                            onSubmit={handleReply}
                            onClick={(e) => e.stopPropagation()}
                            className="space-y-2 border-t border-slate-600 pt-4"
                          >
                            <textarea
                              value={replyMessage}
                              onChange={(e) => setReplyMessage(e.target.value)}
                              placeholder="Add a reply..."
                              rows={3}
                              className="w-full px-4 py-2 rounded bg-slate-700 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-sky-500"
                            />
                            <button
                              type="submit"
                              className="px-4 py-2 bg-sky-600 text-white rounded hover:bg-sky-700 transition-colors text-sm"
                            >
                              Send Reply
                            </button>
                          </form>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>

              <Pagination
                currentPage={ticketCurrentPage}
                totalItems={filteredTickets.length}
                itemsPerPage={ticketItemsPerPage}
                onPageChange={setTicketCurrentPage}
                onItemsPerPageChange={setTicketItemsPerPage}
              />
            </>
          )}
        </div>
      )}
    </div>
  );
};

export default SupportTicketsPage;
