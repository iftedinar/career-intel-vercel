import { useState, useMemo } from "react";
import { RefreshCw, Filter, X, Bookmark, BookmarkCheck } from "lucide-react";
import { api } from "../lib/api.js";
import DetailPanel from "../components/DetailPanel.jsx";

function pc(p){ return p>=70?"hi":p>=50?"mid":"lo"; }
function pCol(p){ return p>=70?"var(--green)":p>=50?"var(--amber)":"var(--red)"; }

function OppCard({ item, type, saved, onSave, onClick }) {
  const score = item.probability || item.admit_prob || item.fit_score;
  return (
    <div className={`opp ${saved?"sv":""}`} onClick={onClick}>
      <div style={{display:"flex",alignItems:"center",gap:12}}>
        <div style={{flex:1,minWidth:0}}>
          <div style={{fontSize:".875rem",fontWeight:500,color:"var(--tx)"}}>{item.title||item.company||item.program}</div>
          <div style={{fontSize:".77rem",color:"var(--tx2)",marginTop:2}}>
            {[item.company||item.university, item.location, item.type||item.employment_type||item.stage||item.degree].filter(Boolean).join(" · ")}
          </div>
        </div>
        {score && (
          <div style={{textAlign:"right",flexShrink:0}}>
            <div className={`pr ${pc(score)}`}>{score}%</div>
            <div className="pbar"><div className="pf" style={{width:`${score}%`,background:pCol(score)}}/></div>
          </div>
        )}
      </div>
      <div style={{display:"flex",alignItems:"center",gap:5,marginTop:8,flexWrap:"wrap"}}>
        {item.visa_friendly && <span className="bd g">CPT/OPT ✓</span>}
        {item.visa_sponsorship && <span className="bd g">H1B sponsor</span>}
        {item.stem && <span className="bd g">STEM OPT</span>}
        {item.remote && <span className="bd b">Remote</span>}
        {item.salary && <span className="bd a">{item.salary}</span>}
        {(item.category||item.stage) && <span className="bd n">{item.category||item.stage}</span>}
        {item.source && item.source!=="AI" && <span className="bd n">📡 {item.source}</span>}
        {item.deadline && item.deadline!=="null" && item.deadline!=="Rolling" && <span className="bd n" style={{marginLeft:"auto"}}>⏳ {item.deadline}</span>}
        {item.deadline_r1 && <span className="bd a" style={{marginLeft:"auto"}}>R1 {item.deadline_r1}</span>}
        <button className="btn ghost ico xs" style={{marginLeft:(!item.deadline&&!item.deadline_r1)?"auto":0}}
          onClick={e=>{e.stopPropagation();onSave(item.id||item.company,item);}}>
          {saved?<BookmarkCheck size={13} style={{color:"var(--amber)"}}/>:<Bookmark size={13}/>}
        </button>
      </div>
      {(item.match_skills||item.open_roles)?.length>0 && (
        <div className="tags">{(item.match_skills||item.open_roles||[]).slice(0,5).map(s=><span key={s} className="tag">{s}</span>)}</div>
      )}
      {item.focus && <div style={{fontSize:".77rem",color:"var(--tx3)",marginTop:5,lineHeight:1.5}}>{item.focus}</div>}
    </div>
  );
}

const TABS = [
  { id:"internships",  label:"Internships",   key:"internships"  },
  { id:"fulltime",     label:"Full-time Jobs", key:"fulltime_jobs"},
  { id:"startups",     label:"Startups",       key:"startups"     },
  { id:"grad",         label:"Grad programs",  key:"grad_programs"},
];

