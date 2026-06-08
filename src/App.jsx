import { useState, useEffect } from "react";
import { Target, FileText, Bookmark, Zap, UserCheck, User, Sun, Moon } from "lucide-react";
import { useStore } from "./lib/store.js";
import DocumentsPage     from "./pages/DocumentsPage.jsx";
import OpportunitiesPage from "./pages/OpportunitiesPage.jsx";
import TrackerPage       from "./pages/TrackerPage.jsx";

// ─── Landing / mode selector ─────────────────────────────────────────────────
function LandingPage({ onGuest, onSignIn, theme, onToggleTheme }) {
  return (
    <div style={{
      minHeight: "100vh", display: "flex", alignItems: "center",
      justifyContent: "center", background: "var(--bg)", padding: "2rem",
    }}>
      <button
        onClick={onToggleTheme}
        title={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
        style={{
          position: "fixed", top: "1rem", right: "1rem",
          background: "var(--bg2)", border: "1px solid var(--b2)",
          borderRadius: "var(--r)", padding: ".45rem .6rem",
          cursor: "pointer", color: "var(--tx2)", display: "flex", alignItems: "center",
        }}
      >
        {theme === "dark" ? <Sun size={15} /> : <Moon size={15} />}
      </button>
      <div style={{ width: "100%", maxWidth: 420 }}>
        {/* Logo */}
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: "2rem" }}>
          <div className="logo-ico" style={{ width: 40, height: 40, borderRadius: 10, fontSize: 18 }}>
            <Zap size={18} />
          </div>
          <div>
            <div style={{ fontFamily: "var(--serif,Georgia)", fontSize: "1.6rem", color: "var(--tx)" }}>Career Intel</div>
            <div style={{ fontSize: ".72rem", color: "var(--tx3)", textTransform: "uppercase", letterSpacing: ".08em" }}>
              AI-powered opportunity engine
            </div>
          </div>
        </div>

        <div style={{ fontSize: ".88rem", color: "var(--tx2)", lineHeight: 1.75, marginBottom: "2rem" }}>
          Upload your resume → get ranked internships, full-time jobs,
          startups worth cold-emailing, and grad programs — all matched
          to your specific profile, visa status, and location.
        </div>

        {/* Mode cards */}
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {/* Guest */}
          <button
            onClick={onGuest}
            style={{
              background: "var(--bg2)", border: "1px solid var(--b2)",
              borderRadius: "var(--rl)", padding: "1.1rem 1.25rem",
              cursor: "pointer", textAlign: "left", transition: "all var(--t)",
            }}
            onMouseEnter={e => e.currentTarget.style.borderColor = "var(--amber)"}
            onMouseLeave={e => e.currentTarget.style.borderColor = "var(--b2)"}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 4 }}>
              <User size={16} style={{ color: "var(--tx2)" }} />
              <span style={{ fontSize: ".9rem", fontWeight: 500, color: "var(--tx)" }}>Continue as Guest</span>
              <span style={{ marginLeft: "auto", fontSize: ".7rem", background: "var(--bg3)", color: "var(--tx3)", padding: "2px 8px", borderRadius: 4 }}>
                No account needed
              </span>
            </div>
            <div style={{ fontSize: ".78rem", color: "var(--tx3)", paddingLeft: 26 }}>
              Upload your resume and get opportunities immediately.
              Your data stays in this browser — nothing is saved to a server.
            </div>
          </button>

          {/* Sign in — placeholder for future Supabase auth */}
          <button
            onClick={onSignIn}
            style={{
              background: "var(--amberD)", border: "1px solid rgba(232,160,32,.3)",
              borderRadius: "var(--rl)", padding: "1.1rem 1.25rem",
              cursor: "pointer", textAlign: "left", transition: "all var(--t)",
            }}
            onMouseEnter={e => e.currentTarget.style.borderColor = "var(--amber)"}
            onMouseLeave={e => e.currentTarget.style.borderColor = "rgba(232,160,32,.3)"}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 4 }}>
              <UserCheck size={16} style={{ color: "var(--amber)" }} />
              <span style={{ fontSize: ".9rem", fontWeight: 500, color: "var(--tx)" }}>Sign in / Create account</span>
              <span style={{ marginLeft: "auto", fontSize: ".7rem", background: "var(--amberD2)", color: "var(--amber)", padding: "2px 8px", borderRadius: 4 }}>
                Saves history
              </span>
            </div>
            <div style={{ fontSize: ".78rem", color: "var(--tx3)", paddingLeft: 26 }}>
              Save opportunity snapshots, track applications across devices,
              and access your history anytime. (Coming soon — uses Supabase)
            </div>
          </button>
        </div>

        <div style={{ marginTop: "1.5rem", fontSize: ".72rem", color: "var(--tx3)", textAlign: "center" }}>
          Powered by OpenAI · USAJobs · JSearch · Adzuna
        </div>
      </div>
    </div>
  );
}

