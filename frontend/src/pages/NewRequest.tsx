import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { LocationPicker } from "@/components/MapView";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { api } from "@/lib/api";
import { useLargeText } from "@/lib/prefs";
import { PLACES } from "@/lib/places";

export default function NewRequest() {
  const navigate = useNavigate();
  const [large, setLarge] = useLargeText();
  const [text, setText] = useState("");
  const [people, setPeople] = useState("");
  const [place, setPlace] = useState("");
  const [loc, setLoc] = useState<{ lat: number; lng: number } | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const pickPlace = (name: string) => {
    setPlace(name);
    const p = PLACES.find((x) => x.name === name);
    if (p) setLoc({ lat: p.lat, lng: p.lng });
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!loc) return setError("Please choose a location on the map or from the list.");
    setBusy(true);
    setError("");
    try {
      const incident = await api<{ id: string }>("/api/incidents", {
        body: { text, people_affected: people, lat: loc.lat, lng: loc.lng, address_text: place },
      });
      navigate(`/incidents/${incident.id}`);
    } catch (err) {
      setError((err as Error).message);
      setBusy(false);
    }
  };

  return (
    <form onSubmit={submit} className="mx-auto max-w-2xl space-y-4">
      <h1 className="text-2xl font-bold">Request emergency help</h1>
      <p className="text-sm text-slate-600">
        Describe what is happening. A coordinator will review your request. This is not a replacement for official
        emergency services: if life is in immediate danger, call your local emergency number.
      </p>
      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" checked={large} onChange={(e) => setLarge(e.target.checked)} className="size-4" />
        Large text
      </label>

      <Card>
        <CardHeader><CardTitle>What do you need?</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <label className="block">
            <span className="text-sm font-medium">Describe the emergency</span>
            <textarea
              required rows={5} value={text} onChange={(e) => setText(e.target.value)}
              placeholder="e.g. Water is entering our ground floor. Six people, including an elderly person. We need drinking water."
              className="mt-1 w-full rounded border border-slate-300 p-3"
            />
          </label>
          <label className="block">
            <span className="text-sm font-medium">Number of people affected</span>
            <input type="number" min={0} value={people} onChange={(e) => setPeople(e.target.value)}
              className="mt-1 w-32 rounded border border-slate-300 p-2" />
          </label>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Where are you?</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <label className="block">
            <span className="text-sm font-medium">Pick a known place</span>
            <select value={place} onChange={(e) => pickPlace(e.target.value)} className="mt-1 block w-full rounded border border-slate-300 p-2">
              <option value="">Choose…</option>
              {PLACES.map((p) => <option key={p.name}>{p.name}</option>)}
            </select>
          </label>
          <p className="text-sm text-slate-600">…or click the exact spot on the map.</p>
          <LocationPicker value={loc} onChange={(lat, lng) => setLoc({ lat, lng })} />
          {loc && <p className="text-xs text-slate-500">Selected: {loc.lat.toFixed(4)}, {loc.lng.toFixed(4)}</p>}
        </CardContent>
      </Card>

      {error && <p role="alert" className="text-sm text-red-700">{error}</p>}
      <Button type="submit" size="lg" disabled={busy}>{busy ? "Sending…" : "Send request"}</Button>
    </form>
  );
}
