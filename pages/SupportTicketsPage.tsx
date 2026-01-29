import React, { useState, useEffect } from 'react';
import { useCustomerAuth } from '../context/CustomerAuthContext';
import { useNavigate } from 'react-router-dom';
import { useToast } from '../hooks/useToast';

interface SupportTicket {
  id: string;
  ticketNumber: string;
  subject: string;
  message: string;
  orderId?: string;
  status: 'open' | 'in_progress' | 'resolved' | 'closed';
  priority: 'low' | 'medium' | 'high';
  createdAt: string;
  updatedAt: string;
  replies: Array<{
    id: string;
    author: 'customer' | 'support';
    message: string;
    timestamp: string;
  }>;
}

const SupportTicketsPage: React.FC = () => {
  const { isAuthenticated } = useCustomerAuth();
  const navigate = useNavigate();
  const { addToast } = useToast();

  const [activeTab, setActiveTab] = useState<'create' | 'tickets'>('create');
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [selectedTicket, setSelectedTicket] = useState<SupportTicket | null>(null);
  const [formData, setFormData] = useState({ subject: '', message: '', orderId: '', priority: 'medium' });
  const [replyMessage, setReplyMessage] = useState('');

  useEffect(() => {
    if (isAuthenticated) {
      const mockTickets: SupportTicket[] = [
        {
          id: '1',
          ticketNumber: 'TKT-2026-001',
          subject: 'Question about product customization',
          message: 'Can I add metallic ink to my design?',
          orderId: 'ORD-2026-001',
          status: 'in_progress',
          priority: 'medium',
          createdAt: '2026-01-24T10:30:00Z',
          updatedAt: '2026-01-26T14:00:00Z',
          replies: [
            {
              id: '1',
              author: 'customer',
              message: 'Can I add metallic ink to my design?',
              timestamp: '2026-01-24T10:30:00Z',
            },
            {
              id: '2',
              author: 'support',
              message: 'Yes, we offer metallic ink options. The cost is $5.00 per color.',
              timestamp: '2026-01-25T09:15:00Z',
            },
          ],
        },
      ];
      setTickets(mockTickets);
    }
  }, [isAuthenticated]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.subject.trim() || !formData.message.trim()) {
      addToast('Subject and message are required', 'error');
      return;
    }

    const newTicket: SupportTicket = {
      id: String(tickets.length + 1),
      ticketNumber: `TKT-2026-${String(tickets.length + 1).padStart(3, '0')}`,
      subject: formData.subject,
      message: formData.message,
      orderId: formData.orderId || undefined,
      status: 'open',
      priority: formData.priority as any,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      replies: [
        {
          id: '1',
          author: 'customer',
          message: formData.message,
          timestamp: new Date().toISOString(),
        },
      ],
    };

    setTickets([newTicket, ...tickets]);
    setFormData({ subject: '', message: '', orderId: '', priority: 'medium' });
    addToast('Support ticket created successfully', 'success');
    setActiveTab('tickets');
  };

  const handleReply = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTicket || !replyMessage.trim()) return;

    const updated = tickets.map(t => {
      if (t.id === selectedTicket.id) {
        return {
          ...t,
          replies: [
            ...t.replies,
            {
              id: String(t.replies.length + 1),
              author: 'customer' as const,
              message: replyMessage,
              timestamp: new Date().toISOString(),
            },
          ],
          updatedAt: new Date().toISOString(),
        };
      }
      return t;
    });
    setTickets(updated);
    setSelectedTicket(updated.find(t => t.id === selectedTicket.id) || null);
    setReplyMessage('');
    addToast('Reply sent', 'success');
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'open': return 'bg-blue-900 text-blue-200';
      case 'in_progress': return 'bg-yellow-900 text-yellow-200';
      case 'resolved': return 'bg-green-900 text-green-200';
      case 'closed': return 'bg-gray-900 text-gray-200';
      default: return 'bg-slate-900 text-slate-200';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'bg-red-900 text-red-200';
      case 'medium': return 'bg-orange-900 text-orange-200';
      case 'low': return 'bg-gray-900 text-gray-200';
      default: return 'bg-slate-900 text-slate-200';
    }
  };

  if (!isAuthenticated) {
    return (
      <div className="max-w-6xl mx-auto p-6 py-12 text-center">
        <p className="text-gray-400 mb-4">Please log in to contact support</p>
        <button onClick={() => navigate('/login')} className="px-6 py-2 bg-sky-600 text-white rounded hover:bg-sky-700">
          Sign In
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-6">
      <h1 className="text-3xl font-bold text-white">Support Center</h1>

      <div className="flex gap-2 border-b border-slate-700">
        <button
          onClick={() => setActiveTab('create')}
          className={`px-6 py-3 font-semibold transition-colors ${
            activeTab === 'create' ? 'border-b-2 border-sky-500 text-white' : 'text-gray-400 hover:text-white'
          }`}
        >
          Create Ticket
        </button>
        <button
          onClick={() => setActiveTab('tickets')}
          className={`px-6 py-3 font-semibold transition-colors ${
            activeTab === 'tickets' ? 'border-b-2 border-sky-500 text-white' : 'text-gray-400 hover:text-white'
          }`}
        >
          My Tickets ({tickets.length})
        </button>
      </div>

      {activeTab === 'create' ? (
        <form onSubmit={handleSubmit} className="bg-slate-800 p-6 rounded-lg space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Subject *</label>
            <input
              type="text"
              value={formData.subject}
              onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
              placeholder="Brief description of your issue"
              className="w-full px-4 py-2 rounded bg-slate-700 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-sky-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Related Order (Optional)</label>
            <input
              type="text"
              value={formData.orderId}
              onChange={(e) => setFormData({ ...formData, orderId: e.target.value })}
              placeholder="e.g., ORD-2026-001"
              className="w-full px-4 py-2 rounded bg-slate-700 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-sky-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Priority</label>
            <select
              value={formData.priority}
              onChange={(e) => setFormData({ ...formData, priority: e.target.value })}
              className="w-full px-4 py-2 rounded bg-slate-700 text-white focus:outline-none focus:ring-2 focus:ring-sky-500"
            >
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Message *</label>
            <textarea
              value={formData.message}
              onChange={(e) => setFormData({ ...formData, message: e.target.value })}
              placeholder="Describe your issue in detail..."
              rows={6}
              className="w-full px-4 py-2 rounded bg-slate-700 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-sky-500"
            />
          </div>

          <button
            type="submit"
            className="px-6 py-2 bg-sky-600 text-white rounded hover:bg-sky-700 transition-colors"
          >
            Submit Ticket
          </button>
        </form>
      ) : (
        <div className="space-y-4">
          {tickets.length === 0 ? (
            <div className="text-center py-12 bg-slate-800 rounded-lg">
              <p className="text-gray-400">No support tickets yet</p>
            </div>
          ) : (
            <>
              <div className="grid gap-4">
                {tickets.map((ticket) => (
                  <div
                    key={ticket.id}
                    className="bg-slate-800 p-4 rounded-lg cursor-pointer hover:bg-slate-700/50 transition"
                    onClick={() => setSelectedTicket(selectedTicket?.id === ticket.id ? null : ticket)}
                  >
                    <div className="flex justify-between items-start mb-2">
                      <div className="flex-1">
                        <h3 className="text-lg font-semibold text-white">{ticket.ticketNumber}</h3>
                        <p className="text-gray-300">{ticket.subject}</p>
                        <p className="text-gray-400 text-sm mt-1">{new Date(ticket.createdAt).toLocaleDateString()}</p>
                      </div>
                      <div className="flex gap-2">
                        <span className={`px-3 py-1 rounded text-xs font-semibold ${getStatusColor(ticket.status)}`}>
                          {ticket.status.replace('_', ' ')}
                        </span>
                        <span className={`px-3 py-1 rounded text-xs font-semibold ${getPriorityColor(ticket.priority)}`}>
                          {ticket.priority}
                        </span>
                      </div>
                    </div>

                    {selectedTicket?.id === ticket.id && (
                      <div className="mt-4 pt-4 border-t border-slate-600 space-y-4">
                        <div className="space-y-3 max-h-96 overflow-y-auto">
                          {ticket.replies.map((reply, idx) => (
                            <div key={idx} className={`p-3 rounded ${reply.author === 'support' ? 'bg-sky-900/30' : 'bg-slate-700/50'}`}>
                              <p className="text-xs text-gray-400 mb-1">
                                {reply.author === 'support' ? 'Support Team' : 'You'} • {new Date(reply.timestamp).toLocaleString()}
                              </p>
                              <p className="text-white text-sm">{reply.message}</p>
                            </div>
                          ))}
                        </div>

                        {ticket.status !== 'closed' && (
                          <form onSubmit={handleReply} className="space-y-2 border-t border-slate-600 pt-4">
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
            </>
          )}
        </div>
      )}
    </div>
  );
};

export default SupportTicketsPage;
