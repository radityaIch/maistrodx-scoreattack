import { TournamentForm } from "@/components/admin/TournamentForm";

export default function NewTournamentPage() {
  return (
    <div>
      <h1 className="text-display text-3xl mb-6">New tournament</h1>
      <TournamentForm mode="create" />
    </div>
  );
}
