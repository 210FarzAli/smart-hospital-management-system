import { Route, Routes } from "react-router-dom";

import PublicLayout from "./pages/public/PublicLayout";
import Home from "./pages/public/Home";
import Departments from "./pages/public/Departments";
import DepartmentDetail from "./pages/public/DepartmentDetail";
import Doctors from "./pages/public/Doctors";
import DoctorProfile from "./pages/public/DoctorProfile";
import BookAppointment from "./pages/public/BookAppointment";
import AIAssistant from "./pages/public/AIAssistant";
import Reviews from "./pages/public/Reviews";

import AdminLogin from "./pages/admin/AdminLogin";
import AdminLayout from "./pages/admin/AdminLayout";
import AdminDashboard from "./pages/admin/AdminDashboard";
import AdminDoctors from "./pages/admin/AdminDoctors";
import AdminAppointments from "./pages/admin/AdminAppointments";
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

import ProtectedRoute from "./components/ProtectedRoute";

export default function App() {
  return (
    <Routes>
      {/* =========================
          PUBLIC WEBSITE
      ========================== */}
      <Route element={<PublicLayout />}>
        <Route path="/" element={<Home />} />

        <Route path="/departments" element={<Departments />} />

        <Route
          path="/departments/:id"
          element={<DepartmentDetail />}
        />

        <Route path="/doctors" element={<Doctors />} />

        <Route
          path="/doctors/:id"
          element={<DoctorProfile />}
        />

        <Route
          path="/book"
          element={<BookAppointment />}
        />

        <Route
          path="/assistant"
          element={<AIAssistant />}
        />

        <Route
          path="/reviews"
          element={<Reviews />}
        />
      </Route>

      {/* =========================
          ADMIN
      ========================== */}
      <Route
        path="/admin/login"
        element={<AdminLogin />}
      />

      <Route
        path="/admin"
        element={
          <ProtectedRoute
            role="admin"
            loginPath="/admin/login"
          >
            <AdminLayout />
          </ProtectedRoute>
        }
      >
        <Route
          path="dashboard"
          element={<AdminDashboard />}
        />

        <Route
          path="doctors"
          element={<AdminDoctors />}
        />

        <Route
          path="appointments"
          element={<AdminAppointments />}
        />

        <Route
          path="pharmacy"
          element={<AdminPharmacy />}
        />

        <Route
          path="reports"
          element={<AdminReports />}
        />
      </Route>

      {/* =========================
          DOCTOR
      ========================== */}
      <Route
        path="/doctor/login"
        element={<DoctorLogin />}
      />

      <Route
        path="/doctor"
        element={
          <ProtectedRoute
            role="doctor"
            loginPath="/doctor/login"
          >
            <DoctorLayout />
          </ProtectedRoute>
        }
      >
        <Route
          path="appointments"
          element={<DoctorAppointments />}
        />

        <Route
          path="patients"
          element={<DoctorPatients />}
        />

        <Route
          path="consultation/:appointmentId"
          element={<DoctorConsultation />}
        />

        <Route
          path="profile"
          element={<DoctorProfilePage />}
        />
      </Route>

      {/* =========================
          PHARMACY
      ========================== */}
      <Route
        path="/pharmacy/login"
        element={<PharmacistLogin />}
      />

      <Route
        path="/pharmacy"
        element={
          <ProtectedRoute
            role="pharmacist"
            loginPath="/pharmacy/login"
          >
            <PharmacistLayout />
          </ProtectedRoute>
        }
      >
        <Route
          path="dashboard"
          element={<PharmacistDashboard />}
        />

        <Route
          path="medicines"
          element={<PharmacistMedicines />}
        />

        <Route
          path="new-sale"
          element={<PharmacistNewSale />}
        />

        <Route
          path="customers"
          element={<PharmacistCustomers />}
        />

        <Route path="sales"
        element={<PharmacistSalesHistory />} />
      </Route>
    </Routes>
  );
}