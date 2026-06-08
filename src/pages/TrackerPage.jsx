import { Bookmark, ExternalLink, Trash2 } from "lucide-react";

// Status pipeline shown for every saved opportunity.
const STATUSES = [
  { id: "saved",        label: "Saved",        color: "var(--tx2)"  },
  { id: "applied",      label: "Applied",      color: "var(--blue)" },
  { id: "interviewing", label: "Interviewing", color: "var(--amber)"},
  { id: "offer",        label: "Offer",        color: "var(--green)"},
  { id: "rejected",     label: "Rejected",     color: "var(--red)"  },
];

function statusMeta(id) {
  return STATUSES.find(s => s.id === id) || STATUSES[0];
}

function TrackerCard({ id, item, onSetStatus, onRemove }) {
  const meta = statusMeta(item.status);
  const name = item.title || item.company || item.program || "Untitled opportunity";
  const sub  = [item.company || item.university, item.location, item.type || item.employment_type || item.stage || item.degree]
    .filter(Boolean).join(" · ");

  return (
    <div className="card" style={{ marginBottom: 8 }}>
      <div style={{ display: "flex", alignItems: "flex-start", gap: 12 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: ".9rem", fontWeight: 500, color: "var(--tx)" }}>{name}</div>
          {sub && <div style={{ fontSize: ".77rem", color: "var(--tx2)", marginTop: 2 }}>{sub}</div>}
          {item.savedAt && (
            <div style={{ fontSize: ".7rem", color: "var(--tx3)", marginTop: 4 }}>
              Saved {new Date(item.savedAt).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })}
            </div>
          )}
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 6, flexShrink: 0 }}>
          {(item.apply_url || item.url) && (
            <a className="btn ghost ico xs" href={item.apply_url || item.url} target="_blank" rel="noreferrer" title="Open listing">
              <ExternalLink size={12} />
            </a>
          )}
          <button className="btn ghost ico xs" onClick={() => onRemove(id)} title="Remove from tracker">
            <Trash2 size={12} />
          </button>
        </div>
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap", marginTop: 10 }}>
        <span style={{ fontSize: ".7rem", color: "var(--tx3)", marginRight: 2 }}>Status:</span>
        {STATUSES.map(s => (
          <button
            key={s.id}
            className="btn xs"
            onClick={() => onSetStatus(id, s.id)}
            style={{
              borderColor: item.status === s.id ? s.color : undefined,
              color: item.status === s.id ? s.color : "var(--tx3)",
              background: item.status === s.id ? "var(--bg3)" : "transparent",
            }}
          >
            {s.label}
          </button>
        ))}
        <span className="bd" style={{ marginLeft: "auto", color: meta.color, borderColor: meta.color + "40", background: "var(--bg3)" }}>
          {meta.label}
        </span>
      </div>
    </div>
  );
}

export default function TrackerPage({ saved, setStatus, onRemove }) {
  const entries = Object.entries(saved || {}).sort((a, b) => (b[1].savedAt || 0) - (a[1].savedAt || 0));

  const counts = STATUSES.reduce((acc, s) => {
    acc[s.id] = entries.filter(([, item]) => item.status === s.id).length;
    return acc;
  }, {});

  return (
    <div className="page si">
      <div className="ph">
        <div>
          <div className="ph-title">Tracker</div>
          <div className="ph-sub">
            {entries.length
              ? `${entries.length} saved opportunit${entries.length === 1 ? "y" : "ies"} — track your application progress`
              : "Bookmark opportunities from the Opportunities tab to track them here"}
          </div>
        </div>
      </div>

      {entries.length > 0 && (
        <div className="mets">
          {STATUSES.map(s => (
            <div key={s.id} className="met">
              <div className="met-v" style={{ color: s.color, fontFamily: "var(--mono)" }}>{counts[s.id]}</div>
              <div className="met-l">{s.label}</div>
            </div>
          ))}
        </div>
      )}

      {entries.length === 0 ? (
        <div className="empty">
          <div style={{ fontSize: "2rem", marginBottom: ".75rem" }}><Bookmark size={28} style={{ color: "var(--tx3)" }} /></div>
          <div style={{ fontSize: ".85rem" }}>
            Nothing saved yet.<br />
            <span style={{ color: "var(--tx3)", fontSize: ".78rem" }}>
              Go to Opportunities, click the bookmark icon on any listing, and it will show up here.
            </span>
          </div>
        </div>
      ) : (
        entries.map(([id, item]) => (
          <TrackerCard key={id} id={id} item={item} onSetStatus={setStatus} onRemove={onRemove} />
        ))
      )}
    </div>
  );
}
