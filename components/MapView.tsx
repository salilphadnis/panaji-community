"use client";

import { useEffect, useRef } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { Waves, TrafficCone, Construction, Mountain, Sailboat, Wrench, MapPin } from "lucide-react";
import maplibregl, { type Map, type Marker } from "maplibre-gl";
import type { Category, Report } from "@/lib/types";

type Props = {
  reports: Report[];
  onSelect: (report: Report) => void;
  selectedId?: string | null;
  onCenterChange?: (center: { latitude: number; longitude: number }) => void;
  destination?: { latitude: number; longitude: number; zoom: number; requestId: number } | null;
  pickingLocation?: boolean;
  onLocationPicked?: (point: { latitude: number; longitude: number }) => void;
};

const COLORS: Record<Category, string> = {
  "Flooding / Waterlogging": "#2563eb",
  "Road obstruction": "#ea580c",
  "Road damage": "#dc2626",
  Landslide: "#7c3aed",
  "Coastal issue": "#0891b2",
  Infrastructure: "#ca8a04",
  Other: "#475569",
};

const ICONS = {
  "Flooding / Waterlogging": Waves,
  "Road obstruction": TrafficCone,
  "Road damage": Construction,
  Landslide: Mountain,
  "Coastal issue": Sailboat,
  Infrastructure: Wrench,
  Other: MapPin,
} satisfies Record<Category, typeof MapPin>;

export default function MapView({ reports, onSelect, selectedId, onCenterChange, destination, pickingLocation = false, onLocationPicked }: Props) {
  const container = useRef<HTMLDivElement>(null);
  const map = useRef<Map | null>(null);
  const markers = useRef<Marker[]>([]);
  const onSelectRef = useRef(onSelect);
  const onCenterChangeRef = useRef(onCenterChange);
  const onLocationPickedRef = useRef(onLocationPicked);
  const pickingRef = useRef(pickingLocation);
  const pickMarker = useRef<Marker | null>(null);

  useEffect(() => { onSelectRef.current = onSelect; }, [onSelect]);
  useEffect(() => { onCenterChangeRef.current = onCenterChange; }, [onCenterChange]);
  useEffect(() => { onLocationPickedRef.current = onLocationPicked; }, [onLocationPicked]);
  useEffect(() => {
    pickingRef.current = pickingLocation;
    if (map.current) map.current.getCanvas().style.cursor = pickingLocation ? "crosshair" : "";
    if (!pickingLocation) { pickMarker.current?.remove(); pickMarker.current = null; }
  }, [pickingLocation]);

  useEffect(() => {
    if (!container.current || map.current) return;
    const instance = new maplibregl.Map({
      container: container.current,
      center: [73.8278, 15.4909],
      zoom: 12.5,
      style: {
        version: 8,
        sources: {
          osm: {
            type: "raster",
            tiles: ["https://tile.openstreetmap.org/{z}/{x}/{y}.png"],
            tileSize: 256,
            attribution: "© OpenStreetMap contributors",
          },
        },
        layers: [{ id: "osm", type: "raster", source: "osm" }],
      },
    });
    map.current = instance;
    const publishCenter = () => {
      const center = instance.getCenter();
      onCenterChangeRef.current?.({ latitude: center.lat, longitude: center.lng });
    };
    instance.on("moveend", publishCenter);
    instance.on("click", (event) => {
      if (!pickingRef.current) return;
      const point = { latitude: event.lngLat.lat, longitude: event.lngLat.lng };
      pickMarker.current?.remove();
      pickMarker.current = new maplibregl.Marker({ color: "#16a34a" })
        .setLngLat([point.longitude, point.latitude]).addTo(instance);
      onLocationPickedRef.current?.(point);
    });
    publishCenter();
    instance.addControl(new maplibregl.NavigationControl(), "top-right");
    instance.on("error", (event) => console.error("MapLibre error:", event.error));

    return () => {
      markers.current.forEach((marker) => marker.remove());
      markers.current = [];
      pickMarker.current?.remove();
      instance.remove();
      map.current = null;
    };
  }, []);

  useEffect(() => {
    if (!destination || !map.current) return;
    map.current.flyTo({
      center: [destination.longitude, destination.latitude],
      zoom: destination.zoom,
      essential: true,
    });
  }, [destination]);

  useEffect(() => {
    const instance = map.current;
    if (!instance) return;
    markers.current.forEach((marker) => marker.remove());
    markers.current = reports.filter((r) =>
      Number.isFinite(r.longitude) && Number.isFinite(r.latitude)
    ).map((report) => {
      const markerButton = document.createElement("button");
      markerButton.type = "button";
      markerButton.setAttribute("aria-label", `View ${report.category} report in ${report.village || "Panaji"}`);
      markerButton.title = report.category;
      const IconComponent = ICONS[report.category] || MapPin;
      markerButton.style.cssText = [
        "display:flex", "align-items:center", "justify-content:center",
        "width:34px", "height:34px", "padding:0", "border:2px solid white",
        "border-radius:50%", `background:${COLORS[report.category] || COLORS.Other}`,
        "color:white", "box-shadow:0 2px 8px #172d3b77", "cursor:pointer",
      ].join(";");
      markerButton.innerHTML = renderToStaticMarkup(
        <IconComponent size={19} strokeWidth={2.5} aria-hidden="true" />
      );
      markerButton.addEventListener("click", (event) => {
        event.stopPropagation();
        if (!pickingRef.current) onSelectRef.current(report);
      });

      return new maplibregl.Marker({ element: markerButton })
        .setLngLat([report.longitude, report.latitude])
        .addTo(instance);
    });
  }, [reports]);

  useEffect(() => {
    if (!selectedId || !map.current) return;
    const report = reports.find((r) => r.id === selectedId);
    if (!report) return;
    map.current.flyTo({ center: [report.longitude, report.latitude], zoom: Math.max(map.current.getZoom(), 14), essential: true });
  }, [selectedId, reports]);

  return (
    <div className="map-wrap">
      <div ref={container} className="map-canvas" aria-label="Map of community reports" />
    </div>
  );
}
