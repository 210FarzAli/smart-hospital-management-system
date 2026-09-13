import { useEffect, useState } from "react";
import { hrApi } from "../../lib/apiClient";
import type { Employee, EmployeeAttendance, EmployeeLeave } from "../../lib/types";
import {
  Calendar,
  Clock,
  CheckCircle,
  Plus,
  Search,
  Users,
  X,
  AlertCircle,
  FileText,
} from "../../components/icons/Icons";

export default function HRAttendanceLeaves() {
  const [activeTab, setActiveTab] = useState<"attendance" | "leaves">("attendance");
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [attendanceDate, setAttendanceDate] = useState(
    new Date().toISOString().slice(0, 10)
  );
  const [attendanceList, setAttendanceList] = useState<EmployeeAttendance[]>([]);
  const [leavesList, setLeavesList] = useState<EmployeeLeave[]>([]);
  const [loading, setLoading] = useState(true);

  // Mark attendance modal/form state
  const [attendanceModalOpen, setAttendanceModalOpen] = useState(false);
  const [selectedEmpId, setSelectedEmpId] = useState("");
  const [attStatus, setAttStatus] = useState("present");
  const [checkInTime, setCheckInTime] = useState("09:00 AM");
  const [checkOutTime, setCheckOutTime] = useState("05:00 PM");
  const [attRemarks, setAttRemarks] = useState("");
  const [savingAttendance, setSavingAttendance] = useState(false);

  // Apply leave modal/form state
  const [leaveModalOpen, setLeaveModalOpen] = useState(false);
  const [leaveEmpId, setLeaveEmpId] = useState("");
  const [leaveType, setLeaveType] = useState("casual");
  const [startDate, setStartDate] = useState(new Date().toISOString().slice(0, 10));
  const [endDate, setEndDate] = useState(new Date().toISOString().slice(0, 10));
  const [daysCount, setDaysCount] = useState("1");
  const [leaveReason, setLeaveReason] = useState("");
  const [savingLeave, setSavingLeave] = useState(false);

  async function loadInitial() {
    setLoading(true);
    try {
      const [empData, attData, lvsData] = await Promise.all([
        hrApi.employees(),
        hrApi.attendance({ date: attendanceDate }),
        hrApi.leaves(),
      ]);
      setEmployees(empData || []);
      setAttendanceList(attData || []);
      setLeavesList(lvsData || []);
    } catch (err) {
      console.error("Failed to load HR data:", err);
    } finally {
      setLoading(false);
    }
  }

  async function loadAttendanceForDate(d: string) {
    try {
      const data = await hrApi.attendance({ date: d });
      setAttendanceList(data || []);
    } catch (err) {
      console.error("Failed to load attendance for date:", err);
    }
  }

  async function loadLeaves() {
    try {
      const data = await hrApi.leaves();
      setLeavesList(data || []);
    } catch (err) {
      console.error("Failed to load leaves:", err);
    }
  }

  useEffect(() => {
    loadInitial();
  }, []);

  const handleSaveAttendance = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedEmpId) {
      alert("Please select an employee.");
      return;
    }
    setSavingAttendance(true);
    try {
      await hrApi.markAttendance({
        employee_id: selectedEmpId,
        attendance_date: attendanceDate,
        status: attStatus,
        check_in_time: checkInTime,
        check_out_time: checkOutTime,
        remarks: attRemarks,
      });
      setAttendanceModalOpen(false);
      setSelectedEmpId("");
      setAttRemarks("");
      loadAttendanceForDate(attendanceDate);
    } catch (err: any) {
      alert(err.message || "Failed to record attendance.");
    } finally {
      setSavingAttendance(false);
    }
  };

  const handleApplyLeave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!leaveEmpId || !startDate || !endDate) {
      alert("Please fill in all required fields.");
      return;
    }
    setSavingLeave(true);
    try {
      await hrApi.applyLeave({
        employee_id: leaveEmpId,
        leave_type: leaveType,
        start_date: startDate,
        end_date: endDate,
        days_count: parseInt(daysCount, 10) || 1,
        reason: leaveReason,
      });
      setLeaveModalOpen(false);
      setLeaveEmpId("");
      setLeaveReason("");
      loadLeaves();
    } catch (err: any) {
      alert(err.message || "Failed to submit leave application.");
    } finally {
      setSavingLeave(false);
    }
  };

  const handleUpdateLeaveStatus = async (id: string, status: string) => {
    try {
      await hrApi.updateLeaveStatus(id, status);
      loadLeaves();
    } catch (err: any) {
      alert(err.message || "Failed to update leave status.");
    }
  };

  const presentCount = attendanceList.filter((a) => a.status === "present").length;
  const absentCount = attendanceList.filter((a) => a.status === "absent").length;
  const lateCount = attendanceList.filter((a) => a.status === "late").length;
  const onLeaveCount = attendanceList.filter((a) => a.status === "on_leave").length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-teal-950 sm:text-3xl">
            Staff Attendance & Leave Management
          </h1>
          <p className="text-xs text-slate-500">
            Monitor daily employee check-ins, record shifts, and process medical and annual leave requests.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {activeTab === "attendance" ? (
            <button
              type="button"
              onClick={() => setAttendanceModalOpen(true)}
              className="btn-primary inline-flex items-center gap-2 text-xs shadow-md shadow-teal-900/10"
            >
              <Plus className="h-4 w-4" />
              Mark Attendance
            </button>
          ) : (
            <button
              type="button"
              onClick={() => setLeaveModalOpen(true)}
              className="btn-primary inline-flex items-center gap-2 text-xs shadow-md shadow-teal-900/10"
            >
              <Plus className="h-4 w-4" />
              Apply Leave Request
            </button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200">
        <button
          type="button"
          onClick={() => setActiveTab("attendance")}
          className={`flex items-center gap-2 px-4 py-2.5 text-xs font-bold border-b-2 transition ${
            activeTab === "attendance"
              ? "border-teal-700 text-teal-900 bg-white rounded-t-lg"
              : "border-transparent text-slate-500 hover:text-slate-700"
          }`}
        >
          <Clock className="h-4 w-4" />
          Daily Attendance
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("leaves")}
          className={`flex items-center gap-2 px-4 py-2.5 text-xs font-bold border-b-2 transition ${
            activeTab === "leaves"
              ? "border-teal-700 text-teal-900 bg-white rounded-t-lg"
              : "border-transparent text-slate-500 hover:text-slate-700"
          }`}
        >
          <Calendar className="h-4 w-4" />
          Leave Applications ({leavesList.filter((l) => l.status === "pending").length} Pending)
        </button>
      </div>

      {/* Tab 1: Daily Attendance */}
      {activeTab === "attendance" && (
        <div className="space-y-6">
          {/* Controls Bar */}
          <div className="card p-4 flex flex-col sm:flex-row gap-4 items-center justify-between">
            <div className="flex items-center gap-3 w-full sm:w-auto">
              <label className="text-xs font-semibold text-slate-700 shrink-0">
                Attendance Date:
              </label>
              <input
                type="date"
                value={attendanceDate}
                onChange={(e) => {
                  setAttendanceDate(e.target.value);
                  loadAttendanceForDate(e.target.value);
                }}
                className="input-field py-1.5 text-xs w-auto"
              />
            </div>

            <div className="flex items-center gap-2 text-xs font-medium text-slate-600">
              <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-emerald-800 ring-1 ring-emerald-200">
                Present: <b>{presentCount}</b>
              </span>
              <span className="rounded-full bg-rose-50 px-2.5 py-1 text-rose-800 ring-1 ring-rose-200">
                Absent: <b>{absentCount}</b>
              </span>
              <span className="rounded-full bg-amber-50 px-2.5 py-1 text-amber-800 ring-1 ring-amber-200">
                Late: <b>{lateCount}</b>
              </span>
              <span className="rounded-full bg-purple-50 px-2.5 py-1 text-purple-800 ring-1 ring-purple-200">
                On Leave: <b>{onLeaveCount}</b>
              </span>
            </div>
          </div>

          {/* Table */}
          <div className="card overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="border-b border-slate-200 bg-slate-50 font-bold uppercase tracking-wider text-slate-500">
                  <tr>
                    <th className="px-5 py-3.5">Employee Details</th>
                    <th className="px-5 py-3.5">Department & Role</th>
                    <th className="px-5 py-3.5">Status</th>
                    <th className="px-5 py-3.5">Check In / Out</th>
                    <th className="px-5 py-3.5">Remarks</th>
                    <th className="px-5 py-3.5 text-right">Quick Mark</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {loading ? (
                    <tr>
                      <td colSpan={6} className="p-8 text-center text-slate-400">
                        Loading attendance records...
                      </td>
                    </tr>
                  ) : attendanceList.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="p-8 text-center text-slate-500">
                        No attendance records logged for {attendanceDate}. Click <b>Mark Attendance</b> to log records.
                      </td>
                    </tr>
                  ) : (
                    attendanceList.map((a) => (
                      <tr key={a.id} className="hover:bg-slate-50/80 transition">
                        <td className="px-5 py-3.5">
                          <div className="font-bold text-teal-950">{a.employee_name}</div>
                          <div className="text-[11px] text-slate-500">{a.employee_phone}</div>
                        </td>

                        <td className="px-5 py-3.5">
                          <div className="text-slate-800 font-medium">{a.designation}</div>
                          <div className="text-[11px] text-slate-500">{a.department_name}</div>
                        </td>

                        <td className="px-5 py-3.5">
                          <span
                            className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                              a.status === "present"
                                ? "bg-emerald-100 text-emerald-800"
                                : a.status === "absent"
                                ? "bg-rose-100 text-rose-800"
                                : a.status === "late"
                                ? "bg-amber-100 text-amber-800"
                                : "bg-purple-100 text-purple-800"
                            }`}
                          >
                            {a.status.replace("_", " ")}
                          </span>
                        </td>

                        <td className="px-5 py-3.5 font-mono text-[11px] text-slate-600">
                          {a.check_in_time || "--"} – {a.check_out_time || "--"}
                        </td>

                        <td className="px-5 py-3.5 text-slate-500 text-[11px]">
                          {a.remarks || "-"}
                        </td>

                        <td className="px-5 py-3.5 text-right">
                          <div className="inline-flex items-center gap-1">
                            <button
                              type="button"
                              onClick={async () => {
                                await hrApi.markAttendance({
                                  employee_id: a.employee_id,
                                  attendance_date: attendanceDate,
                                  status: "present",
                                  check_in_time: "09:00 AM",
                                  check_out_time: "05:00 PM",
                                });
                                loadAttendanceForDate(attendanceDate);
                              }}
                              className="rounded bg-emerald-50 px-2 py-1 text-[10px] font-bold text-emerald-700 hover:bg-emerald-100"
                              title="Mark Present"
                            >
                              Present
                            </button>
                            <button
                              type="button"
                              onClick={async () => {
                                await hrApi.markAttendance({
                                  employee_id: a.employee_id,
                                  attendance_date: attendanceDate,
                                  status: "absent",
                                  remarks: "Unexcused Absence",
                                });
                                loadAttendanceForDate(attendanceDate);
                              }}
                              className="rounded bg-rose-50 px-2 py-1 text-[10px] font-bold text-rose-700 hover:bg-rose-100"
                              title="Mark Absent"
                            >
                              Absent
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Tab 2: Leaves Management */}
      {activeTab === "leaves" && (
        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-slate-200 bg-slate-50 font-bold uppercase tracking-wider text-slate-500">
                <tr>
                  <th className="px-5 py-3.5">Employee</th>
                  <th className="px-5 py-3.5">Leave Type</th>
                  <th className="px-5 py-3.5">Period & Duration</th>
                  <th className="px-5 py-3.5">Reason</th>
                  <th className="px-5 py-3.5">Status</th>
                  <th className="px-5 py-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {loading ? (
                  <tr>
                    <td colSpan={6} className="p-8 text-center text-slate-400">
                      Loading leave applications...
                    </td>
                  </tr>
                ) : leavesList.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="p-8 text-center text-slate-500">
                      No leave applications found.
                    </td>
                  </tr>
                ) : (
                  leavesList.map((l) => (
                    <tr key={l.id} className="hover:bg-slate-50/80 transition">
                      <td className="px-5 py-3.5">
                        <div className="font-bold text-teal-950">{l.employee_name}</div>
                        <div className="text-[11px] text-slate-500">
                          {l.designation} • {l.department_name}
                        </div>
                      </td>

                      <td className="px-5 py-3.5">
                        <span className="font-bold uppercase text-[10px] tracking-wider text-teal-800 bg-teal-50 px-2 py-0.5 rounded border border-teal-200">
                          {l.leave_type}
                        </span>
                      </td>

                      <td className="px-5 py-3.5">
                        <div className="font-semibold text-slate-800">
                          {String(l.start_date).slice(0, 10)} to {String(l.end_date).slice(0, 10)}
                        </div>
                        <div className="text-[11px] text-slate-500">{l.days_count} day(s)</div>
                      </td>

                      <td className="px-5 py-3.5 max-w-[200px] truncate text-slate-600">
                        {l.reason || "Personal grounds"}
                      </td>

                      <td className="px-5 py-3.5">
                        <span
                          className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                            l.status === "approved"
                              ? "bg-emerald-100 text-emerald-800"
                              : l.status === "rejected"
                              ? "bg-rose-100 text-rose-800"
                              : "bg-amber-100 text-amber-800"
                          }`}
                        >
                          {l.status}
                        </span>
                      </td>

                      <td className="px-5 py-3.5 text-right">
                        {l.status === "pending" ? (
                          <div className="inline-flex items-center gap-1.5">
                            <button
                              type="button"
                              onClick={() => handleUpdateLeaveStatus(l.id, "approved")}
                              className="rounded-lg bg-emerald-700 px-2.5 py-1 text-[11px] font-bold text-white hover:bg-emerald-600 transition"
                            >
                              Approve
                            </button>
                            <button
                              type="button"
                              onClick={() => handleUpdateLeaveStatus(l.id, "rejected")}
                              className="rounded-lg bg-rose-700 px-2.5 py-1 text-[11px] font-bold text-white hover:bg-rose-600 transition"
                            >
                              Reject
                            </button>
                          </div>
                        ) : (
                          <span className="text-[11px] text-slate-400 italic">Resolved</span>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modal: Mark Attendance */}
      {attendanceModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="w-full max-w-md rounded-3xl bg-white p-6 sm:p-8 shadow-2xl border border-slate-200">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-base font-bold text-teal-950">Record Attendance</h3>
              <button
                type="button"
                onClick={() => setAttendanceModalOpen(false)}
                className="p-1 rounded-lg hover:bg-slate-100 text-slate-500"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSaveAttendance} className="mt-4 space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Select Employee *</label>
                <select
                  required
                  value={selectedEmpId}
                  onChange={(e) => setSelectedEmpId(e.target.value)}
                  className="input-field"
                >
                  <option value="">-- Choose Employee --</option>
                  {employees.map((emp) => (
                    <option key={emp.id} value={emp.id}>
                      {emp.full_name} ({emp.designation})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Status</label>
                  <select
                    value={attStatus}
                    onChange={(e) => setAttStatus(e.target.value)}
                    className="input-field"
                  >
                    <option value="present">Present</option>
                    <option value="absent">Absent</option>
                    <option value="late">Late Arrival</option>
                    <option value="half_day">Half Day</option>
                    <option value="on_leave">On Leave</option>
                  </select>
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Date</label>
                  <input
                    type="date"
                    value={attendanceDate}
                    onChange={(e) => setAttendanceDate(e.target.value)}
                    className="input-field"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Check In Time</label>
                  <input
                    type="text"
                    value={checkInTime}
                    onChange={(e) => setCheckInTime(e.target.value)}
                    placeholder="09:00 AM"
                    className="input-field"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Check Out Time</label>
                  <input
                    type="text"
                    value={checkOutTime}
                    onChange={(e) => setCheckOutTime(e.target.value)}
                    placeholder="05:00 PM"
                    className="input-field"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Remarks / Shift Notes</label>
                <input
                  type="text"
                  value={attRemarks}
                  onChange={(e) => setAttRemarks(e.target.value)}
                  placeholder="e.g. Approved morning shift"
                  className="input-field"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setAttendanceModalOpen(false)}
                  className="btn-outline text-xs"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingAttendance}
                  className="btn-primary text-xs"
                >
                  {savingAttendance ? "Saving..." : "Record Attendance"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Apply Leave */}
      {leaveModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="w-full max-w-md rounded-3xl bg-white p-6 sm:p-8 shadow-2xl border border-slate-200">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-base font-bold text-teal-950">Apply Leave Request</h3>
              <button
                type="button"
                onClick={() => setLeaveModalOpen(false)}
                className="p-1 rounded-lg hover:bg-slate-100 text-slate-500"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleApplyLeave} className="mt-4 space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Select Employee *</label>
                <select
                  required
                  value={leaveEmpId}
                  onChange={(e) => setLeaveEmpId(e.target.value)}
                  className="input-field"
                >
                  <option value="">-- Choose Employee --</option>
                  {employees.map((emp) => (
                    <option key={emp.id} value={emp.id}>
                      {emp.full_name} ({emp.designation})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Leave Type</label>
                  <select
                    value={leaveType}
                    onChange={(e) => setLeaveType(e.target.value)}
                    className="input-field"
                  >
                    <option value="casual">Casual Leave</option>
                    <option value="sick">Medical / Sick</option>
                    <option value="annual">Annual Leave</option>
                    <option value="unpaid">Unpaid Leave</option>
                    <option value="maternity">Maternity</option>
                    <option value="emergency">Emergency</option>
                  </select>
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Days Count</label>
                  <input
                    type="number"
                    min="1"
                    max="60"
                    value={daysCount}
                    onChange={(e) => setDaysCount(e.target.value)}
                    className="input-field"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Start Date</label>
                  <input
                    type="date"
                    required
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="input-field"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">End Date</label>
                  <input
                    type="date"
                    required
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="input-field"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Reason</label>
                <textarea
                  rows={3}
                  value={leaveReason}
                  onChange={(e) => setLeaveReason(e.target.value)}
                  placeholder="Provide reason for leave..."
                  className="input-field"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setLeaveModalOpen(false)}
                  className="btn-outline text-xs"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingLeave}
                  className="btn-primary text-xs"
                >
                  {savingLeave ? "Submitting..." : "Submit Leave"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
