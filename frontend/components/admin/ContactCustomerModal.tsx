import React, { useState, useEffect } from "react";
import { useToast } from "../../hooks/useToast";
import { apiClient } from "../../services/apiClient";

interface ContactCustomerModalProps {
  isOpen: boolean;
  onClose: () => void;
  customer: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
  } | null;
  orderId?: string;
  orderNumber?: string;
  orderDate?: string;
}

const ContactCustomerModal: React.FC<ContactCustomerModalProps> = ({
  isOpen,
  onClose,
  customer,
  orderId,
  orderNumber,
  orderDate,
}) => {
  const [message, setMessage] = useState("");
  const getDefaultSubject = () => {
    if (orderNumber) {
      const dateStr = orderDate
        ? ` from ${new Date(orderDate).toLocaleDateString()}`
        : "";
      return `Regarding your order #${orderNumber}${dateStr}`;
    }
    return "Store Support";
  };
  const [subject, setSubject] = useState(getDefaultSubject());
  const [isSending, setIsSending] = useState(false);
  const { addToast } = useToast();

  useEffect(() => {
    if (!isOpen) return;
    setSubject(getDefaultSubject());
  }, [isOpen, orderNumber, orderDate]);

  if (!isOpen || !customer) return null;

  const handleSend = async () => {
    if (!message.trim()) {
      addToast("Message cannot be empty", "error");
      return;
    }

    if (!subject.trim()) {
      addToast("Subject cannot be empty", "error");
      return;
    }

    setIsSending(true);
    try {
      // Create a support ticket with the message
      const ticketNumber = `TKT-${new Date().getFullYear()}-${String(Date.now()).slice(-6)}`;

      const response = await apiClient.tickets.create({
        ticketNumber,
        customerId: customer.id,
        customerName: `${customer.firstName} ${customer.lastName}`,
        customerEmail: customer.email,
        subject,
        message,
        orderId: orderId || null,
        priority: "high",
        isAdminInitiated: true,
      });

      if (response && response.id) {
        addToast("Message sent to customer successfully", "success");
        setMessage("");
        setSubject(getDefaultSubject());
        onClose();
      } else {
        addToast("Failed to send message", "error");
      }
    } catch (error) {
      console.error("Failed to send message:", error);
      addToast(
        `Failed to send message: ${error instanceof Error ? error.message : "Unknown error"}`,
        "error",
      );
    } finally {
      setIsSending(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
      handleSend();
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-60 p-4">
      <div className="bg-slate-800 p-6 rounded-lg max-w-2xl w-full border-2 border-sky-600">
        <div className="flex justify-between items-start mb-6">
          <div>
            <h2 className="text-2xl font-bold text-white">Contact Customer</h2>
            <p className="text-gray-400 mt-1">
              Send a message to {customer.firstName} {customer.lastName}
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white text-3xl font-bold"
          >
            ×
          </button>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Customer Email
            </label>
            <div className="bg-slate-700 px-4 py-3 rounded text-gray-300">
              {customer.email}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Subject *
            </label>
            <input
              type="text"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="Message subject..."
              className="w-full px-4 py-2 rounded bg-slate-700 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-sky-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Message *
            </label>
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Type your message here... (Ctrl+Enter to send)"
              className="w-full px-4 py-3 rounded bg-slate-700 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-sky-500 resize-none h-40"
            />
            <p className="text-xs text-gray-400 mt-2">
              This will create a support ticket and notify the customer via
              email
            </p>
          </div>
        </div>

        <div className="flex gap-3 mt-6">
          <button
            onClick={onClose}
            disabled={isSending}
            className="flex-1 px-4 py-2 bg-slate-700 text-white rounded-lg hover:bg-slate-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Cancel
          </button>
          <button
            onClick={handleSend}
            disabled={isSending || !message.trim() || !subject.trim()}
            className="flex-1 px-4 py-2 bg-sky-600 text-white rounded-lg hover:bg-sky-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-semibold"
          >
            {isSending ? "Sending..." : "Send Message"}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ContactCustomerModal;
