import { redirect } from "next/navigation";

// Conflicts are now resolved inline from each contact's detail page.
// Redirect to the contacts list filtered by sync_status=conflict.
export default function ConflictsPage() {
  redirect("/contacts?status=conflict");
}
