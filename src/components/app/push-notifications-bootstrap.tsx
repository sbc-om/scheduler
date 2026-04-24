"use client";

import { useEffect } from "react";

const publicKey = process.env.NEXT_PUBLIC_PUSH_VAPID_PUBLIC_KEY;

export function PushNotificationsBootstrap() {
  useEffect(() => {
    void register();
  }, []);

  return null;
}

async function register() {
  if (typeof window === "undefined") return;
  if (!("serviceWorker" in navigator) || !("PushManager" in window)) return;
  if (!publicKey) return;

  try {
    const registration = await navigator.serviceWorker.register("/sw.js");
    let permission = Notification.permission;
    if (permission === "default") {
      permission = await Notification.requestPermission();
    }
    if (permission !== "granted") return;

    const existing = await registration.pushManager.getSubscription();
    const subscription =
      existing ??
      (await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: base64ToUint8Array(publicKey),
      }));

    await fetch("/api/push-subscriptions", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(subscription.toJSON()),
    });
  } catch {
    // Silent bootstrap; notification delivery still falls back to in-app.
  }
}

function base64ToUint8Array(value: string) {
  const padding = "=".repeat((4 - (value.length % 4)) % 4);
  const base64 = (value + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = window.atob(base64);
  return Uint8Array.from(raw, (char) => char.charCodeAt(0));
}