"use client";

import dynamic from "next/dynamic";
import { useCallback, useEffect, useMemo, useState } from "react";
import { MapPin, Plus, ShieldCheck, Camera, RefreshCw } from "lucide-react";
import ReportForm from "@/components/ReportForm";
import { supabase } from "@/lib/supabase";
import { CATEGORIES, type Report } from "@/lib/types";
import { GOA_LOCATIONS } from "@/lib/locations";
import { reportLocality } from "@/lib/goaLocality";
import { isWithinGoaBounds } from "@/lib/goaBounds";

const MapView = dynamic(() => import("@/components/MapView"), { ssr: false, loading: () => <div className="loading">Loading map…</div> });
const filters = ["All reports", ...CATEGORIES];

export default function Home() {
  const [reports, setReports] = useState<Report[]>([]);
  const [filter, setFilter] = useState("All reports");
  const [showForm, setShowForm] = useState(false);
  const [mapCenter, setMapCenter] = useState({ latitude: 15.4909, longitude: 73.8278 });
  const [selectedArea, setSelectedArea] = useState("current");
  const [locationMessage, setLocationMessage] = useState("Requesting browser location…");
  const [mapDestination, setMapDestination] = useState<{latitude: number; longitude: number; zoom: number; requestId: number} | null>(null);
  const [pickingLocation, setPickingLocation] = useState(false);
  const [pickedLocation, setPickedLocation] = useState<{latitude: number; longitude: number} | null>(null);
  const [selected, setSelected] = useState<Report | null>(null);
  const [loading, setLoading] = useState(true);
  const [notice, setNotice] = useState("");

  const loadReports = useCallback(async () => {
    if (!supabase) { setNotice("Connect Supabase to load live community reports."); setLoading(false); return; }
    const { data, error } = await supabase
      .from("reports")
      .select("id,category,description,village,latitude,longitude,created_at,incident_time,moderation_status,incident_status")
      .in("moderation_status", ["pending", "approved"])
      .neq("incident_status", "expired")
      .order("created_at", { ascending: false })
      .limit(250);
    if (error) setNotice("Unable to load reports. Check your Supabase configuration and database policies.");
    else setReports((data || []) as Report[]);
    setLoading(false);
  }, []);

  useEffect(() => { loadReports(); }, [loadReports]);

  const navigateTo = useCallback((latitude: number, longitude: number, zoom = 13) => {
    setMapDestination((previous) => ({ latitude, longitude, zoom, requestId: (previous?.requestId ?? 0) + 1 }));
  }, []);

  const showAllGoa = useCallback(() => {
    // MapView recognizes an out-of-bounds destination and fits all Goa.
    navigateTo(0, 0, 0);
  }, [navigateTo]);

  const locateUser = useCallback(() => {
    if (!navigator.geolocation) {
      setLocationMessage("Location unavailable. Showing all of Goa.");
      showAllGoa();
      return;
    }
    setLocationMessage("Requesting browser location…");
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => {
        if (isWithinGoaBounds(coords.latitude, coords.longitude)) {
          setLocationMessage("Map centered on your current location in Goa.");
          navigateTo(coords.latitude, coords.longitude, 13);
        } else {
          setLocationMessage("Your location is outside Goa. Showing all of Goa.");
          showAllGoa();
        }
      },
      () => {
        setLocationMessage("Location permission denied or unavailable. Showing all of Goa; choose a locality below.");
        showAllGoa();
      },
      { enableHighAccuracy: false, timeout: 12000, maximumAge: 60000 }
    );
  }, [navigateTo, showAllGoa]);

  useEffect(() => { locateUser(); }, [locateUser]);

  function chooseArea(id: string) {
    setSelectedArea(id);
    if (id === "current") { locateUser(); return; }
    const place = GOA_LOCATIONS.find((location) => location.id === id);
    if (place) {
      setLocationMessage(`Showing ${place.name}.`);
      navigateTo(place.latitude, place.longitude, place.zoom ?? 13);
    }
  }


  const visibleReports = useMemo(() => filter === "All reports" ? reports : reports.filter((r) => r.category === filter), [reports, filter]);
  const todayCount = reports.filter((r) => new Date(r.created_at).toDateString() === new Date().toDateString()).length;
  const confirmedCount = reports.filter((r) => r.moderation_status === "approved").length;
  const selectReport = useCallback((report: Report) => setSelected(report), []);

  function relativeTime(value: string) {
    const minutes = Math.max(0, Math.floor((Date.now() - new Date(value).getTime()) / 60000));
    if (minutes < 60) return `${minutes} min ago`;
    if (minutes < 1440) return `${Math.floor(minutes / 60)} hr ago`;
    return `${Math.floor(minutes / 1440)} days ago`;
  }

  return (
    <main className="shell">
      <header className="topbar">
        <a className="brand" href="/">
          <div className="brand-mark"><MapPin size={22}/></div>
          <div><div className="brand-name">Goa Community</div><div className="brand-sub">A community-powered local map</div></div>
        </a>
        <div className="top-actions">
          <div className="area-pill"><MapPin size={12} style={{display:"inline",verticalAlign:"middle"}}/> Goa</div>
          <button className="primary-btn" onClick={() => { setPickedLocation(null); setPickingLocation(false); setShowForm(true); }}><Plus size={15}/> Report incident</button>
        </div>
      </header>

      <section className="hero">
        <div><div className="eyebrow">Community incident map Â· Pilot</div><h1>Know what's happening across Goa.</h1><p>Explore community-reported flooding, road hazards, and other local incidents across Goa.</p></div>
        <button className="secondary-btn" onClick={() => { setLoading(true); loadReports(); }}><RefreshCw size={14}/> Refresh reports</button>
      </section>

      <section className="stats">
        <div className="stat"><div className="stat-label">Visible reports</div><div className="stat-value">{reports.length}</div></div>
        <div className="stat"><div className="stat-label">Submitted today</div><div className="stat-value">{todayCount}</div></div>
        <div className="stat"><div className="stat-label">Moderator reviewed</div><div className="stat-value">{confirmedCount}</div></div>
      </section>

      {notice && <div className="hint" style={{padding:"0 0 12px"}}>{notice}</div>}

      <section className="content-grid">
        <div className="panel">
          <div className="panel-head"><div><div className="panel-title">Panaji incident map</div><div className="panel-sub">Select a marker to view its report</div></div><span className="hint">Community reports</span></div>
          <div style={{padding:"8px 12px"}}>
            <button className="secondary-btn" onClick={() => { setPickedLocation(null); setPickingLocation((current) => !current); }}>
              <MapPin size={14}/> {pickingLocation ? "Cancel location selection" : "Select incident location on map"}
            </button>
            {pickingLocation && <div className="hint" style={{marginTop:8}}>Click the incident location on the map. A report form will open with its coordinates.</div>}
          </div>
          <div style={{padding:"8px 12px"}}>
            <label htmlFor="goa-location" style={{display:"block",fontWeight:600,marginBottom:6}}>Map location</label>
            <select id="goa-location" value={selectedArea} onChange={(event) => chooseArea(event.target.value)} style={{width:"100%",maxWidth:360,padding:9,borderRadius:8}}>
              <option value="current">My current location</option>
              {GOA_LOCATIONS.map((place) => <option key={place.id} value={place.id}>{place.name}</option>)}
            </select>
            <div className="hint" role="status" style={{marginTop:6}}>{locationMessage}</div>
          </div>
          <div className="filters">{filters.map((item) => <button key={item} className={`filter ${filter === item ? "active" : ""}`} onClick={() => setFilter(item)}>{item}</button>)}</div>
          <div>
            <MapView reports={visibleReports} onSelect={selectReport} selectedId={selected?.id ?? null} onCenterChange={setMapCenter} destination={mapDestination} pickingLocation={pickingLocation} onLocationPicked={(point) => { setPickedLocation(point); setPickingLocation(false); setShowForm(true); }}/>
            <div className="map-note">Community-submitted information may be incomplete or unverified. Check official sources for emergency instructions.</div>
          </div>
        </div>

        <aside className="panel">
          <div className="panel-head"><div><div className="panel-title">Recent reports</div><div className="panel-sub">Latest community submissions</div></div><Camera size={17} color="#718078"/></div>
          <div className="report-list">
            {loading ? <div className="empty">Loading reports…</div> : visibleReports.length === 0 ? <div className="empty">No reports to show yet.<br/>Be the first to contribute.</div> : visibleReports.map((report) => (
              <button key={report.id} onClick={() => selectReport(report)} style={{width:"100%",textAlign:"left",border:0,background:"transparent",padding:0}}>
                <div className="report-item">
                  <div className="report-thumb"><MapPin size={20}/></div>
                  <div className="report-info">
                    <div className="report-title">{report.category}</div>
                    <div className="report-meta">{reportLocality(report)} · {relativeTime(report.created_at)}</div>
                    <div style={{marginTop:7}}><span className={`status ${report.moderation_status === "approved" ? "approved" : ""}`}>{report.moderation_status === "approved" ? "Moderator reviewed" : "Pending review"}</span></div>
                  </div>
                </div>
              </button>
            ))}
          </div>
        </aside>
      </section>

      <footer className="footer-note"><ShieldCheck size={13} style={{display:"inline",verticalAlign:"middle"}}/> Community information is not an official emergency alert service. Reports may be inaccurate, outdated, or unverified. In an emergency, contact the appropriate local authorities. <br/>Map data © OpenStreetMap contributors.</footer>

      {showForm && <ReportForm initialLatitude={(pickedLocation ?? mapCenter).latitude} initialLongitude={(pickedLocation ?? mapCenter).longitude} onClose={() => { setShowForm(false); setPickedLocation(null); }} onSubmitted={loadReports}/>}
      {selected && <div className="modal-backdrop" onMouseDown={(e)=>{if(e.target===e.currentTarget)setSelected(null);}}><section className="modal" role="dialog" aria-modal="true">
        <div className="modal-head"><div><div className="eyebrow">Community report</div><h2>{selected.category}</h2></div><button className="close-btn" onClick={()=>setSelected(null)}>×</button></div>
        <p style={{fontSize:13,lineHeight:1.6}}>{selected.description}</p>
        <div className="hint">{reportLocality(selected)} · {new Date(selected.created_at).toLocaleString()}</div>
        <div className="hint" style={{marginTop:10}}>Coordinates: {selected.latitude.toFixed(5)}, {selected.longitude.toFixed(5)}</div>
        <div className="hint" style={{marginTop:10}}>Incident status: {selected.incident_status}</div>
        <div style={{marginTop:14}}><span className={`status ${selected.moderation_status === "approved" ? "approved" : ""}`}>{selected.moderation_status === "approved" ? "Moderator reviewed" : "Pending review"}</span></div>
      </section></div>}
    </main>
  );
}
