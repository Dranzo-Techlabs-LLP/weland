import { AirVent } from "lucide-react";

// "AC" or "Non-AC" beside a stay's count: an air-conditioner icon, struck
// through when there is none, and the word, so it never relies on the icon alone.
export default function Climate({ kind }: { kind: "ac" | "non-ac" }) {
  const ac = kind === "ac";
  return (
    <span className={`climate ${ac ? "is-ac" : "is-non-ac"}`}>
      <span className="climate-icon" aria-hidden="true">
        <AirVent size={16} />
        {!ac && (
          <svg className="climate-slash" viewBox="0 0 24 24">
            <line x1="3" y1="21" x2="21" y2="3" />
          </svg>
        )}
      </span>
      {ac ? "AC" : "Non-AC"}
    </span>
  );
}
