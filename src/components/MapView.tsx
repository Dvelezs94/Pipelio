"use client";

import { useEffect, useRef, useState } from "react";
import type { BusinessRecord } from "@/types";
import { Loader2 } from "lucide-react";

declare global {
  interface Window {
    google?: unknown;
    initMap?: () => void;
  }
}

export interface MapViewProps {
  businesses: BusinessRecord[];
  /** Center fallback when no businesses (e.g. search lat/lng) */
  center?: { lat: number; lng: number };
  /** Google Maps API key (from server env, passed to client for map render) */
  apiKey: string;
  className?: string;
}

export function MapView({ businesses, center, apiKey, className }: MapViewProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<unknown>(null);
  const markersRef = useRef<unknown[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!apiKey || !containerRef.current) {
      setLoading(false);
      return;
    }

    const withCoords = businesses.filter((b) => b.lat != null && b.lng != null);
    const defaultCenter = center ?? (withCoords[0] ? { lat: withCoords[0].lat!, lng: withCoords[0].lng! } : { lat: 40.7128, lng: -74.006 });

    if (window.google?.maps?.Map) {
      initMap();
      return;
    }

    const script = document.createElement("script");
    script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}`;
    script.async = true;
    script.defer = true;
    script.onload = () => {
      if ((window as { google?: { maps?: unknown } }).google?.maps) initMap();
      else setError("Failed to load Google Maps");
    };
    script.onerror = () => setError("Failed to load Google Maps script");
    document.head.appendChild(script);

    function initMap() {
      const g = (window as { google?: { maps: { Map: new (el: HTMLElement, o?: object) => { fitBounds: (b: unknown) => void; setCenter: (c: { lat: number; lng: number }) => void }; Marker: new (o?: object) => { setMap: (m: unknown) => void; addListener: (e: string, fn: () => void) => void }; InfoWindow: new (o?: object) => { open: (map: unknown, marker: unknown) => void }; LatLngBounds: new () => { extend: (p: { lat: number; lng: number }) => void } } } }).google?.maps;
      if (!containerRef.current || !g) return;
      const map = new g.Map(containerRef.current, {
        center: defaultCenter,
        zoom: 12,
        mapTypeControl: true,
        fullscreenControl: true,
      });
      mapRef.current = map;

      // Clear previous markers
      markersRef.current.forEach((m) => (m as { setMap: (x: null) => void }).setMap(null));
      markersRef.current = [];

      const bounds = new g.LatLngBounds();
      for (const b of withCoords) {
        const pos = { lat: b.lat!, lng: b.lng! };
        const marker = new g.Marker({ position: pos, map, title: b.name });
        const infoContent = `
          <div style="padding:8px;min-width:180px;">
            <strong>${escapeHtml(b.name)}</strong><br/>
            <span style="color:#666">${escapeHtml(b.industry ?? "—")}</span><br/>
            ${b.rating != null ? `★ ${b.rating} (${b.reviews} reviews)` : ""}<br/>
            ${b.website ? `<a href="${escapeHtml(b.website)}" target="_blank" rel="noopener">Website</a>` : ""}
          </div>
        `;
        const info = new g.InfoWindow({ content: infoContent });
        marker.addListener("click", () => info.open(map, marker));
        markersRef.current.push(marker);
        bounds.extend(pos);
      }
      if (withCoords.length > 1) map.fitBounds(bounds);
      else if (withCoords.length === 1) map.setCenter(defaultCenter);
      setLoading(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps -- init map once when container/key ready
  }, [apiKey]);

  // Update markers when businesses change (e.g. after filter)
  useEffect(() => {
    const g = (window as { google?: { maps: unknown } }).google?.maps as undefined | { Marker: new (o?: object) => { setMap: (m: unknown) => void; addListener: (e: string, fn: () => void) => void }; InfoWindow: new (o?: object) => { open: (map: unknown, marker: unknown) => void } };
    if (!mapRef.current || !g) return;
    const withCoords = businesses.filter((b) => b.lat != null && b.lng != null);
    markersRef.current.forEach((m) => (m as { setMap: (x: null) => void }).setMap(null));
    markersRef.current = [];
    for (const b of withCoords) {
      const marker = new g.Marker({ position: { lat: b.lat!, lng: b.lng! }, map: mapRef.current, title: b.name });
      const infoContent = `
        <div style="padding:8px;min-width:180px;">
          <strong>${escapeHtml(b.name)}</strong><br/>
          <span style="color:#666">${escapeHtml(b.industry ?? "—")}</span><br/>
          ${b.rating != null ? `★ ${b.rating}` : ""}
          ${b.website ? `<br/><a href="${escapeHtml(b.website)}" target="_blank">Website</a>` : ""}
        </div>
      `;
      const info = new g.InfoWindow({ content: infoContent });
      marker.addListener("click", () => info.open(mapRef.current, marker));
      markersRef.current.push(marker);
    }
  }, [businesses]);

  if (error) {
    return (
      <div className={className} style={{ minHeight: 300, display: "flex", alignItems: "center", justifyContent: "center", background: "var(--muted)" }}>
        <p className="text-destructive">{error}</p>
      </div>
    );
  }

  return (
    <div className={className} style={{ position: "relative", minHeight: 300 }}>
      {loading && (
        <div
          style={{
            position: "absolute",
            inset: 0,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            background: "var(--muted)",
            zIndex: 1,
          }}
        >
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      )}
      <div ref={containerRef} style={{ width: "100%", height: 300, opacity: loading ? 0 : 1 }} />
    </div>
  );
}

function escapeHtml(s: string): string {
  const div = document.createElement("div");
  div.textContent = s;
  return div.innerHTML;
}
