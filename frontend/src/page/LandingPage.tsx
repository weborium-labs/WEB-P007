import {
    useEffect,
    useRef,
    useState,
    type FormEvent,
    type KeyboardEvent as ReactKeyboardEvent,
    type ReactNode,
} from "react";
import { useNavigate } from "react-router-dom";
import Button from "../component/Button";
import { useDocumentTitle } from "../hooks/useDocumentTitle";

/* ==========================================================================
   IMS by Weborium Labs: product landing page (WEB-P007)

   Design tokens are read from the existing Signup, Login and Button code:
   - Dark brand panel  #020407          - Page surface   #F7F8FA
   - Primary blue      #2862F4 (hover #1F55DC, active #194BCB)
   - Ink               #141B2A          - Body text      #536078 / #647087
   - Placeholder       #98A2B3          - Borders        #E8EBF0 / #EEF0F3
   - Fill              #F1F3F6          - Success #2EAD79, Warning #D99127,
                                          Danger #D94A4A / #C33F45

   Environment variables (all optional):
   - VITE_SITE_URL                       canonical origin, e.g. https://ims.weborium.com
   - VITE_GOOGLE_SITE_VERIFICATION       token from Google Search Console
   - VITE_WAITLIST_ENDPOINT              POST endpoint that receives { email, role }
   - VITE_CONTACT_EMAIL                  fallback mailbox shown on form errors
   ========================================================================== */

const EASE = "ease-[cubic-bezier(0.22,1,0.36,1)]";

const GRADIENT_SIGNUP = "https://i.ibb.co/6cmHPkyt/register-gradient.jpg";
const GRADIENT_LOGIN = "https://i.ibb.co/KzGxT2Pj/login-gradient.jpg";

/* Named text styles from the visual system, written once and reused. */
const T = {
    heading1: "text-4xl font-semibold tracking-[-0.035em] text-balance sm:text-5xl lg:text-6xl",
    heading2: "text-3xl font-semibold tracking-[-0.03em] text-balance sm:text-4xl lg:text-5xl",
    heading3: "text-2xl font-semibold tracking-[-0.025em] text-balance sm:text-3xl lg:text-4xl",
    heading5: "text-2xl font-semibold tracking-[-0.02em] text-balance",
    heading6: "text-xl font-semibold tracking-[-0.02em] text-balance",
    title2: "text-lg font-medium tracking-[-0.01em]",
    title3: "text-base font-medium",
    title4: "text-sm font-medium",
    body3: "text-base font-normal text-pretty",
    body6: "text-sm font-normal text-pretty",
    caption3: "text-xs font-semibold",
    caption4: "text-xs font-medium",
    caption5: "text-xs font-normal",
    mono: "font-mono text-xs font-medium tracking-[0.02em]",
} as const;

const cn = (...parts: Array<string | false | null | undefined>) =>
    parts.filter(Boolean).join(" ");

/* ==========================================================================
   Content
   ========================================================================== */

const SITE_NAME = "IMS by Weborium Labs";
const SEO_TITLE = "IMS by Weborium Labs | Internship management software";
const SEO_DESCRIPTION =
    "IMS is the internship management system from Weborium Labs. Run batches, teams, document checks, tasks, attendance, leave, scores and tickets in one place. Launching soon.";

const NAV_LINKS = [
    { id: "features", label: "Features" },
    { id: "roles", label: "Roles" },
    { id: "how-it-works", label: "How it works" },
    { id: "security", label: "Security" },
    { id: "faq", label: "FAQ" },
] as const;

type IconName =
    | "arrow" | "check" | "plus" | "user" | "users" | "shield" | "file" | "calendar"
    | "chat" | "tasks" | "clock" | "chart" | "ticket" | "score" | "layers" | "lock"
    | "mail" | "close" | "chevron" | "pulse";

const ICON_PATHS: Record<IconName, string> = {
    arrow: "M17 17V7H7M17 7L7 17",
    check: "M5 12.5l4.5 4.5L19 7.5",
    plus: "M12 5v14M5 12h14",
    user: "M12 12a4 4 0 100-8 4 4 0 000 8zM4 20c0-3.3 3.6-6 8-6s8 2.7 8 6",
    users: "M9 11a3.5 3.5 0 100-7 3.5 3.5 0 000 7zM2.5 19.5c0-3 2.9-5 6.5-5s6.5 2 6.5 5M16 4.4a3.5 3.5 0 010 6.7M18 14.8c2 .6 3.5 2 3.5 4.2",
    shield: "M12 3l7 3v5c0 4.5-3 8.2-7 10-4-1.8-7-5.5-7-10V6l7-3zM9 12l2.2 2.2L15.5 10",
    file: "M7 3h7l5 5v13H7zM14 3v5h5M10 13h6M10 17h6",
    calendar: "M5 5h14v15H5zM5 10h14M9 3v4M15 3v4",
    chat: "M4 5h16v11H9l-5 4z",
    tasks: "M9 6h11M9 12h11M9 18h11M4 6l1 1 2-2M4 12l1 1 2-2M4 18l1 1 2-2",
    clock: "M12 21a9 9 0 100-18 9 9 0 000 18zM12 7v5l3 2",
    chart: "M4 20V11M10 20V4M16 20v-6M3 20h18",
    ticket: "M3 9V6h18v3a3 3 0 000 6v3H3v-3a3 3 0 000-6zM14 6v12",
    score: "M12 3l2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1L3.2 9.5l6.1-.9z",
    layers: "M12 3l9 5-9 5-9-5 9-5zM3 13l9 5 9-5",
    lock: "M6 11h12v9H6zM8 11V8a4 4 0 118 0v3",
    mail: "M3 6h18v12H3zM3 7l9 6 9-6",
    close: "M6 6l12 12M18 6L6 18",
    chevron: "M6 9l6 6 6-6",
    pulse: "M3 12h4l2-6 4 12 2-6h6",
};

type Feature = { code: string; icon: IconName; title: string; body: string };

const FEATURES: Feature[] = [
    {
        code: "AUTH",
        icon: "lock",
        title: "Sign in your way",
        body: "Username and password or Google, with expiring sessions, password reset through verified email and a dashboard for each role.",
    },
    {
        code: "REG",
        icon: "user",
        title: "Registration in minutes",
        body: "Interns register once and pick a batch. Any number of batches can run together, so June and April cohorts never collide.",
    },
    {
        code: "DOC",
        icon: "file",
        title: "Document checks with a paper trail",
        body: "HR reviews Aadhaar, PAN and marksheets, approves or rejects with a reason, and every decision records who acted and when.",
    },
    {
        code: "BAT",
        icon: "layers",
        title: "Batches with clear owners",
        body: "Create a batch with start and end dates. Each one has an HR owner, and only Admin can archive it.",
    },
    {
        code: "TEAM",
        icon: "users",
        title: "Teams led by group managers",
        body: "Split a batch into teams. Every team has one group manager, and every intern sits in one team inside their own batch.",
    },
    {
        code: "CHAT",
        icon: "chat",
        title: "Batch and team chat",
        body: "Live channels for the whole batch and for each team, with paginated history. One to one chat is left out by design.",
    },
    {
        code: "TASK",
        icon: "tasks",
        title: "Tasks that show their status",
        body: "Assign work to a team or a single intern. Status moves from pending to todo to done, and overdue work stands out.",
    },
    {
        code: "ATT",
        icon: "calendar",
        title: "Attendance and leave, connected",
        body: "One record per intern per day. Approved leave updates attendance automatically, and overlapping requests are blocked.",
    },
    {
        code: "SCORE",
        icon: "score",
        title: "Scores everyone can trust",
        body: "HR records scores, interns see their own, group managers see their team, and every change keeps its old and new value.",
    },
    {
        code: "TKT",
        icon: "ticket",
        title: "Tickets with an outcome",
        body: "Raise an issue with attachments, follow it from scrutiny to resolved or rejected, and get told when the status changes.",
    },
    {
        code: "ACT",
        icon: "pulse",
        title: "Activity monitoring on autopilot",
        body: "An hourly job tracks logins, flags quiet interns and deactivates stale accounts, with every state change logged.",
    },
    {
        code: "ANA",
        icon: "chart",
        title: "Analytics by batch and by team",
        body: "Activity, attendance, leave, tasks and scores in one view, filterable by date and built for CSV and PDF export.",
    },
];

type RoleKey = "Intern" | "GPM" | "HR" | "Admin";

const ROLES: Record<RoleKey, { tagline: string; scope: string; can: string[] }> = {
    Intern: {
        tagline: "Know what to do today and where you stand.",
        scope: "Own records, own team, own batch",
        can: [
            "Register, choose a batch and upload Aadhaar, PAN and marksheets",
            "Log in from the batch start date onward",
            "Chat in the batch channel and the team channel",
            "Update the status of your own tasks",
            "Apply for or cancel leave while it is in scrutiny",
            "See your own score, attendance and personal summary",
            "Raise a ticket and follow its outcome",
        ],
    },
    GPM: {
        tagline: "Lead your team without chasing spreadsheets.",
        scope: "Team level access",
        can: [
            "Create tasks for the team or for one intern",
            "Mark daily attendance for the team",
            "Approve or reject team leave requests",
            "View team scores in read only mode",
            "Open group wise analytics for your team",
            "Moderate messages inside the team channel",
            "Raise tickets to HR",
        ],
    },
    HR: {
        tagline: "Own the batch from first document to last score.",
        scope: "Batch level access",
        can: [
            "Create batches and teams with no limit",
            "Create group manager accounts and assign them to teams",
            "Verify or reject documents with a reason",
            "Approve leave and correct past attendance",
            "Assign and update intern scores",
            "Resolve or reject tickets from your batches",
            "Reactivate deactivated accounts and read batch analytics",
        ],
    },
    Admin: {
        tagline: "Full control, with an audit log behind it.",
        scope: "Whole system access",
        can: [
            "Create HR accounts and assign HR owners to batches",
            "Do everything HR can do across every batch",
            "Archive batches while keeping their history",
            "Configure activity thresholds and system settings",
            "Handle every ticket in the system",
            "Join any conversation",
            "View audit logs for privileged actions",
        ],
    },
};