// ─── Main nav items ───────────────────────────────────────────────────────────
const NAV = [
  { id: "opportunities", label: "Opportunities", icon: Target },
  { id: "documents",     label: "Documents",     icon: FileText },
  { id: "tracker",       label: "Tracker",       icon: Bookmark },
];

// ─── App shell ────────────────────────────────────────────────────────────────
export default function App() {
  const [mode, setMode] = useState(null); // null = landing, "guest" or "user"
  const [page, setPage] = useState("documents");
  const [theme, setTheme] = useState(() => localStorage.getItem("ci_theme") || "dark");
  const { profile, setProfile, opps, setOpps, saved, toggleSave, setStatus, filters, setFilters, reset } = useStore();

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
    localStorage.setItem("ci_theme", theme);
  }, [theme]);

  function toggleTheme() { setTheme(t => t === "dark" ? "light" : "dark"); }

  function handleProfile(p) { setProfile(p); setPage("opportunities"); }

  function handleSignIn() {
    // Supabase auth will go here — for now, just use guest mode
    alert("Account sign-in coming soon (requires Supabase setup). Continuing as guest for now.");
    setMode("guest");
  }

  // Show landing if no mode selected
  if (!mode) {
    return <LandingPage onGuest={() => setMode("guest")} onSignIn={handleSignIn} theme={theme} onToggleTheme={toggleTheme} />;
  }

  const initials = profile?.name
    ? profile.name.split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase()
    : "CI";
  const savedCount = Object.keys(saved).length;
  const oppCount = (opps?.internships?.length || 0) + (opps?.fulltime_jobs?.length || 0) +
                   (opps?.startups?.length || 0) + (opps?.grad_programs?.length || 0);

  return (
    <div className="shell">
      {/* Sidebar */}
      <aside className="side">
        <div className="logo">
          <div className="logo-mark">
            <div className="logo-ico"><Zap size={14} /></div>
            <div>
              <div className="logo-name">Career Intel</div>
              <div className="logo-sub">
                {mode === "guest" ? "Guest mode" : "Signed in"} · v7
              </div>
            </div>
          </div>
        </div>

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

        <div className="side-bot">
          {mode === "guest" && (
            <div style={{
              background: "var(--bg3)", borderRadius: "var(--r)", padding: ".5rem .75rem",
              fontSize: ".72rem", color: "var(--tx3)", marginBottom: ".6rem",
              display: "flex", alignItems: "center", gap: 6,
            }}>
              <User size={11} />
              Guest — data in browser only
            </div>
          )}
          <div className="user-row">
            <div className="ava">{initials}</div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: ".8rem", color: "var(--tx2)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {profile?.name || "Upload resume to start"}
              </div>
              {profile?.gpa && (
                <div style={{ fontSize: ".68rem", color: "var(--amber)", fontFamily: "var(--mono)" }}>
                  GPA {profile.gpa}
                </div>
              )}
            </div>
            <button
              className="btn ghost xs"
              onClick={toggleTheme}
              title={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
              style={{ padding: ".28rem .4rem" }}
            >
              {theme === "dark" ? <Sun size={13} /> : <Moon size={13} />}
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

      {/* Main content */}
      <main className="main">
        {profile && page !== "documents" && (
          <div style={{ padding: ".55rem 2.5rem 0", maxWidth: 980, margin: "0 auto" }}>
            <div className="pbar-strip">
              <div style={{ width: 7, height: 7, borderRadius: "50%", background: "var(--green)", flexShrink: 0 }} />
              <strong style={{ color: "var(--tx)" }}>{profile.name}</strong>
              <span style={{ color: "var(--b3)" }}>·</span>
              <span style={{ fontSize: ".8rem" }}>{profile.university}</span>
              <span style={{ color: "var(--b3)" }}>·</span>
              <span style={{ fontFamily: "var(--mono)", color: "var(--amber)" }}>GPA {profile.gpa}</span>
              <span style={{ color: "var(--b3)" }}>·</span>
              <span style={{ color: "var(--tx3)", fontSize: ".74rem" }}>{profile.visa_status}</span>
              <button className="btn ghost xs" style={{ marginLeft: "auto" }} onClick={() => setPage("documents")}>
                Update docs
              </button>
            </div>
          </div>
        )}

        {page === "documents"     && <DocumentsPage    profile={profile} onDone={handleProfile} />}
        {page === "opportunities" && <OpportunitiesPage profile={profile} opps={opps} onRefresh={setOpps} saved={saved} onSave={toggleSave} filters={filters} setFilters={setFilters} />}
        {page === "tracker"       && <TrackerPage       saved={saved} setStatus={setStatus} onRemove={id => toggleSave(id, saved[id])} />}
      </main>
    </div>
  );
}
