import React, { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import CreatorDashboard from "../../components/dashboard/CreatorDashboard";
import BrandDashboard from "../../components/dashboard/BrandDashboard";
import TourRunner from "../../components/dashboard/TourRunner";
import { useAuth } from "../../contexts/AuthContext";

export default function Dashboard() {
  console.log("Dashboard rendering...");
  const { user } = useAuth();
  const navigate = useNavigate();

  const isAdminOrSubAdmin = user?.role === "admin" || user?.team_role === "sub_admin";

  useEffect(() => {
    if (isAdminOrSubAdmin) {
      navigate("/admin", { replace: true });
    }
  }, [isAdminOrSubAdmin, navigate]);

  if (isAdminOrSubAdmin) return null;

  const isCreator = user?.role === "creator";

  return (
    <>
      {user && <TourRunner user={user} />}
      {isCreator ? <CreatorDashboard user={user} /> : <BrandDashboard user={user} />}
    </>
  );
}