const STEPS = [
    {
        n: "01",
        title: "Register and pick a batch",
        body: "Interns sign up with a Google account, choose one open batch and upload their documents. HR reviews them and approves or rejects with a reason.",
    },
    {
        n: "02",
        title: "Start when the batch starts",
        body: "Login opens on the batch start date. Interns land in a team, meet their group manager and see tasks, chat and attendance in one workspace.",
    },
    {
        n: "03",
        title: "Track the batch to the end",
        body: "Group managers mark attendance and assign work, HR approves leave and scores, and analytics show how every team is doing.",
    },
] as const;

const ACTIVITY_STAGES = [
    {
        hours: "Under 48 hours",
        state: "Active",
        body: "At least one login in the last 48 hours. No action needed.",
        tone: "#2EAD79",
    },
    {
        hours: "48 to 72 hours",
        state: "Idle",
        body: "The state is logged. The intern keeps full access.",
        tone: "#D99127",
    },
    {
        hours: "72 hours or more",
        state: "Inactive",
        body: "HR sees the intern flagged as inactive, with the change logged.",
        tone: "#D94A4A",
    },
    {
        hours: "96 hours or more",
        state: "Deactivated",
        body: "The account is disabled and login is blocked until HR or Admin reactivates it.",
        tone: "#98A2B3",
    },
] as const;

const SECURITY_ITEMS: Array<{ icon: IconName; title: string; body: string }> = [
    {
        icon: "shield",
        title: "Access enforced on the server",
        body: "Every request is checked against the role and scope rules. Hiding a button is never the only guard.",
    },
    {
        icon: "file",
        title: "Private document storage",
        body: "Identity and education documents are never public. They open through expiring signed links for the owner, the batch HR and Admin only.",
    },
    {
        icon: "lock",
        title: "Hashed passwords",
        body: "Passwords are stored as salted hashes and are never written to logs. Repeated failed logins trigger rate limits.",
    },
    {
        icon: "mail",
        title: "Verified Google emails",
        body: "Every account email is a Google account and is verified before the first login.",
    },
    {
        icon: "clock",
        title: "Audit trail",
        body: "Document verification, score changes, deactivation, reactivation and threshold changes are all recorded.",
    },
    {
        icon: "calendar",
        title: "Built for India",
        body: "Times are stored in UTC and shown in IST, and attendance days follow IST. Data handling is designed around Indian data protection law.",
    },
];

const ROADMAP_NOW = [
    "Accounts, Google verification and role dashboards",
    "Intern registration, batch selection and document verification",
    "Batches, teams and group managers",
    "Batch and team chat",
    "Tasks, attendance, leave, scores and tickets",
    "Activity monitoring with automatic deactivation",
    "Batch level and team level analytics",
] as const;

const ROADMAP_LATER = [
    "Automated name and email validation for documents",
    "Direct messages are not planned. Chat stays in batch and team channels",
    "Payroll, stipends, certificates and offer letters are outside release 1.0",
    "Native mobile apps are outside release 1.0. The web app is responsive",
] as const;

const FAQS: Array<{ q: string; a: string }> = [
    {
        q: "What is IMS?",
        a: "IMS is an internship management system from Weborium Labs. HR teams create batches and teams, verify intern documents, and then run the programme with chat, tasks, attendance, leave, scores, tickets and analytics in one web app.",
    },
    {
        q: "When does IMS launch?",
        a: "IMS is in active development and launching soon. Join the early access list and we will email you when release 1.0 opens.",
    },
    {
        q: "Who can use IMS?",
        a: "IMS has four roles: Intern, group manager (GPM), HR and Admin. Each role gets its own dashboard and sees only the data its scope allows.",
    },
    {
        q: "Can we run several batches at the same time?",
        a: "Yes. HR and Admin can create any number of batches and teams, and batches such as B1 in June, B2 in June and B3 in April can run together.",
    },
    {
        q: "Can interns log in before their batch starts?",
        a: "No. An intern can log in only on or after the start date of the batch they selected. Earlier attempts show the start date instead.",
    },
    {
        q: "What happens when an intern stops logging in?",
        a: "By default, an intern with no login for 72 hours is marked inactive, and after 96 hours the account is deactivated automatically. Admin can change these thresholds, and HR or Admin can reactivate an account.",
    },
    {
        q: "How are Aadhaar, PAN and marksheets protected?",
        a: "Documents sit in private storage and open only through expiring signed links. Only the owning intern, the HR of that batch and Admin can view them, and every verification decision is recorded.",
    },
    {
        q: "Do I need a Google account?",
        a: "Yes. Every IMS account email must be a Google account, and it is verified before the first login.",
    },
    {
        q: "Does IMS include direct messages?",
        a: "No. Chat is limited to batch channels and team channels by design, so conversations stay visible to the people running the programme.",
    },
    {
        q: "How much will IMS cost?",
        a: "Pricing has not been announced yet. People on the early access list will hear first.",
    },
];

/* ==========================================================================
   Hooks and helpers
   ========================================================================== */

function useReducedMotion(): boolean {
    const [reduced, setReduced] = useState<boolean>(() =>
        typeof window !== "undefined" && typeof window.matchMedia === "function"
            ? window.matchMedia("(prefers-reduced-motion: reduce)").matches
            : false,
    );
    useEffect(() => {
        if (typeof window.matchMedia !== "function") return;
        const query = window.matchMedia("(prefers-reduced-motion: reduce)");
        const handle = () => setReduced(query.matches);
        query.addEventListener("change", handle);
        return () => query.removeEventListener("change", handle);
    }, []);
    return reduced;
}

function scrollToId(id: string) {
    const el = document.getElementById(id);
    if (!el) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    el.scrollIntoView({ behavior: reduce ? "auto" : "smooth", block: "start" });
    window.history.replaceState(null, "", `#${id}`);
}

function useActiveSection(ids: readonly string[]): string {
    const [active, setActive] = useState<string>("");
    useEffect(() => {
        if (typeof IntersectionObserver === "undefined") return;
        const observer = new IntersectionObserver(
            (entries) => {
                entries.forEach((entry) => {
                    if (entry.isIntersecting) setActive(entry.target.id);
                });
            },
            { rootMargin: "-40% 0px -55% 0px", threshold: 0 },
        );
        ids.forEach((id) => {
            const el = document.getElementById(id);
            if (el) observer.observe(el);
        });
        return () => observer.disconnect();
    }, [ids]);
    return active;
}

/**
 * Writes title, meta, Open Graph, canonical, Google Search Console
 * verification and JSON-LD at runtime. For the strongest Search Console
 * result, also copy the verification meta tag into index.html.
 */
function useSeo() {
    useEffect(() => {
        const created: Element[] = [];
        const origin =
            (import.meta.env.VITE_SITE_URL as string | undefined)?.replace(/\/+$/, "") ||
            window.location.origin;
        const url = `${origin}/`;

        const setMeta = (attr: "name" | "property", key: string, content: string) => {
            let el = document.head.querySelector<HTMLMetaElement>(`meta[${attr}="${key}"]`);
            if (!el) {
                el = document.createElement("meta");
                el.setAttribute(attr, key);
                document.head.appendChild(el);
                created.push(el);
            }
            el.setAttribute("content", content);
        };

        document.documentElement.lang = "en";
        setMeta("name", "description", SEO_DESCRIPTION);
        setMeta("name", "robots", "index, follow, max-image-preview:large");
        setMeta("name", "theme-color", "#020407");
        setMeta("name", "application-name", SITE_NAME);

        const verification = import.meta.env.VITE_GOOGLE_SITE_VERIFICATION as string | undefined;
        if (verification) setMeta("name", "google-site-verification", verification);

        setMeta("property", "og:type", "website");
        setMeta("property", "og:site_name", SITE_NAME);
        setMeta("property", "og:title", SEO_TITLE);
        setMeta("property", "og:description", SEO_DESCRIPTION);
        setMeta("property", "og:url", url);
        setMeta("property", "og:image", `${origin}/og-image.png`);
        setMeta("property", "og:image:alt", "IMS by Weborium Labs, internship management software");
        setMeta("name", "twitter:card", "summary_large_image");
        setMeta("name", "twitter:title", SEO_TITLE);
        setMeta("name", "twitter:description", SEO_DESCRIPTION);
        setMeta("name", "twitter:image", `${origin}/og-image.png`);

        let canonical = document.head.querySelector<HTMLLinkElement>('link[rel="canonical"]');
        if (!canonical) {
            canonical = document.createElement("link");
            canonical.rel = "canonical";
            document.head.appendChild(canonical);
            created.push(canonical);
        }
        canonical.href = url;

        if (!document.head.querySelector('link[data-ims-font="geist"]')) {
            const font = document.createElement("link");
            font.rel = "stylesheet";
            font.href =
                "https://fonts.googleapis.com/css2?family=Geist:wght@400;500;600&family=Geist+Mono:wght@400;500&display=swap";
            font.setAttribute("data-ims-font", "geist");
            document.head.appendChild(font);
            created.push(font);
        }

        const graph = {
            "@context": "https://schema.org",
            "@graph": [
                {
                    "@type": "Organization",
                    "@id": `${origin}/#organization`,
                    name: "Weborium Labs",
                    url: origin,
                },
                {
                    "@type": "WebSite",
                    "@id": `${origin}/#website`,
                    url,
                    name: SITE_NAME,
                    publisher: { "@id": `${origin}/#organization` },
                },
                {
                    "@type": "SoftwareApplication",
                    name: "IMS",
                    alternateName: SITE_NAME,
                    applicationCategory: "BusinessApplication",
                    operatingSystem: "Web",
                    description: SEO_DESCRIPTION,
                    publisher: { "@id": `${origin}/#organization` },
                },
                {
                    "@type": "FAQPage",
                    mainEntity: FAQS.map((item) => ({
                        "@type": "Question",
                        name: item.q,
                        acceptedAnswer: { "@type": "Answer", text: item.a },
                    })),
                },
            ],
        };
        const script = document.createElement("script");
        script.type = "application/ld+json";
        script.text = JSON.stringify(graph);
        document.head.appendChild(script);
        created.push(script);

        return () => created.forEach((el) => el.remove());
    }, []);
}

