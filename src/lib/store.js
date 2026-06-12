import { useState, useCallback } from "react";

const ls = (k) => { try { return JSON.parse(localStorage.getItem(k)); } catch { return null; } };
const lsSet = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch {} };

export function useStore() {
  const [profile,  setProfileRaw]  = useState(() => ls("ci_profile"));
  const [opps,     setOppsRaw]     = useState(() => ls("ci_opps"));
  const [saved,    setSavedRaw]    = useState(() => ls("ci_saved") || {});
  const [filters,  setFiltersRaw]  = useState(() => ls("ci_filters") || {
    visaFriendly: true, remote: false, minProb: 0,
    location: "both", jobTypes: ["internship", "fulltime"],
  });
  const [aiModel,  setAiModelRaw]  = useState(() => ls("ci_model") || "gpt-4o-mini");

  const setProfile = useCallback((p) => { setProfileRaw(p); lsSet("ci_profile", p); }, []);
  const setOpps    = useCallback((o) => { setOppsRaw(o);    lsSet("ci_opps", o); }, []);
  const setFilters = useCallback((f) => { setFiltersRaw(f); lsSet("ci_filters", f); }, []);
  const setAiModel = useCallback((m) => { setAiModelRaw(m); lsSet("ci_model", m); }, []);

  const toggleSave = useCallback((id, data) => {
    setSavedRaw(prev => {
      const next = { ...prev };
      if (next[id]) { delete next[id]; } else { next[id] = { ...data, status: "saved", savedAt: Date.now() }; }
      lsSet("ci_saved", next);
      return next;
    });
  }, []);

  const setStatus = useCallback((id, status) => {
    setSavedRaw(prev => {
      const next = { ...prev, [id]: { ...prev[id], status } };
      lsSet("ci_saved", next);
      return next;
    });
  }, []);

  const reset = useCallback(() => {
    ["ci_profile","ci_opps","ci_saved","ci_filters"].forEach(k => localStorage.removeItem(k));
    setProfileRaw(null); setOppsRaw(null); setSavedRaw({});
    setFiltersRaw({ visaFriendly: true, remote: false, minProb: 0, location: "both", jobTypes: ["internship","fulltime"] });
  }, []);

  return { profile, setProfile, opps, setOpps, saved, toggleSave, setStatus, filters, setFilters, aiModel, setAiModel, reset };
}
