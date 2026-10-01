import { useEffect, useRef, useState } from "react";
import type { RealtimeChannel, SupabaseClient } from "@supabase/supabase-js";
import { CHANNEL, flattenPresence, presenceConfig, sessionId, type Peer, type PeerInfo } from "./presence";

export type PresenceStatus = "off" | "connecting" | "live" | "error";

const SEND_EVERY_MS = 500; // at most ~2 updates a second, however fast someone moves
const SYNC_EVERY_MS = 150; // batch incoming changes before re-rendering

/**
 * Shares `me` (or nothing, when null) on the shared channel and returns everyone who's here.
 * If Supabase isn't configured or the connection fails, it returns no peers and the site
 * carries on normally.
 */
export function usePresence(me: PeerInfo | null): { peers: Peer[]; status: PresenceStatus; selfId: string } {
  const [selfId] = useState(sessionId);
  const [peers, setPeers] = useState<Peer[]>([]);
  const [status, setStatus] = useState<PresenceStatus>("off");
  const active = me !== null;

  const meRef = useRef(me);
  meRef.current = me;
  const channelRef = useRef<RealtimeChannel | null>(null);
  const lastSent = useRef({ at: 0, json: "" });
  const sendTimer = useRef<number>(undefined);

  // Send the latest payload, throttled and skipped when nothing changed.
  const send = () => {
    window.clearTimeout(sendTimer.current);
    const channel = channelRef.current;
    const payload = meRef.current;
    if (!channel || !payload) return;
    const json = JSON.stringify(payload);
    if (json === lastSent.current.json) return;
    const wait = lastSent.current.at + SEND_EVERY_MS - Date.now();
    if (wait > 0) {
      sendTimer.current = window.setTimeout(send, wait);
      return;
    }
    lastSent.current = { at: Date.now(), json };
    channel.track(payload).catch(() => {
      lastSent.current.json = ""; // retry on the next change
    });
  };
  const sendRef = useRef(send);
  sendRef.current = send;

  // Connect while in the house; disconnect when leaving it (e.g. Retake quiz) or closing the tab.
  useEffect(() => {
    const config = presenceConfig();
    if (!active || !config) {
      setStatus("off");
      setPeers([]);
      return;
    }
    let cancelled = false;
    let client: SupabaseClient | null = null;
    let syncTimer: number | undefined;
    setStatus("connecting");

    const leave = () => {
      const channel = channelRef.current;
      channelRef.current = null;
      lastSent.current = { at: 0, json: "" };
      if (channel) {
        channel.untrack().catch(() => {});
        client?.removeChannel(channel).catch(() => {});
      }
    };

    import("@supabase/supabase-js")
      .then(({ createClient }) => {
        if (cancelled) return;
        client = createClient(config.url, config.key, {
          auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
          realtime: { params: { eventsPerSecond: 5 } },
        });
        const channel = client.channel(CHANNEL, { config: { presence: { key: selfId } } });
        channelRef.current = channel;
        channel.on("presence", { event: "sync" }, () => {
          window.clearTimeout(syncTimer);
          syncTimer = window.setTimeout(() => {
            if (!cancelled) setPeers(flattenPresence(channel.presenceState() as Record<string, unknown[]>, selfId));
          }, SYNC_EVERY_MS);
        });
        channel.subscribe((s) => {
          if (cancelled) return;
          if (s === "SUBSCRIBED") {
            setStatus("live");
            lastSent.current = { at: 0, json: "" };
            sendRef.current();
          } else if (s === "CHANNEL_ERROR" || s === "TIMED_OUT") {
            setStatus("error");
          }
        });
      })
      .catch(() => !cancelled && setStatus("error"));

    // Closing the tab: leave right away so others see us go within seconds.
    window.addEventListener("pagehide", leave);
    return () => {
      cancelled = true;
      window.clearTimeout(syncTimer);
      window.clearTimeout(sendTimer.current);
      window.removeEventListener("pagehide", leave);
      leave();
      setPeers([]);
    };
  }, [active, selfId]);

  // Room or profile changed: share it (throttled).
  const meJson = me ? JSON.stringify(me) : "";
  useEffect(() => {
    if (meJson) sendRef.current();
  }, [meJson]);

  return { peers, status, selfId };
}