/* ==========================================================================
   Primitives
   ========================================================================== */

function Icon({ name, className = "h-5 w-5" }: { name: IconName; className?: string }) {
    return (
        <svg
            aria-hidden="true"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={1.75}
            strokeLinecap="round"
            strokeLinejoin="round"
            className={cn("shrink-0", className)}
        >
            <path d={ICON_PATHS[name]} />
        </svg>
    );
}

function Reveal({
    children,
    delay = 0,
    className = "",
}: {
    children: ReactNode;
    delay?: number;
    className?: string;
}) {
    const ref = useRef<HTMLDivElement>(null);
    const [shown, setShown] = useState(false);

    useEffect(() => {
        const el = ref.current;
        if (!el) return;
        if (typeof IntersectionObserver === "undefined") {
            setShown(true);
            return;
        }
        const observer = new IntersectionObserver(
            ([entry]) => {
                if (entry.isIntersecting) {
                    setShown(true);
                    observer.disconnect();
                }
            },
            { threshold: 0.12, rootMargin: "0px 0px -8% 0px" },
        );
        observer.observe(el);
        return () => observer.disconnect();
    }, []);

    return (
        <div
            ref={ref}
            style={{ transitionDelay: shown ? `${delay}ms` : "0ms" }}
            className={cn(
                "transition-[opacity,transform] duration-700",
                EASE,
                "motion-reduce:translate-y-0 motion-reduce:transition-opacity",
                shown ? "translate-y-0 opacity-100" : "translate-y-8 opacity-0",
                className,
            )}
        >
            {children}
        </div>
    );
}

function SectionHeading({
    id,
    eyebrow,
    title,
    body,
    tone = "light",
    align = "center",
}: {
    id?: string;
    eyebrow: string;
    title: string;
    body?: string;
    tone?: "light" | "dark";
    align?: "center" | "left";
}) {
    const dark = tone === "dark";
    return (
        <div className={cn("max-w-[680px]", align === "center" ? "mx-auto text-center" : "text-left")}>
            <p className={cn(T.mono, "uppercase", dark ? "text-[#98A2B3]" : "text-[#2862F4]")}>
                {eyebrow}
            </p>
            <h2 id={id} className={cn(T.heading2, "mt-3", dark ? "text-white" : "text-[#141B2A]")}>{title}</h2>
            {body ? (
                <p className={cn(T.body3, "mt-4", dark ? "text-[#98A2B3]" : "text-[#536078]")}>{body}</p>
            ) : null}
        </div>
    );
}

function Section({
    id,
    children,
    className = "",
    labelledBy,
}: {
    id: string;
    children: ReactNode;
    className?: string;
    labelledBy?: string;
}) {
    return (
        <section
            id={id}
            aria-labelledby={labelledBy}
            className={cn("scroll-mt-24 px-4 py-20 sm:px-6 sm:py-24 lg:px-8", className)}
        >
            <div className="mx-auto w-full max-w-[1200px]">{children}</div>
        </section>
    );
}

function WeboriumMark() {
    return (
        <span className="flex h-[31px] w-16 flex-col items-center justify-start">
            <svg
                aria-hidden="true"
                width="64"
                height="22"
                viewBox="0 0 64 22"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
                className="block h-[22px] w-16 shrink-0"
            >
                <path
                    d="M0.402758 0.0311155C2.32776 -0.0185223 4.75919 0.122124 6.60123 0.0230223C10.7039 -0.197673 10.9035 1.16443 12.6446 4.27796L16.0409 10.3875C15.5636 11.2797 14.993 12.1706 14.5112 13.0611C13.8342 14.3125 13.1759 15.5829 12.5157 16.8437L10.8098 20.1226C8.39245 15.5512 5.93797 10.9996 3.44663 6.46798C2.28386 4.33199 1.19562 2.21496 0 0.0848846C0.111457 0.0196723 0.26111 0.0354655 0.402758 0.0311155Z"
                    transform="translate(9 0)"
                    fill="white"
                />
                <path
                    d="M12.039 0.00109893C12.9474 -0.031964 13.3963 0.68672 13.7931 1.389C15.0156 3.55506 16.4151 5.79429 17.5183 8.0182C16.5963 9.7621 15.5929 11.493 14.6614 13.2363L12.6459 17.0002C12.324 17.6075 11.8946 18.3684 11.6096 18.9748C10.607 21.1095 9.82286 21.1383 7.64084 21.1348L5.55 21.1322L0 21.1335C0.674266 19.9258 1.35401 18.5554 2.00531 17.3212L7.42175 6.99447L9.19305 3.6562C9.6876 2.73353 10.1454 1.83217 10.7662 0.986504C11.1607 0.449188 11.3425 0.146402 12.039 0.00109893Z"
                    transform="translate(20 0)"
                    fill="white"
                />
                <path
                    d="M12.8571 0.0157408C13.2108 0.00173259 13.6006 0.00677846 13.9569 0.0113464C16.3279 0.041886 18.7232 -0.0391612 21.0915 0.026399C20.502 1.16694 19.8164 2.36081 19.2017 3.49887L14.9679 11.3689L12.3142 16.3368C11.8383 17.2382 10.631 19.7954 10.0102 20.4153C9.03792 21.3859 7.52007 21.1453 6.26281 21.1401C3.037 21.1614 3.05963 21.0422 1.55396 18.2515L0 15.3745C0.393274 14.5745 0.985797 13.5735 1.4204 12.7738C2.09906 11.5235 2.7986 10.1933 3.5138 8.96904C3.87097 9.51697 4.38214 10.5215 4.72103 11.1327C5.91652 8.90796 7.12549 6.6904 8.34795 4.48023C8.76819 3.71726 9.21759 2.93023 9.62696 2.16413C10.3717 0.769965 11.2549 0.109666 12.8571 0.0157408Z"
                    transform="translate(35 0)"
                    fill="white"
                />
            </svg>
            <span className="-mt-px whitespace-nowrap text-[7px] font-semibold leading-[8px] tracking-[-0.03em] text-white">
                Weborium Labs
            </span>
        </span>
    );
}

function LaunchBadge({ dark = true }: { dark?: boolean }) {
    return (
        <span
            className={cn(
                "inline-flex items-center gap-2 rounded-full border px-3 py-1",
                T.caption3,
                dark
                    ? "border-white/20 bg-white/10 text-white"
                    : "border-[#E8EBF0] bg-white text-[#141B2A]",
            )}
        >
            <span aria-hidden="true" className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#2EAD79] opacity-60 motion-reduce:hidden" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-[#2EAD79]" />
            </span>
            Launching soon · Release 1.0 in development
        </span>
    );
}

/* ==========================================================================
   Navigation
   ========================================================================== */

