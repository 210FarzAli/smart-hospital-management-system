import { useEffect, useState } from "react";
import { onlinePharmacyApi } from "../../lib/apiClient";
import type { PharmacyOnlineOrder } from "../../lib/types";
import {
  FileText,
  Search,
  CheckCircle,
  Clock,
  MapPin,
  Phone,
  ShieldCheck,
  ShoppingBag,
  AlertCircle,
} from "../../components/icons/Icons";

export default function PharmacistOrders() {
  const [orders, setOrders] = useState<PharmacyOnlineOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  async function loadOrders() {
    setLoading(true);
    try {
      const data = await onlinePharmacyApi.orders({
        status: statusFilter !== "all" ? statusFilter : undefined,
      });
      setOrders(data || []);
    } catch (err) {
      console.error("Failed to load pharmacy orders:", err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadOrders();
  }, [statusFilter]);

  const handleUpdateStatus = async (orderId: string, status: string) => {
    setActionLoading(orderId);
    try {
      await onlinePharmacyApi.updateStatus(orderId, status);
      await loadOrders();
    } catch (err: any) {
      alert(err.message || "Failed to update order status.");
    } finally {
      setActionLoading(null);
    }
  };

  const filtered = orders.filter((o) => {
    const q = search.toLowerCase();
    return (
      (o.order_code && o.order_code.toLowerCase().includes(q)) ||
      o.customer_name.toLowerCase().includes(q) ||
      o.customer_phone.toLowerCase().includes(q) ||
      o.delivery_address.toLowerCase().includes(q)
    );
  });

  const pendingCount = orders.filter((o) => o.status === "pending").length;
  const readyCount = orders.filter((o) => o.status === "ready").length;
  const completedCount = orders.filter((o) => o.status === "completed").length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full bg-teal-50 px-3 py-1 text-xs font-semibold text-teal-800 ring-1 ring-teal-200">
            <ShieldCheck className="h-3.5 w-3.5" />
            Online Pharmacy Fulfillment
          </div>
          <h1 className="mt-2 text-2xl font-extrabold tracking-tight text-teal-950 sm:text-3xl">
            Customer Online Orders ({orders.length})
          </h1>
          <p className="text-xs text-slate-500">
            Dispense prescription medications, dispatch hospital delivery couriers, and track Cash on Delivery collections.
          </p>
        </div>

        {pendingCount > 0 && (
          <div className="rounded-xl bg-amber-50 px-3.5 py-2 text-xs font-semibold text-amber-900 ring-1 ring-amber-200">
            <span className="font-bold">{pendingCount}</span> Orders Awaiting Dispensing
          </div>
        )}
      </div>

      {/* KPI Stats */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-4">
        <div className="card p-5">
          <div className="text-xs font-bold text-slate-500 uppercase">Total Orders</div>
          <div className="mt-2 text-2xl font-extrabold text-teal-950">{orders.length}</div>
          <div className="mt-1 text-xs text-slate-400">All received orders</div>
        </div>

        <div className="card p-5">
          <div className="text-xs font-bold text-amber-800 uppercase">Pending Review</div>
          <div className="mt-2 text-2xl font-extrabold text-amber-600">{pendingCount}</div>
          <div className="mt-1 text-xs text-slate-400">Requires dispensing</div>
        </div>

        <div className="card p-5">
          <div className="text-xs font-bold text-blue-800 uppercase">Ready for Dispatch</div>
          <div className="mt-2 text-2xl font-extrabold text-blue-600">{readyCount}</div>
          <div className="mt-1 text-xs text-slate-400">Packed for courier</div>
        </div>

        <div className="card p-5">
          <div className="text-xs font-bold text-emerald-800 uppercase">Delivered & Paid</div>
          <div className="mt-2 text-2xl font-extrabold text-emerald-700">{completedCount}</div>
          <div className="mt-1 text-xs text-slate-400">Cash collected</div>
        </div>
      </div>

      {/* Search & Filter Bar */}
      <div className="card p-4 flex flex-col sm:flex-row gap-3 justify-between items-center">
        <div className="relative flex-1 w-full">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by order code, customer name, phone, or address..."
            className="input-field pl-9 text-xs"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <label className="text-xs font-medium text-slate-500">Status:</label>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="input-field py-1.5 text-xs w-auto"
          >
            <option value="all">All Statuses ({orders.length})</option>
            <option value="pending">Pending ({pendingCount})</option>
            <option value="confirmed">Confirmed</option>
            <option value="ready">Ready for Dispatch ({readyCount})</option>
            <option value="completed">Completed / Delivered ({completedCount})</option>
            <option value="cancelled">Cancelled</option>
          </select>
        </div>
      </div>

      {/* Orders List / Cards */}
      <div className="space-y-4">
        {loading ? (
          <div className="card p-12 text-center text-slate-400">
            <div className="inline-block h-6 w-6 animate-spin rounded-full border-2 border-teal-700 border-t-transparent" />
            <p className="mt-2 text-xs">Loading orders registry...</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="card p-12 text-center text-slate-500 text-xs">
            No customer online orders found matching current filters.
          </div>
        ) : (
          filtered.map((order) => (
            <div
              key={order.id}
              className="card p-6 space-y-4 hover:border-teal-300 transition-colors"
            >
              {/* Top Order Row */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-slate-100 pb-4 gap-3">
                <div className="flex items-center gap-3">
                  <span className="font-mono text-xs font-bold text-teal-950 bg-teal-50 px-2.5 py-1 rounded-md border border-teal-200">
                    {order.order_code}
                  </span>
                  <div>
                    <h3 className="text-base font-bold text-teal-950">{order.customer_name}</h3>
                    <div className="text-xs text-slate-500 flex items-center gap-2">
                      <span>Phone: {order.customer_phone}</span>
                      {order.customer_email && <span>• Email: {order.customer_email}</span>}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <div className="text-right">
                    <span className="text-[10px] font-bold uppercase text-slate-400 block">
                      Order Placed
                    </span>
                    <span className="text-xs text-slate-600 font-medium">
                      {new Date(order.created_at).toLocaleString()}
                    </span>
                  </div>

                  <span
                    className={`px-3 py-1 text-xs font-bold rounded-full uppercase tracking-wider ${
                      order.status === "completed"
                        ? "bg-emerald-100 text-emerald-800 border border-emerald-300"
                        : order.status === "ready"
                        ? "bg-blue-100 text-blue-800 border border-blue-300"
                        : order.status === "confirmed"
                        ? "bg-purple-100 text-purple-800 border border-purple-300"
                        : order.status === "cancelled"
                        ? "bg-rose-100 text-rose-800 border border-rose-300"
                        : "bg-amber-100 text-amber-800 border border-amber-300"
                    }`}
                  >
                    {order.status}
                  </span>
                </div>
              </div>

              {/* Delivery Address & Note */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs bg-slate-50/60 p-3.5 rounded-xl border border-slate-100">
                <div>
                  <span className="font-bold text-slate-700 flex items-center gap-1 mb-1">
                    <MapPin className="h-3.5 w-3.5 text-teal-700" />
                    Delivery Destination:
                  </span>
                  <p className="text-slate-600 font-medium pl-4">{order.delivery_address}</p>
                </div>

                {order.notes && (
                  <div>
                    <span className="font-bold text-slate-700 block mb-1">
                      Customer Delivery Note / Instructions:
                    </span>
                    <p className="text-slate-600 italic pl-1">{order.notes}</p>
                  </div>
                )}
              </div>

              {/* Items Table / List */}
              {order.items && order.items.length > 0 && (
                <div>
                  <div className="text-xs font-bold uppercase text-slate-500 tracking-wider mb-2">
                    Ordered Medications:
                  </div>
                  <div className="divide-y divide-slate-100 border border-slate-100 rounded-xl overflow-hidden text-xs">
                    {order.items.map((it) => (
                      <div
                        key={it.id || it.medicine_id}
                        className="px-4 py-2.5 flex items-center justify-between bg-white"
                      >
                        <div>
                          <span className="font-bold text-teal-950">{it.medicine_name}</span>
                          <span className="text-slate-400 ml-2">
                            Rs. {Number(it.unit_price).toLocaleString()} × {it.quantity}
                          </span>
                        </div>
                        <div className="font-bold text-teal-950">
                          Rs. {Number(it.line_total).toLocaleString()}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Footer: Amount & Dispatch Actions */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between pt-3 border-t border-slate-100 gap-3">
                <div className="flex items-center gap-2">
                  <span className="text-xs text-slate-500 font-bold uppercase">Net Total (COD):</span>
                  <span className="text-base font-extrabold text-teal-950">
                    Rs. {Number(order.total_amount).toLocaleString()}
                  </span>
                  <span className="rounded bg-amber-50 px-2 py-0.5 text-[10px] font-bold text-amber-800 border border-amber-200">
                    Pay Physically on Delivery
                  </span>
                </div>

                {/* Status Transition Actions */}
                <div className="flex flex-wrap gap-2">
                  {order.status === "pending" && (
                    <button
                      type="button"
                      disabled={actionLoading === order.id}
                      onClick={() => handleUpdateStatus(order.id, "confirmed")}
                      className="rounded-lg bg-teal-800 px-3 py-1.5 text-xs font-bold text-white hover:bg-teal-700 transition"
                    >
                      Confirm Order
                    </button>
                  )}

                  {order.status === "confirmed" && (
                    <button
                      type="button"
                      disabled={actionLoading === order.id}
                      onClick={() => handleUpdateStatus(order.id, "ready")}
                      className="rounded-lg bg-blue-700 px-3 py-1.5 text-xs font-bold text-white hover:bg-blue-600 transition"
                    >
                      Mark Ready for Dispatch
                    </button>
                  )}

                  {order.status === "ready" && (
                    <button
                      type="button"
                      disabled={actionLoading === order.id}
                      onClick={() => handleUpdateStatus(order.id, "completed")}
                      className="rounded-lg bg-emerald-700 px-3 py-1.5 text-xs font-bold text-white hover:bg-emerald-600 transition"
                    >
                      Mark Delivered & Cash Received
                    </button>
                  )}

                  {order.status !== "completed" && order.status !== "cancelled" && (
                    <button
                      type="button"
                      disabled={actionLoading === order.id}
                      onClick={() => {
                        if (window.confirm("Cancel this order?")) {
                          handleUpdateStatus(order.id, "cancelled");
                        }
                      }}
                      className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-rose-600 hover:bg-rose-50 transition"
                    >
                      Cancel Order
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
