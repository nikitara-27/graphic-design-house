import { useCallback, useEffect, useRef, useState } from "react";
import type { RealtimeChannel, SupabaseClient } from "@supabase/supabase-js";
import { getSupabase } from "./supabase";
import {
  COLUMNS,
  checkDraft,
  newResourceId,
  newestFirst,
  recentPostCount,
  recordPost,
  recordReport,
  starterResources,
  submitterId,
  toResource,
  type Draft,
  type DraftError,
  type Resource,
} from "./resources";

/**
 * "offline": Supabase isn't configured (starter picks only, no sharing).
 * "error": the board couldn't be loaded (e.g. the table isn't set up yet); starter picks are shown.
 */
export type BoardStatus = "offline" | "loading" | "live" | "error";
export type AddResult = { ok: true } | { ok: false; error: DraftError | "busy" | "network" };

// Local development reads the real board but doesn't write to it, so testing never shows up on
// the live site. Add ?liveBoard to the dev URL to really send.
const SENDS = !import.meta.env.DEV || new URLSearchParams(window.location.search).has("liveBoard");

/** The Design Resources board. Loads (and listens for new cards) only while `open`. */
export function useResources(open: boolean, name: string) {
  const [items, setItems] = useState<Resource[]>(starterResources);
  const [status, setStatus] = useState<BoardStatus>(() => (getSupabase() ? "loading" : "offline"));
  const clientRef = useRef<SupabaseClient | null>(null);
  const itemsRef = useRef(items);
  itemsRef.current = items;

  const merge = useCallback((incoming: Resource[]) => {
    setItems((prev) => {
      const byId = new Map(prev.map((r) => [r.id, r]));
      for (const r of incoming) byId.set(r.id, r);
      return newestFirst([...byId.values()]);
    });
  }, []);

  useEffect(() => {
    if (!open) return;
    const connect = getSupabase();
    if (!connect) {
      setStatus("offline");
      return;
    }
    let cancelled = false;
    let channel: RealtimeChannel | null = null;
    setStatus((s) => (s === "live" ? s : "loading"));
    connect
      .then(async (client) => {
        if (cancelled) return;
        clientRef.current = client;
        // Listen first, then load, so nothing added in between is missed.
        channel = client
          .channel("gd-resources")
          .on("postgres_changes", { event: "INSERT", schema: "public", table: "resources" }, (msg) => {
            const r = toResource(msg.new);
            if (r) merge([r]);
          })
          .subscribe();
        const { data, error } = await client.from("resources").select(COLUMNS).order("created_at", { ascending: false }).limit(300);
        if (cancelled) return;
        if (error || !data) {
          setStatus("error");
          return;
        }
        // The database is the source of truth (you may have hidden a starter pick).
        setItems(newestFirst(data.map(toResource).filter((r): r is Resource => r !== null)));
        setStatus("live");
      })
      .catch(() => !cancelled && setStatus("error"));
    return () => {
      cancelled = true;
      if (channel) clientRef.current?.removeChannel(channel).catch(() => {});
    };
  }, [open, merge]);

  const add = useCallback(
    async (draft: Draft): Promise<AddResult> => {
      const checked = checkDraft(draft, itemsRef.current, recentPostCount());
      if (!checked.ok) return checked;
      const row = {
        id: newResourceId(),
        url: checked.url,
        title: checked.title,
        description: checked.description || null,
        category: checked.category,
        shared_by: name || "Guest",
      };
      const client = clientRef.current;
      if (SENDS) {
        if (!client) return { ok: false, error: "network" };
        const { error } = await client.from("resources").insert({ ...row, submitter: submitterId() });
        if (error) {
          if (error.code === "23505") return { ok: false, error: "duplicate" };
          if (error.message?.includes("rate_limited")) return { ok: false, error: "rate" };
          if (error.message?.includes("board_busy")) return { ok: false, error: "busy" };
          return { ok: false, error: "network" };
        }
      } else {
        console.info("[dev] Not sent to the live board (add ?liveBoard to send):", row);
      }
      recordPost();
      const mine = toResource({ ...row, created_at: new Date().toISOString() });
      if (mine) merge([mine]);
      return { ok: true };
    },
    [name, merge],
  );

  const report = useCallback(async (id: string): Promise<boolean> => {
    if (SENDS) {
      const client = clientRef.current;
      if (!client) return false;
      const { error } = await client.from("resource_reports").insert({ resource_id: id });
      if (error) return false;
    } else {
      console.info("[dev] Report not sent to the live board:", id);
    }
    recordReport(id);
    return true;
  }, []);

  // In local development nothing is sent, so the form works even before the table exists.
  return { items, status, add, report, canShare: status === "live" || !SENDS };
}
