import { Route, Routes, Navigate } from "react-router-dom";
import ScrollToTop from "./components/ScrollToTop";

import PublicLayout from "./pages/public/PublicLayout";
import Home from "./pages/public/Home";
import Departments from "./pages/public/Departments";
import DepartmentDetail from "./pages/public/DepartmentDetail";
import Doctors from "./pages/public/Doctors";
import DoctorProfile from "./pages/public/DoctorProfile";
import BookAppointment from "./pages/public/BookAppointment";
import AIAssistant from "./pages/public/AIAssistant";
import Reviews from "./pages/public/Reviews";
import Laboratory from "./pages/public/Laboratory";
import OnlinePharmacy from "./pages/public/OnlinePharmacy";

import AdminLogin from "./pages/admin/AdminLogin";
import AdminLayout from "./pages/admin/AdminLayout";
import AdminDashboard from "./pages/admin/AdminDashboard";
import AdminDoctors from "./pages/admin/AdminDoctors";
import AdminHR from "./pages/admin/AdminHR";
import AdminAppointments from "./pages/admin/AdminAppointments";
import AdminLaboratory from "./pages/admin/AdminLaboratory";
import AdminPharmacy from "./pages/admin/AdminPharmacy";
import AdminReports from "./pages/admin/AdminReports";

import DoctorLogin from "./pages/doctor/DoctorLogin";
import DoctorLayout from "./pages/doctor/DoctorLayout";
import DoctorAppointments from "./pages/doctor/DoctorAppointments";
import DoctorPatients from "./pages/doctor/DoctorPatients";
import DoctorConsultation from "./pages/doctor/DoctorConsultation";
import DoctorProfilePage from "./pages/doctor/DoctorProfile";

import PharmacistLogin from "./pages/pharmacy/PharmacistLogin";
import PharmacistLayout from "./pages/pharmacy/PharmacistLayout";
import PharmacistDashboard from "./pages/pharmacy/PharmacistDashboard";
import PharmacistMedicines from "./pages/pharmacy/PharmacistMedicines";
import PharmacistNewSale from "./pages/pharmacy/PharmacistNewSale";
import PharmacistCustomers from "./pages/pharmacy/PharmacistCustomers";
import PharmacistSalesHistory from "./pages/pharmacy/PharmacistSalesHistory";
import PharmacistOrders from "./pages/pharmacy/PharmacistOrders";

import LaboratoryLogin from "./pages/lab/LaboratoryLogin";
import LaboratoryLayout from "./pages/lab/LaboratoryLayout";
import LaboratoryDashboard from "./pages/lab/LaboratoryDashboard";
import LaboratoryAppointments from "./pages/lab/LaboratoryAppointments";
import LaboratoryResults from "./pages/lab/LaboratoryResults";

import HRLogin from "./pages/hr/HRLogin";
import HRLayout from "./pages/hr/HRLayout";
import HRDashboard from "./pages/hr/HRDashboard";
import HREmployees from "./pages/hr/HREmployees";
import HRDoctors from "./pages/hr/HRDoctors";
import HRPayroll from "./pages/hr/HRPayroll";
import HRAttendanceLeaves from "./pages/hr/HRAttendanceLeaves";

import ReceptionLogin from "./pages/reception/ReceptionLogin";
import ReceptionLayout from "./pages/reception/ReceptionLayout";
import ReceptionDashboard from "./pages/reception/ReceptionDashboard";
import ReceptionLaboratory from "./pages/reception/ReceptionLaboratory";

import ProtectedRoute from "./components/ProtectedRoute";