function Nav({ active }: { active: string }) {
    const navigate = useNavigate();
    const [open, setOpen] = useState(false);

    useEffect(() => {
        document.body.style.overflow = open ? "hidden" : "";
        return () => {
            document.body.style.overflow = "";
        };
    }, [open]);

    useEffect(() => {
        if (!open) return;
        const onKey = (event: KeyboardEvent) => {
            if (event.key === "Escape") setOpen(false);
        };
        document.addEventListener("keydown", onKey);
        return () => document.removeEventListener("keydown", onKey);
    }, [open]);

    const go = (id: string) => {
        setOpen(false);
        window.setTimeout(() => scrollToId(id), open ? 250 : 0);
    };

    return (
        <>
            <header className="fixed inset-x-0 top-4 z-50 flex justify-center px-4">
                <nav
                    aria-label="Primary"
                    className="flex w-full max-w-[960px] items-center justify-between gap-4 rounded-2xl border border-[#E8EBF0] bg-white/80 py-2 pl-3 pr-2 backdrop-blur-xl"
                >
                    <a
                        href="#top"
                        onClick={(event) => {
                            event.preventDefault();
                            window.scrollTo({ top: 0, behavior: "smooth" });
                        }}
                        className="flex items-center gap-2 rounded-lg focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#2862F4]/35"
                        aria-label="IMS by Weborium Labs, back to top"
                    >
                        <span className="grid h-8 w-8 place-items-center rounded-lg bg-[#ffffff] text-white">
                            <img src="https://i.ibb.co/S73b3Rzt/weborium-logo-8k-transparent.png" alt="weborium_labs_logo" />
                        </span>
                        <span className={cn(T.title3, "hidden text-[#141B2A] sm:inline")}>
                            Weborium Labs
                        </span>
                    </a>

                    <ul className="hidden items-center gap-1 lg:flex">
                        {NAV_LINKS.map((link) => (
                            <li key={link.id}>
                                <a
                                    href={`#${link.id}`}
                                    aria-current={active === link.id ? "true" : undefined}
                                    onClick={(event) => {
                                        event.preventDefault();
                                        go(link.id);
                                    }}
                                    className={cn(
                                        "block rounded-lg px-3 py-2 transition-colors duration-300",
                                        T.title4,
                                        active === link.id
                                            ? "bg-[#F1F3F6] text-[#141B2A]"
                                            : "text-[#536078] hover:bg-[#F7F8FA] hover:text-[#141B2A]",
                                        "focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#2862F4]/25",
                                    )}
                                >
                                    {link.label}
                                </a>
                            </li>
                        ))}
                    </ul>

                    <div className="flex items-center gap-2">
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => navigate("/auth/login")}
                            className="hidden sm:inline-flex"
                        >
                            Log in
                        </Button>
                        <Button size="sm" onClick={() => go("early-access")} className="hidden sm:inline-flex">
                            Join early access
                        </Button>
                        <button
                            type="button"
                            aria-label={open ? "Close menu" : "Open menu"}
                            aria-expanded={open}
                            aria-controls="mobile-menu"
                            onClick={() => setOpen((value) => !value)}
                            className="relative grid h-10 w-10 place-items-center rounded-lg text-[#141B2A] transition-colors duration-300 hover:bg-[#F1F3F6] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#2862F4]/25 active:scale-[0.98] lg:hidden"
                        >
                            <span
                                aria-hidden="true"
                                className={cn(
                                    "absolute h-0.5 w-5 rounded-full bg-current transition-transform duration-500",
                                    EASE,
                                    open ? "rotate-45" : "-translate-y-1.5",
                                )}
                            />
                            <span
                                aria-hidden="true"
                                className={cn(
                                    "absolute h-0.5 w-5 rounded-full bg-current transition-transform duration-500",
                                    EASE,
                                    open ? "-rotate-45" : "translate-y-1.5",
                                )}
                            />
                        </button>
                    </div>
                </nav>
            </header>

            <div
                id="mobile-menu"
                aria-hidden={!open}
                className={cn(
                    "fixed inset-0 z-40 flex flex-col bg-[#F7F8FA]/95 px-6 pb-10 pt-24 backdrop-blur-2xl transition-opacity duration-500 lg:hidden",
                    EASE,
                    open ? "opacity-100" : "pointer-events-none opacity-0",
                )}
            >
                <ul className="flex flex-col gap-2">
                    {NAV_LINKS.map((link, index) => (
                        <li
                            key={link.id}
                            style={{ transitionDelay: open ? `${Math.min(index * 60, 400)}ms` : "0ms" }}
                            className={cn(
                                "transition-[opacity,transform] duration-500",
                                EASE,
                                "motion-reduce:translate-y-0",
                                open ? "translate-y-0 opacity-100" : "translate-y-6 opacity-0",
                            )}
                        >
                            <a
                                href={`#${link.id}`}
                                tabIndex={open ? 0 : -1}
                                aria-current={active === link.id ? "true" : undefined}
                                onClick={(event) => {
                                    event.preventDefault();
                                    go(link.id);
                                }}
                                className={cn(
                                    "block rounded-xl px-4 py-3",
                                    T.heading5,
                                    active === link.id ? "bg-white text-[#2862F4]" : "text-[#141B2A]",
                                    "focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#2862F4]/25",
                                )}
                            >
                                {link.label}
                            </a>
                        </li>
                    ))}
                </ul>
                <div className="mt-auto flex flex-col gap-3">
                    <Button fullWidth onClick={() => go("early-access")} tabIndex={open ? 0 : -1}>
                        Join early access
                    </Button>
                    <Button
                        fullWidth
                        variant="secondary"
                        onClick={() => navigate("/login")}
                        tabIndex={open ? 0 : -1}
                    >
                        Log in
                    </Button>
                </div>
            </div>
        </>
    );
}

/* ==========================================================================
   Hero
   ========================================================================== */

const STATE_STYLES = {
    Active: { color: "#2EAD79", label: "Active" },
    Idle: { color: "#D99127", label: "Idle" },
    Inactive: { color: "#D94A4A", label: "Inactive" },
    Deactivated: { color: "#647087", label: "Deactivated" },
} as const;

type InternState = keyof typeof STATE_STYLES;

const PREVIEW_ROWS: Array<{ name: string; team: string; state: InternState; login: string }> = [
    { name: "Aarav Mehta", team: "Team Orion", state: "Active", login: "6 hours ago" },
    { name: "Diya Patel", team: "Team Orion", state: "Active", login: "19 hours ago" },
    { name: "Kabir Shah", team: "Team Vega", state: "Idle", login: "53 hours ago" },
    { name: "Riya Joshi", team: "Team Vega", state: "Inactive", login: "78 hours ago" },
    { name: "Neel Desai", team: "Team Orion", state: "Deactivated", login: "101 hours ago" },
];

function StatePill({ state }: { state: InternState }) {
    const { color, label } = STATE_STYLES[state];
    return (
        <span
            className={cn("inline-flex items-center gap-1.5 rounded-full px-2 py-1", T.caption4)}
            style={{ backgroundColor: `${color}1A`, color }}
        >
            <span aria-hidden="true" className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: color }} />
            {label}
        </span>
    );
}

