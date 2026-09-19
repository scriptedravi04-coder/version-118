import React from "react";
import useIsMobile from "../../hooks/useIsMobile";
import Chat from "../dashboard/Chat";
import InboxMobile from "../../components/inbox/mobile/InboxMobile";

export default function CreatorInbox() {
  const isMobile = useIsMobile();

  if (isMobile) {
    return <InboxMobile role="creator" />;
  }

  return (
    <div className="w-full h-full">
      <Chat />
    </div>
  );
}
