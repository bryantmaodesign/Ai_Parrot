import { redirect } from "next/navigation";

export default function VocabularyPage() {
  redirect("/library?tab=vocabulary");
}
