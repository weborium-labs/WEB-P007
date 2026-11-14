/**
 * Admin dashboard placeholder (frontend app).
 *
 * Deliberately minimal (H1 + H2 only) — a direct-flow checkpoint while the
 * admin app grows out. Replace this file with the full dashboard.
 */
export default function AdminDashboard() {
    return (
        <main className="flex min-h-screen flex-col items-center justify-center bg-[#F8F9FB] px-5 font-inter">
            <h1 className="text-[28px] font-semibold leading-9 text-[#101828]">
                Admin Dashboard
            </h1>
            <h2 className="mt-2 text-base font-semibold leading-6 text-[#475467]">
                This is the admin dashboard.
            </h2>
        </main>
    );
}
