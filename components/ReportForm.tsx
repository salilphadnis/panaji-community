"use client";

import { useState } from "react";
import { X, MapPin, UploadCloud } from "lucide-react";
import { CATEGORIES } from "@/lib/types";

type Props = { onClose: () => void; onSubmitted: () => void; initialLatitude: number; initialLongitude: number };

export default function ReportForm({ onClose, onSubmitted, initialLatitude, initialLongitude }: Props) {
  const [category, setCategory] = useState<string>(CATEGORIES[0]);
  const [description, setDescription] = useState("");
  const [village, setVillage] = useState("");
  const [latitude, setLatitude] = useState(() => initialLatitude.toFixed(6));
  const [longitude, setLongitude] = useState(() => initialLongitude.toFixed(6));
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  async function useLocation() {
    setError("");
    if (!navigator.geolocation) {
      setError("Location is not available in this browser. Enter coordinates manually.");
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setLatitude(position.coords.latitude.toFixed(6));
        setLongitude(position.coords.longitude.toFixed(6));
      },
      () => setError("We couldn't access your location. You can enter it manually."),
      { enableHighAccuracy: true, timeout: 10000 }
    );
  }

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true); setError(""); setMessage("");
    try {
      const lat = Number(latitude), lng = Number(longitude);
      if (!Number.isFinite(lat) || lat < 15.40 || lat > 15.60 || !Number.isFinite(lng) || lng < 73.75 || lng > 73.95) {
        throw new Error("Please choose a location within the Panaji pilot area.");
      }
      const body = new FormData();
      body.set("category", category);
      body.set("description", description);
      body.set("village", village);
      body.set("latitude", String(lat));
      body.set("longitude", String(lng));
      if (file) body.set("photo", file);
      const response = await fetch("/api/reports", { method: "POST", body });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Unable to submit report.");
      setMessage("Your report was submitted and is awaiting review.");
      onSubmitted();
      setTimeout(onClose, 1600);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="modal-backdrop" role="presentation" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <section className="modal" role="dialog" aria-modal="true" aria-labelledby="report-title">
        <div className="modal-head">
          <div><div className="eyebrow">Community contribution</div><h2 id="report-title">Report an incident</h2></div>
          <button className="close-btn" onClick={onClose} aria-label="Close"><X size={17}/></button>
        </div>
        <form onSubmit={submit}>
          <div className="field">
            <label htmlFor="category">Incident category</label>
            <select id="category" value={category} onChange={(e) => setCategory(e.target.value)}>
              {CATEGORIES.map((item) => <option key={item}>{item}</option>)}
            </select>
          </div>
          <div className="field">
            <label htmlFor="description">What did you observe?</label>
            <textarea id="description" required minLength={8} maxLength={1000} value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Describe the situation, nearby landmark, and anything residents should know."/>
          </div>
          <div className="field">
            <label htmlFor="village">Locality / nearby landmark</label>
            <input id="village" maxLength={100} value={village} onChange={(e) => setVillage(e.target.value)} placeholder="e.g. Miramar, Campal, Altinho"/>
          </div>
          <div className="field">
            <label>Location coordinates</label>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>
              <input aria-label="Latitude" value={latitude} onChange={(e)=>setLatitude(e.target.value)} placeholder="Latitude"/>
              <input aria-label="Longitude" value={longitude} onChange={(e)=>setLongitude(e.target.value)} placeholder="Longitude"/>
            </div>
            <button type="button" className="secondary-btn" style={{justifySelf:"start"}} onClick={useLocation}><MapPin size={14}/> Use my current location</button>
            <div className="hint">Coordinates are prefilled from your selected map location, or the map center if you used Report incident. You can edit them or use your current GPS location. Confirm the incident location before submitting.</div>
          </div>
          <div className="field">
            <label htmlFor="photo">Photograph (optional, max 8 MB)</label>
            <div className="file-input">
              <input id="photo" type="file" accept="image/jpeg,image/png,image/webp" onChange={(e)=>setFile(e.target.files?.[0] || null)}/>
              <div className="hint"><UploadCloud size={13} style={{display:"inline",verticalAlign:"middle"}}/> Avoid including identifiable people or private information.</div>
            </div>
          </div>
          <div className="hint">Reports are public. Do not submit private, sensitive, or emergency information. For immediate danger, contact local emergency services.</div>
          {error && <p className="form-error">{error}</p>}
          {message && <p className="form-success">{message}</p>}
          <div className="form-actions">
            <button type="button" className="secondary-btn" onClick={onClose}>Cancel</button>
            <button type="submit" className="primary-btn" disabled={busy}>{busy ? "Submitting…" : "Submit report"}</button>
          </div>
        </form>
      </section>
    </div>
  );
}
