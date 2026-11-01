import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { CATEGORIES } from "@/lib/types";

export const runtime = "nodejs";
const MAX_IMAGE_BYTES = 8 * 1024 * 1024;
const allowedTypes = ["image/jpeg", "image/png", "image/webp"];

export async function POST(request: NextRequest) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) return NextResponse.json({ error: "Server is not configured for submissions." }, { status: 503 });

  // Public production submissions remain disabled until Turnstile verification
  // AND a shared IP-based rate limiter (e.g. Upstash Redis) are implemented.
  // Do not rely on in-memory rate limiting on serverless hosting.
  if (process.env.NODE_ENV === "production") {
    return NextResponse.json({ error: "Public submissions are not enabled on this deployment yet. Anti-abuse protection must be configured first." }, { status: 503 });
  }

  try {
    const form = await request.formData();
    const category = String(form.get("category") || "");
    const description = String(form.get("description") || "").trim();
    const village = String(form.get("village") || "").trim().slice(0, 100);
    const latitude = Number(form.get("latitude"));
    const longitude = Number(form.get("longitude"));
    const photo = form.get("photo");

    if (!CATEGORIES.includes(category as (typeof CATEGORIES)[number])) return NextResponse.json({ error: "Invalid category." }, { status: 400 });
    if (description.length < 8 || description.length > 1000) return NextResponse.json({ error: "Description must be between 8 and 1,000 characters." }, { status: 400 });
    if (!Number.isFinite(latitude) || latitude < 15.40 || latitude > 15.60 || !Number.isFinite(longitude) || longitude < 73.75 || longitude > 73.95) return NextResponse.json({ error: "Location is outside the Panaji pilot area." }, { status: 400 });
    if (photo instanceof File && photo.size > MAX_IMAGE_BYTES) return NextResponse.json({ error: "Image must be 8 MB or smaller." }, { status: 400 });
    if (photo instanceof File && !allowedTypes.includes(photo.type)) return NextResponse.json({ error: "Use a JPEG, PNG, or WebP image." }, { status: 400 });

    const supabase = createClient(url, serviceKey, { auth: { persistSession: false } });
    const { data: report, error: insertError } = await supabase.from("reports").insert({
      category, description, village: village || null, latitude, longitude,
      moderation_status: "pending", incident_status: "active"
    }).select("id").single();

    if (insertError || !report) {
      return NextResponse.json({ error: "Could not save report. Check the database setup." }, { status: 500 });
    }

    if (photo instanceof File && photo.size > 0) {
      const extension = photo.type === "image/png" ? "png" : photo.type === "image/webp" ? "webp" : "jpg";
      const path = `${report.id}/${crypto.randomUUID()}.${extension}`;
      const { error: uploadError } = await supabase.storage.from("report-photos").upload(path, photo, {
        contentType: photo.type, upsert: false
      });
      if (uploadError) {
        await supabase.from("reports").delete().eq("id", report.id);
        return NextResponse.json({ error: "Photo upload failed. Please try again." }, { status: 500 });
      }
      const { data: publicUrl } = supabase.storage.from("report-photos").getPublicUrl(path);
      const { error: imageError } = await supabase.from("report_images").insert({
        report_id: report.id, storage_path: path, public_url: publicUrl.publicUrl
      });
      if (imageError) {
        await supabase.from("reports").delete().eq("id", report.id);
        return NextResponse.json({ error: "Could not attach photo to report." }, { status: 500 });
      }
    }

    return NextResponse.json({ id: report.id, status: "pending" }, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Invalid submission." }, { status: 400 });
  }
}
