import type { Chat } from "../../types/types";
import ChatItem from "./ChatItem";
import SectionHeading from "./SectionHeading";
import ViewAllLink from "./ViewAllLink";

export default function ChatsPanel({ chats }: { chats: readonly Chat[] }) {
    return (
        <section
            aria-labelledby="chats-heading"
            className="flex min-w-0 flex-col gap-[19px] overflow-hidden rounded-3xl border border-[#F1F3F6] bg-white p-[22px] shadow-[0.2px_0.2px_12px_0_rgba(0,0,0,0.02)]"
        >
            <SectionHeading
                id="chats-heading"
                title="Chats"
                subtitle="Your recent conversations and team updates."
            />
            <div className="flex flex-1 flex-col items-center justify-between gap-6">
                <ul className="flex w-full flex-col items-start gap-3">
                    {chats.map((chat) => (
                        <ChatItem key={chat.id} chat={chat} />
                    ))}
                </ul>
                <ViewAllLink to="/chats">Go To All Chats</ViewAllLink>
            </div>
        </section>
    );
}