function HeroPreview() {
    return (
        <div
            role="img"
            aria-label="Concept preview of the IMS batch overview showing interns with their activity status"
            className="mx-auto w-full max-w-[880px] rounded-3xl border border-white/15 bg-white/10 p-2 backdrop-blur-sm"
        >
            <div className="overflow-hidden rounded-2xl bg-white text-left">
                <div className="flex flex-wrap items-center justify-between gap-3 border border-transparent px-4 py-3 sm:px-6">
                    <div>
                        <p className={cn(T.title3, "text-[#141B2A]")}>Batch B1 overview</p>
                        <p className={cn(T.caption4, "text-[#647087]")}>Teams, group managers and interns</p>
                    </div>
                    <span className={cn(T.caption3, "rounded-full bg-[#F1F3F6] px-3 py-1 text-[#536078]")}>
                        Concept preview · sample data
                    </span>
                </div>
                <div className="bg-[#F7F8FA] px-4 py-2 sm:px-6">
                    <div className={cn("hidden grid-cols-[1.4fr_1fr_1fr_1fr] gap-4 py-2 text-[#647087] md:grid", T.caption4)}>
                        <span>Intern</span>
                        <span>Team</span>
                        <span>Status</span>
                        <span>Last login</span>
                    </div>
                    <ul className="divide-y divide-[#E8EBF0]">
                        {PREVIEW_ROWS.map((row) => (
                            <li
                                key={row.name}
                                className="grid grid-cols-[1fr_auto] items-center gap-x-4 gap-y-1 py-3 md:grid-cols-[1.4fr_1fr_1fr_1fr]"
                            >
                                <span className="flex items-center gap-3">
                                    <span
                                        aria-hidden="true"
                                        className={cn("grid h-8 w-8 place-items-center rounded-full bg-[#2862F4]/10 text-[#2862F4]", T.caption3)}
                                    >
                                        {row.name
                                            .split(" ")
                                            .map((part) => part[0])
                                            .join("")}
                                    </span>
                                    <span className={cn(T.title4, "text-[#141B2A]")}>{row.name}</span>
                                </span>
                                <span className={cn(T.body6, "hidden text-[#536078] md:block")}>{row.team}</span>
                                <span className="justify-self-end md:justify-self-start">
                                    <StatePill state={row.state} />
                                </span>
                                <span className={cn(T.body6, "hidden text-[#536078] md:block")}>{row.login}</span>
                            </li>
                        ))}
                    </ul>
                </div>
                <div className="grid grid-cols-1 gap-2 px-4 py-4 sm:grid-cols-3 sm:px-6">
                    {[
                        { label: "Attendance", value: "Present · Absent · Leave" },
                        { label: "Tasks", value: "Pending · Todo · Done" },
                        { label: "Tickets", value: "Scrutiny · Resolved · Reject" },
                    ].map((item) => (
                        <div key={item.label} className="rounded-xl bg-[#F1F3F6] px-3 py-3">
                            <p className={cn(T.caption4, "text-[#647087]")}>{item.label}</p>
                            <p className={cn(T.title4, "mt-1 text-[#141B2A]")}>{item.value}</p>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}

function Hero() {
    return (
        <section id="top" aria-labelledby="hero-title" className="bg-[#F7F8FA] p-2">
            <div className="relative isolate overflow-hidden rounded-2xl bg-[#020407] px-4 pb-10 pt-24 text-white sm:pb-16 sm:px-6 lg:px-8">
                <img
                    src={GRADIENT_SIGNUP}
                    alt=""
                    aria-hidden="true"
                    className="pointer-events-none absolute inset-0 -z-10 h-full w-full object-cover object-center"
                />
                <div className="pointer-events-none absolute inset-0 -z-10 bg-black/25" />

                <div className="mx-auto flex max-w-[1200px] flex-col items-center pt-10 text-center sm:pt-16">
                    <LaunchBadge />
                    <h1
                        id="hero-title"
                        className={cn(T.heading1, "mt-6 max-w-[680px] bg-clip-text text-transparent")}
                        style={{
                            backgroundImage: "linear-gradient(90deg, #FFFFFF 0%, #9B9B9B 100%)",
                            WebkitBackgroundClip: "text",
                        }}
                    >
                        Run every internship batch from one calm workspace
                    </h1>
                    <p className={cn(T.body3, "mt-6 max-w-[680px] text-[#D0D5DD] sm:text-lg")}>
                        IMS by Weborium Labs brings registration, document checks, teams, tasks, attendance, scores
                        and tickets together for HR, group managers and interns.
                    </p>

                    <div className="mt-10 flex w-full max-w-[440px] flex-col items-stretch gap-3 sm:w-auto sm:max-w-none sm:flex-row sm:items-center">
                        <Button
                            size="lg"
                            onClick={() => scrollToId("early-access")}
                            endIcon={<Icon name="arrow" className="h-6 w-6" />}
                            className="sm:min-w-[240px]"
                        >
                            Join the early access list
                        </Button>
                        <a
                            href="#how-it-works"
                            onClick={(event) => {
                                event.preventDefault();
                                scrollToId("how-it-works");
                            }}
                            className={cn(
                                "inline-flex min-h-[52px] items-center justify-center rounded-xl px-6 text-white/80 transition-colors duration-300 hover:text-white",
                                T.title3,
                                "focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-white/30",
                            )}
                        >
                            See how it works
                        </a>
                    </div>

                    <ul
                        aria-label="Roles supported by IMS"
                        className="mt-8 flex flex-wrap items-center justify-center gap-2"
                    >
                        {["Intern", "Group manager", "HR", "Admin"].map((role) => (
                            <li
                                key={role}
                                className={cn("rounded-full border border-white/15 bg-white/5 px-3 py-1 text-white/80", T.caption4)}
                            >
                                {role}
                            </li>
                        ))}
                    </ul>
                </div>

                <div className="relative mx-auto mt-12 max-w-[1200px] sm:mt-16">
                    <HeroPreview />
                </div>
            </div>
        </section>
    );
}

/* ==========================================================================
   Trust strip, problem and solution
   ========================================================================== */

function TrustStrip() {
    const items: Array<{ icon: IconName; label: string }> = [
        { icon: "mail", label: "Verified Google emails" },
        { icon: "shield", label: "Role based access on the server" },
        { icon: "file", label: "Private signed document links" },
        { icon: "clock", label: "IST times and attendance days" },
        { icon: "chart", label: "Audit log for privileged actions" },
    ];
    return (
        <section aria-label="Built on" className="px-4 py-12 sm:px-6 lg:px-8">
            <div className="mx-auto max-w-[1200px]">
                <p className={cn(T.mono, "text-center uppercase text-[#647087]")}>Designed around</p>
                <ul className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-5">
                    {items.map((item, index) => (
                        <li key={item.label}>
                            <Reveal delay={index * 60}>
                                <div className="flex items-center gap-3 rounded-xl border border-[#E8EBF0] bg-white px-4 py-3">
                                    <span className="grid h-8 w-8 place-items-center rounded-lg bg-[#2862F4]/10 text-[#2862F4]">
                                        <Icon name={item.icon} className="h-4 w-4" />
                                    </span>
                                    <span className={cn(T.title4, "text-[#141B2A]")}>{item.label}</span>
                                </div>
                            </Reveal>
                        </li>
                    ))}
                </ul>
            </div>
        </section>
    );
}

function ProblemSolution() {
    const before = [
        "Documents scattered across email threads and chat attachments",
        "Attendance kept in spreadsheets that nobody trusts by Friday",
        "Tasks buried inside group messages",
        "No signal when an intern quietly stops showing up",
        "Leave requests approved in a hallway and recorded nowhere",
    ];
    const after = [
        "One verified record for every document, with who approved it and when",
        "One attendance row per intern per day, updated by approved leave",
        "Tasks with owners, dates and a clear status",
        "Automatic flags at 72 hours and deactivation at 96 hours by default",
        "Every leave decision recorded with the approver",
    ];
    return (
        <Section id="why" labelledBy="why-title">
            <Reveal>
                <div className="max-w-[680px] mx-auto text-center">
                    <p className={cn(T.mono, "uppercase text-[#2862F4]")}>Why IMS</p>
                    <h2 id="why-title" className={cn(T.heading2, "mt-3 text-[#141B2A]")}>
                        Internship programmes deserve better than a shared drive
                    </h2>
                    <p className={cn(T.body3, "mt-4 text-[#536078]")}>
                        Running a cohort means documents, people, deadlines and decisions all moving at once. IMS keeps
                        them in one system with clear owners.
                    </p>
                </div>
            </Reveal>
            <div className="mt-12 grid grid-cols-1 gap-4 lg:grid-cols-2">
                <Reveal>
                    <div className="h-full rounded-2xl border border-[#E8EBF0] bg-white p-6 sm:p-8">
                        <p className={cn(T.mono, "uppercase text-[#647087]")}>Without IMS</p>
                        <ul className="mt-6 space-y-4">
                            {before.map((item) => (
                                <li key={item} className="flex items-start gap-3">
                                    <span className="mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded-full bg-[#D94A4A]/10 text-[#D94A4A]">
                                        <Icon name="close" className="h-3.5 w-3.5" />
                                    </span>
                                    <span className={cn(T.body3, "text-[#536078]")}>{item}</span>
                                </li>
                            ))}
                        </ul>
                    </div>
                </Reveal>
                <Reveal delay={80}>
                    <div className="h-full rounded-2xl bg-[#020407] p-6 sm:p-8">
                        <p className={cn(T.mono, "uppercase text-[#98A2B3]")}>With IMS</p>
                        <ul className="mt-6 space-y-4">
                            {after.map((item) => (
                                <li key={item} className="flex items-start gap-3">
                                    <span className="mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded-full bg-[#2EAD79]/15 text-[#2EAD79]">
                                        <Icon name="check" className="h-3.5 w-3.5" />
                                    </span>
                                    <span className={cn(T.body3, "text-white")}>{item}</span>
                                </li>
                            ))}
                        </ul>
                    </div>
                </Reveal>
            </div>
        </Section>
    );
}

/* ==========================================================================
   Tagline reveal (word by word)
   ========================================================================== */

const TAGLINE = "Every intern accounted for. Every batch on track. Every decision on record.";

function TaglineReveal() {
    const reduced = useReducedMotion();
    const words = TAGLINE.split(" ");
    const refs = useRef<Array<HTMLSpanElement | null>>([]);
    const [active, setActive] = useState<Set<number>>(() => new Set());

    useEffect(() => {
        if (reduced || typeof IntersectionObserver === "undefined") return;
        const observer = new IntersectionObserver(
            (entries) => {
                setActive((previous) => {
                    const next = new Set(previous);
                    entries.forEach((entry) => {
                        if (entry.isIntersecting) {
                            next.add(Number((entry.target as HTMLElement).dataset.index));
                        }
                    });
                    return next;
                });
            },
            { rootMargin: "0px 0px -35% 0px", threshold: 0 },
        );
        refs.current.forEach((el) => {
            if (el) observer.observe(el);
        });
        return () => observer.disconnect();
    }, [reduced]);

    return (
        <section aria-label="Our promise" className="px-4 py-24 sm:px-6 lg:px-8">
            <div className="mx-auto max-w-[1200px]">
                <h2 className="mx-auto max-w-[680px] text-center text-4xl font-semibold tracking-[-0.035em] text-balance sm:text-5xl lg:text-6xl">
                    {words.map((word, index) => {
                        const on = reduced || active.has(index);
                        return (
                            <span
                                key={`${word}-${index}`}
                                ref={(el) => {
                                    refs.current[index] = el;
                                }}
                                data-index={index}
                                style={{ transitionDelay: on ? `${(index % 6) * 60}ms` : "0ms" }}
                                className={cn(
                                    "inline-block pr-[0.25em] text-[#141B2A] transition-opacity duration-700",
                                    EASE,
                                    on ? "opacity-100" : "opacity-30",
                                )}
                            >
                                {word}
                            </span>
                        );
                    })}
                </h2>
            </div>
        </section>
    );
}

/* ==========================================================================
   Features
   ========================================================================== */

function Features() {
    return (
        <Section id="features" labelledBy="features-title">
            <Reveal>
                <div className="mx-auto max-w-[680px] text-center">
                    <p className={cn(T.mono, "uppercase text-[#2862F4]")}>Twelve modules, one system</p>
                    <h2 id="features-title" className={cn(T.heading2, "mt-3 text-[#141B2A]")}>
                        Everything a batch needs from day one to the last score
                    </h2>
                    <p className={cn(T.body3, "mt-4 text-[#536078]")}>
                        Each module is specified in the IMS requirements document, so what you read here is what is being built.
                    </p>
                </div>
            </Reveal>
            <ul className="mt-12 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {FEATURES.map((feature, index) => (
                    <li key={feature.code}>
                        <Reveal delay={(index % 3) * 70} className="h-full">
                            <article
                                className={cn(
                                    "group h-full rounded-2xl border border-[#E8EBF0] bg-white p-6 transition-[transform,border-color] duration-500",
                                    EASE,
                                    "hover:-translate-y-1 hover:border-[#2862F4]/40 active:scale-[0.98] motion-reduce:hover:translate-y-0",
                                )}
                            >
                                <div className="flex items-center justify-between">
                                    <span className="grid h-10 w-10 place-items-center rounded-xl bg-[#2862F4]/10 text-[#2862F4]">
                                        <Icon name={feature.icon} />
                                    </span>
                                    {/* <span className={cn(T.mono, "text-[#98A2B3]")}>{feature.code}</span> */}
                                </div>
                                <h3 className={cn(T.title2, "mt-6 text-[#141B2A]")}>{feature.title}</h3>
                                <p className={cn(T.body6, "mt-2 text-[#536078]")}>{feature.body}</p>
                            </article>
                        </Reveal>
                    </li>
                ))}
            </ul>
        </Section>
    );
}

/* ==========================================================================
   Role explorer
   ========================================================================== */

function RoleExplorer() {
    const keys = Object.keys(ROLES) as RoleKey[];
    const [role, setRole] = useState<RoleKey>("Intern");
    const current = ROLES[role];

    const onKeyDown = (event: ReactKeyboardEvent<HTMLButtonElement>, index: number) => {
        if (event.key !== "ArrowRight" && event.key !== "ArrowLeft") return;
        event.preventDefault();
        const nextIndex =
            event.key === "ArrowRight" ? (index + 1) % keys.length : (index - 1 + keys.length) % keys.length;
        setRole(keys[nextIndex]);
        document.getElementById(`role-tab-${keys[nextIndex]}`)?.focus();
    };

    return (
        <Section id="roles" labelledBy="roles-title" className="bg-white">
            <Reveal>
                <SectionHeading
                    id="roles-title"
                    eyebrow="Explore by role"
                    title="Pick a role and see exactly what it can do"
                    body="Interns, group managers, HR and Admin each get a focused workspace. Access is checked on the server for every request."
                />
            </Reveal>
            <Reveal className="mt-12">
                <div className="rounded-3xl border border-[#E8EBF0] bg-[#F7F8FA] p-2">
                    <div
                        role="tablist"
                        aria-label="IMS roles"
                        className="grid grid-cols-2 gap-2 sm:grid-cols-4"
                    >
                        {keys.map((key, index) => (
                            <button
                                key={key}
                                id={`role-tab-${key}`}
                                role="tab"
                                type="button"
                                aria-selected={role === key}
                                aria-controls="role-panel"
                                tabIndex={role === key ? 0 : -1}
                                onClick={() => setRole(key)}
                                onKeyDown={(event) => onKeyDown(event, index)}
                                className={cn(
                                    "rounded-2xl px-4 py-3 transition-colors duration-300 active:scale-[0.98]",
                                    T.title3,
                                    role === key
                                        ? "bg-[#2862F4] text-white"
                                        : "bg-transparent text-[#536078] hover:bg-white hover:text-[#141B2A]",
                                    "focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#2862F4]/35",
                                )}
                            >
                                {key === "GPM" ? "Group manager" : key}
                            </button>
                        ))}
                    </div>

                    <div
                        id="role-panel"
                        role="tabpanel"
                        aria-labelledby={`role-tab-${role}`}
                        className="mt-2 grid grid-cols-1 gap-8 rounded-2xl bg-white p-6 sm:p-8 lg:grid-cols-[0.9fr_1.1fr]"
                    >
                        <div key={role} className="animate-[fadeIn_500ms_cubic-bezier(0.22,1,0.36,1)] motion-reduce:animate-none">
                            <p className={cn(T.mono, "uppercase text-[#647087]")}>{current.scope}</p>
                            <h3 className={cn(T.heading3, "mt-3 text-[#141B2A]")}>{current.tagline}</h3>
                            <div className="mt-6">
                                <Button
                                    variant="outline"
                                    onClick={() => scrollToId("early-access")}
                                    endIcon={<Icon name="arrow" className="h-5 w-5" />}
                                >
                                    Get early access
                                </Button>
                            </div>
                        </div>
                        <ul key={`${role}-list`} className="space-y-3 animate-[fadeIn_500ms_cubic-bezier(0.22,1,0.36,1)] motion-reduce:animate-none">
                            {current.can.map((item) => (
                                <li key={item} className="flex items-start gap-3 rounded-xl bg-[#F7F8FA] px-4 py-3">
                                    <span className="mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full bg-[#2EAD79]/15 text-[#2EAD79]">
                                        <Icon name="check" className="h-3 w-3" />
                                    </span>
                                    <span className={cn(T.body6, "text-[#141B2A]")}>{item}</span>
                                </li>
                            ))}
                        </ul>
                    </div>
                </div>
            </Reveal>
            <style>{`@keyframes fadeIn{from{opacity:0}to{opacity:1}}`}</style>
        </Section>
    );
}

/* ==========================================================================
   How it works
   ========================================================================== */

function HowItWorks() {
    return (
        <Section id="how-it-works" labelledBy="how-title">
            <Reveal>
                <div className="mx-auto max-w-[680px] text-center">
                    <p className={cn(T.mono, "uppercase text-[#2862F4]")}>How it works</p>
                    <h2 id="how-title" className={cn(T.heading2, "mt-3 text-[#141B2A]")}>
                        From first sign up to final score in three steps
                    </h2>
                </div>
            </Reveal>
            <ol className="mt-12 grid grid-cols-1 gap-4 lg:grid-cols-3">
                {STEPS.map((step, index) => (
                    <li key={step.n}>
                        <Reveal delay={index * 90} className="h-full">
                            <div className="h-full rounded-2xl border border-[#E8EBF0] bg-white p-6 sm:p-8">
                                <span className={cn(T.mono, "rounded-full bg-[#2862F4]/10 px-3 py-1 text-[#2862F4]")}>
                                    Step {step.n}
                                </span>
                                <h3 className={cn(T.heading6, "mt-6 text-[#141B2A]")}>{step.title}</h3>
                                <p className={cn(T.body3, "mt-3 text-[#536078]")}>{step.body}</p>
                            </div>
                        </Reveal>
                    </li>
                ))}
            </ol>
        </Section>
    );
}

/* ==========================================================================
   Activity monitoring spotlight
   ========================================================================== */

function ActivitySpotlight() {
    return (
        <section aria-labelledby="activity-title" className="bg-[#F7F8FA] p-2">
            <div className="relative isolate overflow-hidden rounded-2xl bg-[#020407] px-4 py-20 sm:px-6 sm:py-24 lg:px-8">
                <div className="mx-auto max-w-[1200px]">
                    <Reveal>
                        <div className="mx-auto max-w-[680px] text-center">
                            <p className={cn(T.mono, "uppercase text-[#98A2B3]")}>Activity monitoring</p>
                            <h2 id="activity-title" className={cn(T.heading2, "mt-3 text-white")}>
                                Quiet interns get noticed before they disappear
                            </h2>
                            <p className={cn(T.body3, "mt-4 text-[#98A2B3]")}>
                                A scheduled job checks every user at least once an hour. These are the default thresholds, and Admin can
                                change them.
                            </p>
                        </div>
                    </Reveal>

                    <Reveal className="mt-12">
                        <div aria-hidden="true" className="flex h-2 w-full overflow-hidden rounded-full">
                            {ACTIVITY_STAGES.map((stage) => (
                                <span key={stage.state} className="h-full flex-1" style={{ backgroundColor: stage.tone }} />
                            ))}
                        </div>
                    </Reveal>

                    <ol className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                        {ACTIVITY_STAGES.map((stage, index) => (
                            <li key={stage.state}>
                                <Reveal delay={index * 80} className="h-full">
                                    <div className="h-full rounded-2xl border border-white/10 bg-[#181818] p-6">
                                        <p className={cn(T.mono, "text-[#98A2B3]")}>{stage.hours}</p>
                                        <p className={cn(T.heading6, "mt-3 flex items-center gap-2 text-white")}>
                                            <span
                                                aria-hidden="true"
                                                className="h-2.5 w-2.5 rounded-full"
                                                style={{ backgroundColor: stage.tone }}
                                            />
                                            {stage.state}
                                        </p>
                                        <p className={cn(T.body6, "mt-3 text-[#98A2B3]")}>{stage.body}</p>
                                    </div>
                                </Reveal>
                            </li>
                        ))}
                    </ol>
                </div>
            </div>
        </section>
    );
}

/* ==========================================================================
   Security
   ========================================================================== */

function Security() {
    return (
        <Section id="security" labelledBy="security-title">
            <Reveal>
                <div className="mx-auto max-w-[680px] text-center">
                    <p className={cn(T.mono, "uppercase text-[#2862F4]")}>Security and privacy</p>
                    <h2 id="security-title" className={cn(T.heading2, "mt-3 text-[#141B2A]")}>
                        Sensitive documents deserve careful handling
                    </h2>
                    <p className={cn(T.body3, "mt-4 text-[#536078]")}>
                        Aadhaar, PAN and marksheets are personal data. IMS limits who can see them and keeps a record of who did.
                    </p>
                </div>
            </Reveal>
            <ul className="mt-12 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {SECURITY_ITEMS.map((item, index) => (
                    <li key={item.title}>
                        <Reveal delay={(index % 3) * 70} className="h-full">
                            <div className="flex h-full gap-4 rounded-2xl border border-[#E8EBF0] bg-white p-6">
                                <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-[#141B2A] text-white">
                                    <Icon name={item.icon} />
                                </span>
                                <div>
                                    <h3 className={cn(T.title2, "text-[#141B2A]")}>{item.title}</h3>
                                    <p className={cn(T.body6, "mt-2 text-[#536078]")}>{item.body}</p>
                                </div>
                            </div>
                        </Reveal>
                    </li>
                ))}
            </ul>
        </Section>
    );
}