export default function OpportunitiesPage({ profile, opps, onRefresh, saved, onSave, filters, setFilters, aiModel = "gpt-4o-mini" }) {
  const [loading,  setLoading]  = useState(false);
  const [tab,      setTab]      = useState("internships");
  const [selected, setSelected] = useState(null);
  const [err,      setErr]      = useState("");
  const [showF,    setShowF]    = useState(false);
  const [q,        setQ]        = useState("");

  async function refresh() {
    if (!profile) { setErr("Upload your resume first."); return; }
    setLoading(true); setErr("");
    try {
      const { opportunities } = await api.opportunities(profile, filters, aiModel);
      onRefresh(opportunities);
    } catch (e) { setErr(e.message); }
    finally { setLoading(false); }
  }

  const internships = opps?.internships    || [];
  const fulltime    = opps?.fulltime_jobs  || [];
  const startups    = opps?.startups       || [];
  const grad        = opps?.grad_programs  || [];
  const summary     = opps?.summary;

  const filt = useMemo(() => {
    const qL = q.toLowerCase();
    const f = items => items.filter(item => {
      if (qL && !JSON.stringify(item).toLowerCase().includes(qL)) return false;
      const score = item.probability||item.admit_prob||item.fit_score||0;
      if (score < (filters.minProb||0)) return false;
      if (filters.visaFriendly && (tab==="internships"||tab==="fulltime") && item.visa_friendly===false) return false;
      if (filters.remote && (tab==="internships"||tab==="fulltime") && !item.remote) return false;
      return true;
    });
    return { internships:f(internships), fulltime:f(fulltime), startups:f(startups), grad:f(grad) };
  }, [internships, fulltime, startups, grad, q, filters, tab]);

  const active = filt[tab==="fulltime"?"fulltime":tab==="grad"?"grad":tab] || filt.internships;
  const totals = { internships:filt.internships.length, fulltime:filt.fulltime.length, startups:filt.startups.length, grad:filt.grad.length };
  const grand  = internships.length+fulltime.length+startups.length+grad.length;

  function toggleJobType(t) {
    const jt = filters.jobTypes||["internship","fulltime"];
    setFilters({...filters, jobTypes: jt.includes(t) ? jt.filter(x=>x!==t) : [...jt, t]});
  }

  return (
    <div className="page si">
      <div className="ph">
        <div>
          <div className="ph-title">Opportunities</div>
          <div className="ph-sub">
            {opps ? `${grand} results · refreshed ${opps.generated_at} · sources: ${opps.summary?.sources?.join(", ")||"AI"}`
                  : "Hit Refresh — finds internships, full-time jobs, startups, and grad programs"}
          </div>
        </div>
        <div className="ph-r">
          <button className="btn sm" onClick={()=>setShowF(!showF)}><Filter size={13}/> Filters</button>
          <button className="btn prim" onClick={refresh} disabled={loading||!profile}>
            {loading?<span className="spin"/>:<RefreshCw size={13}/>}
            {loading?"Searching…":"Refresh"}
          </button>
        </div>
      </div>

      {err && <div className="al e">{err}</div>}
      {!profile && <div className="al w">Upload your resume on the Documents page first.</div>}

      {showF && (
        <div className="card" style={{marginBottom:"1rem"}}>
          <div style={{display:"flex",justifyContent:"space-between",marginBottom:".75rem"}}>
            <span style={{fontSize:".85rem",fontWeight:500}}>Filters</span>
            <button className="btn ghost ico xs" onClick={()=>setShowF(false)}><X size={13}/></button>
          </div>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:".5rem 1.5rem",marginBottom:".75rem"}}>
            <Tog label="Visa-friendly only" v={filters.visaFriendly} set={v=>setFilters({...filters,visaFriendly:v})}/>
            <Tog label="Remote/hybrid only" v={filters.remote}       set={v=>setFilters({...filters,remote:v})}/>
          </div>
          <div style={{marginBottom:".75rem"}}>
            <div style={{fontSize:".77rem",color:"var(--tx2)",marginBottom:4}}>Job types to include</div>
            <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>
              {[["internship","Internships"],["fulltime","Full-time Jobs"]].map(([val,lbl])=>(
                <button key={val} className="btn sm"
                  style={{borderColor:(filters.jobTypes||[]).includes(val)?"var(--amber)":undefined,color:(filters.jobTypes||[]).includes(val)?"var(--amber)":undefined}}
                  onClick={()=>toggleJobType(val)}>{lbl}</button>
              ))}
            </div>
          </div>
          <div style={{marginBottom:".75rem"}}>
            <div style={{display:"flex",justifyContent:"space-between",fontSize:".77rem",color:"var(--tx2)",marginBottom:4}}>
              <span>Min probability</span>
              <span style={{fontFamily:"var(--mono)",color:"var(--amber)"}}>{filters.minProb||0}%</span>
            </div>
            <input type="range" min="0" max="80" step="5" value={filters.minProb||0}
              onChange={e=>setFilters({...filters,minProb:+e.target.value})}
              style={{padding:0,border:"none",background:"var(--bg4)"}}/>
          </div>
          <div>
            <label>Location scope</label>
            <select value={filters.location||"both"} onChange={e=>setFilters({...filters,location:e.target.value})}>
              <option value="both">US + Canada + International</option>
              <option value="us">US only</option>
              <option value="international">Outside US only</option>
            </select>
          </div>
        </div>
      )}

      {opps && (
        <div className="mets">
          {[["Internships",filt.internships.length,"var(--tx)"],["Full-time",filt.fulltime.length,"var(--blue)"],
            ["Startups",filt.startups.length,"var(--amber)"],["Grad",filt.grad.length,"var(--green)"],
            ["Top match",Math.max(internships[0]?.probability||0,fulltime[0]?.probability||0,grad[0]?.admit_prob||0)+"%","var(--amber)"]
          ].map(([l,v,c])=>(
            <div key={l} className="met"><div className="met-v" style={{color:c,fontFamily:"var(--mono)"}}>{v}</div><div className="met-l">{l}</div></div>
          ))}
        </div>
      )}

      {summary?.top_action && <div className="al i"><strong>⚡ This week:</strong> {summary.top_action}</div>}
      {summary?.market_note && <div className="al w" style={{marginTop:-4}}>{summary.market_note}</div>}

      {opps && (
        <div style={{marginBottom:".75rem"}}>
          <input placeholder="Search by company, skill, location, role…" value={q} onChange={e=>setQ(e.target.value)}/>
        </div>
      )}

      <div className="tabs">
        {TABS.map(({id,label}) => (
          <button key={id} className={`tab ${tab===id?"on":""}`} onClick={()=>setTab(id)}>
            {label}
            {opps && <span style={{opacity:.55,fontSize:".71rem",marginLeft:3}}>{totals[id==="fulltime"?"fulltime":id==="grad"?"grad":id]}</span>}
          </button>
        ))}
      </div>

      {!opps && !loading && (
        <div className="empty">
          <div style={{fontSize:"2rem",marginBottom:".75rem"}}>🎯</div>
          <div style={{fontSize:".85rem"}}>Hit Refresh to find live opportunities matched to your profile.<br/><span style={{color:"var(--tx3)",fontSize:".78rem"}}>Searches internships, full-time jobs, startups, and grad programs.</span></div>
        </div>
      )}

      {active.map(item => (
        <OppCard key={item.id||item.company} item={item}
          type={tab==="internships"?"internship":tab==="fulltime"?"fulltime":tab==="startups"?"startup":"grad"}
          saved={!!saved[item.id||item.company]} onSave={onSave}
          onClick={()=>setSelected({item,type:tab==="internships"?"internship":tab==="fulltime"?"fulltime":tab==="startups"?"startup":"grad"})}/>
      ))}

      {summary?.skill_gaps?.length>0 && opps && (
        <div className="card" style={{marginTop:"1.25rem"}}>
          <div style={{fontSize:".68rem",color:"var(--tx3)",textTransform:"uppercase",letterSpacing:".06em",marginBottom:8}}>Skill gaps to close</div>
          {summary.skill_gaps.map(g=>(
            <div key={g} style={{fontSize:".8rem",color:"var(--tx2)",padding:"3px 0",display:"flex",gap:6}}>
              <span style={{color:"var(--amber)"}}>→</span>{g}
            </div>
          ))}
        </div>
      )}

      {selected && (
        <DetailPanel item={selected.item} type={selected.type}
          profile={profile} saved={saved} onSave={onSave} onClose={()=>setSelected(null)} aiModel={aiModel}/>
      )}
    </div>
  );
}

function Tog({ label, v, set }) {
  return (
    <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:".4rem 0",borderBottom:"1px solid var(--b)",fontSize:".81rem",color:"var(--tx2)"}}>
      <span>{label}</span>
      <label className="tog">
        <input type="checkbox" checked={v} onChange={e=>set(e.target.checked)}/>
        <span className="tog-s"/>
      </label>
    </div>
  );
}
