"use client";

import { useEffect, useRef, useState } from "react";
import { Loader2 } from "lucide-react";

declare global {
  interface Window {
    google?: unknown;
  }
}

export interface SearchMapProps {
  /** Center from geocode (null = show placeholder) */
  center: { lat: number; lng: number } | null;
  /** Radius in km; circle is drawn when center is set */
  radiusKm: number;
  apiKey: string;
  className?: string;
}

export function SearchMap({ center, radiusKm, apiKey, className }: SearchMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<unknown>(null);
  const circleRef = useRef<unknown>(null);
  const [loading, setLoading] = useState(!!center && !!apiKey);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!apiKey || !center || !containerRef.current) {
      setLoading(false);
      return;
    }

    const radiusMeters = radiusKm * 1000;

    function initMap() {
      const g = (window as {
        google?: {
          maps: {
            Map: new (el: HTMLElement, o?: object) => {
              setCenter: (c: { lat: number; lng: number }) => void;
              getZoom: () => number;
            };
            Circle: new (o?: object) => {
              setMap: (m: unknown) => void;
              setCenter: (c: { lat: number; lng: number }) => void;
              setRadius: (r: number) => void;
            };
          };
        };
      }).google?.maps;

      if (!containerRef.current || !g || !center) return;

      const map = new g.Map(containerRef.current, {
        center: { lat: center.lat, lng: center.lng },
        zoom: 11,
        mapTypeControl: true,
        fullscreenControl: true,
      });
      mapRef.current = map;

      const circle = new g.Circle({
        map,
        center: { lat: center.lat, lng: center.lng },
        radius: radiusMeters,
        strokeColor: "#2563eb",
        strokeOpacity: 0.8,
        strokeWeight: 2,
        fillColor: "#2563eb",
        fillOpacity: 0.15,
      });
      circleRef.current = circle;

      setLoading(false);
    }

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
  }, [apiKey, center?.lat, center?.lng]);

  // Update circle when radius or center changes (map already mounted)
  useEffect(() => {
    if (!center || !circleRef.current) return;
    // maps circle overlay uses window.google.maps at runtime
    const circle = circleRef.current as { setCenter: (c: { lat: number; lng: number }) => void; setRadius: (r: number) => void };
    if (circle.setCenter) {
      circle.setCenter({ lat: center.lat, lng: center.lng });
      circle.setRadius(radiusKm * 1000);
    }
    if (mapRef.current && typeof (mapRef.current as { setCenter: (c: { lat: number; lng: number }) => void }).setCenter === "function") {
      (mapRef.current as { setCenter: (c: { lat: number; lng: number }) => void }).setCenter({ lat: center.lat, lng: center.lng });
    }
  }, [center, radiusKm]);

  if (error) {
    return (
      <div className={className} style={{ minHeight: 280, display: "flex", alignItems: "center", justifyContent: "center", background: "var(--muted)", borderRadius: 8 }}>
        <p className="text-destructive text-sm">{error}</p>
      </div>
    );
  }

  if (!center) {
    return (
      <div
        className={className}
        style={{
          minHeight: 280,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "var(--muted)",
          borderRadius: 8,
          color: "var(--muted-foreground)",
          fontSize: 14,
        }}
      >
        Enter a ZIP code and country to see the search area
      </div>
    );
  }

  return (
    <div className={className} style={{ position: "relative", minHeight: 280 }}>
      {loading && (
        <div
          style={{
            position: "absolute",
            inset: 0,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            background: "var(--muted)",
            borderRadius: 8,
            zIndex: 1,
          }}
        >
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      )}
      <div
        ref={containerRef}
        style={{ width: "100%", height: 280, borderRadius: 8, opacity: loading ? 0 : 1 }}
      />
    </div>
  );
}
