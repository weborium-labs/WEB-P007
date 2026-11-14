import { useNavigate } from "react-router-dom";
import { useDocumentTitle } from "../../../hooks/useDocumentTitle";
import { useLogoutMutation } from "../../../hooks/useAuthMutations";
import ChatsPanel from "../../../component/intern-dashboard/ChatsPanel";
import OverviewStats from "../../../component/intern-dashboard/OverviewStats";
import Salutation from "../../../component/intern-dashboard/Salutation";
import TasksSection from "../../../component/intern-dashboard/TaskSection";
import TopBar from "../../../component/intern-dashboard/Topbar";
import { CHATS, INTERN_NAME, INTERNSHIP_OPTIONS, OVERVIEW_STATS, TASKS } from "../../../data/intern-dashboard.data";

/**
 * Layout is driven by container queries (not viewport breakpoints), so toggling
 * the sidebar — which changes the body's left padding — reflows the page correctly.
 * Requires Tailwind CSS v4 (`@container`, `@min-[…]`).
 */
const InternDashBoard = () => {
  useDocumentTitle("Intern Dashboard");
  const navigate = useNavigate();
  const logoutMutation = useLogoutMutation();

  const handleLogout = async () => {
    // Prevent duplicate submissions while the request is in flight.
    if (logoutMutation.isPending) return;

    try {
      await logoutMutation.mutateAsync();
    } catch {
      // Local session + query cache are already cleared in `onSettled`, so a
      // failed network call still ends in a clean logged-out state.
    }

    navigate("/auth/login", { replace: true });
  };

  const handleViewProfile = () => {
    navigate("/profile");
  };

  return (
    <main className="@container flex min-h-screen flex-col bg-[#F8F9FB] pb-8 pl-10 pr-[34px] pt-8 font-inter">
      <header className="flex flex-wrap items-start justify-between gap-x-6 gap-y-4">
        <Salutation name={INTERN_NAME} />
        <TopBar
          options={INTERNSHIP_OPTIONS}
          userInitials="IN"
          status="Active"
          onViewProfile={handleViewProfile}
          onLogout={handleLogout}
        />
      </header>

      <div className="mt-7 grid flex-1 grid-cols-1 gap-11 @min-[1200px]:grid-cols-[minmax(0,798px)_minmax(0,1fr)]">
        <div className="flex min-w-0 flex-col gap-[51px]">
          <OverviewStats stats={OVERVIEW_STATS} />
          <TasksSection tasks={TASKS} />
        </div>
        <ChatsPanel chats={CHATS} />
      </div>
    </main>
  );
};

export default InternDashBoard;
