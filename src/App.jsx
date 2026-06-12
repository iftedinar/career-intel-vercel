import { useState, useEffect } from "react";
import { Target, FileText, Bookmark, Zap, UserCheck, User, Sun, Moon, Settings } from "lucide-react";
import { useStore } from "./lib/store.js";
import DocumentsPage     from "./pages/DocumentsPage.jsx";
import OpportunitiesPage from "./pages/OpportunitiesPage.jsx";
import TrackerPage       from "./pages/TrackerPage.jsx";

// ─── Model options ────────────────────────────────────────────────────────────
const MODELS = [
  { value: "gpt-4o-mini",   label: "GPT-4o mini",   provider: "OpenAI",    note: "Fast" },
  { value: "gpt-4o",        label: "GPT-4o",         provider: "OpenAI",    note: "Powerful" },
  { value: "claude-haiku",  label: "Claude Haiku",   provider: "Anthropic", note: "Fast" },
  { value: "claude-sonnet", label: "Claude Sonnet",  provider: "Anthropic", note: "Best" },
];

// ─── Landing page ─────────────────────────────────────────────────────────────
function LandingPage({ onGuest, onSignIn, theme, onToggleTheme }) {
  return (
    <div style={{
      minHeight: "100vh", display: "flex", alignItems: "center",
      justifyContent: "center", background: "var(--bg)", padding: "2rem",
    }}>
      {/* Theme toggle */}
      <button
        onClick={onToggleTheme}
        title={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
        style={{
          position: "fixed", top: "1.25rem", right: "1.25rem",
          background: "var(--bg2)", border: "1px solid var(--b2)",
          borderRadius: "var(--r)", padding: ".5rem .65rem",
          cursor: "pointer", color: "var(--tx2)",
          display: "flex", alignItems: "center", gap: 6,
          fontSize: ".75rem", transition: "all var(--t)",
        }}
      >
        {theme === "dark" ? <Sun size={14} /> : <Moon size={14} />}
        {theme === "dark" ? "Light" : "Dark"}
      </button>

      <div style={{ width: "100%", maxWidth: 440 }}>
        {/* Logo */}
        <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: "2.25rem" }}>
          <div className="logo-ico" style={{ width: 44, height: 44, borderRadius: 12, fontSize: 20 }}>
            <Zap size={20} />
          </div>
          <div>
            <div style={{ fontFamily: "var(--serif)", fontSize: "1.65rem", color: "var(--tx)", lineHeight: 1.1 }}>
              Career Intel
            </div>
            <div style={{ fontSize: ".71rem", color: "var(--tx3)", textTransform: "uppercase", letterSpacing: ".1em", marginTop: 3 }}>
              AI-powered opportunity engine
            </div>
          </div>
        </div>

        <p style={{ fontSize: ".875rem", color: "var(--tx2)", lineHeight: 1.8, marginBottom: "2rem", marginTop: 0 }}>
          Upload your resume → get ranked internships, full-time jobs,
          startups worth cold-emailing, and grad programs — all matched
          to your profile, visa status, and goals.
        </p>

        {/* Mode cards */}
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <button
            onClick={onGuest}
            style={{
              background: "var(--bg2)", border: "1.5px solid var(--b2)",
              borderRadius: "var(--rl)", padding: "1.15rem 1.3rem",
              cursor: "pointer", textAlign: "left", transition: "all var(--t)", width: "100%",
            }}
            onMouseEnter={e => e.currentTarget.style.borderColor = "var(--amber)"}
            onMouseLeave={e => e.currentTarget.style.borderColor = "var(--b2)"}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 5 }}>
              <User size={15} style={{ color: "var(--tx3)" }} />
              <span style={{ fontSize: ".9rem", fontWeight: 600, color: "var(--tx)" }}>Continue as Guest</span>
              <span style={{ marginLeft: "auto", fontSize: ".69rem", background: "var(--bg3)", color: "var(--tx3)", padding: "2px 9px", borderRadius: 999 }}>
                No account needed
              </span>
            </div>
            <div style={{ fontSize: ".78rem", color: "var(--tx3)", paddingLeft: 25, lineHeight: 1.6 }}>
              Full access — your data stays in this browser only.
            </div>
          </button>

          <button
            onClick={onSignIn}
            style={{
              background: "var(--amberD)", border: "1.5px solid rgba(232,160,32,.25)",
              borderRadius: "var(--rl)", padding: "1.15rem 1.3rem",
              cursor: "pointer", textAlign: "left", transition: "all var(--t)", width: "100%",
            }}
            onMouseEnter={e => e.currentTarget.style.borderColor = "var(--amber)"}
            onMouseLeave={e => e.currentTarget.style.borderColor = "rgba(232,160,32,.25)"}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 5 }}>
              <UserCheck size={15} style={{ color: "var(--amber)" }} />
              <span style={{ fontSize: ".9rem", fontWeight: 600, color: "var(--tx)" }}>Sign in / Create account</span>
              <span style={{ marginLeft: "auto", fontSize: ".69rem", background: "var(--amberD2)", color: "var(--amber)", padding: "2px 9px", borderRadius: 999 }}>
                Coming soon
              </span>
            </div>
            <div style={{ fontSize: ".78rem", color: "var(--tx3)", paddingLeft: 25, lineHeight: 1.6 }}>
              Save history and access across devices (Supabase — in development).
            </div>
          </button>
        </div>

        <div style={{ marginTop: "1.75rem", fontSize: ".7rem", color: "var(--tx3)", textAlign: "center" }}>
          Powered by OpenAI · Anthropic · USAJobs · JSearch · Adzuna
        </div>
      </div>
    </div>
  );
}

