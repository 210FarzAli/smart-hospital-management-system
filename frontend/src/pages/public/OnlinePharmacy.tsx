import { FormEvent, useEffect, useState } from "react";
import { onlinePharmacyApi, type CatalogMedicine } from "../../lib/apiClient";
import {
  Search,
  ShoppingBag,
  CheckCircle,
  AlertCircle,
  ShieldCheck,
  X,
  MapPin,
  Clock,
} from "../../components/icons/Icons";

interface CartItem {
  medicine: CatalogMedicine;
  quantity: number;
}

export default function OnlinePharmacy() {
  const [medicines, setMedicines] = useState<CatalogMedicine[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("all");
  const [cart, setCart] = useState<CartItem[]>(() => {
    try {
      const saved = localStorage.getItem("hospital_pharmacy_cart");
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });
  const [cartOpen, setCartOpen] = useState(false);

  // Checkout modal/state
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [customerEmail, setCustomerEmail] = useState("");
  const [deliveryAddress, setDeliveryAddress] = useState("");
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [orderSuccess, setOrderSuccess] = useState<{
    order_code: string;
    total_amount: number;
  } | null>(null);
  const [orderError, setOrderError] = useState("");

  useEffect(() => {
    localStorage.setItem("hospital_pharmacy_cart", JSON.stringify(cart));
  }, [cart]);

  useEffect(() => {
    setLoading(true);
    onlinePharmacyApi
      .catalog()
      .then((data: CatalogMedicine[]) => {
        setMedicines(data || []);
        setLoading(false);
      })
      .catch((err: any) => {
        console.error("Failed to load medicines:", err);
        setLoading(false);
      });
  }, []);

  const categories = [
    "all",
    ...Array.from(new Set(medicines.map((m) => m.category).filter(Boolean) as string[])),
  ];

  const filteredMedicines = medicines.filter((m) => {
    const matchCat = category === "all" || m.category === category;
    const matchSearch =
      m.name.toLowerCase().includes(search.toLowerCase()) ||
      (m.category && m.category.toLowerCase().includes(search.toLowerCase()));
    return matchCat && matchSearch;
  });

  const addToCart = (med: CatalogMedicine) => {
    setCart((prev) => {
      const existing = prev.find((item) => item.medicine.id === med.id);
      if (existing) {
        if (existing.quantity >= med.in_stock) return prev;
        return prev.map((item) =>
          item.medicine.id === med.id ? { ...item, quantity: item.quantity + 1 } : item
        );
      }
      return [...prev, { medicine: med, quantity: 1 }];
    });
  };

  const updateQuantity = (medId: string, qty: number) => {
    if (qty <= 0) {
      removeFromCart(medId);
      return;
    }
    setCart((prev) =>
      prev.map((item) => {
        if (item.medicine.id === medId) {
          const max = item.medicine.in_stock;
          return { ...item, quantity: Math.min(qty, max) };
        }
        return item;
      })
    );
  };

  const removeFromCart = (medId: string) => {
    setCart((prev) => prev.filter((item) => item.medicine.id !== medId));
  };

  const cartTotal = cart.reduce(
    (sum, item) => sum + (Number(item.medicine.unit_price) || 0) * item.quantity,
    0
  );
  const totalCartCount = cart.reduce((sum, item) => sum + item.quantity, 0);

  const handleCheckoutSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setOrderError("");

    if (cart.length === 0) {
      setOrderError("Your shopping cart is empty.");
      return;
    }
    if (!deliveryAddress.trim()) {
      setOrderError("Please provide your delivery address.");
      return;
    }

    setSubmitting(true);
    try {
      const res = await onlinePharmacyApi.placeOrder({
        customer_name: customerName,
        customer_phone: customerPhone,
        customer_email: customerEmail || undefined,
        delivery_address: deliveryAddress,
        notes: notes || undefined,
        items: cart.map((c) => ({
          medicine_id: c.medicine.id,
          quantity: c.quantity,
        })),
      });

      setOrderSuccess({
        order_code: res.order.order_code,
        total_amount: res.order.total_amount,
      });
      setCart([]);
      localStorage.removeItem("hospital_pharmacy_cart");
      setCheckoutOpen(false);
    } catch (err: any) {
      setOrderError(err.message || "Failed to place order. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50/50 pb-20">
      {/* Hero Header */}
      <div className="border-b border-slate-200/80 bg-gradient-to-r from-teal-950 via-slate-900 to-teal-900 py-14 text-white px-4 sm:px-6">
        <div className="mx-auto max-w-7xl flex flex-col md:flex-row md:items-center md:justify-between gap-6">
          <div className="max-w-2xl">
            <div className="inline-flex items-center gap-2 rounded-full border border-teal-400/30 bg-teal-500/10 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-teal-300 mb-4">
              <ShoppingBag className="w-3.5 h-3.5" />
              <span>Hospital Licensed Pharmacy</span>
            </div>

            <h1 className="text-3xl font-extrabold tracking-tight sm:text-4xl lg:text-5xl">
              Online Pharmacy Store
            </h1>

            <p className="mt-3 text-sm sm:text-base text-slate-300 leading-relaxed">
              Order genuine prescription and OTC medications directly from the hospital's central
              formulary. Fast home delivery with Cash on Delivery payment.
            </p>
          </div>

          {/* Cart Trigger Badge */}
          <div className="flex items-center gap-4">
            <button
              onClick={() => setCartOpen(true)}
              className="relative flex items-center gap-2.5 rounded-2xl bg-teal-600 px-5 py-3 text-sm font-bold text-white shadow-lg shadow-teal-950/40 transition hover:bg-teal-500"
            >
              <ShoppingBag className="w-5 h-5" />
              <span>Cart ({totalCartCount})</span>
              {totalCartCount > 0 && (
                <span className="ml-1 rounded-full bg-amber-400 px-2 py-0.5 text-xs font-black text-slate-950">
                  Rs. {cartTotal.toLocaleString()}
                </span>
              )}
            </button>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-7xl px-4 sm:px-6 mt-8">
        {/* Order Success Confirmation Banner */}
        {orderSuccess && (
          <div className="mb-8 card p-8 border-emerald-300 bg-emerald-50/50 text-center space-y-4">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-600 text-white shadow-sm">
              <CheckCircle className="w-8 h-8" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-emerald-950">Pharmacy Order Confirmed!</h2>
              <p className="text-sm text-emerald-800 mt-1">
                Your order has been forwarded to the Hospital Pharmacy Dispensing Desk.
              </p>
            </div>
            <div className="mx-auto max-w-sm rounded-xl bg-white p-4 border border-emerald-200">
              <div className="text-xs uppercase font-bold text-slate-500">Order Number</div>
              <div className="text-xl font-black text-teal-950 font-mono mt-1">
                {orderSuccess.order_code}
              </div>
              <div className="text-xs font-bold text-teal-900 mt-1">
                Total Payable: Rs. {orderSuccess.total_amount.toLocaleString()}
              </div>
            </div>
            <div className="rounded-xl bg-amber-50 p-3 max-w-md mx-auto text-xs text-amber-900 border border-amber-200">
              <span className="font-bold">Payment Method:</span> Cash on Delivery (Pay Physically).
              Please hand cash to the courier upon parcel delivery.
            </div>
            <button
              onClick={() => setOrderSuccess(null)}
              className="btn-primary py-2 px-6 text-xs font-bold"
            >
              Continue Shopping
            </button>
          </div>
        )}

        {/* Search & Category Pills */}
        <div className="card p-5 flex flex-col sm:flex-row gap-4 justify-between items-center">
          <div className="relative w-full sm:w-80">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search medicines by name or category..."
              className="input-field pl-9"
            />
          </div>

          <div className="flex items-center gap-2 overflow-x-auto w-full sm:w-auto pb-1 sm:pb-0">
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => setCategory(cat)}
                className={`rounded-full px-3.5 py-1.5 text-xs font-semibold capitalize whitespace-nowrap transition ${
                  category === cat
                    ? "bg-teal-900 text-white shadow-sm"
                    : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                }`}
              >
                {cat === "all" ? "All Medicines" : cat}
              </button>
            ))}
          </div>
        </div>

        {/* Medicines Catalog Grid */}
        {loading ? (
          <div className="mt-8 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
              <div
                key={i}
                className="h-60 rounded-2xl bg-white border border-slate-200 animate-pulse p-6"
              ></div>
            ))}
          </div>
        ) : filteredMedicines.length === 0 ? (
          <div className="mt-8 card p-14 text-center">
            <ShoppingBag className="mx-auto w-12 h-12 text-slate-300" />
            <h3 className="mt-4 text-base font-bold text-slate-800">No medicines found</h3>
            <p className="mt-1 text-xs text-slate-500">
              Try searching with another medication name or clear category filters.
            </p>
          </div>
        ) : (
          <div className="mt-8 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {filteredMedicines.map((med) => {
              const inStock = med.in_stock > 0;
              const cartItem = cart.find((c) => c.medicine.id === med.id);
              const isMaxed = cartItem ? cartItem.quantity >= med.in_stock : false;

              return (
                <div
                  key={med.id}
                  className="card flex flex-col justify-between p-6 transition-all duration-200 hover:-translate-y-1 hover:border-teal-300 hover:shadow-card"
                >
                  <div>
                    <div className="flex items-start justify-between gap-2">
                      <span className="badge-teal text-[10px] font-bold uppercase">
                        {med.category || "General"}
                      </span>
                      <span
                        className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold ${
                          inStock
                            ? med.in_stock <= (med.reorder_level ?? 10)
                              ? "bg-amber-50 text-amber-800 ring-1 ring-amber-200"
                              : "bg-emerald-50 text-emerald-800 ring-1 ring-emerald-200"
                            : "bg-rose-50 text-rose-800 ring-1 ring-rose-200"
                        }`}
                      >
                        {inStock
                          ? med.in_stock <= (med.reorder_level ?? 10)
                            ? "Low Stock"
                            : "In Stock"
                          : "Out of Stock"}
                      </span>
                    </div>

                    <h3 className="mt-3 text-base font-bold text-teal-950">{med.name}</h3>

                    <div className="mt-4 flex items-baseline justify-between pt-3 border-t border-slate-100">
                      <div>
                        <span className="text-[10px] uppercase font-bold text-slate-400 block">
                          Price
                        </span>
                        <span className="text-lg font-extrabold text-teal-950">
                          Rs. {Number(med.unit_price).toLocaleString()}
                        </span>
                      </div>
                      <div className="text-right">
                        <span className="text-[11px] text-slate-700 font-semibold block">
                          Stock: {med.in_stock}
                        </span>
                        <span className="text-[10px] text-slate-400">
                          Reorder Level: {med.reorder_level ?? 10}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="mt-5 pt-3">
                    {inStock ? (
                      cartItem ? (
                        <div className="flex items-center justify-between rounded-xl bg-teal-50 p-1 border border-teal-200">
                          <button
                            onClick={() => updateQuantity(med.id, cartItem.quantity - 1)}
                            className="flex h-8 w-8 items-center justify-center rounded-lg bg-white font-bold text-teal-950 shadow-sm hover:bg-teal-100"
                          >
                            -
                          </button>
                          <span className="text-xs font-bold text-teal-950">
                            {cartItem.quantity} in cart
                          </span>
                          <button
                            onClick={() => updateQuantity(med.id, cartItem.quantity + 1)}
                            disabled={isMaxed}
                            className="flex h-8 w-8 items-center justify-center rounded-lg bg-teal-700 font-bold text-white shadow-sm hover:bg-teal-800 disabled:opacity-40"
                          >
                            +
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => addToCart(med)}
                          className="btn-primary w-full py-2 text-xs font-bold flex items-center justify-center gap-1.5"
                        >
                          <ShoppingBag className="w-4 h-4" />
                          <span>Add to Cart</span>
                        </button>
                      )
                    ) : (
                      <button
                        disabled
                        className="w-full rounded-xl bg-slate-100 py-2 text-xs font-semibold text-slate-400 cursor-not-allowed"
                      >
                        Out of Stock
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Cart Drawer / Slide-Over Modal */}
      {cartOpen && (
        <div className="fixed inset-0 z-50 overflow-hidden bg-slate-900/50 backdrop-blur-xs flex justify-end">
          <div className="w-full max-w-md bg-white h-full shadow-2xl flex flex-col animate-in slide-in-from-right duration-200">
            {/* Drawer Header */}
            <div className="p-5 border-b border-slate-200 flex items-center justify-between bg-slate-50">
              <div className="flex items-center gap-2">
                <ShoppingBag className="w-5 h-5 text-teal-800" />
                <h3 className="font-bold text-base text-teal-950">
                  Shopping Cart ({totalCartCount})
                </h3>
              </div>
              <button
                onClick={() => setCartOpen(false)}
                className="p-1 rounded-lg hover:bg-slate-200 text-slate-500"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Items List */}
            <div className="flex-1 overflow-y-auto p-5 divide-y divide-slate-100">
              {cart.length === 0 ? (
                <div className="py-20 text-center text-slate-400">
                  <ShoppingBag className="mx-auto w-12 h-12 mb-3 text-slate-300" />
                  <p className="text-sm font-semibold">Your cart is currently empty</p>
                  <p className="text-xs text-slate-400 mt-1">
                    Select medications from the catalog to proceed.
                  </p>
                </div>
              ) : (
                cart.map((item) => (
                  <div key={item.medicine.id} className="py-3 flex items-center justify-between">
                    <div className="pr-3">
                      <div className="text-xs font-bold text-teal-950">{item.medicine.name}</div>
                      <div className="text-[11px] text-slate-500">
                        Rs. {Number(item.medicine.unit_price).toLocaleString()} each
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="flex items-center rounded-lg border border-slate-200 bg-slate-50">
                        <button
                          onClick={() => updateQuantity(item.medicine.id, item.quantity - 1)}
                          className="px-2 py-0.5 text-xs font-bold hover:bg-slate-200 rounded-l"
                        >
                          -
                        </button>
                        <span className="px-2 text-xs font-bold">{item.quantity}</span>
                        <button
                          onClick={() => updateQuantity(item.medicine.id, item.quantity + 1)}
                          disabled={item.quantity >= item.medicine.in_stock}
                          className="px-2 py-0.5 text-xs font-bold hover:bg-slate-200 rounded-r disabled:opacity-30"
                        >
                          +
                        </button>
                      </div>
                      <div className="text-xs font-bold text-teal-950 w-16 text-right">
                        Rs. {(Number(item.medicine.unit_price) * item.quantity).toLocaleString()}
                      </div>
                      <button
                        onClick={() => removeFromCart(item.medicine.id)}
                        className="text-slate-400 hover:text-rose-600 p-1"
                        title="Remove item"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Drawer Footer & Checkout Action */}
            {cart.length > 0 && (
              <div className="p-5 border-t border-slate-200 bg-slate-50 space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-xs font-bold uppercase text-slate-500">Subtotal</span>
                  <span className="text-lg font-extrabold text-teal-950">
                    Rs. {cartTotal.toLocaleString()}
                  </span>
                </div>

                <div className="rounded-xl bg-emerald-50 p-2.5 text-[11px] text-emerald-900 border border-emerald-200">
                  <span className="font-bold">Payment Method:</span> Cash on Delivery (Pay Physically).
                </div>

                <button
                  onClick={() => {
                    setCartOpen(false);
                    setCheckoutOpen(true);
                  }}
                  className="btn-primary w-full py-3 text-xs font-bold shadow-md"
                >
                  Proceed to Checkout (COD)
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Checkout Modal */}
      {checkoutOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="w-full max-w-lg rounded-3xl bg-white p-6 sm:p-8 shadow-2xl border border-slate-200">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div>
                <h3 className="text-lg font-bold text-teal-950">Checkout & Home Delivery</h3>
                <p className="text-xs text-slate-500">
                  Order will be delivered to your address with Cash on Delivery.
                </p>
              </div>
              <button
                onClick={() => setCheckoutOpen(false)}
                className="p-1 rounded-lg hover:bg-slate-100 text-slate-500"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCheckoutSubmit} className="mt-5 space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700">
                  Full Name <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  placeholder="e.g. Tariq Mehmood"
                  className="input-field mt-1.5"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-700">
                    Mobile Phone Number <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="tel"
                    required
                    value={customerPhone}
                    onChange={(e) => setCustomerPhone(e.target.value)}
                    placeholder="0300-1234567"
                    className="input-field mt-1.5"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-700">
                    Email Address
                  </label>
                  <input
                    type="email"
                    value={customerEmail}
                    onChange={(e) => setCustomerEmail(e.target.value)}
                    placeholder="customer@example.com"
                    className="input-field mt-1.5"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700">
                  Complete Delivery Address <span className="text-rose-500">*</span>
                </label>
                <div className="relative mt-1.5">
                  <MapPin className="absolute top-3 left-3 w-4 h-4 text-slate-400" />
                  <textarea
                    rows={2}
                    required
                    value={deliveryAddress}
                    onChange={(e) => setDeliveryAddress(e.target.value)}
                    placeholder="House/Apartment #, Street, Block/Sector, City..."
                    className="input-field pl-9 text-xs"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700">
                  Delivery Notes / Landmark
                </label>
                <input
                  type="text"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="e.g. Near Central Park Gate 2"
                  className="input-field mt-1.5 text-xs"
                />
              </div>

              {/* Order Breakdown */}
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 space-y-2 text-xs">
                <div className="flex justify-between text-slate-600">
                  <span>Total Items ({totalCartCount})</span>
                  <span className="font-bold text-teal-950">Rs. {cartTotal.toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-slate-600">
                  <span>Delivery Charges</span>
                  <span className="font-bold text-emerald-700">Free Hospital Courier</span>
                </div>
                <div className="border-t border-slate-200 pt-2 flex justify-between font-extrabold text-sm text-teal-950">
                  <span>Net Payable on Delivery</span>
                  <span>Rs. {cartTotal.toLocaleString()}</span>
                </div>
              </div>

              <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900">
                <div className="font-bold flex items-center gap-1.5 text-amber-950">
                  <ShieldCheck className="w-4 h-4 text-amber-700" />
                  Payment: Cash on Delivery (Pay Physically)
                </div>
                <p className="mt-0.5 text-amber-800">
                  No online card or bank payment required. Please pay cash to our delivery rider when you receive the medicine packet.
                </p>
              </div>

              {orderError && (
                <div className="flex items-center gap-2 rounded-xl bg-rose-50 p-3 text-xs text-rose-800 border border-rose-200">
                  <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                  <span>{orderError}</span>
                </div>
              )}

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setCheckoutOpen(false)}
                  className="btn-secondary flex-1 py-2.5 text-xs font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="btn-primary flex-1 py-2.5 text-xs font-bold shadow-md"
                >
                  {submitting ? "Placing Order..." : "Confirm & Place Order"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
