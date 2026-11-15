/**
 * Group Manager dashboard placeholder.
 *
 * Deliberately minimal (H1 + H2 only) — a direct-flow checkpoint while the
 * real GPM features are built out. Replace this file with the full dashboard.
 */
export default function GroupManagerDashboard() {
    return (
        <main className="flex min-h-screen flex-col items-center justify-center bg-grey-25 px-5 font-inter">
            <h1 className="text-[28px] font-semibold leading-9 text-ink">
                Group Manager Dashboard
            </h1>
            <h2 className="mt-2 text-base font-semibold leading-6 text-ink-700">
                This is the group manager&apos;s dashboard.
            </h2>
        </main>
    );
}
