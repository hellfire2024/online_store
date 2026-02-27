import React, { useEffect, useState } from "react";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarController,
  BarElement,
  ArcElement,
  Tooltip,
  Legend,
} from "chart.js";
import { Bar, Doughnut } from "react-chartjs-2";
import { apiClient } from "../../services/apiClient";
import { useToast } from "../../hooks/useToast";
import {
  getSegmentName,
  getSegmentColor,
} from "../../services/segmentationService";
import { useSiteSettings } from "../../context/SiteSettingsContext";

interface AnalyticsCustomer {
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
  segment?: string; // Segment ID (vip, atrisk, standard, etc.)
}

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarController,
  BarElement,
  ArcElement,
  Tooltip,
  Legend,
);

const CustomerAnalytics: React.FC = () => {
  const [customers, setCustomers] = useState<AnalyticsCustomer[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState<
    "all" | "active" | "inactive"
  >("all");
  const [filterSegment, setFilterSegment] = useState<string>("all");
  const [sortBy, setSortBy] = useState<
    "revenue" | "orders" | "recent" | "name"
  >("revenue");
  const { addToast } = useToast();
  const { siteSettings } = useSiteSettings();

  useEffect(() => {
    const load = async () => {
      try {
        setIsLoading(true);
        const data = await apiClient.customers.getAll();
        setCustomers(data);
      } catch (e) {
        const mock: AnalyticsCustomer[] = [
          {
            id: "1",
            firstName: "Jane",
            lastName: "Smith",
            email: "jane@ex.com",
            phone: "555-045-6789",
            isActive: true,
            orderCount: 12,
            totalSpent: 1450.75,
            averageOrderValue: 120.9,
            lastOrderDate: "2026-01-24T15:30:00Z",
            createdAt: "2023-11-05T08:15:00Z",
            segment: "vip",
          },
          {
            id: "2",
            firstName: "John",
            lastName: "Doe",
            email: "john@ex.com",
            phone: "555-012-3456",
            isActive: true,
            orderCount: 5,
            totalSpent: 287.5,
            averageOrderValue: 57.5,
            lastOrderDate: "2026-01-20T12:00:00Z",
            createdAt: "2024-02-10T12:00:00Z",
            segment: "standard",
          },
          {
            id: "3",
            firstName: "Alice",
            lastName: "Williams",
            email: "alice@ex.com",
            phone: "555-078-9123",
            isActive: true,
            orderCount: 8,
            totalSpent: 623.4,
            averageOrderValue: 77.93,
            lastOrderDate: "2026-01-22T11:15:00Z",
            createdAt: "2024-05-17T11:30:00Z",
            segment: "standard",
          },
          {
            id: "4",
            firstName: "Bob",
            lastName: "Johnson",
            email: "bob@ex.com",
            phone: "555-098-7654",
            isActive: false,
            orderCount: 2,
            totalSpent: 89.99,
            averageOrderValue: 45.0,
            lastOrderDate: "2025-11-15T10:00:00Z",
            createdAt: "2025-08-22T16:45:00Z",
            segment: "atrisk",
          },
        ];
        setCustomers(mock);
        addToast("Using demo analytics - backend not connected", "info");
      } finally {
        setIsLoading(false);
      }
    };
    load();
  }, [addToast]);

  const totalCustomers = customers.length;
  const activeCustomers = customers.filter((c) => c.isActive).length;
  const totalOrders = customers.reduce((sum, c) => sum + c.orderCount, 0);
  const totalRevenue = customers.reduce((sum, c) => sum + c.totalSpent, 0);
  const avgOrderValue = totalOrders ? totalRevenue / totalOrders : 0;
  const topCustomers = [...customers]
    .sort((a, b) => b.totalSpent - a.totalSpent)
    .slice(0, 5);
  const inactiveCount = customers.filter((c) => !c.isActive).length;

  // Count customers by segment
  const segmentCounts = (siteSettings?.segmentRules || []).reduce(
    (acc, rule) => {
      acc[rule.id] = customers.filter((c) => c.segment === rule.id).length;
      return acc;
    },
    {} as Record<string, number>,
  );

  // Apply filters
  const filteredCustomers = customers.filter((c) => {
    if (
      filterStatus !== "all" &&
      ((filterStatus === "active" && !c.isActive) ||
        (filterStatus === "inactive" && c.isActive))
    )
      return false;
    if (filterSegment !== "all" && c.segment !== filterSegment) return false;
    return true;
  });

  // Sort filtered results
  let sortedCustomers = [...filteredCustomers];
  if (sortBy === "revenue")
    sortedCustomers.sort((a, b) => b.totalSpent - a.totalSpent);
  else if (sortBy === "orders")
    sortedCustomers.sort((a, b) => b.orderCount - a.orderCount);
  else if (sortBy === "recent")
    sortedCustomers.sort(
      (a, b) =>
        new Date(b.lastOrderDate || b.createdAt).getTime() -
        new Date(a.lastOrderDate || a.createdAt).getTime(),
    );
  else if (sortBy === "name")
    sortedCustomers.sort((a, b) =>
      `${a.firstName} ${a.lastName}`.localeCompare(
        `${b.firstName} ${b.lastName}`,
      ),
    );

  const displayedCustomers = sortedCustomers.slice(0, 10);

  // Calculate segment counts dynamically
  const vipCount = customers.filter(
    (c) => c.segment?.toLowerCase() === "vip",
  ).length;
  const atRiskCount = customers.filter((c) =>
    c.segment?.toLowerCase().includes("risk"),
  ).length;

  const exportSummaryCSV = () => {
    const headers = ["Metric", "Value"];
    const rows = [
      ["Total Customers", String(totalCustomers)],
      ["Active Customers", String(activeCustomers)],
      ["Inactive Customers", String(inactiveCount)],
      ["VIP Customers", String(vipCount)],
      ["At-Risk Customers", String(atRiskCount)],
      ["Total Orders", String(totalOrders)],
      ["Total Revenue", totalRevenue.toFixed(2)],
      ["Average Order Value", avgOrderValue.toFixed(2)],
    ];
    const csv = [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `customer_analytics_summary_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    addToast("Exported analytics summary to CSV", "success");
  };

  const exportDetailedCSV = () => {
    const headers = [
      "First Name",
      "Last Name",
      "Email",
      "Phone",
      "Status",
      "Order Count",
      "Total Spent",
      "Average Order Value",
      "Last Order Date",
    ];
    const rows = sortedCustomers.map((c) => [
      c.firstName,
      c.lastName,
      c.email,
      c.phone,
      c.isActive ? "Active" : "Inactive",
      String(c.orderCount),
      c.totalSpent.toFixed(2),
      c.averageOrderValue.toFixed(2),
      c.lastOrderDate
        ? new Date(c.lastOrderDate).toISOString().slice(0, 10)
        : "Never",
    ]);
    const csv = [
      headers.join(","),
      ...rows.map((r) => r.map((cell) => `"${cell}"`).join(",")),
    ].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `customer_details_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    addToast("Exported detailed customer data to CSV", "success");
  };

  if (isLoading) {
    return <div className="p-8">Loading analytics...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold text-white">Customer Analytics</h1>
        <div className="flex gap-2">
          <button
            onClick={exportSummaryCSV}
            className="px-3 py-2 bg-slate-700 text-white rounded-lg hover:bg-slate-600 text-sm"
          >
            Export Summary
          </button>
          <button
            onClick={exportDetailedCSV}
            className="px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm"
          >
            Export Details
          </button>
        </div>
      </div>

      {/* Key Metrics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        <div className="bg-slate-800 p-4 rounded-lg">
          <div className="text-sm text-gray-400">Total Customers</div>
          <div className="text-2xl font-bold text-white">{totalCustomers}</div>
        </div>
        <div className="bg-slate-800 p-4 rounded-lg">
          <div className="text-sm text-gray-400">Active</div>
          <div className="text-2xl font-bold text-green-400">
            {activeCustomers}
          </div>
        </div>
        <div className="bg-slate-800 p-4 rounded-lg">
          <div className="text-sm text-gray-400">VIP ($1k+)</div>
          <div className="text-2xl font-bold text-sky-400">{vipCount}</div>
        </div>
        <div className="bg-slate-800 p-4 rounded-lg">
          <div className="text-sm text-gray-400">At-Risk (180d+)</div>
          <div className="text-2xl font-bold text-yellow-400">
            {atRiskCount}
          </div>
        </div>
        <div className="bg-slate-800 p-4 rounded-lg">
          <div className="text-sm text-gray-400">Total Revenue</div>
          <div className="text-2xl font-bold text-blue-400">
            ${Number(totalRevenue).toFixed(0)}
          </div>
        </div>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="bg-slate-800 p-4 rounded-lg">
          <h3 className="text-sm font-semibold text-gray-300 mb-4">
            Account Status
          </h3>
          <Doughnut
            data={{
              labels: ["Active", "Inactive"],
              datasets: [
                {
                  data: [activeCustomers, inactiveCount],
                  backgroundColor: ["#16a34a", "#dc2626"],
                  borderColor: ["#15803d", "#b91c1c"],
                  borderWidth: 2,
                },
              ],
            }}
            options={{
              responsive: true,
              maintainAspectRatio: true,
              plugins: { legend: { position: "bottom" as const } },
            }}
          />
        </div>

        <div className="bg-slate-800 p-4 rounded-lg">
          <h3 className="text-sm font-semibold text-gray-300 mb-4">
            Customer Segments
          </h3>
          <Doughnut
            data={{
              labels: (siteSettings?.segmentRules || []).map((r) => r.name),
              datasets: [
                {
                  data: (siteSettings?.segmentRules || []).map(
                    (r) => segmentCounts[r.id] || 0,
                  ),
                  backgroundColor: (siteSettings?.segmentRules || []).map((r) =>
                    getSegmentColor(r.id),
                  ),
                  borderColor: (siteSettings?.segmentRules || []).map((r) =>
                    getSegmentColor(r.id),
                  ),
                  borderWidth: 2,
                },
              ],
            }}
            options={{
              responsive: true,
              maintainAspectRatio: true,
              plugins: { legend: { position: "bottom" as const } },
            }}
          />
        </div>

        <div className="bg-slate-800 p-4 rounded-lg">
          <h3 className="text-sm font-semibold text-gray-300 mb-4">
            Orders Distribution
          </h3>
          <Doughnut
            data={{
              labels: ["1-5 Orders", "6-10 Orders", "11+ Orders"],
              datasets: [
                {
                  data: [
                    customers.filter((c) => c.orderCount <= 5).length,
                    customers.filter(
                      (c) => c.orderCount > 5 && c.orderCount <= 10,
                    ).length,
                    customers.filter((c) => c.orderCount > 10).length,
                  ],
                  backgroundColor: ["#8b5cf6", "#06b6d4", "#f59e0b"],
                  borderColor: ["#7c3aed", "#0891b2", "#d97706"],
                  borderWidth: 2,
                },
              ],
            }}
            options={{
              responsive: true,
              maintainAspectRatio: true,
              plugins: { legend: { position: "bottom" as const } },
            }}
          />
        </div>
      </div>

      {/* Top Customers Chart */}
      <div className="bg-slate-800 p-4 rounded-lg">
        <h2 className="text-xl font-semibold text-white mb-4">
          Top 5 Customers by Revenue
        </h2>
        <Bar
          data={{
            labels: topCustomers.map((c) => `${c.firstName} ${c.lastName}`),
            datasets: [
              {
                label: "Total Spent ($)",
                data: topCustomers.map((c) => c.totalSpent),
                backgroundColor: "#0ea5e9",
                borderColor: "#0284c7",
                borderWidth: 1,
              },
            ],
          }}
          options={{
            responsive: true,
            indexAxis: "y" as const,
            plugins: { legend: { display: true, position: "top" as const } },
            scales: {
              x: {
                beginAtZero: true,
                ticks: { color: "#cbd5e1" },
                grid: { color: "#1e293b" },
              },
              y: { ticks: { color: "#cbd5e1" }, grid: { display: false } },
            },
          }}
        />
      </div>

      {/* Filters and Customer List */}
      <div className="bg-slate-800 p-4 rounded-lg">
        <h2 className="text-xl font-semibold text-white mb-4">
          Customer List & Filters
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div>
            <label className="block text-sm text-gray-400 mb-2">Status</label>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value as any)}
              className="w-full px-3 py-2 bg-slate-700 text-white rounded-md text-sm"
            >
              <option value="all">All Customers</option>
              <option value="active">Active Only</option>
              <option value="inactive">Inactive Only</option>
            </select>
          </div>

          <div>
            <label className="block text-sm text-gray-400 mb-2">Segment</label>
            <select
              value={filterSegment}
              onChange={(e) => setFilterSegment(e.target.value)}
              className="w-full px-3 py-2 bg-slate-700 text-white rounded-md text-sm"
            >
              <option value="all">All Segments</option>
              {(siteSettings?.segmentRules || []).map((rule) => (
                <option key={rule.id} value={rule.id}>
                  {rule.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm text-gray-400 mb-2">Sort By</label>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="w-full px-3 py-2 bg-slate-700 text-white rounded-md text-sm"
            >
              <option value="revenue">Total Revenue (High to Low)</option>
              <option value="orders">Order Count (High to Low)</option>
              <option value="recent">Most Recent Order</option>
              <option value="name">Name (A-Z)</option>
            </select>
          </div>

          <div>
            <label className="block text-sm text-gray-400 mb-2">Results</label>
            <div className="px-3 py-2 bg-slate-700 text-white rounded-md text-sm">
              Showing {displayedCustomers.length} of {filteredCustomers.length}
            </div>
          </div>
        </div>

        {/* Customer Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="border-b border-slate-600">
              <tr className="text-left">
                <th className="px-4 py-2 text-gray-300">Customer</th>
                <th className="px-4 py-2 text-gray-300">Email</th>
                <th className="px-4 py-2 text-gray-300 text-right">Orders</th>
                <th className="px-4 py-2 text-gray-300 text-right">
                  Total Spent
                </th>
                <th className="px-4 py-2 text-gray-300 text-right">
                  Avg Order
                </th>
                <th className="px-4 py-2 text-gray-300">Last Order</th>
                <th className="px-4 py-2 text-gray-300">Segment</th>
                <th className="px-4 py-2 text-gray-300">Status</th>
              </tr>
            </thead>
            <tbody>
              {displayedCustomers.length === 0 ? (
                <tr>
                  <td
                    colSpan={8}
                    className="px-4 py-4 text-center text-gray-400"
                  >
                    No customers match the selected filters
                  </td>
                </tr>
              ) : (
                displayedCustomers.map((c) => (
                  <tr
                    key={c.id}
                    className="border-b border-slate-700 hover:bg-slate-700/30"
                  >
                    <td className="px-4 py-3 text-white font-medium">
                      {c.firstName} {c.lastName}
                    </td>
                    <td className="px-4 py-3 text-gray-400 text-sm">
                      {c.email}
                    </td>
                    <td className="px-4 py-3 text-right text-white">
                      {c.orderCount}
                    </td>
                    <td className="px-4 py-3 text-right text-green-400 font-medium">
                      ${Number(c.totalSpent).toFixed(2)}
                    </td>
                    <td className="px-4 py-3 text-right text-gray-300">
                      ${Number(c.averageOrderValue).toFixed(2)}
                    </td>
                    <td className="px-4 py-3 text-gray-400 text-sm">
                      {c.lastOrderDate
                        ? new Date(c.lastOrderDate).toLocaleDateString()
                        : "Never"}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className="px-2 py-1 rounded text-xs font-semibold text-white"
                        style={{ backgroundColor: getSegmentColor(c.segment) }}
                      >
                        {getSegmentName(
                          c.segment,
                          siteSettings?.segmentRules || [],
                        )}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`px-2 py-1 rounded text-xs font-semibold ${c.isActive ? "bg-green-900 text-green-200" : "bg-red-900 text-red-200"}`}
                      >
                        {c.isActive ? "Active" : "Inactive"}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default CustomerAnalytics;
