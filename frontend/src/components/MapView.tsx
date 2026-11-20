// Leaflet + OpenStreetMap (no API key). Circle markers avoid Leaflet's icon-image bundling issues.
import { CircleMarker, MapContainer, Popup, TileLayer, useMapEvents } from "react-leaflet";
import { URGENCY_COLOR } from "@/components/badges";
import { MAP_CENTER } from "@/lib/places";
import type { IncidentListItem } from "@/lib/types";
import { label } from "@/lib/utils";

const Tiles = () => (
  <TileLayer
    url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
  />
);

/** Incident map for the coordinator: one dot per incident, coloured by urgency. */
export function IncidentMap({
  incidents, onSelect, height = 380,
}: { incidents: IncidentListItem[]; onSelect?: (id: string) => void; height?: number }) {
  return (
    <MapContainer center={MAP_CENTER} zoom={13} style={{ height }} className="rounded-lg">
      <Tiles />
      {incidents.map((i) => (
        <CircleMarker
          key={i.id} center={[i.lat, i.lng]} radius={i.status === "resolved" || i.status === "rejected" ? 6 : 10}
          pathOptions={{
            color: URGENCY_COLOR[i.urgency], fillColor: URGENCY_COLOR[i.urgency],
            fillOpacity: i.status === "resolved" || i.status === "rejected" ? 0.25 : 0.7,
          }}
          eventHandlers={{ click: () => onSelect?.(i.id) }}
        >
          <Popup>
            <strong>{label(i.category)}</strong> · {i.urgency}<br />
            {label(i.status)}<br />
            {i.address_text}
          </Popup>
        </CircleMarker>
      ))}
    </MapContainer>
  );
}

function ClickToPick({ onPick }: { onPick: (lat: number, lng: number) => void }) {
  useMapEvents({ click: (e) => onPick(e.latlng.lat, e.latlng.lng) });
  return null;
}

/** Map where the citizen clicks to set the emergency location. */
export function LocationPicker({
  value, onChange,
}: { value: { lat: number; lng: number } | null; onChange: (lat: number, lng: number) => void }) {
  return (
    <MapContainer center={value ? [value.lat, value.lng] : MAP_CENTER} zoom={13} style={{ height: 280 }} className="rounded-lg">
      <Tiles />
      <ClickToPick onPick={onChange} />
      {value && <CircleMarker center={[value.lat, value.lng]} radius={10} pathOptions={{ color: "#dc2626", fillOpacity: 0.7 }} />}
    </MapContainer>
  );
}