// ─── Nav items ────────────────────────────────────────────────────────────────
const NAV = [
  { id: "opportunities", label: "Opportunities", icon: Target },
  { id: "documents",     label: "Documents",     icon: FileText },
  { id: "tracker",       label: "Tracker",       icon: Bookmark },
];

// ─── App shell ────────────────────────────────────────────────────────────────
export default function App() {
  const [mode, setMode]   = useState(null);
  const [page, setPage]   = useState("documents");
  const [theme, setTheme] = useState(() => localStorage.getItem("ci_theme") || "dark");
  const [showModelPicker, setShowModelPicker] = useState(false);

  const {
    profile, setProfile, opps, setOpps,
    saved, toggleSave, setStatus,
    filters, setFilters,
    aiModel, setAiModel,
    reset,
  } = useStore();

  // Apply theme
  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
    localStorage.setItem("ci_theme", theme);
  }, [theme]);

  function toggleTheme() { setTheme(t => t === "dark" ? "light" : "dark"); }
  function handleProfile(p) { setProfile(p); setPage("opportunities"); }
  function handleSignIn() {
    alert("Account sign-in coming soon. Continuing as guest for now.");
    setMode("guest");
  }

  if (!mode) {
    return <LandingPage onGuest={() => setMode("guest")} onSignIn={handleSignIn} theme={theme} onToggleTheme={toggleTheme} />;
  }

  const initials = profile?.name
    ? profile.name.split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase()
    : "CI";
  const savedCount = Object.keys(saved).length;
  const oppCount   = (opps?.internships?.length || 0) + (opps?.fulltime_jobs?.length || 0) +
                     (opps?.startups?.length || 0)    + (opps?.grad_programs?.length || 0);

  const currentModel = MODELS.find(m => m.value === aiModel) || MODELS[0];

  return (
    <div className="shell">
      {/* ── Sidebar ── */}
      <aside className="side">
        {/* Logo */}
        <div className="logo">
          <div className="logo-mark">
            <div className="logo-ico"><Zap size={14} /></div>
            <div>
              <div className="logo-name">Career Intel</div>
              <div className="logo-sub">v7 · {mode === "guest" ? "Guest" : "Signed in"}</div>
            </div>
          </div>
        </div>

        {/* Nav */}
        <nav className="nav">
          {NAV.map(({ id, label, icon: Icon }) => (
            <div key={id} className={`ni ${page === id ? "on" : ""}`} onClick={() => setPage(id)}>
              <Icon size={15} style={{ opacity: .75, flexShrink: 0 }} />
              {label}
              {id === "tracker"       && savedCount > 0 && <span className="nb">{savedCount}</span>}
              {id === "opportunities" && oppCount > 0   && <span className="nb">{oppCount}</span>}
            </div>
          ))}
        </nav>

        {/* Bottom section */}
        <div className="side-bot">
          {/* AI Model picker */}
          <div style={{ marginBottom: ".75rem" }}>
            <div style={{
              fontSize: ".65rem", color: "var(--tx3)",
              textTransform: "uppercase", letterSpacing: ".06em",
              marginBottom: 5, display: "flex", justifyContent: "space-between", alignItems: "center",
            }}>
              <span>AI Model</span>
              <span style={{ color: currentModel.provider === "Anthropic" ? "var(--blue)" : "var(--green)", fontWeight: 500 }}>
                {currentModel.provider}
              </span>
            </div>
            <select
              value={aiModel}
              onChange={e => setAiModel(e.target.value)}
              style={{
                width: "100%", fontSize: ".76rem",
                padding: ".38rem .55rem", borderRadius: "var(--r)",
              }}
            >
              <optgroup label="OpenAI">
                <option value="gpt-4o-mini">GPT-4o mini — fast</option>
                <option value="gpt-4o">GPT-4o — powerful</option>
              </optgroup>
              <optgroup label="Anthropic">
                <option value="claude-haiku">Claude Haiku — fast</option>
                <option value="claude-sonnet">Claude Sonnet — best quality</option>
              </optgroup>
            </select>
            <div style={{ fontSize: ".67rem", color: "var(--tx3)", marginTop: 4, lineHeight: 1.4 }}>
              Auto-fallback enabled — if the primary fails, the other provider is tried automatically.
            </div>
          </div>

          {/* Divider */}
          <div style={{ height: 1, background: "var(--b)", marginBottom: ".75rem" }} />

          {/* User row */}
          <div className="user-row">
            <div className="ava">{initials}</div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: ".8rem", fontWeight: 500, color: "var(--tx)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {profile?.name || "Guest Mode"}
              </div>
              <div style={{ fontSize: ".7rem", color: "var(--tx3)", marginTop: 1 }}>
                {profile ? profile.university || "Profile loaded" : "Upload resume to start"}
              </div>
            </div>
            <button
              className="btn ghost ico xs"
              onClick={toggleTheme}
              title={theme === "dark" ? "Light mode" : "Dark mode"}
            >
              {theme === "dark" ? <Sun size={12} /> : <Moon size={12} />}
            </button>
            <button
              className="btn ghost xs"
              onClick={() => { reset(); setMode(null); }}
              title="Exit to home"
            >
              Exit
            </button>
          </div>
        </div>
      </aside>

      {/* ── Main content ── */}
      <main className="main">
        {profile && page !== "documents" && (
          <div style={{ padding: ".6rem 2.5rem 0", maxWidth: 980, margin: "0 auto" }}>
            <div className="pbar-strip">
              <div style={{ width: 7, height: 7, borderRadius: "50%", background: "var(--green)", flexShrink: 0 }} />
              <strong style={{ color: "var(--tx)" }}>{profile.name}</strong>
              {profile.university && (
                <>
                  <span style={{ color: "var(--b3)" }}>·</span>
                  <span style={{ fontSize: ".8rem", color: "var(--tx2)" }}>{profile.university}</span>
                </>
              )}
              {profile.gpa && (
                <>
                  <span style={{ color: "var(--b3)" }}>·</span>
                  <span style={{ fontFamily: "var(--mono)", color: "var(--amber)", fontSize: ".8rem" }}>GPA {profile.gpa}</span>
                </>
              )}
              {profile.visa_status && (
                <>
                  <span style={{ color: "var(--b3)" }}>·</span>
                  <span style={{ color: "var(--tx3)", fontSize: ".74rem" }}>{profile.visa_status}</span>
                </>
              )}
              <button className="btn ghost xs" style={{ marginLeft: "auto" }} onClick={() => setPage("documents")}>
                Update docs
              </button>
            </div>
          </div>
        )}

        {page === "documents"     && <DocumentsPage    profile={profile} onDone={handleProfile} aiModel={aiModel} />}
        {page === "opportunities" && <OpportunitiesPage profile={profile} opps={opps} onRefresh={setOpps} saved={saved} onSave={toggleSave} filters={filters} setFilters={setFilters} aiModel={aiModel} />}
        {page === "tracker"       && <TrackerPage       saved={saved} setStatus={setStatus} onRemove={id => toggleSave(id, saved[id])} />}
      </main>
    </div>
  );
}
