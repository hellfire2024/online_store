import React, { useEffect, useState } from 'react';
import { Chart as ChartJS, CategoryScale, LinearScale, BarController, BarElement, ArcElement, Tooltip, Legend } from 'chart.js';
import { Bar, Doughnut } from 'react-chartjs-2';
import { apiClient } from '../../services/apiClient';
import { useToast } from '../../hooks/useToast';

interface Customer {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  isActive: boolean;
  orderCount: number;
  totalSpent: number;
  averageOrderValue: number;
  lastOrderDate?: string;
  createdAt: string;
}

ChartJS.register(CategoryScale, LinearScale, BarController, BarElement, ArcElement, Tooltip, Legend);

const CustomerAnalytics: React.FC = () => {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { addToast } = useToast();

  useEffect(() => {
    const load = async () => {
      try {
        setIsLoading(true);
        const data = await apiClient.customers.getAll();
        setCustomers(data);
      } catch (e) {
        const mock: Customer[] = [
          { id: '1', firstName: 'Jane', lastName: 'Smith', email: 'jane@ex.com', phone: '555-045-6789', isActive: true, orderCount: 12, totalSpent: 1450.75, averageOrderValue: 120.9, lastOrderDate: '2026-01-24T15:30:00Z', createdAt: '2023-11-05T08:15:00Z' },
          { id: '2', firstName: 'John', lastName: 'Doe', email: 'john@ex.com', phone: '555-012-3456', isActive: true, orderCount: 5, totalSpent: 287.5, averageOrderValue: 57.5, lastOrderDate: '2026-01-20T12:00:00Z', createdAt: '2024-02-10T12:00:00Z' },
          { id: '3', firstName: 'Alice', lastName: 'Williams', email: 'alice@ex.com', phone: '555-078-9123', isActive: true, orderCount: 8, totalSpent: 623.4, averageOrderValue: 77.93, lastOrderDate: '2026-01-22T11:15:00Z', createdAt: '2024-05-17T11:30:00Z' },
          { id: '4', firstName: 'Bob', lastName: 'Johnson', email: 'bob@ex.com', phone: '555-098-7654', isActive: false, orderCount: 2, totalSpent: 89.99, averageOrderValue: 45.0, lastOrderDate: '2025-11-15T10:00:00Z', createdAt: '2025-08-22T16:45:00Z' },
        ];
        setCustomers(mock);
        addToast('Using demo analytics - backend not connected', 'info');
      } finally {
        setIsLoading(false);
      }
    };
    load();
  }, [addToast]);

  const totalCustomers = customers.length;
  const activeCustomers = customers.filter(c => c.isActive).length;
  const totalOrders = customers.reduce((sum, c) => sum + c.orderCount, 0);
  const totalRevenue = customers.reduce((sum, c) => sum + c.totalSpent, 0);
  const avgOrderValue = totalOrders ? totalRevenue / totalOrders : 0;
  const topCustomers = [...customers].sort((a, b) => b.totalSpent - a.totalSpent).slice(0, 5);
  const vipCount = customers.filter(c => c.totalSpent >= 1000).length;
  const atRiskCount = customers.filter(c => c.lastOrderDate && ((Date.now() - new Date(c.lastOrderDate).getTime())/(1000*60*60*24) > 180)).length;
  const inactiveCount = customers.filter(c => !c.isActive).length;
  const pct = (n: number) => totalCustomers ? Math.round((n / totalCustomers) * 100) : 0;

  const exportSummaryCSV = () => {
    const headers = ['Metric','Value'];
    const rows = [
      ['Total Customers', String(totalCustomers)],
      ['Active Customers', String(activeCustomers)],
      ['Total Orders', String(totalOrders)],
      ['Total Revenue', totalRevenue.toFixed(2)],
      ['Average Order Value', avgOrderValue.toFixed(2)],
    ];
    const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `customer_analytics_${new Date().toISOString().slice(0,10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    addToast('Exported analytics summary to CSV', 'success');
  };

  if (isLoading) {
    return <div className="p-8">Loading analytics...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold text-white">Customer Analytics</h1>
        <button onClick={exportSummaryCSV} className="px-3 py-2 bg-slate-700 text-white rounded-lg hover:bg-slate-600">Export Summary</button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-slate-800 p-4 rounded-lg">
          <div className="text-sm text-gray-400">Total Customers</div>
          <div className="text-2xl font-bold text-white">{totalCustomers}</div>
        </div>
        <div className="bg-slate-800 p-4 rounded-lg">
          <div className="text-sm text-gray-400">Active Customers</div>
          <div className="text-2xl font-bold text-green-400">{activeCustomers}</div>
        </div>
        <div className="bg-slate-800 p-4 rounded-lg">
          <div className="text-sm text-gray-400">Total Orders</div>
          <div className="text-2xl font-bold text-white">{totalOrders}</div>
        </div>
        <div className="bg-slate-800 p-4 rounded-lg">
          <div className="text-sm text-gray-400">Total Revenue</div>
          <div className="text-2xl font-bold text-blue-400">${totalRevenue.toFixed(2)}</div>
        </div>
      </div>

      <div className="bg-slate-800 p-4 rounded-lg">
        <h2 className="text-xl font-semibold text-white mb-4">Top Customers by Revenue</h2>
        <div className="space-y-3">
          {topCustomers.map((c) => {
            const pct = totalRevenue ? (c.totalSpent / totalRevenue) * 100 : 0;
            return (
              <div key={c.id}>
                <div className="flex justify-between text-sm text-gray-300">
                  <span>{c.firstName} {c.lastName}</span>
                  <span>${c.totalSpent.toFixed(2)}</span>
                </div>
                <div className="h-3 bg-slate-700 rounded mt-1">
                  <div className="h-3 bg-sky-600 rounded" style={{ width: `${pct}%` }} />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="bg-slate-800 p-4 rounded-lg">
        <h2 className="text-xl font-semibold text-white mb-4">Segments</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-slate-700 p-4 rounded">
            <div className="text-sm text-gray-300">VIP (Total Spent ≥ $1,000)</div>
            <div className="text-2xl font-bold text-white">{vipCount}</div>
          </div>
          <div className="bg-slate-700 p-4 rounded">
            <div className="text-sm text-gray-300">At-Risk (Last order &gt; 180 days)</div>
            <div className="text-2xl font-bold text-white">{atRiskCount}</div>
          </div>
        </div>
        <p className="text-xs text-gray-400 mt-2">These are simple demo segments; full reporting will integrate orders.</p>
      </div>

      <div className="bg-slate-800 p-4 rounded-lg">
        <h2 className="text-xl font-semibold text-white mb-4">Charts</h2>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-slate-700/50 p-4 rounded-lg">
            <h3 className="text-sm font-semibold text-gray-300 mb-4">Account Status Distribution</h3>
            <Doughnut
              data={{
                labels: ['Active', 'Inactive'],
                datasets: [{
                  data: [activeCustomers, inactiveCount],
                  backgroundColor: ['#16a34a', '#dc2626'],
                  borderColor: ['#15803d', '#b91c1c'],
                  borderWidth: 2,
                }]
              }}
              options={{
                responsive: true,
                maintainAspectRatio: true,
                plugins: { legend: { position: 'bottom' as const } }
              }}
            />
          </div>

          <div className="bg-slate-700/50 p-4 rounded-lg">
            <h3 className="text-sm font-semibold text-gray-300 mb-4">Customer Segments</h3>
            <Doughnut
              data={{
                labels: ['VIP (≥$1k)', 'At-Risk', 'Standard'],
                datasets: [{
                  data: [vipCount, atRiskCount, totalCustomers - vipCount - atRiskCount],
                  backgroundColor: ['#0ea5e9', '#eab308', '#64748b'],
                  borderColor: ['#0284c7', '#ca8a04', '#475569'],
                  borderWidth: 2,
                }]
              }}
              options={{
                responsive: true,
                maintainAspectRatio: true,
                plugins: { legend: { position: 'bottom' as const } }
              }}
            />
          </div>
        </div>

        <div className="mt-6 bg-slate-700/50 p-4 rounded-lg">
          <h3 className="text-sm font-semibold text-gray-300 mb-4">Top 5 Customers by Revenue</h3>
          <Bar
            data={{
              labels: topCustomers.map(c => `${c.firstName} ${c.lastName}`),
              datasets: [{
                label: 'Total Spent ($)',
                data: topCustomers.map(c => c.totalSpent),
                backgroundColor: '#0ea5e9',
                borderColor: '#0284c7',
                borderWidth: 1,
              }]
            }}
            options={{
              responsive: true,
              indexAxis: 'y' as const,
              plugins: { legend: { display: true, position: 'top' as const } },
              scales: {
                x: { beginAtZero: true, ticks: { color: '#cbd5e1' }, grid: { color: '#1e293b' } },
                y: { ticks: { color: '#cbd5e1' }, grid: { display: false } }
              }
            }}
          />
        </div>
      </div>
    </div>
  );
};

export default CustomerAnalytics;