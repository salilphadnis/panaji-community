import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { CATEGORIES } from "@/lib/types";
import { isWithinGoaBounds } from "@/lib/goaBounds";

export const runtime = "nodejs";
const MAX_IMAGE_BYTES = 8 * 1024 * 1024;
const allowedTypes = ["image/jpeg", "image/png", "image/webp"];

export async function POST(request: NextRequest) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) return NextResponse.json({ error: "Server is not configured for submissions." }, { status: 503 });

  // Fail closed in production unless both protections are configured.
  const turnstileSecret = process.env.TURNSTILE_SECRET_KEY;
  const redisUrl = process.env.UPSTASH_REDIS_REST_URL;
  const redisToken = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (process.env.NODE_ENV === "production" && (!turnstileSecret || !redisUrl || !redisToken)) {
    return NextResponse.json({ error: "Public submissions are not configured yet." }, { status: 503 });
  }

  try {
    const form = await request.formData();
    const category = String(form.get("category") || "");
    const description = String(form.get("description") || "").trim();
    const village = String(form.get("village") || "").trim().slice(0, 100);
    const latitude = Number(form.get("latitude"));
    const longitude = Number(form.get("longitude"));
    const photo = form.get("photo");
    const turnstileToken = String(form.get("turnstileToken") || "");

    if (turnstileSecret && redisUrl && redisToken) {
      if (!turnstileToken) return NextResponse.json({ error: "Please complete the security check." }, { status: 400 });
      const verifyBody = new URLSearchParams({ secret: turnstileSecret, response: turnstileToken });
      const verifyResponse = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
        method: "POST", body: verifyBody, cache: "no-store"
      });
      if (!verifyResponse.ok) return NextResponse.json({ error: "Security verification is temporarily unavailable." }, { status: 503 });
      const verification = await verifyResponse.json() as { success?: boolean; hostname?: string };
      const expectedHostname = process.env.TURNSTILE_EXPECTED_HOSTNAME;
      if (!verification.success || (expectedHostname && verification.hostname !== expectedHostname)) {
        return NextResponse.json({ error: "Security verification failed. Please try again." }, { status: 403 });
      }

      // Shared Redis fixed-window limiter: 5 submissions per IP per hour.
      const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
      if (!ip) return NextResponse.json({ error: "Unable to verify request origin." }, { status: 400 });
      const encoder = new TextEncoder();
      const digest = await crypto.subtle.digest("SHA-256", encoder.encode(ip));
      const ipHash = Array.from(new Uint8Array(digest), b => b.toString(16).padStart(2, "0")).join("");
      const key = `report-rate:${ipHash}:${Math.floor(Date.now() / 3600000)}`;
      const limiterResponse = await fetch(`${redisUrl.replace(/\/$/, "")}/pipeline`, {
        method: "POST",
        headers: { Authorization: `Bearer ${redisToken}`, "Content-Type": "application/json" },
        body: JSON.stringify([["INCR", key], ["EXPIRE", key, 7200]]),
        cache: "no-store"
      });
      if (!limiterResponse.ok) return NextResponse.json({ error: "Submission protection is temporarily unavailable." }, { status: 503 });
      const results = await limiterResponse.json() as Array<{ result?: number; error?: string }>;
      if (!Array.isArray(results) || results.length !== 2 || results.some(r => r.error) || typeof results[0]?.result !== "number" || results[1]?.result !== 1) {
        return NextResponse.json({ error: "Submission protection is temporarily unavailable." }, { status: 503 });
      }
      if (results[0].result > 5) return NextResponse.json({ error: "Too many reports from this connection. Please try again later." }, { status: 429 });
    }

    if (!CATEGORIES.includes(category as (typeof CATEGORIES)[number])) return NextResponse.json({ error: "Invalid category." }, { status: 400 });
    if (description.length < 8 || description.length > 1000) return NextResponse.json({ error: "Description must be between 8 and 1,000 characters." }, { status: 400 });
    if (!isWithinGoaBounds(latitude, longitude)) return NextResponse.json({ error: "Location is outside the supported Goa area." }, { status: 400 });
    if (photo instanceof File && photo.size > MAX_IMAGE_BYTES) return NextResponse.json({ error: "Image must be 8 MB or smaller." }, { status: 400 });
    if (photo instanceof File && !allowedTypes.includes(photo.type)) return NextResponse.json({ error: "Use a JPEG, PNG, or WebP image." }, { status: 400 });

    const supabase = createClient(url, serviceKey, { auth: { persistSession: false } });
    const { data: report, error: insertError } = await supabase.from("reports").insert({
      category, description, village: village || null, latitude, longitude,
      moderation_status: "pending", incident_status: "active"
    }).select("id").single();

    if (insertError) {
      console.error("Supabase report insert failed:", {
        code: insertError.code,
        message: insertError.message,
        details: insertError.details,
        hint: insertError.hint,
      });
    }

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
    return NextResponse.json({ error: "Submission could not be processed. Please try again." }, { status: 503 });
  }
}
