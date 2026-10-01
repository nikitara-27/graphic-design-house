import { useEffect, useRef, useState } from "react";
import type { RealtimeChannel, SupabaseClient } from "@supabase/supabase-js";
import { CHANNEL, flattenPresence, sessionId, type Peer, type PeerInfo } from "./presence";
import { getSupabase } from "./supabase";

export type PresenceStatus = "off" | "connecting" | "live" | "error";

const DEBOUNCE_MS = 200; // clicking through rooms quickly sends only the room you stop in
const RETRY_MS = 2000; // a failed send is retried
const SYNC_EVERY_MS = 150; // batch incoming changes before re-rendering

/**
 * Shares `me` (or nothing, when null) on the shared channel and returns everyone who's here.
 *
 * Every change to `me` (a new room, by any route: arrows, swipe, map, Back, a typed URL) sends the
 * whole state again, because track() replaces what was shared before. Sends always read the latest
 * state at the moment they go out, only happen once the channel is SUBSCRIBED, and are repeated
 * after a reconnect or when the tab comes back into view. If Supabase isn't configured or can't be
 * reached, it returns no peers and the site carries on normally.
 */
export function usePresence(me: PeerInfo | null): { peers: Peer[]; status: PresenceStatus; selfId: string } {
  const [selfId] = useState(sessionId);
  const [peers, setPeers] = useState<Peer[]>([]);
  const [status, setStatus] = useState<PresenceStatus>("off");
  // Bumped to rebuild the connection from scratch (e.g. after the page is restored from the back/forward cache).
  const [generation, setGeneration] = useState(0);
  const active = me !== null;

  // Always the latest state, read when a send actually happens (never a value captured earlier).
  const meRef = useRef(me);
  meRef.current = me;

  const channelRef = useRef<RealtimeChannel | null>(null);
  const subscribed = useRef(false);
  const lastSent = useRef(""); // JSON of the last state the server confirmed
  const timer = useRef<number>(undefined);
  const sending = useRef(false);

  // Send the latest state now (if connected and it changed, or `force`).
  const flush = async (force = false) => {
    window.clearTimeout(timer.current);
    const channel = channelRef.current;
    const state = meRef.current;
    if (!channel || !subscribed.current || !state) return; // sent on SUBSCRIBED instead
    const payload = { ...state, at: Date.now() };
    const json = JSON.stringify(state);
    if (!force && json === lastSent.current) return;
    if (sending.current) {
      // One send at a time; check again right after this one finishes.
      timer.current = window.setTimeout(() => flushRef.current(force), DEBOUNCE_MS);
      return;
    }
    sending.current = true;
    try {
      const result = await channel.track(payload);
      if (result === "ok") lastSent.current = json;
      else throw new Error(result);
    } catch {
      lastSent.current = "";
      timer.current = window.setTimeout(() => flushRef.current(), RETRY_MS);
    } finally {
      sending.current = false;
    }
    // The room may have changed while that was in flight.
    if (meRef.current && JSON.stringify(meRef.current) !== lastSent.current && channelRef.current === channel) {
      window.clearTimeout(timer.current);
      timer.current = window.setTimeout(() => flushRef.current(), DEBOUNCE_MS);
    }
  };
  const flushRef = useRef(flush);
  flushRef.current = flush;

  // Connect while in the house; disconnect when leaving it (e.g. Retake quiz) or the page.
  useEffect(() => {
    const connect = active ? getSupabase() : null;
    if (!connect) {
      setStatus("off");
      setPeers([]);
      return;
    }
    let cancelled = false;
    let client: SupabaseClient | null = null;
    let syncTimer: number | undefined;
    setStatus("connecting");

    connect
      .then((c) => {
        if (cancelled) return;
        client = c;
        const channel = c.channel(CHANNEL, { config: { presence: { key: selfId } } });
        channelRef.current = channel;
        // Every sync: rebuild everyone (and their rooms) from the full presence state.
        channel.on("presence", { event: "sync" }, () => {
          window.clearTimeout(syncTimer);
          syncTimer = window.setTimeout(() => {
            if (!cancelled) setPeers(flattenPresence(channel.presenceState() as Record<string, unknown[]>, selfId));
          }, SYNC_EVERY_MS);
        });
        channel.subscribe((s) => {
          if (cancelled) return;
          if (s === "SUBSCRIBED") {
            // First connect and every reconnect: share the current state again.
            subscribed.current = true;
            setStatus("live");
            void flushRef.current(true);
          } else {
            subscribed.current = false;
            if (s === "CHANNEL_ERROR" || s === "TIMED_OUT") setStatus("error"); // the client retries by itself
          }
        });
      })
      .catch(() => !cancelled && setStatus("error"));

    // Leaving the page: drop out right away so others see us go within seconds.
    const onHide = () => leave();
    // Coming back from the back/forward cache: the connection was closed, so start again.
    const onShow = (e: PageTransitionEvent) => e.persisted && setGeneration((g) => g + 1);
    // Back on the tab: re-send, in case updates were missed while it was in the background.
    const onVisible = () => document.visibilityState === "visible" && void flushRef.current(true);
    window.addEventListener("pagehide", onHide);
    window.addEventListener("pageshow", onShow);
    document.addEventListener("visibilitychange", onVisible);

    function leave() {
      const channel = channelRef.current;
      channelRef.current = null;
      subscribed.current = false;
      lastSent.current = "";
      window.clearTimeout(timer.current);
      if (channel) {
        channel.untrack().catch(() => {});
        client?.removeChannel(channel).catch(() => {});
      }
    }

    return () => {
      cancelled = true;
      window.clearTimeout(syncTimer);
      window.removeEventListener("pagehide", onHide);
      window.removeEventListener("pageshow", onShow);
      document.removeEventListener("visibilitychange", onVisible);
      leave();
      setPeers([]);
    };
  }, [active, selfId, generation]);

  // Room (or name, etc.) changed: send the full state once things settle for a moment.
  const meJson = me ? JSON.stringify(me) : "";
  useEffect(() => {
    if (!meJson) return;
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => void flushRef.current(), DEBOUNCE_MS);
  }, [meJson]);

  return { peers, status, selfId };
}
