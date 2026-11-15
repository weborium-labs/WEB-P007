/**
 * Admin dashboard placeholder (frontend app).
 *
 * Deliberately minimal (H1 + H2 only) — a direct-flow checkpoint while the
 * admin app grows out. Replace this file with the full dashboard.
 */
export default function AdminDashboard() {
    return (
        <main className="flex min-h-screen flex-col items-center justify-center bg-grey-25 px-5 font-inter">
            <h1 className="text-[28px] font-semibold leading-9 text-ink">
                Admin Dashboard
            </h1>
            <h2 className="mt-2 text-base font-semibold leading-6 text-ink-700">
                This is the admin dashboard.
            </h2>
        </main>
    );
}
