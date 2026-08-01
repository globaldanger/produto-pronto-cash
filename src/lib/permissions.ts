import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export type Role = "admin" | "funcionario" | "cliente";
export type Permission =
  | "dashboard"
  | "pdv"
  | "products"
  | "categories"
  | "orders.view"
  | "orders.status"
  | "orders.cancel"
  | "orders.refund"
  | "orders.edit_items"
  | "sales"
  | "finance"
  | "content"
  | "settings"
  | "backup"
  | "users"
  | "coupons"
  | "themes"
  | "reports"
  | "media"
  | "audit"
  | "payments"
  | "customers"
  | "service";

const MATRIX: Record<Role, Permission[]> = {
  admin: [
    "dashboard","pdv","products","categories","orders.view","orders.status",
    "orders.cancel","orders.refund","orders.edit_items","sales","finance",
    "content","settings","backup","users","coupons","themes","reports",
    "media","audit","payments","customers","service",
  ],
  funcionario: ["dashboard","pdv","products","categories","orders.view","orders.status","coupons","reports","media","payments","customers","service"],
  cliente: [],
};

export function can(role: Role | null, perm: Permission) {
  if (!role) return false;
  return MATRIX[role].includes(perm);
}

export function usePermissions() {
  const [role, setRole] = useState<Role | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) { setLoading(false); return; }
      setUserId(u.user.id);
      const { data: roles } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", u.user.id);
      const list = (roles ?? []).map((r) => r.role as Role);
      const r: Role = list.includes("admin")
        ? "admin"
        : list.includes("funcionario")
          ? "funcionario"
          : "cliente";
      setRole(r);
      setLoading(false);
    })();
  }, []);

  return {
    role,
    userId,
    loading,
    can: (p: Permission) => can(role, p),
    isStaff: role === "admin" || role === "funcionario",
    isAdmin: role === "admin",
  };
}