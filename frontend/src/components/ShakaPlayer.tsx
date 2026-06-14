"use client";

import { useEffect, useRef, useState } from "react";
import { Loader2, Tv, TriangleAlert } from "lucide-react";
import type { Channel } from "@/lib/channels";

type Status = "idle" | "loading" | "playing" | "error";

export function ShakaPlayer({ channel }: { channel: Channel | null }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [status, setStatus] = useState<Status>("idle");

  useEffect(() => {
    const video = videoRef.current;
    if (!video || !channel) {
      setStatus("idle");
      return;
    }

    let player: any = null;
    let cancelled = false;
    setStatus("loading");

    (async () => {
      // Shaka touches `window`, so load it only on the client.
      const shaka = (await import("shaka-player/dist/shaka-player.compiled.js"))
        .default as any;
      if (cancelled) return;

      shaka.polyfill.installAll();
      if (!shaka.Player.isBrowserSupported()) {
        setStatus("error");
        return;
      }

      player = new shaka.Player();
      await player.attach(video);
      if (cancelled) {
        player.destroy();
        return;
      }

      // ClearKey DRM: keys are { keyIdHex: keyHex } straight from the source.
      player.configure({
        drm: channel.drm ? { clearKeys: channel.drm } : {},
      });

      player.addEventListener("error", () => setStatus("error"));
      video.addEventListener("playing", () => setStatus("playing"));

      try {
        await player.load(channel.url);
        if (cancelled) return;
        try {
          await video.play();
        } catch {
          // Browsers block unmuted autoplay on load — fall back to muted so the
          // picture still rolls; the user can unmute with the native control.
          video.muted = true;
          video.play().catch(() => {});
        }
      } catch {
        if (!cancelled) setStatus("error");
      }
    })();

    return () => {
      cancelled = true;
      if (player) player.destroy();
    };
  }, [channel]);

  return (
    <div className="relative aspect-video w-full overflow-hidden bg-black lg:rounded-2xl">
      <video
        ref={videoRef}
        controls
        autoPlay
        playsInline
        className="h-full w-full"
      />

      {status === "idle" && (
        <Overlay>
          <Tv className="h-10 w-10 text-slate-500" />
          <p className="text-sm text-slate-400">Select a channel to start watching</p>
        </Overlay>
      )}
      {status === "loading" && (
        <Overlay>
          <Loader2 className="h-9 w-9 animate-spin text-pitch-500" />
          <p className="text-sm text-slate-300">Loading {channel?.name}…</p>
        </Overlay>
      )}
      {status === "error" && (
        <Overlay>
          <TriangleAlert className="h-10 w-10 text-amber-400" />
          <p className="text-sm text-slate-200">This channel isn’t available right now.</p>
          <p className="text-xs text-slate-500">Pick another channel from the list.</p>
        </Overlay>
      )}
    </div>
  );
}

function Overlay({ children }: { children: React.ReactNode }) {
  return (
    <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center gap-2 bg-black/70 text-center">
      {children}
    </div>
  );
}
