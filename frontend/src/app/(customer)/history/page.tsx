import { redirect } from "next/navigation";

// History now lives inside Orders (Track) as its "Past" tab.
export default function HistoryPage() {
  redirect("/track?tab=history");
}
