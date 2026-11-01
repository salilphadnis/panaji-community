export const CATEGORIES = [
  "Flooding / Waterlogging",
  "Road obstruction",
  "Road damage",
  "Landslide",
  "Coastal issue",
  "Infrastructure",
  "Other"
] as const;

export type Category = (typeof CATEGORIES)[number];

export type Report = {
  id: string;
  category: Category;
  description: string;
  village: string | null;
  latitude: number;
  longitude: number;
  created_at: string;
  incident_time: string | null;
  moderation_status: "pending" | "approved" | "rejected";
  incident_status: "active" | "resolved" | "expired";
  image_url?: string | null;
  confirmation_count?: number;
};
