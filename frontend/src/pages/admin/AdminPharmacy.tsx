import { useEffect, useState } from "react";
import { pharmacyApi } from "../../lib/apiClient";

interface MedicineRow {
  id: string;
  name: string;
  category: string | null;
  unit_price: number;
  reorder_level: number;
  in_stock: number;
}

// Pharmacy overview for Admin — stock and low-stock flags. Full sale/receipt
// flows live in the Pharmacist role's own screens (POST /api/pharmacy/sales
// is ready on the backend); this follows the same pattern shown throughout.
export default function AdminPharmacy() {
  const [medicines, setMedicines] = useState<MedicineRow[]>([]);

  useEffect(() => {
    pharmacyApi.medicines().then(setMedicines).catch(console.error);
  }, []);

  return (
    <div>
      <h1 className="text-2xl font-semibold text-teal-950">Pharmacy — Stock Overview</h1>
      <div className="mt-6 overflow-hidden rounded-lg border border-slate-200 bg-white">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-left text-slate-500">
            <tr>
              <th className="px-4 py-2">Medicine</th>
              <th className="px-4 py-2">Category</th>
              <th className="px-4 py-2">Unit Price</th>
              <th className="px-4 py-2">In Stock</th>
              <th className="px-4 py-2">Status</th>
            </tr>
          </thead>
          <tbody>
            {medicines.map((m) => {
              const low = m.in_stock <= m.reorder_level;
              return (
                <tr key={m.id} className="border-t border-slate-100">
                  <td className="px-4 py-2">{m.name}</td>
                  <td className="px-4 py-2">{m.category}</td>
                  <td className="px-4 py-2">Rs. {m.unit_price}</td>
                  <td className="px-4 py-2">{m.in_stock}</td>
                  <td className="px-4 py-2">
                    <span className={`rounded-full px-2 py-0.5 text-xs ${low ? "bg-red-50 text-red-700" : "bg-teal-50 text-teal-800"}`}>
                      {low ? "Low stock" : "OK"}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