/* ==========================================================================
   Roadmap
   ========================================================================== */

function Roadmap() {
    return (
        <Section id="roadmap" labelledBy="roadmap-title" className="bg-white">
            <Reveal>
                <div className="mx-auto max-w-[680px] text-center">
                    <p className={cn(T.mono, "uppercase text-[#2862F4]")}>Launching soon</p>
                    <h2 id="roadmap-title" className={cn(T.heading2, "mt-3 text-[#141B2A]")}>
                        What ships in release 1.0 and what comes after
                    </h2>
                    <p className={cn(T.body3, "mt-4 text-[#536078]")}>
                        IMS is under development, so we are open about scope. Details may change before launch.
                    </p>
                </div>
            </Reveal>
            <div className="mt-12 grid grid-cols-1 gap-4 lg:grid-cols-2">
                <Reveal>
                    <div className="h-full rounded-2xl border border-[#E8EBF0] bg-[#F7F8FA] p-6 sm:p-8">
                        <p className={cn(T.mono, "uppercase text-[#2EAD79]")}>In release 1.0</p>
                        <ul className="mt-6 space-y-3">
                            {ROADMAP_NOW.map((item) => (
                                <li key={item} className="flex items-start gap-3">
                                    <span className="mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full bg-[#2EAD79]/15 text-[#2EAD79]">
                                        <Icon name="check" className="h-3 w-3" />
                                    </span>
                                    <span className={cn(T.body3, "text-[#141B2A]")}>{item}</span>
                                </li>
                            ))}
                        </ul>
                    </div>
                </Reveal>
                <Reveal delay={80}>
                    <div className="h-full rounded-2xl border border-[#E8EBF0] bg-[#F7F8FA] p-6 sm:p-8">
                        <p className={cn(T.mono, "uppercase text-[#D99127]")}>Later or not planned</p>
                        <ul className="mt-6 space-y-3">
                            {ROADMAP_LATER.map((item) => (
                                <li key={item} className="flex items-start gap-3">
                                    <span className="mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full bg-[#D99127]/15 text-[#D99127]">
                                        <Icon name="clock" className="h-3 w-3" />
                                    </span>
                                    <span className={cn(T.body3, "text-[#141B2A]")}>{item}</span>
                                </li>
                            ))}
                        </ul>
                    </div>
                </Reveal>
            </div>
        </Section>
    );
}

