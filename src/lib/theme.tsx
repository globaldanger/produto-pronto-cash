import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type ThemePack = {
  id: string;
  key: string;
  name: string;
  accent_color: string;
  accent_glow: string;
  banner_text: string | null;
  banner_subtext: string | null;
  decoration: string;
  active: boolean;
};

export function useActiveTheme() {
  const { data } = useQuery<ThemePack | null>({
    queryKey: ["active_theme"],
    queryFn: async () => {
      const { data: st } = await supabase
        .from("store_settings")
        .select("active_theme_key")
        .limit(1)
        .maybeSingle();
      const key = st?.active_theme_key ?? "default";
      const { data: t } = await supabase
        .from("theme_packs")
        .select("*")
        .eq("key", key)
        .maybeSingle();
      return (t as ThemePack | null) ?? null;
    },
    staleTime: 60_000,
  });

  useEffect(() => {
    if (typeof document === "undefined") return;
    const root = document.documentElement;
    if (data?.accent_color) {
      root.style.setProperty("--theme-accent", data.accent_color);
      root.style.setProperty("--theme-accent-glow", data.accent_glow || data.accent_color);
    } else {
      root.style.removeProperty("--theme-accent");
      root.style.removeProperty("--theme-accent-glow");
    }
  }, [data?.accent_color, data?.accent_glow]);

  return data ?? null;
}

export function ThemeBanner({ theme }: { theme: ThemePack | null }) {
  if (!theme || theme.key === "default" || !theme.banner_text) return null;
  return (
    <div className="relative overflow-hidden border-b border-border/60 bg-black/40">
      <div className={`theme-decoration theme-${theme.decoration}`} />
      <div className="relative mx-auto flex max-w-7xl items-center justify-center gap-3 px-4 py-2.5 text-xs">
        <span className="rounded-full border border-white/20 px-2 py-0.5 uppercase tracking-widest theme-accent-text">
          {theme.name}
        </span>
        <span className="font-semibold text-foreground/90">{theme.banner_text}</span>
        {theme.banner_subtext && (
          <span className="hidden text-muted-foreground sm:inline">— {theme.banner_subtext}</span>
        )}
      </div>
    </div>
  );
}

export function ThemeDecorationLayer({ theme }: { theme: ThemePack | null }) {
  if (!theme || theme.decoration === "none") return null;
  return <div className={`theme-decoration theme-${theme.decoration}`} />;
}