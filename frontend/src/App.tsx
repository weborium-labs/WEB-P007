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
import CaptureToken from "./component/auth/CaptureToken";

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

            <Route path="/intern/dashboard" element={<InternDashboard />} />

            {/* Public legal page */}
            < Route
              path="/terms-and-services"
              element={<TermsAndServicesRoute />}
            />

            Prevent blank screens for unknown routes
            {/* <Route
              path="*"
              element={<Navigate to="/intern/dashboard" replace />}
            /> */}
          </Route>
        </Routes>
      </BrowserRouter>
    </div>
  );
}