/* ==========================================================================
   FAQ
   ========================================================================== */

function Faq() {
    return (
        <Section id="faq" labelledBy="faq-title">
            <Reveal>
                <div className="mx-auto max-w-[680px] text-center">
                    <p className={cn(T.mono, "uppercase text-[#2862F4]")}>FAQ</p>
                    <h2 id="faq-title" className={cn(T.heading2, "mt-3 text-[#141B2A]")}>
                        Questions people ask before joining
                    </h2>
                </div>
            </Reveal>
            <div className="mx-auto mt-12 max-w-[800px] space-y-3">
                {FAQS.map((item, index) => (
                    <Reveal key={item.q} delay={Math.min(index * 40, 200)}>
                        <details className="group rounded-2xl border border-[#E8EBF0] bg-white open:border-[#2862F4]/40">
                            <summary
                                className={cn(
                                    "flex cursor-pointer list-none items-center justify-between gap-4 rounded-2xl px-6 py-4 text-[#141B2A] [&::-webkit-details-marker]:hidden",
                                    T.title2,
                                    "focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#2862F4]/25",
                                )}
                            >
                                <span>{item.q}</span>
                                <Icon
                                    name="chevron"
                                    className={cn(
                                        "h-5 w-5 text-[#647087] transition-transform duration-500 group-open:rotate-180",
                                        EASE,
                                    )}
                                />
                            </summary>
                            <p className={cn(T.body3, "px-6 pb-6 text-[#536078]")}>{item.a}</p>
                        </details>
                    </Reveal>
                ))}
            </div>
        </Section>
    );
}

/* ==========================================================================
   Early access form and final CTA
   ========================================================================== */

type WaitlistPayload = { email: string; role: string };
type FormStatus = "idle" | "loading" | "success" | "error";

const AUDIENCES = ["Organisation or HR team", "Group manager", "Intern", "Other"] as const;

export interface LandingPageProps {
    onJoinWaitlist?: (payload: WaitlistPayload) => void | Promise<void>;
}

