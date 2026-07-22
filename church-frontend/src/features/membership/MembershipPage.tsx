import { useEffect, useState } from "react";
import { listMembers, Member } from "./api";

export default function MembershipPage() {
  const [members, setMembers] = useState<Member[]>([]);

  useEffect(() => {
    listMembers().then(setMembers).catch(console.error);
  }, []);

  return (
    <div>
      <h1>Membership</h1>
      <ul>
        {members.map((m) => (
          <li key={m.ID}>{m.Name} — {m.Email}</li>
        ))}
      </ul>
    </div>
  );
}
