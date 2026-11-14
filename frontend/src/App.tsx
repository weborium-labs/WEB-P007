import {
  BrowserRouter,
  Link,
  Navigate,
  Outlet,
  Route,
  Routes,
  useNavigate,
} from "react-router-dom";

import SignupPage from "./page/SignupPage";
import LoginPage from "./page/LoginPage";
import { useEffect } from "react";
import AOS from "aos";
import "aos/dist/aos.css";
import LandingPage from "./page/LandingPage";
import Sidebar from "./component/sidebar/Sidebar";
import InternDashboard from "./page/dashboards/intern/InternDashboard"
import GroupManagerDashboard from "./page/dashboards/gpm/GroupManagerDashboard";
import HrDashboard from "./page/dashboards/hr/HrDashboard";
import AdminDashboard from "./page/dashboards/admin/AdminDashboard";
import CaptureToken from "./component/auth/CaptureToken";
import AuthFailurePage from "./page/AuthFailurePage";
import ProfilePage from "./page/ProfilePage";
import { ProtectedRoute } from "./component/ProtectedRoute";
import { dashboardPathForRole } from "./lib/routes";
import { useAuthStore } from "./store/auth.store";

/**
 * Shared app shell: sidebar + page area in one flex row, so everything
 * rendered inside the page area moves together when the sidebar toggles.
 * The sidebar renders null on hidden routes, giving the page full width.
 */
function AppLayout() {
  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <div className="min-w-0 flex-1">
        <Outlet />
      </div>
    </div>
  );
}

/**
 * Signup route wrapper.
 * Navigation stays in the application layer; SignupPage remains reusable.
 */
function SignupRoute() {
  const navigate = useNavigate();

  return (
    <SignupPage
      onNavigateToLogin={() => navigate("/auth/login")}
      onOpenTerms={() => navigate("/terms-and-services")}
    />
  );
}

/** Login route wrapper. */
function LoginRoute() {
  return <LoginPage />;
}

/**
 * Role-aware `/dashboard` entry point.
 *
 * The sidebar and older links point at `/dashboard`; this resolves the
 * signed-in user's role to that role's dashboard so every entry path
 * (login, OAuth, sidebar, bookmarks) lands in the same place.
 */
function DashboardRedirect() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const isBootstrapping = useAuthStore((s) => s.isBootstrapping);
  const role = useAuthStore((s) => s.user?.role);

  if (isBootstrapping) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#F7F8FA]">
        <span className="h-7 w-7 animate-spin rounded-full border-2 border-[#2862F4] border-r-transparent" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/auth/login" replace />;
  }

  return <Navigate to={dashboardPathForRole(role ?? "INTERN")} replace />;
}

/**
 * Terms page route placeholder.
 * Replace the placeholder paragraph with your approved legal content or
 * render your dedicated TermsAndServicesPage component when it is available.
 */
function TermsAndServicesRoute() {
  return (
    <main className="min-h-screen bg-[#F7F8FA] px-5 py-12 text-[#141B2A] sm:px-8">
      <article className="mx-auto w-full max-w-3xl rounded-2xl bg-white p-6 shadow-sm sm:p-10">
        <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
          Terms &amp; Services
        </h1>

        <p className="mt-4 text-sm leading-6 text-[#647087]">
          Your approved Terms &amp; Services content will appear here. Replace
          this placeholder before publishing the application.
        </p>

        <Link
          to="/auth/signup"
          className="mt-8 inline-flex font-medium text-[#1457E8] underline underline-offset-4 hover:text-[#0F45BD] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2862F4] focus-visible:ring-offset-4"
        >
          Back to sign up
        </Link>
      </article>
    </main>
  );
}

export default function App() {
  useEffect(() => {
    AOS.init({
      once: true,
    });
  }, []);

  return (
    <div className="font-inter">
      <BrowserRouter>
        <Routes>
          <Route element={<AppLayout />}>
            {/* Default entry point */}
            <Route path="/" element={<LandingPage />} />

            {/* Authentication pages */}
            <Route path="/auth/signup" element={<SignupRoute />} />
            <Route path="/auth/login" element={<LoginRoute />} />
            <Route path="/verify-token" element={<CaptureToken />} />
            <Route path="/auth/failure" element={<AuthFailurePage />} />

            {/* Role dashboards — every authenticated entry point resolves
                through `dashboardPathForRole` (login, OAuth, /dashboard). */}
            <Route element={<ProtectedRoute />}>
              <Route path="/dashboard" element={<DashboardRedirect />} />
              <Route path="/intern/dashboard" element={<InternDashboard />} />
              <Route path="/gpm/dashboard" element={<GroupManagerDashboard />} />
              <Route path="/hr/dashboard" element={<HrDashboard />} />
              <Route path="/admin/dashboard" element={<AdminDashboard />} />
              <Route path="/profile" element={<ProfilePage />} />
            </Route>

            {/* Public legal page */}
            < Route
              path="/terms-and-services"
              element={<TermsAndServicesRoute />}
            />

            {/* Back-compat aliases for older links */}
            <Route path="/login" element={<Navigate to="/auth/login" replace />} />
            <Route path="/signup" element={<Navigate to="/auth/signup" replace />} />
            <Route path="/terms" element={<Navigate to="/terms-and-services" replace />} />

            {/* Unknown routes land on the landing page, never a blank screen */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </div>
  );
}