function EarlyAccess({ onJoinWaitlist }: LandingPageProps) {
    const [email, setEmail] = useState("");
    const [role, setRole] = useState<string>("");
    const [honeypot, setHoneypot] = useState("");
    const [errors, setErrors] = useState<{ email?: string; role?: string }>({});
    const [status, setStatus] = useState<FormStatus>("idle");
    const [message, setMessage] = useState("");

    const contactEmail = import.meta.env.VITE_CONTACT_EMAIL as string | undefined;

    const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        if (honeypot) return;

        const nextErrors: { email?: string; role?: string } = {};
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
            nextErrors.email = "Enter a valid email address.";
        }
        if (!role) nextErrors.role = "Select the option that describes you.";
        setErrors(nextErrors);
        if (Object.keys(nextErrors).length > 0) return;

        setStatus("loading");
        setMessage("");
        const payload: WaitlistPayload = { email: email.trim(), role };

        try {
            if (onJoinWaitlist) {
                await onJoinWaitlist(payload);
            } else {
                const endpoint = `https://portfolio-serverless-six.vercel.app/api/contact`;
                if (!endpoint) {
                    throw new Error("Early access signup is not connected yet.");
                }
                const response = await fetch(endpoint, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        name: "Message from Weborium Labs",
                        email: "weborium.app@gmail.com",
                        message: JSON.stringify(payload),
                    }),
                });
                if (!response.ok) throw new Error("The request failed. Please try again.");
            }
            setStatus("success");
        } catch (error) {
            setStatus("error");
            setMessage(error instanceof Error ? error.message : "Something went wrong. Please try again.");
        }
    };

    const inputBase =
        "h-[46px] w-full rounded-xl border bg-white px-4 font-sans text-sm font-normal text-[#141B2A] outline-none placeholder:text-[#98A2B3] focus:border-[#2862F4] focus:ring-4 focus:ring-[#2862F4]/10";

    return (
        <section id="early-access" aria-labelledby="early-title" className="scroll-mt-4 bg-[#F7F8FA] p-2">
            <div className="relative isolate overflow-hidden rounded-2xl bg-[#020407] px-4 py-20 sm:px-6 sm:py-24 lg:px-8">
                <img
                    src={GRADIENT_LOGIN}
                    alt=""
                    aria-hidden="true"
                    className="pointer-events-none absolute inset-0 -z-10 h-full w-full object-cover object-center"
                />
                <div className="pointer-events-none absolute inset-0 -z-10 bg-black/25" />

                <div className="mx-auto grid max-w-[1200px] grid-cols-1 items-center gap-12 lg:grid-cols-2">
                    <Reveal>
                        <div>
                            <LaunchBadge />
                            <h2 id="early-title" className={cn(T.heading2, "mt-6 max-w-[680px] text-white")}>
                                Be first in when IMS opens
                            </h2>
                            <p className={cn(T.body3, "mt-4 max-w-[680px] text-[#D0D5DD] sm:text-lg")}>
                                Join the early access list and we will email you when release 1.0 is ready. We only ask for your email and
                                the role that fits you best.
                            </p>
                            <ul className="mt-8 space-y-3">
                                {[
                                    "One email when early access opens",
                                    "Pricing is announced to this list first",
                                    "Tell us your role so we can show what matters to you",
                                ].map((item) => (
                                    <li key={item} className="flex items-center gap-3 text-white">
                                        <span className="grid h-6 w-6 place-items-center rounded-full bg-white/10">
                                            <Icon name="check" className="h-3.5 w-3.5" />
                                        </span>
                                        <span className={T.body3}>{item}</span>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    </Reveal>

                    <Reveal delay={100}>
                        <div className="rounded-3xl border border-white/15 bg-white/10 p-2 backdrop-blur-sm">
                            <div className="rounded-2xl bg-white p-6 sm:p-8">
                                {status === "success" ? (
                                    <div role="status" className="py-8 text-center">
                                        <span className="mx-auto grid h-12 w-12 place-items-center rounded-full bg-[#2EAD79]/15 text-[#2EAD79]">
                                            <Icon name="check" className="h-6 w-6" />
                                        </span>
                                        <h3 className={cn(T.heading5, "mt-6 text-[#141B2A]")}>You are on the list</h3>
                                        <p className={cn(T.body3, "mt-2 text-[#536078]")}>
                                            We will write to {email.trim()} when IMS opens.
                                        </p>
                                    </div>
                                ) : (
                                    <form onSubmit={handleSubmit} noValidate>
                                        <h3 className={cn(T.heading5, "text-[#141B2A]")}>Join early access</h3>
                                        <p className={cn(T.body6, "mt-1 text-[#536078]")}>It takes about ten seconds.</p>

                                        <div className="mt-6 space-y-4">
                                            <div>
                                                <label htmlFor="ea-email" className="sr-only">
                                                    Email address
                                                </label>
                                                <input
                                                    id="ea-email"
                                                    name="email"
                                                    type="email"
                                                    inputMode="email"
                                                    autoComplete="email"
                                                    placeholder="Enter email address"
                                                    value={email}
                                                    onChange={(event) => {
                                                        setEmail(event.target.value);
                                                        setErrors((current) => ({ ...current, email: undefined }));
                                                        if (status === "error") setStatus("idle");
                                                    }}
                                                    aria-invalid={Boolean(errors.email)}
                                                    aria-describedby={errors.email ? "ea-email-error" : undefined}
                                                    className={cn(inputBase, errors.email ? "border-[#DC5555]" : "border-[#E8EBF0]")}
                                                />
                                                {errors.email ? (
                                                    <p id="ea-email-error" className={cn(T.caption5, "mt-1.5 text-[#C33F45]")}>
                                                        {errors.email}
                                                    </p>
                                                ) : null}
                                            </div>

                                            <div>
                                                <label htmlFor="ea-role" className="sr-only">
                                                    I am
                                                </label>
                                                <div className="relative">
                                                    <select
                                                        id="ea-role"
                                                        name="role"
                                                        value={role}
                                                        onChange={(event) => {
                                                            setRole(event.target.value);
                                                            setErrors((current) => ({ ...current, role: undefined }));
                                                        }}
                                                        aria-invalid={Boolean(errors.role)}
                                                        aria-describedby={errors.role ? "ea-role-error" : undefined}
                                                        className={cn(
                                                            inputBase,
                                                            "appearance-none pr-10",
                                                            role ? "text-[#141B2A]" : "text-[#98A2B3]",
                                                            errors.role ? "border-[#DC5555]" : "border-[#E8EBF0]",
                                                        )}
                                                    >
                                                        <option value="" disabled>
                                                            I am joining as
                                                        </option>
                                                        {AUDIENCES.map((audience) => (
                                                            <option key={audience} value={audience}>
                                                                {audience}
                                                            </option>
                                                        ))}
                                                    </select>
                                                    <Icon
                                                        name="chevron"
                                                        className="pointer-events-none absolute right-4 top-1/2 h-4 w-4 -translate-y-1/2 text-[#101828]"
                                                    />
                                                </div>
                                                {errors.role ? (
                                                    <p id="ea-role-error" className={cn(T.caption5, "mt-1.5 text-[#C33F45]")}>
                                                        {errors.role}
                                                    </p>
                                                ) : null}
                                            </div>

                                            <div aria-hidden="true" className="absolute -left-[9999px] h-0 w-0 overflow-hidden">
                                                <label htmlFor="ea-company">Company</label>
                                                <input
                                                    id="ea-company"
                                                    name="company"
                                                    tabIndex={-1}
                                                    autoComplete="off"
                                                    value={honeypot}
                                                    onChange={(event) => setHoneypot(event.target.value)}
                                                />
                                            </div>
                                        </div>

                                        {status === "error" ? (
                                            <p role="alert" className={cn(T.body6, "mt-4 text-[#C33F45]")}>
                                                {message}{" "}
                                                {contactEmail ? (
                                                    <>
                                                        You can also write to{" "}
                                                        <a
                                                            href={`mailto:${contactEmail}`}
                                                            className="font-medium text-[#1457E8] underline underline-offset-2"
                                                        >
                                                            {contactEmail}
                                                        </a>
                                                        .
                                                    </>
                                                ) : null}
                                            </p>
                                        ) : null}

                                        <div className="mt-6">
                                            <Button
                                                type="submit"
                                                fullWidth
                                                loading={status === "loading"}
                                                loadingLabel="Joining"
                                                endIcon={<Icon name="arrow" className="h-6 w-6" />}
                                            >
                                                Join early access
                                            </Button>
                                        </div>
                                        <p className={cn(T.body6, "mt-4 text-center text-[#647087]")}>
                                            We use your email only to tell you about the IMS launch.
                                        </p>
                                    </form>
                                )}
                            </div>
                        </div>
                    </Reveal>
                </div>
            </div>
        </section>
    );
}

/* ==========================================================================
   Footer
   ========================================================================== */

function Footer() {
    const navigate = useNavigate();
    const year = new Date().getFullYear();
    const linkClass = cn(
        "rounded-lg text-left text-[#98A2B3] transition-colors duration-300 hover:text-white",
        T.body6,
        "focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-white/30",
    );

    return (
        <footer className="bg-[#F7F8FA] p-2 pt-0">
            <div className="rounded-2xl bg-[#020407] px-4 py-16 text-white sm:px-6 lg:px-8">
                <div className="mx-auto grid max-w-[1200px] grid-cols-1 gap-12 md:grid-cols-[1.4fr_1fr_1fr_1fr]">
                    <div>
                        <div className="flex items-center gap-3">
                            <span className="grid h-8 w-8 place-items-center rounded-lg bg-[#ffffff] text-white">
                                <img src="https://i.ibb.co/S73b3Rzt/weborium-logo-8k-transparent.png" alt="weborium_labs_logo" />
                            </span>
                        </div>
                        <p className={cn(T.body6, "mt-4 max-w-[320px] text-[#98A2B3]")}>
                            Run internship batches with clear owners, clear records and fewer spreadsheets. Launching soon.
                        </p>
                        <div className="mt-8 flex items-center gap-3">
                            <span className={cn(T.mono, "uppercase text-white")}>Powered by</span>
                            <WeboriumMark />
                        </div>
                    </div>

                    <nav aria-label="Product">
                        <p className={cn(T.mono, "uppercase text-[#98A2B3]")}>Product</p>
                        <ul className="mt-4 space-y-3">
                            {NAV_LINKS.map((link) => (
                                <li key={link.id}>
                                    <a
                                        href={`#${link.id}`}
                                        onClick={(event) => {
                                            event.preventDefault();
                                            scrollToId(link.id);
                                        }}
                                        className={linkClass}
                                    >
                                        {link.label}
                                    </a>
                                </li>
                            ))}
                        </ul>
                    </nav>

                    <nav aria-label="Account">
                        <p className={cn(T.mono, "uppercase text-[#98A2B3]")}>Account</p>
                        <ul className="mt-4 space-y-3">
                            <li>
                                <button type="button" onClick={() => navigate("/login")} className={linkClass}>
                                    Log in
                                </button>
                            </li>
                            <li>
                                <button type="button" onClick={() => navigate("/signup")} className={linkClass}>
                                    Create account
                                </button>
                            </li>
                            <li>
                                <button type="button" onClick={() => scrollToId("early-access")} className={linkClass}>
                                    Early access
                                </button>
                            </li>
                        </ul>
                    </nav>

                    <nav aria-label="Legal">
                        <p className={cn(T.mono, "uppercase text-[#98A2B3]")}>Legal</p>
                        <ul className="mt-4 space-y-3">
                            <li>
                                <button type="button" onClick={() => navigate("/terms")} className={linkClass}>
                                    Terms and services
                                </button>
                            </li>
                            <li>
                                <button type="button" onClick={() => navigate("/privacy")} className={linkClass}>
                                    Privacy policy
                                </button>
                            </li>
                        </ul>
                    </nav>
                </div>

                <div className="mx-auto mt-12 flex max-w-[1200px] flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                    <p className={cn(T.caption4, "text-[#98A2B3]")}>© {year} Weborium Labs. All rights reserved.</p>
                    <p className={cn(T.caption4, "text-[#98A2B3]")}>
                        IMS is under development. Features may change before release 1.0.
                    </p>
                </div>
            </div>
        </footer>
    );
}

/* ==========================================================================
   Page
   ========================================================================== */

export default function LandingPage({ onJoinWaitlist }: LandingPageProps) {
    useDocumentTitle(SEO_TITLE);
    useSeo();

    const sectionIds = [...NAV_LINKS.map((link) => link.id), "early-access"] as const;
    const active = useActiveSection(sectionIds);

    return (
        <div
            className="min-h-[100svh] w-full overflow-x-hidden bg-[#F7F8FA] text-[#141B2A] antialiased"
            style={{ fontFamily: "'Geist', ui-sans-serif, system-ui, sans-serif" }}
        >
            <a
                href="#main"
                className={cn(
                    "sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[60] focus:rounded-xl focus:bg-[#2862F4] focus:px-4 focus:py-3 focus:text-white",
                    T.title4,
                )}
            >
                Skip to content
            </a>

            <Nav active={active} />

            <main id="main">
                <Hero />
                <TrustStrip />
                <ProblemSolution />
                <TaglineReveal />
                <Features />
                <RoleExplorer />
                <HowItWorks />
                <ActivitySpotlight />
                <Security />
                <Roadmap />
                <Faq />
                <EarlyAccess onJoinWaitlist={onJoinWaitlist} />
            </main>

            <Footer />
        </div>
    );
}