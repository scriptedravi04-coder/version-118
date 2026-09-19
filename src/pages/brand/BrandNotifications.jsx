import React from "react";
import useIsMobile from "../../hooks/useIsMobile";
import Notifications from "../dashboard/Notifications";
import NotificationsMobile from "../../components/notifications/mobile/NotificationsMobile";

export default function BrandNotifications() {
  const isMobile = useIsMobile();

  // Mobile gets the dedicated screen; desktop keeps the existing notifications page
  // so the desktop experience is unchanged.
  if (isMobile) {
    return <NotificationsMobile role="brand" />;
  }

  return <Notifications />;
}
