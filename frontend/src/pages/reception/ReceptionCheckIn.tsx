import { useEffect, useState, FormEvent } from "react";
import { receptionApi, doctorsApi, departmentsApi } from "../../lib/apiClient";
import type { Doctor, Department } from "../../lib/types";
import {
  UserCheck,
  Plus,
  Calendar,
  Clock,
  CheckCircle,
  Phone,
  Mail,
  User,
  AlertCircle,
  FileText,
  DollarSign,
} from "../../components/icons/Icons";

export default function ReceptionCheckIn() {
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [loading, setLoading] = useState(true);

  // Form State
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [age, setAge] = useState("");
  const [doctorId, setDoctorId] = useState("");
  const [appointmentTime, setAppointmentTime] = useState("09:00");
  const [reason, setReason] = useState("Walk-in consultation");

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [issuedSlip, setIssuedSlip] = useState<any | null>(null);

  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        const [docs, depts] = await Promise.all([
          doctorsApi.list(),
          departmentsApi.list(),
        ]);
        setDoctors(docs || []);
        setDepartments(depts || []);
        if (docs && docs.length > 0) {
          setDoctorId(docs[0].id);
        }
      } catch (err) {
        console.error("Failed to load doctor shifts:", err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  async function handleRegisterWalkin(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);

    try {
      const res = await receptionApi.registerWalkin({
        full_name: fullName.trim(),
        phone: phone.trim(),
        email: email.trim() || undefined,
        age: age ? Number(age) : undefined,
        doctor_id: doctorId,
        appointment_time: appointmentTime,
        reason: reason.trim(),
      });

      setIssuedSlip(res.appointment);
      // Reset input
      setFullName("");
      setPhone("");
      setEmail("");
      setAge("");
    } catch (err: any) {
      setError(err.message || "Failed to register walk-in patient.");
    } finally {
      setSubmitting(false);
    }
  }

  const selectedDoctor = doctors.find((d) => d.id === doctorId);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-extrabold tracking-tight text-teal-950 sm:text-3xl">
          Walk-In Registration & Check-In Counter
        </h1>
        <p className="text-xs text-slate-500">
          Issue immediate OPD tokens and register arriving clinic patients.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Walk-In Booking Form */}
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs lg:col-span-2">
          <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
            <UserCheck className="h-5 w-5 text-teal-700" />
            <h2 className="text-sm font-extrabold text-teal-950">
              Immediate Patient Walk-In Registration
            </h2>
          </div>

          {error && (
            <div className="mt-4 flex items-center gap-2 rounded-xl bg-red-50 p-3 text-xs text-red-700">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleRegisterWalkin} className="mt-4 space-y-4 text-xs">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div>
                <label className="block font-semibold text-slate-700">Patient Full Name *</label>
                <input
                  type="text"
                  required
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="e.g. Tariq Jamil"
                  className="mt-1 w-full rounded-xl border border-slate-200 p-2.5 text-xs focus:border-teal-600 focus:outline-none"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700">Patient Phone Number *</label>
                <input
                  type="text"
                  required
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+92 300 9876543"
                  className="mt-1 w-full rounded-xl border border-slate-200 p-2.5 text-xs focus:border-teal-600 focus:outline-none"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div>
                <label className="block font-semibold text-slate-700">Email Address (Optional)</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="patient@example.com"
                  className="mt-1 w-full rounded-xl border border-slate-200 p-2.5 text-xs focus:border-teal-600 focus:outline-none"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700">Patient Age</label>
                <input
                  type="number"
                  value={age}
                  onChange={(e) => setAge(e.target.value)}
                  placeholder="e.g. 38"
                  className="mt-1 w-full rounded-xl border border-slate-200 p-2.5 text-xs focus:border-teal-600 focus:outline-none"
                />
              </div>
            </div>

            {/* Doctor and Shift Selection */}
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div>
                <label className="block font-semibold text-slate-700">Select Consultant Doctor *</label>
                <select
                  required
                  value={doctorId}
                  onChange={(e) => setDoctorId(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-slate-200 p-2.5 text-xs focus:border-teal-600 focus:outline-none"
                >
                  {doctors.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.full_name} — {d.specialization} (Fee: Rs. {Number(d.consultation_fee).toLocaleString()})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-700">Shift Consultation Slot *</label>
                <select
                  value={appointmentTime}
                  onChange={(e) => setAppointmentTime(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-slate-200 p-2.5 text-xs focus:border-teal-600 focus:outline-none"
                >
                  <option value="09:00">Morning Shift (09:00 AM)</option>
                  <option value="11:00">Mid-Morning Slot (11:00 AM)</option>
                  <option value="14:00">Afternoon Shift (02:00 PM)</option>
                  <option value="17:00">Evening Shift (05:00 PM)</option>
                  <option value="19:00">Night OPD (07:00 PM)</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block font-semibold text-slate-700">Reason / Symptoms</label>
              <input
                type="text"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="e.g. Chest discomfort, routine checkup, viral fever"
                className="mt-1 w-full rounded-xl border border-slate-200 p-2.5 text-xs focus:border-teal-600 focus:outline-none"
              />
            </div>

            <div className="flex items-center justify-between rounded-xl bg-teal-50 p-3 text-xs text-teal-900">
              <div>
                <span className="font-bold">OPD Consultation Fee: </span>
                <span className="font-extrabold text-teal-950">
                  Rs. {Number(selectedDoctor?.consultation_fee || 0).toLocaleString()}
                </span>
                <p className="text-[11px] text-teal-700">To be collected in physical cash at front desk counter.</p>
              </div>
              <button
                type="submit"
                disabled={submitting}
                className="btn-primary text-xs"
              >
                {submitting ? "Processing..." : "Generate OPD Token & Check In"}
              </button>
            </div>
          </form>
        </div>

        {/* Generated OPD Token Slip */}
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs">
          <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
            <FileText className="h-5 w-5 text-teal-700" />
            <h2 className="text-sm font-extrabold text-teal-950">
              OPD Patient Token Slip
            </h2>
          </div>

          {issuedSlip ? (
            <div className="mt-4 space-y-4 rounded-xl border-2 border-dashed border-teal-600 bg-teal-50/50 p-5 text-xs text-slate-800">
              <div className="text-center border-b border-teal-200 pb-3">
                <div className="text-[10px] font-bold tracking-widest text-teal-800 uppercase">
                  City Care Hospital — OPD Reception
                </div>
                <div className="mt-1 text-2xl font-extrabold text-teal-950">
                  {issuedSlip.appointment_code}
                </div>
                <span className="inline-block mt-1 rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-800">
                  Checked In & Assigned
                </span>
              </div>

              <div className="space-y-1.5 text-xs">
                <div className="flex justify-between">
                  <span className="text-slate-500">Patient:</span>
                  <span className="font-bold text-slate-900">{issuedSlip.patient_name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Contact:</span>
                  <span className="font-medium text-slate-700">{issuedSlip.patient_phone}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Doctor:</span>
                  <span className="font-bold text-slate-900">{issuedSlip.doctor_name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Specialty:</span>
                  <span className="font-medium text-teal-700">{issuedSlip.department_name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Slot / Shift:</span>
                  <span className="font-medium text-slate-700">{issuedSlip.appointment_time}</span>
                </div>
                <div className="flex justify-between border-t border-teal-200 pt-2 font-bold">
                  <span>Consultation Fee:</span>
                  <span className="text-teal-950">Rs. {Number(issuedSlip.consultation_fee || 0).toLocaleString()}</span>
                </div>
              </div>

              <div className="pt-2 text-center">
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="rounded-xl bg-teal-800 px-4 py-2 font-semibold text-white shadow-sm hover:bg-teal-900 text-xs w-full"
                >
                  Print Consultation Slip
                </button>
              </div>
            </div>
          ) : (
            <div className="mt-6 flex flex-col items-center justify-center p-8 text-center text-xs text-slate-400">
              <FileText className="h-10 w-10 text-slate-300 mb-2" />
              <p>Register a walk-in patient on the left to generate and print their immediate consultation token slip.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
