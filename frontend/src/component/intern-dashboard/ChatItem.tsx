import type { Chat } from "../../types/types";
import Avatar from "./Avatar";

export default function ChatItem({ chat }: { chat: Chat }) {
    const { initials, title, preview, time, unread, typing } = chat;
    return (
        <li className="flex w-full items-start justify-between rounded-xl p-3">
            <div className="flex min-w-0 flex-1 items-center gap-2">
                <Avatar initials={initials} />
                <div className="flex min-w-0 flex-1 flex-col items-start gap-1">
                    <p className="w-full truncate text-sm font-semibold leading-5 text-[#101828]">{title}</p>
                    <p
                        className={`w-full truncate text-xs leading-4 ${typing ? "text-[#2563EB]" : "text-[#98A2B3]"}`}
                    >
                        {preview}
                    </p>
                </div>
            </div>
            <div className="flex shrink-0 flex-col items-center gap-0.5">
                <span
                    className={`flex h-5 w-[50px] flex-col justify-center text-xs leading-4 ${unread ? "text-[#475467]" : "text-[#98A2B3]"}`}
                >
                    {time}
                </span>
                {unread ? (
                    <span
                        aria-label={`${unread} unread`}
                        className="flex items-center justify-center rounded-[10px] bg-[#2563EB] px-1.5 py-0.5 text-xs font-medium leading-4 text-white"
                    >
                        {unread}
                    </span>
                ) : null}
            </div>
        </li>
    );
}