export default function App() {
  return (
    <>
      <ScrollToTop />
      <Routes>
        {/* =========================
            PUBLIC WEBSITE
        ========================== */}
        <Route element={<PublicLayout />}>
          <Route path="/" element={<Home />} />
          <Route path="/departments" element={<Departments />} />
          <Route path="/departments/:id" element={<DepartmentDetail />} />
          <Route path="/doctors" element={<Doctors />} />
          <Route path="/doctors/:id" element={<DoctorProfile />} />
          <Route path="/book" element={<BookAppointment />} />
          <Route path="/laboratory" element={<Laboratory />} />
          <Route path="/pharmacy-shop" element={<OnlinePharmacy />} />
          <Route path="/pharmacy" element={<OnlinePharmacy />} />
          <Route path="/assistant" element={<AIAssistant />} />
          <Route path="/reviews" element={<Reviews />} />
        </Route>

        {/* =========================
            ADMIN
        ========================== */}
        <Route path="/admin/login" element={<AdminLogin />} />
        <Route
          path="/admin"
          element={
            <ProtectedRoute role="admin" loginPath="/admin/login">
              <AdminLayout />
            </ProtectedRoute>
          }
        >
          <Route path="dashboard" element={<AdminDashboard />} />
          <Route path="hr" element={<AdminHR />} />
          <Route path="doctors" element={<AdminDoctors />} />
          <Route path="appointments" element={<AdminAppointments />} />
          <Route path="laboratory" element={<AdminLaboratory />} />
          <Route path="pharmacy" element={<AdminPharmacy />} />
          <Route path="reports" element={<AdminReports />} />
        </Route>

        {/* =========================
            DOCTOR
        ========================== */}
        <Route path="/doctor/login" element={<DoctorLogin />} />
        <Route
          path="/doctor"
          element={
            <ProtectedRoute role="doctor" loginPath="/doctor/login">
              <DoctorLayout />
            </ProtectedRoute>
          }
        >
          <Route path="appointments" element={<DoctorAppointments />} />
          <Route path="patients" element={<DoctorPatients />} />
          <Route path="consultation/:appointmentId" element={<DoctorConsultation />} />
          <Route path="profile" element={<DoctorProfilePage />} />
        </Route>

        {/* =========================
            PHARMACY
        ========================== */}
        <Route path="/pharmacy/login" element={<PharmacistLogin />} />
        <Route
          path="/pharmacy"
          element={
            <ProtectedRoute role="pharmacist" loginPath="/pharmacy/login">
              <PharmacistLayout />
            </ProtectedRoute>
          }
        >
          <Route path="dashboard" element={<PharmacistDashboard />} />
          <Route path="medicines" element={<PharmacistMedicines />} />
          <Route path="new-sale" element={<PharmacistNewSale />} />
          <Route path="orders" element={<PharmacistOrders />} />
          <Route path="customers" element={<PharmacistCustomers />} />
          <Route path="sales" element={<PharmacistSalesHistory />} />
        </Route>

        {/* =========================
            LABORATORY
        ========================== */}
        <Route path="/lab/login" element={<LaboratoryLogin />} />
        <Route
          path="/lab"
          element={
            <ProtectedRoute role="laboratorist" loginPath="/lab/login">
              <LaboratoryLayout />
            </ProtectedRoute>
          }
        >
          <Route index element={<LaboratoryDashboard />} />
          <Route path="dashboard" element={<LaboratoryDashboard />} />
          <Route path="bookings" element={<LaboratoryAppointments />} />
          <Route path="results" element={<LaboratoryResults />} />
        </Route>

        {/* =========================
            HUMAN RESOURCES (HR)
        ========================== */}
        <Route path="/hr/login" element={<HRLogin />} />
        <Route
          path="/hr"
          element={
            <ProtectedRoute role="hr" loginPath="/hr/login">
              <HRLayout />
            </ProtectedRoute>
          }
        >
          <Route index element={<HRDashboard />} />
          <Route path="dashboard" element={<HRDashboard />} />
          <Route path="employees" element={<HREmployees />} />
          <Route path="doctors" element={<HRDoctors />} />
          <Route path="attendance" element={<HRAttendanceLeaves />} />
          <Route path="payroll" element={<HRPayroll />} />
        </Route>

        {/* =========================
            RECEPTION / FRONT DESK
        ========================== */}
        <Route path="/reception/login" element={<ReceptionLogin />} />
        <Route
          path="/reception"
          element={
            <ProtectedRoute role="receptionist" loginPath="/reception/login">
              <ReceptionLayout />
            </ProtectedRoute>
          }
        >
          <Route index element={<ReceptionDashboard />} />
          <Route path="dashboard" element={<ReceptionDashboard />} />
          <Route path="patients" element={<Navigate to="/reception/dashboard" replace />} />
          <Route path="laboratory" element={<ReceptionLaboratory />} />
          <Route path="checkin" element={<Navigate to="/reception/dashboard" replace />} />
          <Route path="walkin" element={<Navigate to="/reception/dashboard" replace />} />
          <Route path="search" element={<Navigate to="/reception/dashboard" replace />} />
        </Route>
      </Routes>
    </>
  );
}