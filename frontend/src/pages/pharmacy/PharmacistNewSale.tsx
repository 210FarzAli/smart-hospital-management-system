import { FormEvent, useEffect, useMemo, useState } from "react";
import {
  pharmacyApi,
  type PharmacyMedicine,
} from "../../lib/apiClient";

interface SaleLine {
  medicine_id: string;
  quantity: number;
}

export default function PharmacistNewSale() {
  const [medicines, setMedicines] = useState<PharmacyMedicine[]>([]);
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [customerEmail, setCustomerEmail] = useState("");
  const [saleType, setSaleType] = useState<"walk_in" | "prescription">(
    "walk_in"
  );
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
          err instanceof Error
            ? err.message
            : "Failed to load medicines."
        );
      } finally {
        setLoading(false);
      }
    }

    loadMedicines();
  }, []);

  const selectedLines = useMemo(() => {
    return lines
      .map((line) => {
        const medicine = medicines.find(
          (item) => item.id === line.medicine_id
        );

        if (!medicine) {
          return null;
        }

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
    setLines((current) =>
      current.map((line, lineIndex) => {
        if (lineIndex !== index) {
          return line;
        }

        if (field === "medicine_id") {
          return {
            ...line,
            medicine_id: value,
          };
        }

        return {
          ...line,
          quantity: Math.max(1, Number(value) || 1),
        };
      })
    );
  }

  function addLine() {
    setLines((current) => [
      ...current,
      { medicine_id: "", quantity: 1 },
    ]);
  }

  function removeLine(index: number) {
    setLines((current) => {
      if (current.length === 1) {
        return [{ medicine_id: "", quantity: 1 }];
      }

      return current.filter((_, lineIndex) => lineIndex !== index);
    });
  }

  function resetForm() {
    setCustomerName("");
    setCustomerPhone("");
    setCustomerEmail("");
    setSaleType("walk_in");
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

    if (selectedLines.length === 0) {
      setError("Please select at least one medicine.");
      return;
    }

    const medicineIds = selectedLines.map(
      (line) => line.medicine_id
    );

    if (new Set(medicineIds).size !== medicineIds.length) {
      setError(
        "The same medicine cannot be added more than once. Update its quantity instead."
      );
      return;
    }

    for (const line of selectedLines) {
      if (line.quantity > line.medicine.in_stock) {
        setError(
          `${line.medicine.name} only has ${line.medicine.in_stock} unit(s) in stock.`
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
        sale_type: saleType,
        items: selectedLines.map((line) => ({
          medicine_id: line.medicine_id,
          quantity: line.quantity,
          unit_price: Number(line.medicine.unit_price),
        })),
      });

      const emailMessage =
        result.emailStatus === "sent"
          ? "The receipt was emailed to the customer."
          : "The sale was recorded, but the receipt email was not sent.";

      setSuccess(
        `Sale ${result.sale.sale_code} completed successfully. Receipt: ${result.receiptCode}. ${emailMessage}`
      );

      resetForm();

      const refreshed = await pharmacyApi.medicines();
      setMedicines(refreshed);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Failed to complete the sale."
      );
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return (
      <div>
        <p className="text-sm font-medium text-teal-700">
          Pharmacy Sales
        </p>

        <h1 className="mt-1 text-2xl font-semibold text-teal-950">
          New Sale
        </h1>

        <div className="mt-8 rounded-xl border border-slate-200 bg-white p-6 text-sm text-slate-500">
          Loading medicines...
        </div>
      </div>
    );
  }

  return (
    <div>
      <div>
        <p className="text-sm font-medium text-teal-700">
          Pharmacy Sales
        </p>

        <h1 className="mt-1 text-2xl font-semibold text-teal-950">
          New Sale
        </h1>

        <p className="mt-2 text-sm text-slate-500">
          Record a walk-in or prescription-related pharmacy sale.
        </p>
      </div>

      {error && (
        <div className="mt-6 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {success && (
        <div className="mt-6 rounded-lg border border-teal-200 bg-teal-50 px-4 py-3 text-sm text-teal-800">
          {success}
        </div>
      )}

      <form onSubmit={handleSubmit} className="mt-8">
        <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
          {/* Customer information */}
          <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="font-semibold text-teal-950">
              Customer Information
            </h2>

            <p className="mt-1 text-sm text-slate-500">
              Customer details are stored for pharmacy purchase history.
            </p>

            <div className="mt-6 space-y-5">
              <div>
                <label className="text-sm font-medium text-slate-700">
                  Full Name
                </label>

                <input
                  type="text"
                  required
                  className="input-field mt-1"
                  value={customerName}
                  onChange={(e) =>
                    setCustomerName(e.target.value)
                  }
                  placeholder="Customer name"
                />
              </div>

              <div>
                <label className="text-sm font-medium text-slate-700">
                  Phone
                </label>

                <input
                  type="tel"
                  className="input-field mt-1"
                  value={customerPhone}
                  onChange={(e) =>
                    setCustomerPhone(e.target.value)
                  }
                  placeholder="03XX-XXXXXXX"
                />
              </div>

              <div>
                <label className="text-sm font-medium text-slate-700">
                  Email
                </label>

                <input
                  type="email"
                  className="input-field mt-1"
                  value={customerEmail}
                  onChange={(e) =>
                    setCustomerEmail(e.target.value)
                  }
                  placeholder="customer@email.com"
                />

                <p className="mt-1 text-xs text-slate-400">
                  If provided, the receipt will be emailed.
                </p>
              </div>

              <div>
                <label className="text-sm font-medium text-slate-700">
                  Sale Type
                </label>

                <select
                  className="input-field mt-1"
                  value={saleType}
                  onChange={(e) =>
                    setSaleType(
                      e.target.value as
                        | "walk_in"
                        | "prescription"
                    )
                  }
                >
                  <option value="walk_in">Walk-in</option>
                  <option value="prescription">
                    Prescription
                  </option>
                </select>
              </div>
            </div>
          </div>

          {/* Medicines */}
          <div className="xl:col-span-2">
            <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
              <div className="border-b border-slate-200 px-6 py-5">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <h2 className="font-semibold text-teal-950">
                      Medicines
                    </h2>

                    <p className="mt-1 text-sm text-slate-500">
                      Select medicines and quantities for this sale.
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={addLine}
                    className="rounded-md border border-teal-200 bg-teal-50 px-4 py-2 text-sm font-medium text-teal-800 hover:bg-teal-100"
                  >
                    + Add Medicine
                  </button>
                </div>
              </div>

              <div className="p-6">
                <div className="space-y-4">
                  {lines.map((line, index) => {
                    const medicine = medicines.find(
                      (item) => item.id === line.medicine_id
                    );

                    return (
                      <div
                        key={index}
                        className="rounded-lg border border-slate-200 bg-slate-50 p-4"
                      >
                        <div className="grid grid-cols-1 gap-4 md:grid-cols-[1fr_120px_130px_auto] md:items-end">
                          <div>
                            <label className="text-sm font-medium text-slate-700">
                              Medicine
                            </label>

                            <select
                              required
                              className="input-field mt-1"
                              value={line.medicine_id}
                              onChange={(e) =>
                                updateLine(
                                  index,
                                  "medicine_id",
                                  e.target.value
                                )
                              }
                            >
                              <option value="">
                                Select medicine
                              </option>

                              {medicines.map((item) => (
                                <option
                                  key={item.id}
                                  value={item.id}
                                  disabled={item.in_stock <= 0}
                                >
                                  {item.name} — Stock:{" "}
                                  {item.in_stock}
                                </option>
                              ))}
                            </select>
                          </div>

                          <div>
                            <label className="text-sm font-medium text-slate-700">
                              Quantity
                            </label>

                            <input
                              type="number"
                              min="1"
                              max={medicine?.in_stock || undefined}
                              required
                              className="input-field mt-1"
                              value={line.quantity}
                              onChange={(e) =>
                                updateLine(
                                  index,
                                  "quantity",
                                  e.target.value
                                )
                              }
                            />
                          </div>

                          <div>
                            <label className="text-sm font-medium text-slate-700">
                              Line Total
                            </label>

                            <div className="mt-1 flex h-10 items-center rounded-md border border-slate-200 bg-white px-3 text-sm font-medium text-slate-800">
                              Rs.{" "}
                              {medicine
                                ? (
                                    line.quantity *
                                    Number(medicine.unit_price)
                                  ).toFixed(2)
                                : "0.00"}
                            </div>
                          </div>

                          <button
                            type="button"
                            onClick={() => removeLine(index)}
                            className="rounded-md px-3 py-2 text-sm font-medium text-red-600 hover:bg-red-50"
                          >
                            Remove
                          </button>
                        </div>

                        {medicine && (
                          <div className="mt-3 text-xs text-slate-500">
                            Unit price: Rs.{" "}
                            {Number(medicine.unit_price).toFixed(2)}
                            {" • "}
                            Available: {medicine.in_stock}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>

                <div className="mt-6 flex items-center justify-between border-t border-slate-200 pt-5">
                  <div>
                    <p className="text-sm text-slate-500">
                      Total Amount
                    </p>

                    <p className="mt-1 text-2xl font-semibold text-teal-950">
                      Rs. {totalAmount.toFixed(2)}
                    </p>
                  </div>

                  <button
                    type="submit"
                    disabled={submitting}
                    className="btn-primary min-w-40"
                  >
                    {submitting
                      ? "Processing..."
                      : "Complete Sale"}
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