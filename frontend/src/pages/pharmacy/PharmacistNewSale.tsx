import { FormEvent, useEffect, useMemo, useState } from "react";
import {
  pharmacyApi,
  type PharmacyMedicine,
  type PrescriptionPatient,
} from "../../lib/apiClient";
import {
  Pill,
  User,
  Phone,
  Mail,
  Plus,
  Trash,
  CheckCircle,
  AlertCircle,
  ShieldCheck,
  DollarSign,
  ArrowRight,
} from "../../components/icons/Icons";

interface SaleLine {
  medicine_id: string;
  quantity: number;
  prescribed_name?: string;
}

export default function PharmacistNewSale() {
  const [medicines, setMedicines] = useState<PharmacyMedicine[]>([]);
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [customerEmail, setCustomerEmail] = useState("");
  const [saleType, setSaleType] = useState<"walk_in" | "prescription">(
    "walk_in"
  );
  const [prescriptionPatients, setPrescriptionPatients] = useState<
  PrescriptionPatient[]
>([]);
const [selectedPatientId, setSelectedPatientId] = useState("");
const [loadingPatients, setLoadingPatients] = useState(false);
  const [lines, setLines] = useState<SaleLine[]>([
    { medicine_id: "", quantity: 1 },
  ]);

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    async function loadMedicines() {
      try {
        setLoading(true);
        setError(null);
        const data = await pharmacyApi.medicines();
        setMedicines(data);
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Failed to load medicines."
        );
      } finally {
        setLoading(false);
      }
    }

    loadMedicines();
  }, []);

  useEffect(() => {
  if (saleType !== "prescription") {
    setPrescriptionPatients([]);
    setSelectedPatientId("");
    return;
  }

  async function loadPrescriptionPatients() {
    try {
      setLoadingPatients(true);
      setError(null);

      const data = await pharmacyApi.prescriptionPatients();

      setPrescriptionPatients(data);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Failed to load hospital prescription patients."
      );
    } finally {
      setLoadingPatients(false);
    }
  }

  loadPrescriptionPatients();
}, [saleType]);

  const selectedLines = useMemo(() => {
    return lines
      .map((line) => {
        const medicine = medicines.find(
          (item) => item.id === line.medicine_id
        );
        if (!medicine) return null;
        return {
          ...line,
          medicine,
          lineTotal: line.quantity * Number(medicine.unit_price),
        };
      })
      .filter(
        (
          line
        ): line is SaleLine & {
          medicine: PharmacyMedicine;
          lineTotal: number;
        } => line !== null
      );
  }, [lines, medicines]);

  const totalAmount = selectedLines.reduce(
    (sum, line) => sum + line.lineTotal,
    0
  );

  function updateLine(
    index: number,
    field: "medicine_id" | "quantity",
    value: string
  ) {
    setLines((curr) =>
      curr.map((line, i) => {
        if (i !== index) return line;
        if (field === "medicine_id") {
          return { ...line, medicine_id: value };
        }
        return { ...line, quantity: Math.max(1, Number(value) || 1) };
      })
    );
  }

  function addLine() {
    setLines((curr) => [...curr, { medicine_id: "", quantity: 1 }]);
  }

  function removeLine(index: number) {
    setLines((curr) => {
      if (curr.length === 1) return [{ medicine_id: "", quantity: 1 }];
      return curr.filter((_, i) => i !== index);
    });
  }

  function resetForm() {
  setCustomerName("");
  setCustomerPhone("");
  setCustomerEmail("");
  setSaleType("walk_in");
  setPrescriptionPatients([]);
  setSelectedPatientId("");
  setLines([{ medicine_id: "", quantity: 1 }]);
}

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    if (!customerName.trim()) {
      setError("Customer name is required.");
      return;
    }

    if (saleType === "prescription" && !selectedPatientId) {
  setError("Please select the hospital patient for this prescription sale.");
  return;
}

    if (selectedLines.length === 0) {
      setError("Please select at least one medicine.");
      return;
    }

    const medicineIds = selectedLines.map((line) => line.medicine_id);
    if (new Set(medicineIds).size !== medicineIds.length) {
      setError(
        "The same medicine cannot be added more than once. Adjust the quantity instead."
      );
      return;
    }

    for (const line of selectedLines) {
      if (line.quantity > line.medicine.in_stock) {
        setError(
          `${line.medicine.name} only has ${line.medicine.in_stock} unit(s) available in stock.`
        );
        return;
      }
    }

    try {
      setSubmitting(true);
      const result = await pharmacyApi.createSale({
  customer: {
    full_name: customerName.trim(),
    phone: customerPhone.trim() || undefined,
    email: customerEmail.trim() || undefined,
  },

  patient_id:
    saleType === "prescription"
      ? selectedPatientId
      : null,

  sale_type: saleType,
        items: selectedLines.map((line) => ({
          medicine_id: line.medicine_id,
          quantity: line.quantity,
          unit_price: Number(line.medicine.unit_price),
        })),
      });

      const emailMessage =
        result.emailStatus === "sent"
          ? "Digital receipt was emailed to the customer."
          : "Receipt recorded. (Email dispatch unavailable or not provided)";

      setSuccess(
        `Sale ${result.sale.sale_code} completed successfully. Receipt: ${result.receiptCode}. ${emailMessage}`
      );

      resetForm();
      const refreshed = await pharmacyApi.medicines();
      setMedicines(refreshed);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to complete the sale."
      );
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return (
      <div className="card py-16 text-center text-slate-400">
        <div className="inline-block h-6 w-6 animate-spin rounded-full border-2 border-teal-700 border-t-transparent" />
        <p className="mt-2 text-xs">Loading POS dispensary products...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full bg-teal-50 px-3 py-1 text-xs font-semibold text-teal-800 ring-1 ring-teal-200">
            <ShieldCheck className="h-3.5 w-3.5" />
            Point of Sale (POS) Terminal
          </div>
          <h1 className="mt-2 text-2xl font-extrabold tracking-tight text-teal-950 sm:text-3xl">
            New Pharmacy Checkout
          </h1>
          <p className="text-xs text-slate-500">
            Dispense prescription or walk-in OTC medications with instant customer receipt creation.
          </p>
        </div>
      </div>

      {/* Notifications */}
      {error && (
        <div className="flex items-center gap-2 rounded-xl bg-rose-50 p-4 text-xs font-medium text-rose-800 ring-1 ring-rose-200">
          <AlertCircle className="h-4 w-4 shrink-0 text-rose-600" />
          <span>{error}</span>
        </div>
      )}

      {success && (
        <div className="flex items-center gap-2 rounded-xl bg-emerald-50 p-4 text-xs font-medium text-emerald-800 ring-1 ring-emerald-200">
          <CheckCircle className="h-4 w-4 shrink-0 text-emerald-600" />
          <span>{success}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
          {/* Left Column: Customer & Sale Type (4 cols) */}
          <div className="space-y-6 lg:col-span-4">
            <div className="card p-6 space-y-4">
              <div className="border-b border-slate-100 pb-3">
                <h2 className="text-sm font-bold text-teal-950">
                  Customer Information
                </h2>
                <p className="text-xs text-slate-500">
                  Customer record for pharmacy ledger & receipt
                </p>
              </div>

              <div>
                <label className="block text-xs font-bold tracking-wider text-slate-700 uppercase">
                  Customer Full Name <span className="text-rose-500">*</span>
                </label>
                <div className="relative mt-1.5">
                  <User className="pointer-events-none absolute top-3 left-3 h-4 w-4 text-slate-400" />
                  <input
                    type="text"
                    required
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    placeholder="Customer Name"
                    className="input-field pl-9 text-xs"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold tracking-wider text-slate-700 uppercase">
                  Phone Number
                </label>
                <div className="relative mt-1.5">
                  <Phone className="pointer-events-none absolute top-3 left-3 h-4 w-4 text-slate-400" />
                  <input
                    type="tel"
                    value={customerPhone}
                    onChange={(e) => setCustomerPhone(e.target.value)}
                    placeholder="0300-1234567"
                    className="input-field pl-9 text-xs"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold tracking-wider text-slate-700 uppercase">
                  Email Address
                </label>
                <div className="relative mt-1.5">
                  <Mail className="pointer-events-none absolute top-3 left-3 h-4 w-4 text-slate-400" />
                  <input
                    type="email"
                    value={customerEmail}
                    onChange={(e) => setCustomerEmail(e.target.value)}
                    placeholder="customer@email.com"
                    className="input-field pl-9 text-xs"
                  />
                </div>
                <p className="mt-1 text-[11px] text-slate-400">
                  Receipt will be automatically emailed if provided.
                </p>
              </div>

              <div>
                <label className="block text-xs font-bold tracking-wider text-slate-700 uppercase">
                  Transaction Classification
                </label>
                <select
                  value={saleType}
                  onChange={(e) => {
  const newSaleType = e.target.value as
    | "walk_in"
    | "prescription";

  setSaleType(newSaleType);

  if (newSaleType === "walk_in") {
    setSelectedPatientId("");
    setLines([
      {
        medicine_id: "",
        quantity: 1,
      },
    ]);
  }
}}
                  className="input-field mt-1.5 text-xs"
                >
                  <option value="walk_in">Walk-in OTC Customer</option>
                  <option value="prescription">Doctor Prescription Sale</option>
                </select>
              </div>
              {saleType === "prescription" && (
  <div className="rounded-xl border border-teal-200 bg-teal-50/60 p-4">
    <label className="block text-xs font-bold tracking-wider text-teal-900 uppercase">
      Hospital Patient <span className="text-rose-500">*</span>
    </label>

    <select
      required
      value={selectedPatientId}
      disabled={loadingPatients}
        onChange={(e) => {
          const patientId = e.target.value;
          setSelectedPatientId(patientId);

          const patient = prescriptionPatients.find(
            (item) => item.id === patientId
          );

          if (patient) {
    setCustomerName(patient.full_name);
    setCustomerPhone(patient.phone || "");
    setCustomerEmail(patient.email || "");

  // Automatically load medicines from the patient's
  // latest doctor-issued prescription.
  const prescriptionLines = patient.medicines.map((item) => ({
  medicine_id: item.medicine_id || "",
  quantity: Math.max(
    1,
    Number.parseInt(
      String(item.prescribed_quantity || ""),
      10
    ) || 1
  ),
  prescribed_name: item.medicine_name,
}));

setLines(
  prescriptionLines.length > 0
    ? prescriptionLines
    : [{ medicine_id: "", quantity: 1 }]
);
}
      }}
      className="input-field mt-1.5 text-xs"
    >
      <option value="">
        {loadingPatients
          ? "Loading hospital patients..."
          : "Select hospital patient..."}
      </option>

      {prescriptionPatients.map((patient) => (
        <option key={patient.id} value={patient.id}>
          {patient.full_name} — {patient.patient_code}
        </option>
      ))}
    </select>

    <p className="mt-1.5 text-[11px] text-slate-500">
      Select the patient whose latest hospital prescription is being
      dispensed.
    </p>

    {selectedPatientId &&
      (() => {
        const patient = prescriptionPatients.find(
          (item) => item.id === selectedPatientId
        );

        if (!patient) return null;

        return (
          <div className="mt-3 rounded-lg border border-teal-200 bg-white p-3">
            <div className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
              Referring Doctor
            </div>

            <div className="mt-1 text-sm font-bold text-teal-950">
              {patient.doctor_name}
            </div>

            <div className="text-[11px] text-slate-500">
              {patient.doctor_specialization}
            </div>

            <div className="mt-2 text-[10px] text-slate-400">
              Latest prescription:{" "}
              {new Date(patient.prescription_date).toLocaleDateString()}
            </div>
          </div>
        );
      })()}
  </div>
)}
            </div>
          </div>

          {/* Right Column: Medicine Line Items (8 cols) */}
          <div className="lg:col-span-8">
            <div className="card overflow-hidden">
              <div className="flex items-center justify-between border-b border-slate-200 bg-slate-50/70 px-6 py-4">
                <div>
                  <h2 className="text-sm font-bold text-teal-950">
                    Dispensary Order Items
                  </h2>
                  <p className="text-xs text-slate-500">
                    Select medicines, quantities, and verify live stock availability.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={addLine}
                  className="btn-outline inline-flex items-center gap-1.5 text-xs py-1.5 px-3"
                >
                  <Plus className="h-3.5 w-3.5" />
                  Add Another Item
                </button>
              </div>

              <div className="p-6 space-y-4">
                {lines.map((line, index) => {
                  const medicine = medicines.find(
                    (item) => item.id === line.medicine_id
                  );

                  return (
                    <div
                      key={index}
                      className="grid grid-cols-1 items-center gap-3 rounded-xl border border-slate-200 bg-slate-50/60 p-4 sm:grid-cols-12"
                    >
                      {/* Medicine Select */}
                      <div className="sm:col-span-6">
  <label className="block text-[11px] font-bold text-slate-500 uppercase">
    Select Medicine
  </label>

  {line.prescribed_name && (
    <div className="mt-1 text-[10px] text-amber-600">
      Prescribed: <span className="font-bold">{line.prescribed_name}</span>
      {!line.medicine_id && " — Please map to pharmacy medicine"}
    </div>
  )}
                        <select
                          required
                          value={line.medicine_id}
                          onChange={(e) =>
                            updateLine(index, "medicine_id", e.target.value)
                          }
                          className="input-field mt-1 text-xs"
                        >
                          <option value="">Choose medicine...</option>
                          {medicines.map((m) => (
                            <option
                              key={m.id}
                              value={m.id}
                              disabled={m.in_stock <= 0}
                            >
                              {m.name} — Rs. {m.unit_price} (Stock: {m.in_stock})
                            </option>
                          ))}
                        </select>
                      </div>

                      {/* Quantity */}
                      <div className="sm:col-span-2">
                        <label className="block text-[11px] font-bold text-slate-500 uppercase">
                          Qty
                        </label>
                        <input
                          type="number"
                          min="1"
                          max={medicine?.in_stock || undefined}
                          required
                          value={line.quantity}
                          onChange={(e) =>
                            updateLine(index, "quantity", e.target.value)
                          }
                          className="input-field mt-1 text-xs"
                        />
                      </div>

                      {/* Line Total */}
                      <div className="sm:col-span-3">
                        <label className="block text-[11px] font-bold text-slate-500 uppercase">
                          Subtotal
                        </label>
                        <div className="mt-1 flex h-10 items-center rounded-xl border border-slate-200 bg-white px-3 text-xs font-bold text-teal-950">
                          Rs.{" "}
                          {medicine
                            ? (
                                line.quantity * Number(medicine.unit_price)
                              ).toLocaleString()
                            : "0.00"}
                        </div>
                      </div>

                      {/* Remove */}
                      <div className="flex justify-center sm:col-span-1 pt-4 sm:pt-4">
                        <button
                          type="button"
                          onClick={() => removeLine(index)}
                          className="rounded-lg p-2 text-slate-400 hover:bg-rose-50 hover:text-rose-600 transition-colors"
                          title="Remove item"
                        >
                          <Trash className="h-4 w-4" />
                        </button>
                      </div>

                      {/* Stock availability indicator */}
                      {medicine && (
                        <div className="sm:col-span-12 -mt-2 text-[11px] text-slate-500 flex items-center gap-2">
                          <span>Unit Price: Rs. {medicine.unit_price}</span>
                          <span>•</span>
                          <span
                            className={
                              medicine.in_stock < 10
                                ? "font-bold text-amber-600"
                                : "text-emerald-700"
                            }
                          >
                            In Stock: {medicine.in_stock} units
                          </span>
                        </div>
                      )}
                    </div>
                  );
                })}

                {/* Checkout Bar */}
                <div className="flex flex-col justify-between gap-4 border-t border-slate-200 pt-6 sm:flex-row sm:items-center">
                  <div>
                    <span className="text-xs font-bold tracking-wider text-slate-500 uppercase">
                      Total Invoice Amount
                    </span>
                    <div className="text-3xl font-extrabold text-teal-950">
                      Rs. {totalAmount.toLocaleString()}
                    </div>
                    <span className="text-[11px] text-slate-400">
                      Includes all applicable pharmaceutical taxes
                    </span>
                  </div>

                  <button
                    type="submit"
                    disabled={submitting || selectedLines.length === 0}
                    className="btn-primary inline-flex items-center justify-center gap-2 py-3.5 px-8 text-sm shadow-lg shadow-teal-900/15 disabled:opacity-50"
                  >
                    {submitting ? (
                      <>
                        <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                        Processing Sale...
                      </>
                    ) : (
                      <>
                        <span>Complete POS Sale</span>
                        <ArrowRight className="h-4 w-4" />
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </form>
    </div>
  );
}