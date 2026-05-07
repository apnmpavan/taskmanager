import { useState, useEffect, useMemo, useRef } from "react";
import {
  LayoutDashboard, Banknote, Users, CreditCard, CalendarDays,
  Fish, CheckSquare, Phone, Bell, Plus, Pencil, Trash2, X,
  Check, AlertTriangle, MapPin, Building2, Droplets, ChevronDown,
  ChevronRight, Wallet, Clock, Menu, RefreshCw, Database,
  TrendingDown, Activity, ShieldAlert
} from "lucide-react";

/* ══════════════════════════════════════════════════════════════
   ⚙️  SUPABASE CONFIGURATION  — replace with your credentials
   ══════════════════════════════════════════════════════════════
   SQL SCHEMA (run in Supabase SQL Editor):

   create table bank_loans   (id uuid primary key default gen_random_uuid(), name text, ref text, principal numeric, rate numeric, start_date date, due_date date, status text default 'Active', notes text, created_at timestamptz default now());
   create table private_loans(id uuid primary key default gen_random_uuid(), name text, relation text, principal numeric, rate numeric, start_date date, interest_paid_upto date, due_date date, notes text, created_at timestamptz default now());
   create table emis          (id uuid primary key default gen_random_uuid(), name text, lender text, emi_amount numeric, monthly_due_day int, remaining_months int, principal numeric, status text default 'Active', notify boolean default true, notes text, created_at timestamptz default now());
   create table sites         (id uuid primary key default gen_random_uuid(), name text, location text, area text, notes text, created_at timestamptz default now());
   create table tanks         (id uuid primary key default gen_random_uuid(), site_id uuid, name text, status text default 'Active', stocking_date date, stocking_qty int, feed_status text, mortality_count int, notes text, created_at timestamptz default now());
   create table tasks         (id uuid primary key default gen_random_uuid(), name text, category text default 'Site', priority text default 'Medium', due_date date, status text default 'Pending', notes text, created_at timestamptz default now());
   create table calls         (id uuid primary key default gen_random_uuid(), name text, phone text, purpose text, last_call_date date, due_date date, status text default 'Open', notes text, created_at timestamptz default now());

   -- Also enable Row Level Security + anon policies for each table.
   ══════════════════════════════════════════════════════════════ */
const SUPABASE_URL      = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;
const IS_DEMO = SUPABASE_URL && SUPABASE_URL.includes("YOUR_PROJECT");

/* ── camelCase ↔ snake_case ── */
const toSnake  = s => s.replace(/[A-Z]/g, m => `_${m.toLowerCase()}`);
const toCamel  = s => s.replace(/_([a-z])/g, (_,m) => m.toUpperCase());
const snakeObj = o => Object.fromEntries(Object.entries(o).map(([k,v])=>[toSnake(k),v]));
const camelObj = o => Object.fromEntries(Object.entries(o).map(([k,v])=>[toCamel(k),v]));

/* ── Supabase REST API ── */
const hdr = () => ({ apikey: SUPABASE_ANON_KEY, Authorization:`Bearer ${SUPABASE_ANON_KEY}`, "Content-Type":"application/json", Prefer:"return=representation" });
const DB = {
  get: async t => {
    if (IS_DEMO) return null;
    try { const r=await fetch(`${SUPABASE_URL}/rest/v1/${t}?select=*&order=created_at.asc`,{headers:hdr()}); return r.ok?(await r.json()).map(camelObj):null; } catch{return null;}
  },
  ins: async (t,d) => {
    if (IS_DEMO) return {...d,id:gid()};
    try { const {id,...rest}=d; const r=await fetch(`${SUPABASE_URL}/rest/v1/${t}`,{method:"POST",headers:hdr(),body:JSON.stringify(snakeObj(rest))}); const rows=await r.json(); return camelObj(Array.isArray(rows)?rows[0]:rows)||{...d,id:gid()}; } catch{return {...d,id:gid()};}
  },
  upd: async (t,id,d) => {
    if (IS_DEMO) return d;
    try { const r=await fetch(`${SUPABASE_URL}/rest/v1/${t}?id=eq.${id}`,{method:"PATCH",headers:hdr(),body:JSON.stringify(snakeObj(d))}); const rows=await r.json(); return camelObj(Array.isArray(rows)?rows[0]:rows)||d; } catch{return d;}
  },
  del: async (t,id) => { if (IS_DEMO) return; try{await fetch(`${SUPABASE_URL}/rest/v1/${t}?id=eq.${id}`,{method:"DELETE",headers:hdr()});}catch{} },
};

/* ── Helpers ── */
const gid      = () => `${Date.now()}-${Math.random().toString(36).slice(2,7)}`;
const today    = () => new Date().toISOString().split("T")[0];
const addD     = n => { const d=new Date(); d.setDate(d.getDate()+n); return d.toISOString().split("T")[0]; };
const daysSince = d => !d?0:Math.max(0,Math.floor((Date.now()-new Date(d).getTime())/864e5));
const daysUntil = d => { if(!d) return Infinity; return Math.ceil((new Date(d).setHours(0,0,0,0)-new Date().setHours(0,0,0,0))/864e5); };
const isUrg    = d => { const n=daysUntil(d); return n>=0&&n<=3; };
const isUp     = d => { const n=daysUntil(d); return n>3&&n<=10; };
const fmtINR   = n => new Intl.NumberFormat("en-IN",{style:"currency",currency:"INR",maximumFractionDigits:0}).format(n||0);
const fmtD     = d => d?new Date(d).toLocaleDateString("en-IN",{day:"numeric",month:"short",year:"2-digit"}):"—";
const daysEMI  = e => { const t=new Date();t.setHours(0,0,0,0);const day=parseInt(e.monthlyDueDay||1);let nx=new Date(t.getFullYear(),t.getMonth(),day);if(nx<t)nx.setMonth(nx.getMonth()+1);return Math.ceil((nx-t)/864e5); };
const daySuf   = n => { n=parseInt(n);return n>=11&&n<=13?"th":["th","st","nd","rd"][n%10]||"th"; };
const bkInt    = l => !l.principal||!l.rate||!l.startDate?0:(parseFloat(l.principal)*parseFloat(l.rate)/100)*(daysSince(l.startDate)/30)/12;
const pvInt    = l => !l.principal||!l.rate||!l.interestPaidUpto?0:(parseFloat(l.principal)*parseFloat(l.rate)/100)*(daysSince(l.interestPaidUpto)/30);
const emiNextDate = e => { const t=new Date();const day=parseInt(e.monthlyDueDay||1);let nx=new Date(t.getFullYear(),t.getMonth(),day);if(nx<t)nx.setMonth(nx.getMonth()+1);return nx.toLocaleDateString("en-IN",{day:"numeric",month:"short"}); };

/* ── Seed data ── */
const mkSeed = () => {
  const s1=gid(),s2=gid(),s3=gid();
  return {
    bankLoans:[
      {id:gid(),name:"Bank of Baroda",ref:"BOB/KCC/2024",principal:200000,rate:9.0,startDate:"2024-06-01",dueDate:"2025-06-01",status:"Active",notes:"KCC – Crop Loan"},
      {id:gid(),name:"SBI Gold Loan",ref:"SBI/GL/9923",principal:715000,rate:8.65,startDate:"2024-10-15",dueDate:addD(8),status:"Active",notes:"Gold ornaments pledged"},
    ],
    privateLoans:[
      {id:gid(),name:"Mounica Pavan Relatives",relation:"Relatives",principal:1000000,rate:1.5,startDate:"2024-09-01",interestPaidUpto:"2025-03-31",dueDate:"2025-06-01",notes:"Flexible repayment"},
      {id:gid(),name:"Aruna KVR",relation:"Personal",principal:300000,rate:2.0,startDate:"2024-12-01",interestPaidUpto:"2025-04-30",dueDate:addD(2),notes:"Due soon — confirm"},
    ],
    emis:[
      {id:gid(),name:"HDFC Personal",lender:"HDFC Bank",emiAmount:8500,monthlyDueDay:5,remainingMonths:18,principal:120000,status:"Active",notify:true,notes:""},
      {id:gid(),name:"ICICI Loan",lender:"ICICI Bank",emiAmount:11200,monthlyDueDay:10,remainingMonths:24,principal:220000,status:"Active",notify:true,notes:"Auto-debit"},
      {id:gid(),name:"Axis Loan",lender:"Axis Bank",emiAmount:6800,monthlyDueDay:15,remainingMonths:12,principal:72000,status:"Active",notify:false,notes:"Final year"},
    ],
    sites:[
      {id:s1,name:"Pond A",location:"North Field",area:"2.5",notes:"Primary production pond"},
      {id:s2,name:"Pond B",location:"South Field",area:"1.8",notes:"Recently renovated"},
      {id:s3,name:"Pond C",location:"East Block",area:"3.0",notes:"New batch incoming"},
    ],
    tanks:[
      {id:gid(),siteId:s1,name:"Tank A-1",status:"Active",stockingDate:"2025-03-01",stockingQty:"100000",feedStatus:"Stage 3 – 3 kg/day",mortalityCount:150,notes:"Good growth. ABW ~6g."},
      {id:gid(),siteId:s1,name:"Tank A-2",status:"Issue",stockingDate:"2025-02-15",stockingQty:"80000",feedStatus:"Paused",mortalityCount:820,notes:"High mortality – check urgently."},
      {id:gid(),siteId:s2,name:"Tank B-1",status:"Active",stockingDate:"2025-04-10",stockingQty:"120000",feedStatus:"Stage 1 – 1.5 kg/day",mortalityCount:30,notes:"Recently stocked."},
      {id:gid(),siteId:s2,name:"Tank B-2",status:"Harvest",stockingDate:"2025-01-05",stockingQty:"90000",feedStatus:"Harvest ready",mortalityCount:200,notes:"Contact buyer."},
      {id:gid(),siteId:s3,name:"Tank C-1",status:"Empty",stockingDate:"",stockingQty:"",feedStatus:"",mortalityCount:"",notes:"Preparing for next batch."},
    ],
    tasks:[
      {id:gid(),name:"Check aerators – Tank A-2",category:"Site",priority:"High",dueDate:today(),status:"Pending",notes:"DO levels after mortality spike."},
      {id:gid(),name:"Pay SBI Gold Loan interest",category:"Finance",priority:"High",dueDate:addD(2),status:"Pending",notes:"NEFT transfer to SBI."},
      {id:gid(),name:"Confirm harvest buyer – Tank B-2",category:"Site",priority:"Medium",dueDate:addD(4),status:"In-Progress",notes:"Call Ravi for rate."},
      {id:gid(),name:"Review BOB KCC renewal docs",category:"Finance",priority:"Medium",dueDate:addD(5),status:"Pending",notes:"Collect NOC and land records."},
    ],
    calls:[
      {id:gid(),name:"Ravi (Feed Supplier)",phone:"9876543210",purpose:"Feed pricing Stage 3",lastCallDate:addD(-3),dueDate:today(),status:"Open",notes:"Asked for 10-bag discount."},
      {id:gid(),name:"Aruna KVR",phone:"",purpose:"Loan due date confirmation",lastCallDate:addD(-3),dueDate:addD(1),status:"Open",notes:"Confirm split payment."},
      {id:gid(),name:"BOB Branch Manager",phone:"",purpose:"KCC renewal inquiry",lastCallDate:addD(-7),dueDate:"",status:"Closed",notes:"Submit docs by June 1."},
    ],
  };
};

/* ── Alert computation ── */
const computeAlerts = (bk, pv, em, tk, cl) => {
  const items = [];
  bk.forEach(l => { const d=daysUntil(l.dueDate); if(d>=0&&d<=14) items.push({id:"b_"+l.id,sev:d<=3?"red":"amber",icon:"💳",title:`Bank Loan Due ${d===0?"Today":`in ${d}d`}`,body:`${l.name} — ${fmtINR(l.principal)}`,days:d}); });
  pv.forEach(l => {
    const d=daysUntil(l.dueDate); if(d>=0&&d<=14) items.push({id:"p_"+l.id,sev:d<=3?"red":"amber",icon:"👥",title:`Private Loan Due ${d===0?"Today":`in ${d}d`}`,body:`${l.name} — interest: ${fmtINR(pvInt(l))}`,days:d});
    if(daysSince(l.interestPaidUpto)>30) items.push({id:"pi_"+l.id,sev:"amber",icon:"⏰",title:"Interest Unpaid >30 Days",body:`${l.name} — ${fmtINR(pvInt(l))} owed`,days:999});
  });
  em.filter(e=>e.status==="Active").forEach(e => { const d=daysEMI(e); if(d<=5) items.push({id:"e_"+e.id,sev:d===0?"red":"amber",icon:"📅",title:`EMI Due ${d===0?"TODAY":`in ${d}d`}`,body:`${e.name} — ${fmtINR(e.emiAmount)}`,days:d}); });
  tk.filter(t=>t.status!=="Done").forEach(t => { const d=daysUntil(t.dueDate); if(d<0) items.push({id:"t_"+t.id,sev:"red",icon:"⚠️",title:"Task Overdue",body:`${t.name} (${-d}d late)`,days:d}); else if(d===0) items.push({id:"t0_"+t.id,sev:"amber",icon:"📌",title:"Task Due Today",body:t.name,days:0}); });
  cl.filter(c=>c.status==="Open").forEach(c => { const d=daysUntil(c.dueDate); if(d===0) items.push({id:"c_"+c.id,sev:"amber",icon:"📞",title:"Call Follow-up Today",body:c.name,days:0}); });
  return items.sort((a,b)=>(a.days<0?-a.days+1000:a.days)-(b.days<0?-b.days+1000:b.days));
};

/* ══════════════════════════════════════════════
   UI PRIMITIVES
   ══════════════════════════════════════════════ */
const BADGE = {
  Active:"bg-emerald-100 text-emerald-700",Closed:"bg-gray-100 text-gray-600",Overdue:"bg-red-100 text-red-700",
  Issue:"bg-red-100 text-red-700",Harvest:"bg-amber-100 text-amber-700",Empty:"bg-gray-100 text-gray-500",
  Pending:"bg-gray-100 text-gray-600","In-Progress":"bg-blue-100 text-blue-700",Done:"bg-emerald-100 text-emerald-700",
  High:"bg-red-100 text-red-700",Medium:"bg-amber-100 text-amber-700",Low:"bg-emerald-100 text-emerald-700",
  Open:"bg-amber-100 text-amber-700",Site:"bg-teal-100 text-teal-700",Finance:"bg-blue-100 text-blue-700",Personal:"bg-purple-100 text-purple-700",
};
const Badge = ({label}) => <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold tracking-wide ${BADGE[label]||"bg-gray-100 text-gray-600"}`}>{label}</span>;

const Lbl = ({c}) => <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1.5">{c}</label>;
const Inp = p => <input {...p} className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-teal-400/20 focus:border-teal-500 transition-all bg-white" />;
const Sel = ({children,...p}) => <select {...p} className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-teal-400/20 focus:border-teal-500 bg-white">{children}</select>;
const Txa = p => <textarea {...p} rows={2} className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-teal-400/20 focus:border-teal-500 resize-none bg-white" />;
const Btn = ({children,onClick,color="teal",sm}) => {
  const c={teal:"bg-teal-600 hover:bg-teal-700",amber:"bg-amber-600 hover:bg-amber-700",blue:"bg-blue-600 hover:bg-blue-700",red:"bg-red-500 hover:bg-red-600",gray:"bg-gray-100 hover:bg-gray-200 !text-gray-700"};
  return <button onClick={onClick} className={`${sm?"px-3 py-1.5 text-xs":"px-4 py-2 text-sm"} font-semibold rounded-lg text-white transition-all active:scale-[0.97] inline-flex items-center gap-1.5 ${c[color]}`}>{children}</button>;
};
const Ghost = ({children,onClick}) => <button onClick={onClick} className="px-4 py-2 text-sm font-medium rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-700 transition-colors">{children}</button>;

const Modal = ({title,sub,onClose,children,wide=false}) => (
  <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center" style={{background:"rgba(15,25,35,0.44)",backdropFilter:"blur(6px)"}}>
    <div className={`bg-white w-full ${wide?"sm:max-w-2xl":"sm:max-w-lg"} rounded-t-2xl sm:rounded-2xl max-h-[90vh] overflow-y-auto`} style={{boxShadow:"0 30px 80px rgba(0,0,0,0.25)"}}>
      <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 sticky top-0 bg-white z-10">
        <div><p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{sub}</p><h3 className="font-bold text-gray-900 mt-0.5">{title}</h3></div>
        <button onClick={onClose} className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-gray-100"><X size={14} className="text-gray-400" /></button>
      </div>
      <div className="p-5 pb-7">{children}</div>
    </div>
  </div>
);

const Toast = ({msg,type}) => (
  <div className="fixed bottom-5 right-5 z-[200] flex items-center gap-2.5 bg-gray-900 text-white px-4 py-3 rounded-xl shadow-2xl" style={{animation:"slideUp .25s ease"}}>
    <div className={`w-4 h-4 rounded-full flex items-center justify-center flex-shrink-0 ${type==="success"?"bg-emerald-400":"bg-red-400"}`}>
      {type==="success"?<Check size={9} className="text-white"/>:<X size={9} className="text-white"/>}
    </div>
    <span className="text-sm font-medium">{msg}</span>
  </div>
);

const ConfirmDel = ({onConfirm,onCancel}) => (
  <div className="fixed inset-0 z-[110] flex items-center justify-center" style={{background:"rgba(15,25,35,0.44)",backdropFilter:"blur(6px)"}}>
    <div className="bg-white rounded-2xl p-6 max-w-xs w-full shadow-2xl">
      <div className="w-12 h-12 rounded-xl bg-red-50 flex items-center justify-center mx-auto mb-4"><Trash2 size={20} className="text-red-500"/></div>
      <p className="text-base font-bold text-center text-gray-900 mb-1">Delete Record?</p>
      <p className="text-sm text-gray-400 text-center mb-5">This action cannot be undone.</p>
      <div className="flex gap-3"><Ghost onClick={onCancel}>Cancel</Ghost><Btn color="red" onClick={onConfirm}>Delete</Btn></div>
    </div>
  </div>
);

/* ══════════════════════════════════════════════
   FORM COMPONENTS
   ══════════════════════════════════════════════ */
const G2 = ({children}) => <div className="grid grid-cols-2 gap-3">{children}</div>;
const FG = ({label,children}) => <div><Lbl c={label}/>{children}</div>;

const BankForm = ({init,onSave,onClose}) => {
  const [f,setF] = useState(init||{name:"",ref:"",principal:"",rate:"",startDate:today(),dueDate:"",status:"Active",notes:""});
  const s = k => e => setF(p=>({...p,[k]:e.target.value}));
  const est = f.principal&&f.rate&&f.startDate?(parseFloat(f.principal)*parseFloat(f.rate)/100)*(daysSince(f.startDate)/30)/12:0;
  return (
    <Modal title={init?"Edit Bank Loan":"Add Bank Loan"} sub="Bank Loan" onClose={onClose}>
      <div className="space-y-3">
        <G2><FG label="Bank Name"><Inp value={f.name} onChange={s("name")} placeholder="SBI, BOB…"/></FG><FG label="Ref No."><Inp value={f.ref} onChange={s("ref")} placeholder="Optional"/></FG></G2>
        <G2><FG label="Principal (₹)"><Inp type="number" value={f.principal} onChange={s("principal")} placeholder="0"/></FG><FG label="Rate (% p.a.)"><Inp type="number" step="0.01" value={f.rate} onChange={s("rate")} placeholder="0.00"/></FG></G2>
        <G2><FG label="Start Date"><Inp type="date" value={f.startDate} onChange={s("startDate")}/></FG><FG label="Due Date"><Inp type="date" value={f.dueDate} onChange={s("dueDate")}/></FG></G2>
        <FG label="Status"><Sel value={f.status} onChange={s("status")}><option>Active</option><option>Closed</option><option>Overdue</option></Sel></FG>
        <FG label="Notes"><Txa value={f.notes} onChange={s("notes")} placeholder="Remarks…"/></FG>
        {est>0&&<div className="bg-teal-50 border border-teal-100 rounded-xl px-4 py-3"><p className="text-[10px] font-bold text-teal-500 uppercase tracking-wider">Estimated Interest Accrued</p><p className="text-xl font-extrabold text-teal-700 mt-0.5">{fmtINR(est)}</p></div>}
        <div className="flex gap-3 justify-end pt-2"><Ghost onClick={onClose}>Cancel</Ghost><Btn onClick={()=>{if(!f.name.trim())return;onSave(f);}}>Save Loan</Btn></div>
      </div>
    </Modal>
  );
};

const PrivateForm = ({init,onSave,onClose}) => {
  const [f,setF] = useState(init||{name:"",relation:"",principal:"",rate:"",startDate:today(),interestPaidUpto:today(),dueDate:"",notes:""});
  const s = k => e => setF(p=>({...p,[k]:e.target.value}));
  const owed = f.principal&&f.rate&&f.interestPaidUpto?(parseFloat(f.principal)*parseFloat(f.rate)/100)*(daysSince(f.interestPaidUpto)/30):0;
  return (
    <Modal title={init?"Edit Private Loan":"Add Private Loan"} sub="Private / Personal Loan" onClose={onClose}>
      <div className="space-y-3">
        <G2><FG label="Lender Name"><Inp value={f.name} onChange={s("name")} placeholder="Person / Group"/></FG><FG label="Relation"><Inp value={f.relation} onChange={s("relation")} placeholder="Relative, Friend…"/></FG></G2>
        <G2><FG label="Principal (₹)"><Inp type="number" value={f.principal} onChange={s("principal")} placeholder="0"/></FG><FG label="Rate (% per month)"><Inp type="number" step="0.1" value={f.rate} onChange={s("rate")} placeholder="0.0"/></FG></G2>
        <G2><FG label="Start Date"><Inp type="date" value={f.startDate} onChange={s("startDate")}/></FG><FG label="Interest Paid Upto"><Inp type="date" value={f.interestPaidUpto} onChange={s("interestPaidUpto")}/></FG></G2>
        <FG label="Next Due Date"><Inp type="date" value={f.dueDate} onChange={s("dueDate")}/></FG>
        <FG label="Notes"><Txa value={f.notes} onChange={s("notes")} placeholder="Remarks…"/></FG>
        {owed>0&&<div className="bg-amber-50 border border-amber-100 rounded-xl px-4 py-3"><p className="text-[10px] font-bold text-amber-600 uppercase tracking-wider">Outstanding Interest</p><p className="text-xl font-extrabold text-amber-700 mt-0.5">{fmtINR(owed)}</p><p className="text-xs text-amber-400">{daysSince(f.interestPaidUpto)} days unpaid</p></div>}
        <div className="flex gap-3 justify-end pt-2"><Ghost onClick={onClose}>Cancel</Ghost><Btn color="amber" onClick={()=>{if(!f.name.trim())return;onSave(f);}}>Save Loan</Btn></div>
      </div>
    </Modal>
  );
};

const EMIForm = ({init,onSave,onClose}) => {
  const [f,setF] = useState(init||{name:"",lender:"",emiAmount:"",monthlyDueDay:5,remainingMonths:"",principal:"",status:"Active",notify:true,notes:""});
  const s = k => e => setF(p=>({...p,[k]:e.target.value}));
  return (
    <Modal title={init?"Edit EMI":"Add EMI"} sub="EMI Tracker" onClose={onClose}>
      <div className="space-y-3">
        <G2><FG label="Loan Name"><Inp value={f.name} onChange={s("name")} placeholder="HDFC Personal…"/></FG><FG label="Lender / Bank"><Inp value={f.lender} onChange={s("lender")} placeholder="HDFC, ICICI…"/></FG></G2>
        <G2><FG label="EMI Amount (₹)"><Inp type="number" value={f.emiAmount} onChange={s("emiAmount")} placeholder="0"/></FG><FG label="Monthly Due Day"><Sel value={f.monthlyDueDay} onChange={s("monthlyDueDay")}>{Array.from({length:28},(_,i)=><option key={i+1} value={i+1}>{i+1}{daySuf(i+1)} of month</option>)}</Sel></FG></G2>
        <G2><FG label="Remaining Months"><Inp type="number" value={f.remainingMonths} onChange={s("remainingMonths")} placeholder="0"/></FG><FG label="Outstanding (₹)"><Inp type="number" value={f.principal} onChange={s("principal")} placeholder="0"/></FG></G2>
        <G2><FG label="Status"><Sel value={f.status} onChange={s("status")}><option>Active</option><option>Closed</option></Sel></FG><FG label="Notify on Due Date"><Sel value={String(f.notify)} onChange={e=>setF(p=>({...p,notify:e.target.value==="true"}))}><option value="true">Yes — Remind Me</option><option value="false">No</option></Sel></FG></G2>
        {f.emiAmount&&f.remainingMonths&&<div className="bg-blue-50 border border-blue-100 rounded-xl px-4 py-3"><p className="text-[10px] font-bold text-blue-500 uppercase tracking-wider">Total EMI Remaining</p><p className="text-xl font-extrabold text-blue-700 mt-0.5">{fmtINR(f.emiAmount*f.remainingMonths)}</p></div>}
        <div className="flex gap-3 justify-end pt-2"><Ghost onClick={onClose}>Cancel</Ghost><Btn color="blue" onClick={()=>{if(!f.name.trim())return;onSave(f);}}>Save EMI</Btn></div>
      </div>
    </Modal>
  );
};

const SiteForm = ({init,onSave,onClose}) => {
  const [f,setF] = useState(init||{name:"",location:"",area:"",notes:""});
  const s = k => e => setF(p=>({...p,[k]:e.target.value}));
  return (
    <Modal title={init?"Edit Site":"Add Site"} sub="Farm Site" onClose={onClose}>
      <div className="space-y-3">
        <FG label="Site Name"><Inp value={f.name} onChange={s("name")} placeholder="Pond A, East Farm…"/></FG>
        <G2><FG label="Location"><Inp value={f.location} onChange={s("location")} placeholder="Village, Field…"/></FG><FG label="Area (acres)"><Inp type="number" step="0.1" value={f.area} onChange={s("area")} placeholder="0.0"/></FG></G2>
        <FG label="Notes"><Txa value={f.notes} onChange={s("notes")} placeholder="Observations…"/></FG>
        <div className="flex gap-3 justify-end pt-2"><Ghost onClick={onClose}>Cancel</Ghost><Btn onClick={()=>{if(!f.name.trim())return;onSave(f);}}>Save Site</Btn></div>
      </div>
    </Modal>
  );
};

const TankForm = ({init,sites,onSave,onClose}) => {
  const [f,setF] = useState(init||{name:"",siteId:sites[0]?.id||"",status:"Active",stockingDate:today(),stockingQty:"",feedStatus:"",mortalityCount:"",notes:""});
  const s = k => e => setF(p=>({...p,[k]:e.target.value}));
  return (
    <Modal title={init?"Edit Tank":"Add Tank"} sub="Tank / Pond" onClose={onClose}>
      <div className="space-y-3">
        <G2><FG label="Tank Name"><Inp value={f.name} onChange={s("name")} placeholder="Tank A-1…"/></FG><FG label="Site"><Sel value={f.siteId} onChange={s("siteId")}>{sites.map(s=><option key={s.id} value={s.id}>{s.name}</option>)}</Sel></FG></G2>
        <G2><FG label="Status"><Sel value={f.status} onChange={s("status")}><option>Active</option><option>Harvest</option><option>Issue</option><option>Empty</option></Sel></FG><FG label="Stocking Date"><Inp type="date" value={f.stockingDate} onChange={s("stockingDate")}/></FG></G2>
        <G2><FG label="Stocking Qty (PLs)"><Inp type="number" value={f.stockingQty} onChange={s("stockingQty")} placeholder="0"/></FG><FG label="Mortality Count"><Inp type="number" value={f.mortalityCount} onChange={s("mortalityCount")} placeholder="0"/></FG></G2>
        <FG label="Feed Status"><Inp value={f.feedStatus} onChange={s("feedStatus")} placeholder="Stage 3 – 3 kg/day…"/></FG>
        <FG label="Notes"><Txa value={f.notes} onChange={s("notes")} placeholder="ABW, water quality…"/></FG>
        {f.stockingDate&&<div className={`rounded-xl px-4 py-3 border ${f.status==="Issue"?"bg-red-50 border-red-100":"bg-emerald-50 border-emerald-100"}`}><p className={`text-[10px] font-bold uppercase tracking-wider ${f.status==="Issue"?"text-red-500":"text-emerald-600"}`}>Days of Culture</p><p className={`text-xl font-extrabold mt-0.5 ${f.status==="Issue"?"text-red-700":"text-emerald-700"}`}>DOC {daysSince(f.stockingDate)}</p></div>}
        <div className="flex gap-3 justify-end pt-2"><Ghost onClick={onClose}>Cancel</Ghost><Btn onClick={()=>{if(!f.name.trim())return;onSave(f);}}>Save Tank</Btn></div>
      </div>
    </Modal>
  );
};

const TaskForm = ({init,onSave,onClose}) => {
  const [f,setF] = useState(init||{name:"",category:"Site",priority:"Medium",dueDate:today(),status:"Pending",notes:""});
  const s = k => e => setF(p=>({...p,[k]:e.target.value}));
  return (
    <Modal title={init?"Edit Task":"Add Task"} sub="Task Manager" onClose={onClose}>
      <div className="space-y-3">
        <FG label="Task Name"><Inp value={f.name} onChange={s("name")} placeholder="e.g. Check aerators…"/></FG>
        <G2><FG label="Category"><Sel value={f.category} onChange={s("category")}><option>Site</option><option>Finance</option><option>Personal</option></Sel></FG><FG label="Priority"><Sel value={f.priority} onChange={s("priority")}><option>High</option><option>Medium</option><option>Low</option></Sel></FG></G2>
        <G2><FG label="Due Date"><Inp type="date" value={f.dueDate} onChange={s("dueDate")}/></FG><FG label="Status"><Sel value={f.status} onChange={s("status")}><option>Pending</option><option>In-Progress</option><option>Done</option></Sel></FG></G2>
        <div className="flex gap-1.5 flex-wrap"><span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest w-full mb-0.5">Quick Set Due</span>{[["Today",0],["Tomorrow",1],["In 3 days",3],["This week",7]].map(([l,n])=><button key={l} onClick={()=>setF(p=>({...p,dueDate:addD(n)}))} className="px-2.5 py-1 text-xs font-semibold rounded-lg bg-gray-100 hover:bg-teal-50 hover:text-teal-700 transition-colors text-gray-600">{l}</button>)}</div>
        <FG label="Notes"><Txa value={f.notes} onChange={s("notes")} placeholder="Details…"/></FG>
        <div className="flex gap-3 justify-end pt-2"><Ghost onClick={onClose}>Cancel</Ghost><Btn onClick={()=>{if(!f.name.trim())return;onSave(f);}}>Save Task</Btn></div>
      </div>
    </Modal>
  );
};

const CallForm = ({init,onSave,onClose}) => {
  const [f,setF] = useState(init||{name:"",phone:"",purpose:"",lastCallDate:today(),dueDate:addD(1),status:"Open",notes:""});
  const s = k => e => setF(p=>({...p,[k]:e.target.value}));
  return (
    <Modal title={init?"Edit Call":"Log Call"} sub="Calls & Follow-up" onClose={onClose}>
      <div className="space-y-3">
        <G2><FG label="Person Name"><Inp value={f.name} onChange={s("name")} placeholder="Ravi, Aruna…"/></FG><FG label="Phone"><Inp value={f.phone} onChange={s("phone")} placeholder="Optional"/></FG></G2>
        <FG label="Purpose"><Inp value={f.purpose} onChange={s("purpose")} placeholder="Discuss loan, feed pricing…"/></FG>
        <G2><FG label="Last Call Date"><Inp type="date" value={f.lastCallDate} onChange={s("lastCallDate")}/></FG><FG label="Follow-up Date"><Inp type="date" value={f.dueDate} onChange={s("dueDate")}/></FG></G2>
        <FG label="Status"><Sel value={f.status} onChange={s("status")}><option>Open</option><option>Closed</option></Sel></FG>
        <FG label="Notes"><Txa value={f.notes} onChange={s("notes")} placeholder="Discussion summary…"/></FG>
        <div className="flex gap-3 justify-end pt-2"><Ghost onClick={onClose}>Cancel</Ghost><Btn onClick={()=>{if(!f.name.trim())return;onSave(f);}}>Save Call</Btn></div>
      </div>
    </Modal>
  );
};

/* ══════════════════════════════════════════════
   PAGE — DASHBOARD (above-fold grid)
   ══════════════════════════════════════════════ */
const DashPage = ({bankLoans,privateLoans,emis,sites,tanks,tasks,calls,alerts,setModal,setDelTarget,quickComplete}) => {
  const totalDebt   = [...bankLoans,...privateLoans].reduce((s,l)=>s+parseFloat(l.principal||0),0) + emis.reduce((s,e)=>s+parseFloat(e.principal||0),0);
  const monthlyEMI  = emis.filter(e=>e.status==="Active").reduce((s,e)=>s+parseFloat(e.emiAmount||0),0);
  const activeTanks = tanks.filter(t=>t.status==="Active").length;
  const issueTanks  = tanks.filter(t=>t.status==="Issue").length;
  const pendTasks   = tasks.filter(t=>t.status!=="Done").length;
  const todayTasks  = tasks.filter(t=>t.dueDate===today()&&t.status!=="Done");
  const todayCalls  = calls.filter(c=>c.dueDate===today()&&c.status==="Open");
  const urgAlerts   = alerts.filter(a=>a.sev==="red");

  const STAT = [
    {label:"Total Outstanding",value:fmtINR(totalDebt),sub:"all loans + EMIs",icon:TrendingDown,c:"text-red-600",bg:"bg-red-50",border:"border-red-100"},
    {label:"Monthly EMI",value:fmtINR(monthlyEMI),sub:`${emis.filter(e=>e.status==="Active").length} active EMIs`,icon:CreditCard,c:"text-blue-600",bg:"bg-blue-50",border:"border-blue-100"},
    {label:"Active Tanks",value:activeTanks,sub:`${issueTanks>0?issueTanks+" with issues":"All healthy"}`,icon:Fish,c:issueTanks>0?"text-red-500":"text-emerald-600",bg:issueTanks>0?"bg-red-50":"bg-emerald-50",border:issueTanks>0?"border-red-100":"border-emerald-100"},
    {label:"Open Tasks",value:pendTasks,sub:`${urgAlerts.length} urgent alerts`,icon:CheckSquare,c:"text-amber-600",bg:"bg-amber-50",border:"border-amber-100"},
  ];

  return (
    <div className="h-full flex flex-col gap-3 p-4 overflow-hidden">
      {/* KPI Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 flex-shrink-0">
        {STAT.map(({label,value,sub,icon:Icon,c,bg,border})=>(
          <div key={label} className={`bg-white rounded-xl border ${border} p-3.5 shadow-sm`}>
            <div className="flex items-center justify-between mb-2">
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">{label}</p>
              <div className={`w-7 h-7 rounded-lg ${bg} flex items-center justify-center`}><Icon size={13} className={c}/></div>
            </div>
            <p className={`text-xl font-extrabold ${c} leading-none`}>{value}</p>
            <p className="text-xs text-gray-400 mt-1 font-medium">{sub}</p>
          </div>
        ))}
      </div>

      {/* 3-panel row */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-3 gap-3 min-h-0">

        {/* Finance Alerts */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm flex flex-col overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between flex-shrink-0">
            <div className="flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-red-400"/><p className="text-sm font-bold text-gray-800">Finance Alerts</p></div>
            <span className="text-xs font-bold text-gray-400">{alerts.length} active</span>
          </div>
          <div className="flex-1 overflow-y-auto divide-y divide-gray-50">
            {alerts.length===0&&<div className="flex flex-col items-center py-8 gap-2 text-gray-400"><Check size={20} className="text-emerald-400"/><p className="text-xs font-medium text-emerald-500">All clear!</p></div>}
            {alerts.map(a=>(
              <div key={a.id} className={`px-4 py-2.5 flex items-start gap-2.5 ${a.sev==="red"?"bg-red-50/60":a.sev==="amber"?"bg-amber-50/40":""}`}>
                <div className={`w-6 h-6 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5 text-xs ${a.sev==="red"?"bg-red-100":"bg-amber-100"}`}>{a.icon}</div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-bold text-gray-800">{a.title}</p>
                  <p className="text-xs text-gray-500 truncate">{a.body}</p>
                </div>
              </div>
            ))}
          </div>
          <div className="px-4 py-2.5 border-t border-gray-100 flex-shrink-0">
            <div className="flex justify-between text-xs"><span className="text-gray-400">Total debt</span><span className="font-bold text-gray-700">{fmtINR([...bankLoans,...privateLoans].reduce((s,l)=>s+parseFloat(l.principal||0),0))}</span></div>
            <div className="flex justify-between text-xs mt-1"><span className="text-gray-400">Interest accrued</span><span className="font-bold text-red-600">{fmtINR([...bankLoans.map(bkInt),...privateLoans.map(pvInt)].reduce((a,b)=>a+b,0))}</span></div>
          </div>
        </div>

        {/* Farm Status */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm flex flex-col overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between flex-shrink-0">
            <div className="flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-emerald-500"/><p className="text-sm font-bold text-gray-800">Farm Status</p></div>
            <div className="flex gap-2 text-xs">
              <span className="text-emerald-600 font-bold">{activeTanks} active</span>
              {issueTanks>0&&<span className="text-red-500 font-bold">{issueTanks} issues</span>}
            </div>
          </div>
          <div className="flex-1 overflow-y-auto divide-y divide-gray-50">
            {tanks.filter(t=>t.status==="Active"||t.status==="Issue").map(tank=>{
              const site=sites.find(s=>s.id===tank.siteId);
              return (
                <div key={tank.id} className={`px-4 py-2.5 flex items-center gap-3 ${tank.status==="Issue"?"bg-red-50/50":""}`}>
                  <div className={`w-9 h-9 rounded-lg border-2 flex items-center justify-center flex-shrink-0 text-[11px] font-extrabold ${tank.status==="Issue"?"border-red-400 text-red-600":"border-emerald-300 text-emerald-700"}`}>
                    D{daysSince(tank.stockingDate)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5"><p className="text-xs font-bold text-gray-800">{tank.name}</p><Badge label={tank.status}/></div>
                    <p className="text-[10px] text-gray-400 truncate">{site?.name} · {tank.feedStatus||"—"}</p>
                  </div>
                  {tank.mortalityCount>0&&<span className="text-[10px] font-bold text-red-400 flex-shrink-0">⚠ {tank.mortalityCount}</span>}
                </div>
              );
            })}
            {activeTanks===0&&<div className="flex flex-col items-center py-8 gap-2 text-gray-400"><Fish size={20} className="text-gray-200"/><p className="text-xs">No active tanks</p></div>}
          </div>
          <button onClick={()=>setModal({type:"tank"})} className="px-4 py-2.5 border-t border-gray-100 text-xs font-semibold text-teal-600 hover:bg-teal-50 transition-colors flex items-center justify-center gap-1 flex-shrink-0"><Plus size={11}/>Add Tank</button>
        </div>

        {/* Today's Agenda */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm flex flex-col overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between flex-shrink-0">
            <div className="flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-purple-500"/><p className="text-sm font-bold text-gray-800">Today's Agenda</p></div>
            <span className="text-xs font-bold text-gray-400">{todayTasks.length+todayCalls.length} items</span>
          </div>
          <div className="flex-1 overflow-y-auto divide-y divide-gray-50">
            {todayTasks.map(t=>(
              <div key={t.id} className="px-4 py-2.5 flex items-center gap-3">
                <button onClick={()=>quickComplete(t.id)} className="w-5 h-5 rounded-md border-2 border-gray-300 hover:border-emerald-400 hover:bg-emerald-50 transition-all flex items-center justify-center flex-shrink-0"/>
                <div className="flex-1 min-w-0"><p className="text-xs font-semibold text-gray-800 truncate">{t.name}</p><div className="flex gap-1 mt-0.5"><Badge label={t.priority}/><Badge label={t.category}/></div></div>
              </div>
            ))}
            {todayCalls.map(c=>(
              <div key={c.id} className="px-4 py-2.5 flex items-center gap-3">
                <div className="w-5 h-5 rounded-md bg-indigo-100 flex items-center justify-center flex-shrink-0"><Phone size={9} className="text-indigo-600"/></div>
                <div className="flex-1 min-w-0"><p className="text-xs font-semibold text-gray-800 truncate">{c.name}</p><p className="text-[10px] text-gray-400 truncate">{c.purpose}</p></div>
              </div>
            ))}
            {todayTasks.length===0&&todayCalls.length===0&&<div className="flex flex-col items-center py-8 gap-2 text-gray-400"><Check size={20} className="text-emerald-400"/><p className="text-xs font-medium text-emerald-500">All clear for today!</p></div>}
          </div>
          <button onClick={()=>setModal({type:"task"})} className="px-4 py-2.5 border-t border-gray-100 text-xs font-semibold text-purple-600 hover:bg-purple-50 transition-colors flex items-center justify-center gap-1 flex-shrink-0"><Plus size={11}/>Add Task</button>
        </div>
      </div>

      {/* Quick Actions Row */}
      <div className="flex-shrink-0 bg-white rounded-xl border border-gray-100 p-3 shadow-sm">
        <div className="flex items-center gap-2 flex-wrap">
          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mr-1">Quick Add</p>
          {[["Bank Loan","bank","bg-teal-600"],["Private Loan","private","bg-amber-600"],["EMI","emi","bg-blue-600"],["Tank","tank","bg-emerald-600"],["Task","task","bg-purple-600"],["Call","call","bg-indigo-600"]].map(([l,t,c])=>(
            <button key={t} onClick={()=>setModal({type:t})} className={`${c} hover:opacity-90 text-white px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1 transition-all active:scale-[0.97]`}><Plus size={10}/>{l}</button>
          ))}
        </div>
      </div>
    </div>
  );
};

/* ── Page: Bank Loans ── */
const BankPage = ({bankLoans,setModal,setDelTarget}) => {
  const total = bankLoans.reduce((s,l)=>s+parseFloat(l.principal||0),0);
  const intTotal = bankLoans.reduce((s,l)=>s+bkInt(l),0);
  return (
    <div className="p-5">
      <div className="flex items-center justify-between mb-5">
        <div><h2 className="text-lg font-extrabold text-gray-900">Bank Loans</h2><p className="text-sm text-gray-400 mt-0.5">Principal: {fmtINR(total)} · Interest accrued: {fmtINR(intTotal)}</p></div>
        <Btn onClick={()=>setModal({type:"bank"})}><Plus size={13}/>Add Loan</Btn>
      </div>
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        {bankLoans.map(l=>(
          <div key={l.id} className={`bg-white rounded-xl border p-4 shadow-sm hover:shadow-md transition-all ${isUrg(l.dueDate)?"border-red-200":isUp(l.dueDate)?"border-amber-200":"border-gray-100"}`}>
            <div className="flex items-start justify-between gap-3 mb-3">
              <div>
                <div className="flex items-center gap-2 flex-wrap"><p className="font-bold text-gray-900">{l.name}</p><Badge label={l.status}/>{isUrg(l.dueDate)&&<Badge label={`Due in ${daysUntil(l.dueDate)}d`}/>}</div>
                {l.ref&&<p className="text-xs text-gray-400 mt-0.5">Ref: {l.ref}</p>}
              </div>
              <div className="flex gap-1.5 flex-shrink-0">
                <button onClick={()=>setModal({type:"bank",record:l})} className="w-7 h-7 rounded-lg bg-teal-50 text-teal-600 hover:bg-teal-100 flex items-center justify-center"><Pencil size={12}/></button>
                <button onClick={()=>setDelTarget({type:"bank",id:l.id})} className="w-7 h-7 rounded-lg bg-red-50 text-red-400 hover:bg-red-100 flex items-center justify-center"><Trash2 size={12}/></button>
              </div>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-3 border-t border-gray-50">
              {[["Principal",fmtINR(l.principal),"text-gray-800"],["Rate",`${l.rate}% p.a.`,"text-gray-800"],["Interest Due",fmtINR(bkInt(l)),"text-red-600"],["Due Date",fmtD(l.dueDate),isUrg(l.dueDate)?"text-red-600":isUp(l.dueDate)?"text-amber-600":"text-gray-800"]].map(([k,v,c])=>(
                <div key={k}><p className="text-[10px] text-gray-400 font-semibold uppercase tracking-wide">{k}</p><p className={`text-sm font-bold mt-0.5 ${c}`}>{v}</p></div>
              ))}
            </div>
            {l.notes&&<p className="text-xs text-gray-400 italic mt-2">{l.notes}</p>}
          </div>
        ))}
        {bankLoans.length===0&&<div className="col-span-2 flex flex-col items-center py-16 gap-3 text-gray-400"><Building2 size={32} className="text-gray-200"/><p className="text-sm font-medium">No bank loans yet.</p></div>}
      </div>
    </div>
  );
};

/* ── Page: Private Loans ── */
const PrivatePage = ({privateLoans,setModal,setDelTarget}) => (
  <div className="p-5">
    <div className="flex items-center justify-between mb-5">
      <div><h2 className="text-lg font-extrabold text-gray-900">Private Loans</h2><p className="text-sm text-gray-400 mt-0.5">Total: {fmtINR(privateLoans.reduce((s,l)=>s+parseFloat(l.principal||0),0))} · Interest owed: {fmtINR(privateLoans.reduce((s,l)=>s+pvInt(l),0))}</p></div>
      <Btn color="amber" onClick={()=>setModal({type:"private"})}><Plus size={13}/>Add Private Loan</Btn>
    </div>
    <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
      {privateLoans.map(l=>(
        <div key={l.id} className={`bg-white rounded-xl border p-4 shadow-sm hover:shadow-md transition-all ${isUrg(l.dueDate)?"border-red-200":isUp(l.dueDate)?"border-amber-200":"border-gray-100"}`}>
          <div className="flex items-start justify-between gap-3 mb-3">
            <div><div className="flex items-center gap-2 flex-wrap"><p className="font-bold text-gray-900">{l.name}</p>{l.relation&&<Badge label={l.relation}/>}{isUrg(l.dueDate)&&<span className="text-xs font-bold text-red-500">🔴 Due in {daysUntil(l.dueDate)}d</span>}</div></div>
            <div className="flex gap-1.5 flex-shrink-0">
              <button onClick={()=>setModal({type:"private",record:l})} className="w-7 h-7 rounded-lg bg-amber-50 text-amber-600 hover:bg-amber-100 flex items-center justify-center"><Pencil size={12}/></button>
              <button onClick={()=>setDelTarget({type:"private",id:l.id})} className="w-7 h-7 rounded-lg bg-red-50 text-red-400 hover:bg-red-100 flex items-center justify-center"><Trash2 size={12}/></button>
            </div>
          </div>
          <div className="bg-amber-50 border border-amber-100 rounded-lg px-3 py-2.5 mb-3 flex justify-between">
            <div><p className="text-[10px] font-bold text-amber-600 uppercase">Interest Unpaid Since</p><p className="text-xs font-bold text-amber-800 mt-0.5">{fmtD(l.interestPaidUpto)}</p><p className="text-[10px] text-amber-400">{daysSince(l.interestPaidUpto)} days</p></div>
            <div className="text-right"><p className="text-[10px] font-bold text-amber-600 uppercase">Outstanding Interest</p><p className="text-lg font-extrabold text-amber-700 mt-0.5">{fmtINR(pvInt(l))}</p></div>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-3 border-t border-gray-50">
            {[["Principal",fmtINR(l.principal)],["Rate",`${l.rate}%/mo`],["Monthly",fmtINR(l.principal*l.rate/100)],["Next Due",fmtD(l.dueDate)]].map(([k,v])=>(
              <div key={k}><p className="text-[10px] text-gray-400 font-semibold uppercase tracking-wide">{k}</p><p className="text-sm font-bold text-gray-800 mt-0.5">{v}</p></div>
            ))}
          </div>
        </div>
      ))}
      {privateLoans.length===0&&<div className="col-span-2 flex flex-col items-center py-16 gap-3 text-gray-400"><Users size={32} className="text-gray-200"/><p className="text-sm font-medium">No private loans yet.</p></div>}
    </div>
  </div>
);

/* ── Page: EMI ── */
const EMIPage = ({emis,setModal,setDelTarget}) => {
  const active = emis.filter(e=>e.status==="Active");
  const total  = active.reduce((s,e)=>s+parseFloat(e.emiAmount||0),0);
  return (
    <div className="p-5">
      <div className="flex items-center justify-between mb-5">
        <div><h2 className="text-lg font-extrabold text-gray-900">EMI Tracker</h2><p className="text-sm text-gray-400 mt-0.5">Monthly outflow: {fmtINR(total)} · {active.length} active</p></div>
        <Btn color="blue" onClick={()=>setModal({type:"emi"})}><Plus size={13}/>Add EMI</Btn>
      </div>
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        {emis.map(e=>{const days=daysEMI(e);return(
          <div key={e.id} className={`bg-white rounded-xl border p-4 shadow-sm hover:shadow-md transition-all ${days===0?"border-red-200":days<=5?"border-amber-200":"border-gray-100"}`}>
            <div className="flex items-start justify-between gap-3 mb-3">
              <div><div className="flex items-center gap-2 flex-wrap"><p className="font-bold text-gray-900">{e.name}</p><Badge label={e.lender}/><Badge label={e.status}/>{days===0&&<span className="text-xs font-bold text-red-500 animate-pulse">🔴 DUE TODAY</span>}{days>0&&days<=5&&<span className="text-xs font-bold text-amber-500">⚠ in {days}d</span>}</div></div>
              <div className="flex gap-1.5 flex-shrink-0">
                <button onClick={()=>setModal({type:"emi",record:e})} className="w-7 h-7 rounded-lg bg-blue-50 text-blue-600 hover:bg-blue-100 flex items-center justify-center"><Pencil size={12}/></button>
                <button onClick={()=>setDelTarget({type:"emi",id:e.id})} className="w-7 h-7 rounded-lg bg-red-50 text-red-400 hover:bg-red-100 flex items-center justify-center"><Trash2 size={12}/></button>
              </div>
            </div>
            {e.remainingMonths>0&&<div className="mb-3"><div className="flex justify-between text-[10px] text-gray-400 mb-1"><span>{e.remainingMonths} months left</span><span>{fmtINR(e.emiAmount*e.remainingMonths)} total</span></div><div className="h-1.5 bg-gray-100 rounded-full overflow-hidden"><div className="h-full bg-blue-400 rounded-full" style={{width:`${Math.min(100,100-(e.remainingMonths/60)*100)}%`}}/></div></div>}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-3 border-t border-gray-50">
              {[["EMI/mo",fmtINR(e.emiAmount),"text-blue-700"],["Due",`${e.monthlyDueDay}${daySuf(e.monthlyDueDay)} of month`,"text-gray-800"],["Outstanding",fmtINR(e.principal),"text-gray-800"],["Next Due",emiNextDate(e),days<=5?"text-amber-600":"text-gray-800"]].map(([k,v,c])=>(
                <div key={k}><p className="text-[10px] text-gray-400 font-semibold uppercase tracking-wide">{k}</p><p className={`text-sm font-bold mt-0.5 ${c}`}>{v}</p></div>
              ))}
            </div>
          </div>
        );})}
        {emis.length===0&&<div className="col-span-2 flex flex-col items-center py-16 gap-3 text-gray-400"><CreditCard size={32} className="text-gray-200"/><p className="text-sm font-medium">No EMIs tracked yet.</p></div>}
      </div>
    </div>
  );
};

/* ── Page: Timeline ── */
const TimelinePage = ({bankLoans,privateLoans,emis}) => {
  const items = useMemo(()=>{
    const arr=[];
    bankLoans.forEach(l=>{const d=daysUntil(l.dueDate);if(d>=0&&d<=60)arr.push({id:"b"+l.id,name:l.name,type:"Bank",amount:l.principal,days:d,urgent:d<=3,upcoming:d<=10});});
    privateLoans.forEach(l=>{const d=daysUntil(l.dueDate);if(d>=0&&d<=60)arr.push({id:"p"+l.id,name:l.name,type:"Private",amount:pvInt(l),days:d,urgent:d<=3,upcoming:d<=10});});
    emis.filter(e=>e.status==="Active").forEach(e=>{const d=daysEMI(e);if(d<=30)arr.push({id:"e"+e.id,name:e.name,type:"EMI",amount:e.emiAmount,days:d,urgent:d<=3,upcoming:d<=7});});
    return arr.sort((a,b)=>a.days-b.days);
  },[bankLoans,privateLoans,emis]);
  const TC={Bank:"bg-teal-100 text-teal-700",Private:"bg-amber-100 text-amber-700",EMI:"bg-blue-100 text-blue-700"};
  return (
    <div className="p-5">
      <div className="mb-5"><h2 className="text-lg font-extrabold text-gray-900">Payment Timeline</h2><p className="text-sm text-gray-400 mt-0.5">{items.filter(i=>i.urgent).length} urgent · next 60 days</p></div>
      <div className="space-y-2">
        {items.map(item=>(
          <div key={item.id} className={`bg-white rounded-xl border flex items-center gap-4 p-4 shadow-sm hover:shadow-md transition-all ${item.urgent?"border-red-200":item.upcoming?"border-amber-100":"border-gray-100"}`}>
            <div className={`w-3 h-3 rounded-full flex-shrink-0 ${item.urgent?"bg-red-500":item.upcoming?"bg-amber-400":"bg-teal-400"}`}/>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap"><p className="font-semibold text-sm text-gray-900">{item.name}</p><span className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-bold ${TC[item.type]}`}>{item.type}</span>{item.urgent&&<span className="text-[10px] font-bold text-red-500">🔴 URGENT</span>}</div>
              <p className="text-xs text-gray-400 mt-0.5">{item.days===0?"Due TODAY":`Due in ${item.days} days`}</p>
            </div>
            <div className="text-right flex-shrink-0">
              <p className={`text-base font-extrabold ${item.urgent?"text-red-600":"text-gray-800"}`}>{fmtINR(item.amount)}</p>
            </div>
          </div>
        ))}
        {items.length===0&&<div className="flex flex-col items-center py-16 gap-3 text-gray-400"><Check size={32} className="text-emerald-300"/><p className="text-sm font-medium text-emerald-600">All clear — no upcoming dues!</p></div>}
      </div>
    </div>
  );
};

/* ── Page: Farm ── */
const FarmPage = ({sites,tanks,setModal,setDelTarget}) => {
  const tForSite = sId => tanks.filter(t=>t.siteId===sId);
  const SC={Active:"border-emerald-200 bg-emerald-50",Issue:"border-red-300 bg-red-50",Harvest:"border-amber-200 bg-amber-50",Empty:"border-gray-200 bg-gray-50"};
  return (
    <div className="p-5">
      <div className="flex items-center justify-between mb-5">
        <div><h2 className="text-lg font-extrabold text-gray-900">Sites & Tanks</h2><p className="text-sm text-gray-400 mt-0.5">{sites.length} sites · {tanks.filter(t=>t.status==="Active").length} active · {tanks.filter(t=>t.status==="Issue").length} issues</p></div>
        <div className="flex gap-2"><Btn sm onClick={()=>setModal({type:"tank"})}><Plus size={11}/>Tank</Btn><Btn sm onClick={()=>setModal({type:"site"})}><Plus size={11}/>Site</Btn></div>
      </div>
      <div className="space-y-5">
        {sites.map(site=>(
          <div key={site.id} className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="px-5 py-3.5 bg-gradient-to-r from-emerald-50 to-teal-50 border-b border-gray-100 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-emerald-100 flex items-center justify-center"><MapPin size={14} className="text-emerald-600"/></div>
                <div><p className="font-bold text-gray-900">{site.name}</p><p className="text-xs text-gray-500">{[site.location,site.area&&`${site.area} acres`,`${tForSite(site.id).length} tanks`].filter(Boolean).join(" · ")}</p></div>
              </div>
              <div className="flex gap-1.5">
                <button onClick={()=>setModal({type:"tank",prefill:{siteId:site.id}})} className="text-xs px-2.5 py-1.5 rounded-lg bg-purple-50 text-purple-700 font-semibold hover:bg-purple-100 flex items-center gap-1"><Plus size={10}/>Tank</button>
                <button onClick={()=>setModal({type:"site",record:site})} className="w-7 h-7 rounded-lg bg-emerald-100 text-emerald-600 hover:bg-emerald-200 flex items-center justify-center"><Pencil size={11}/></button>
                <button onClick={()=>setDelTarget({type:"site",id:site.id})} className="w-7 h-7 rounded-lg bg-red-50 text-red-400 hover:bg-red-100 flex items-center justify-center"><Trash2 size={11}/></button>
              </div>
            </div>
            <div className="p-4 grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
              {tForSite(site.id).map(tank=>(
                <div key={tank.id} className={`rounded-xl border p-3.5 ${SC[tank.status]||"border-gray-100 bg-white"}`}>
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <div className={`w-9 h-9 rounded-lg border-2 flex items-center justify-center text-[11px] font-extrabold flex-shrink-0 ${tank.status==="Issue"?"border-red-400 text-red-700":"border-emerald-300 text-emerald-800"}`}>D{daysSince(tank.stockingDate)||"—"}</div>
                      <div><p className="text-sm font-bold text-gray-900">{tank.name}</p><Badge label={tank.status}/></div>
                    </div>
                    <div className="flex gap-1">
                      <button onClick={()=>setModal({type:"tank",record:tank})} className="w-6 h-6 rounded-md bg-white text-gray-500 hover:bg-gray-100 flex items-center justify-center"><Pencil size={10}/></button>
                      <button onClick={()=>setDelTarget({type:"tank",id:tank.id})} className="w-6 h-6 rounded-md bg-white text-red-300 hover:text-red-500 hover:bg-red-50 flex items-center justify-center"><Trash2 size={10}/></button>
                    </div>
                  </div>
                  {tank.feedStatus&&<p className="text-xs text-gray-600 mb-1">🌾 {tank.feedStatus}</p>}
                  {tank.mortalityCount>0&&<p className="text-xs font-bold text-red-500">⚠ Mortality: {Number(tank.mortalityCount).toLocaleString("en-IN")}</p>}
                  {tank.stockingQty&&<p className="text-xs text-gray-400">Stocked: {Number(tank.stockingQty).toLocaleString("en-IN")} PLs</p>}
                  {tank.notes&&<p className="text-xs text-gray-400 italic mt-1.5 pt-1.5 border-t border-black/5">{tank.notes}</p>}
                </div>
              ))}
              {tForSite(site.id).length===0&&<div className="col-span-3 py-8 flex flex-col items-center gap-2 text-gray-400"><Droplets size={20} className="text-gray-200"/><p className="text-xs">No tanks yet</p><button onClick={()=>setModal({type:"tank",prefill:{siteId:site.id}})} className="text-xs font-semibold text-teal-600 hover:underline">+ Add first tank</button></div>}
            </div>
          </div>
        ))}
        {sites.length===0&&<div className="flex flex-col items-center py-20 gap-4 text-gray-400"><MapPin size={40} className="text-gray-200"/><p className="text-sm font-medium">No sites added yet.</p><Btn onClick={()=>setModal({type:"site"})}><Plus size={13}/>Add First Site</Btn></div>}
      </div>
    </div>
  );
};

/* ── Page: Tasks ── */
const TasksPage = ({tasks,setModal,setDelTarget,quickComplete}) => {
  const [filter,setFilter] = useState("All");
  const filtered = useMemo(()=>{
    let t = tasks;
    if(filter==="High") t=t.filter(x=>x.priority==="High"&&x.status!=="Done");
    else if(filter==="Pending") t=t.filter(x=>x.status==="Pending");
    else if(filter==="In-Progress") t=t.filter(x=>x.status==="In-Progress");
    else if(filter==="Done") t=t.filter(x=>x.status==="Done");
    return t.sort((a,b)=>{if(a.status==="Done"&&b.status!=="Done")return 1;if(a.status!=="Done"&&b.status==="Done")return -1;const p={High:0,Medium:1,Low:2};return p[a.priority]-p[b.priority];});
  },[tasks,filter]);
  return (
    <div className="p-5">
      <div className="flex items-center justify-between mb-4">
        <div><h2 className="text-lg font-extrabold text-gray-900">Task Manager</h2><p className="text-sm text-gray-400 mt-0.5">{tasks.filter(t=>t.status!=="Done").length} pending · {tasks.filter(t=>t.dueDate===today()&&t.status!=="Done").length} due today</p></div>
        <Btn onClick={()=>setModal({type:"task"})} color="teal"><Plus size={13}/>Add Task</Btn>
      </div>
      <div className="flex gap-2 mb-4 flex-wrap">
        {["All","Pending","In-Progress","Done","High"].map(f=><button key={f} onClick={()=>setFilter(f)} className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${filter===f?"bg-teal-600 text-white shadow-sm":"bg-white border border-gray-200 text-gray-500 hover:border-teal-300 hover:text-teal-600"}`}>{f}</button>)}
      </div>
      <div className="space-y-2">
        {filtered.map(t=>(
          <div key={t.id} className={`bg-white rounded-xl border p-3.5 flex items-start gap-3 hover:shadow-sm transition-all ${t.status==="Done"?"opacity-50 border-gray-100":isUrg(t.dueDate)?"border-red-200":"border-gray-100"}`}>
            <button onClick={()=>quickComplete(t.id)} className={`w-5 h-5 mt-0.5 rounded-md border-2 flex items-center justify-center flex-shrink-0 transition-all ${t.status==="Done"?"bg-emerald-500 border-emerald-500":"border-gray-300 hover:border-emerald-400"}`}>
              {t.status==="Done"&&<Check size={10} className="text-white"/>}
            </button>
            <div className="flex-1 min-w-0">
              <p className={`text-sm font-semibold ${t.status==="Done"?"line-through text-gray-400":"text-gray-900"}`}>{t.name}</p>
              <div className="flex items-center gap-2 mt-1 flex-wrap"><Badge label={t.priority}/><Badge label={t.status}/><Badge label={t.category}/>{t.dueDate&&<span className={`text-[10px] font-semibold ${isUrg(t.dueDate)&&t.status!=="Done"?"text-red-500":"text-gray-400"}`}>Due {fmtD(t.dueDate)}</span>}</div>
            </div>
            <div className="flex gap-1.5 flex-shrink-0">
              <button onClick={()=>setModal({type:"task",record:t})} className="w-7 h-7 rounded-lg bg-purple-50 text-purple-600 hover:bg-purple-100 flex items-center justify-center"><Pencil size={11}/></button>
              <button onClick={()=>setDelTarget({type:"task",id:t.id})} className="w-7 h-7 rounded-lg bg-red-50 text-red-400 hover:bg-red-100 flex items-center justify-center"><Trash2 size={11}/></button>
            </div>
          </div>
        ))}
        {filtered.length===0&&<div className="flex flex-col items-center py-16 gap-3 text-gray-400"><CheckSquare size={32} className="text-gray-200"/><p className="text-sm font-medium">No tasks found.</p></div>}
      </div>
    </div>
  );
};

/* ── Page: Calls ── */
const CallsPage = ({calls,setModal,setDelTarget}) => {
  const [filter,setFilter] = useState("All");
  const filtered = filter==="All"?calls:calls.filter(c=>c.status===filter);
  return (
    <div className="p-5">
      <div className="flex items-center justify-between mb-4">
        <div><h2 className="text-lg font-extrabold text-gray-900">Calls & Follow-ups</h2><p className="text-sm text-gray-400 mt-0.5">{calls.filter(c=>c.status==="Open").length} open · {calls.filter(c=>c.dueDate===today()&&c.status==="Open").length} follow-up today</p></div>
        <Btn color="blue" onClick={()=>setModal({type:"call"})}><Plus size={13}/>Log Call</Btn>
      </div>
      <div className="flex gap-2 mb-4">
        {["All","Open","Closed"].map(f=><button key={f} onClick={()=>setFilter(f)} className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${filter===f?"bg-blue-600 text-white shadow-sm":"bg-white border border-gray-200 text-gray-500 hover:border-blue-300"}`}>{f}</button>)}
      </div>
      <div className="space-y-2">
        {filtered.map(c=>(
          <div key={c.id} className={`bg-white rounded-xl border p-4 hover:shadow-sm transition-all ${isUrg(c.dueDate)&&c.status==="Open"?"border-red-200":"border-gray-100"}`}>
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap"><p className="font-bold text-gray-900">{c.name}</p><Badge label={c.status}/>{c.phone&&<span className="text-xs text-gray-400">{c.phone}</span>}</div>
                {c.purpose&&<p className="text-xs text-gray-600 mt-0.5">{c.purpose}</p>}
                <div className="flex gap-4 mt-2 text-xs text-gray-400">
                  {c.lastCallDate&&<span>Last: {fmtD(c.lastCallDate)}</span>}
                  {c.dueDate&&c.status==="Open"&&<span className={isUrg(c.dueDate)?"text-red-500 font-bold":""}>Follow-up: {fmtD(c.dueDate)}{daysUntil(c.dueDate)===0?" (TODAY)":""}</span>}
                </div>
                {c.notes&&<p className="text-xs text-gray-400 italic mt-1.5">📝 {c.notes}</p>}
              </div>
              <div className="flex gap-1.5 flex-shrink-0">
                <button onClick={()=>setModal({type:"call",record:c})} className="w-7 h-7 rounded-lg bg-blue-50 text-blue-600 hover:bg-blue-100 flex items-center justify-center"><Pencil size={11}/></button>
                <button onClick={()=>setDelTarget({type:"call",id:c.id})} className="w-7 h-7 rounded-lg bg-red-50 text-red-400 hover:bg-red-100 flex items-center justify-center"><Trash2 size={11}/></button>
              </div>
            </div>
          </div>
        ))}
        {filtered.length===0&&<div className="flex flex-col items-center py-16 gap-3 text-gray-400"><Phone size={32} className="text-gray-200"/><p className="text-sm font-medium">No calls logged.</p></div>}
      </div>
    </div>
  );
};

/* ══════════════════════════════════════════════
   SIDEBAR
   ══════════════════════════════════════════════ */
const NAV = [
  { id:"dashboard", label:"Dashboard",     icon:LayoutDashboard },
  { id:"__finance", label:"Finance",        icon:Wallet, children:[
    { id:"bank",     label:"Bank Loans",    icon:Building2 },
    { id:"private",  label:"Private Loans", icon:Users },
    { id:"emi",      label:"EMI Tracker",   icon:CreditCard },
    { id:"timeline", label:"Timeline",      icon:CalendarDays },
  ]},
  { id:"farm",       label:"Sites & Tanks", icon:Fish },
  { id:"tasks",      label:"Tasks",         icon:CheckSquare },
  { id:"calls",      label:"Calls",         icon:Phone },
];

const Sidebar = ({page,setPage,open,setOpen,alerts}) => {
  const [fin,setFin] = useState(true);
  const urgent = alerts.filter(a=>a.sev==="red").length;
  return (
    <>
      {/* Mobile overlay */}
      {open&&<div className="fixed inset-0 z-40 lg:hidden bg-gray-900/40" onClick={()=>setOpen(false)}/>}
      <aside className={`fixed lg:relative inset-y-0 left-0 z-50 lg:z-auto flex flex-col transition-all duration-300 ${open?"w-56":"w-0 lg:w-56 overflow-hidden"}`}
        style={{background:"#111827"}}>
        {/* Brand */}
        <div className="px-4 py-5 border-b border-white/10 flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{background:"linear-gradient(135deg,#0f6c5e,#14a88b)"}}>
              <Activity size={15} className="text-white"/>
            </div>
            <div className="min-w-0">
              <p className="text-xs font-extrabold text-white leading-none">Pavan Kumar</p>
              <p className="text-[10px] text-white/40 mt-0.5 font-medium">Finance & Farm ERP</p>
            </div>
          </div>
        </div>
        {/* Nav */}
        <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
          {NAV.map(item=>{
            if(item.children) return (
              <div key={item.id}>
                <button onClick={()=>setFin(v=>!v)} className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-white/60 hover:text-white hover:bg-white/8 transition-all text-sm font-semibold">
                  <item.icon size={15}/><span className="flex-1 text-left">{item.label}</span><ChevronDown size={12} className={`transition-transform ${fin?"rotate-180":""}`}/>
                </button>
                {fin&&item.children.map(child=>{
                  const isAct=page===child.id;
                  const cnt=child.id==="timeline"?urgent:null;
                  return(
                    <button key={child.id} onClick={()=>setPage(child.id)}
                      className={`w-full flex items-center gap-2.5 pl-8 pr-3 py-1.5 rounded-lg text-sm font-medium transition-all ${isAct?"bg-teal-600 text-white":"text-white/50 hover:text-white hover:bg-white/8"}`}>
                      <child.icon size={13}/><span className="flex-1 text-left">{child.label}</span>
                      {cnt>0&&<span className="bg-red-500 text-white text-[9px] w-4 h-4 rounded-full flex items-center justify-center font-bold">{cnt}</span>}
                    </button>
                  );
                })}
              </div>
            );
            const isAct=page===item.id;
            const cnt=item.id==="tasks"?null:null;
            return(
              <button key={item.id} onClick={()=>setPage(item.id)}
                className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-semibold transition-all ${isAct?"bg-teal-600 text-white":"text-white/60 hover:text-white hover:bg-white/8"}`}>
                <item.icon size={15}/><span className="flex-1 text-left">{item.label}</span>
                {isAct&&<div className="w-1.5 h-1.5 rounded-full bg-white/60"/>}
              </button>
            );
          })}
        </nav>
        {/* Demo badge */}
        {IS_DEMO&&(
          <div className="mx-3 mb-3 p-3 rounded-xl bg-amber-500/15 border border-amber-500/20 flex-shrink-0">
            <div className="flex items-center gap-2 mb-1"><Database size={11} className="text-amber-400"/><p className="text-[10px] font-bold text-amber-400">DEMO MODE</p></div>
            <p className="text-[10px] text-amber-300/80 leading-snug">Add Supabase credentials for persistent cloud storage & email alerts.</p>
          </div>
        )}
      </aside>
    </>
  );
};

/* ══════════════════════════════════════════════
   NOTIFICATION DROPDOWN
   ══════════════════════════════════════════════ */
const NotifDropdown = ({alerts,open,setOpen}) => {
  const ref = useRef(null);
  useEffect(()=>{
    const h=e=>{if(ref.current&&!ref.current.contains(e.target))setOpen(false);};
    document.addEventListener("mousedown",h); return()=>document.removeEventListener("mousedown",h);
  },[]);
  const total=alerts.length, urgent=alerts.filter(a=>a.sev==="red").length;
  return(
    <div ref={ref} className="relative">
      <button onClick={()=>setOpen(v=>!v)} className={`relative w-9 h-9 rounded-xl flex items-center justify-center transition-colors ${total>0?"bg-red-50 border border-red-100":"bg-gray-100 border border-gray-200"}`}>
        <Bell size={15} className={total>0?"text-red-500":"text-gray-500"}/>
        {total>0&&<span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white text-[9px] rounded-full flex items-center justify-center font-extrabold">{Math.min(total,9)}</span>}
      </button>
      {open&&(
        <div className="absolute right-0 top-11 w-80 bg-white rounded-2xl border border-gray-100 shadow-2xl z-50 overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between bg-gray-50/80">
            <div className="flex items-center gap-2"><Bell size={13} className={total>0?"text-red-500":"text-gray-400"}/><h3 className="text-sm font-bold text-gray-900">Alerts</h3></div>
            <div className="flex items-center gap-2">
              {urgent>0&&<span className="text-[10px] font-bold text-red-500 bg-red-50 px-1.5 py-0.5 rounded-full border border-red-100">{urgent} urgent</span>}
              <span className="text-xs text-gray-400">{total} total</span>
            </div>
          </div>
          <div className="max-h-72 overflow-y-auto">
            {alerts.length===0&&<div className="px-4 py-10 text-center"><Check size={20} className="text-emerald-400 mx-auto mb-2"/><p className="text-sm text-emerald-600 font-medium">All clear!</p><p className="text-xs text-gray-400 mt-0.5">No active alerts.</p></div>}
            {alerts.map(a=>(
              <div key={a.id} className={`px-4 py-3 border-b border-gray-50 flex items-start gap-3 ${a.sev==="red"?"bg-red-50/40":"a.sev==='amber'"?"bg-amber-50/40":""}`}>
                <span className="text-base flex-shrink-0 mt-0.5">{a.icon}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-bold text-gray-900 leading-snug">{a.title}</p>
                  <p className="text-xs text-gray-500 truncate mt-0.5">{a.body}</p>
                </div>
                <span className={`text-[10px] font-extrabold flex-shrink-0 ${a.sev==="red"?"text-red-500":"text-amber-600"}`}>{a.days===0?"NOW":a.days===Infinity?"—":`+${a.days}d`}</span>
              </div>
            ))}
          </div>
          {IS_DEMO&&(
            <div className="px-4 py-2.5 bg-blue-50 border-t border-blue-100">
              <p className="text-[10px] text-blue-600 font-medium flex items-center gap-1.5"><Database size={9}/>📧 Email alerts via Supabase Edge Functions when configured</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

/* ══════════════════════════════════════════════
   HEADER
   ══════════════════════════════════════════════ */
const Header = ({page,alerts,sideOpen,setSideOpen,notifOpen,setNotifOpen,loading}) => {
  const labels={dashboard:"Dashboard",bank:"Bank Loans",private:"Private Loans",emi:"EMI Tracker",timeline:"Payment Timeline",farm:"Sites & Tanks",tasks:"Tasks",calls:"Calls"};
  return (
    <header className="h-14 flex-shrink-0 bg-white border-b border-gray-100 flex items-center justify-between px-4 gap-3" style={{boxShadow:"0 1px 3px rgba(0,0,0,0.05)"}}>
      <div className="flex items-center gap-3">
        <button onClick={()=>setSideOpen(v=>!v)} className="w-8 h-8 rounded-lg hover:bg-gray-100 flex items-center justify-center transition-colors"><Menu size={16} className="text-gray-500"/></button>
        <h1 className="text-sm font-extrabold text-gray-900">{labels[page]||"Dashboard"}</h1>
      </div>
      <div className="flex items-center gap-2">
        {loading&&<div className="flex items-center gap-1.5 text-xs text-gray-400"><RefreshCw size={12} className="animate-spin"/><span>Loading…</span></div>}
        {IS_DEMO&&!loading&&<div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 bg-amber-50 border border-amber-200 rounded-lg"><Database size={10} className="text-amber-500"/><span className="text-[10px] font-bold text-amber-600">DEMO</span></div>}
        <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1.5 bg-gray-50 border border-gray-100 rounded-lg">
          <div className="w-1.5 h-1.5 rounded-full bg-emerald-400" style={{animation:"pulse 2s ease-in-out infinite"}}/>
          <span className="text-[10px] font-bold text-gray-500">{new Date().toLocaleDateString("en-IN",{day:"numeric",month:"short"})}</span>
        </div>
        <NotifDropdown alerts={alerts} open={notifOpen} setOpen={setNotifOpen}/>
      </div>
    </header>
  );
};

/* ══════════════════════════════════════════════
   APP ROOT
   ══════════════════════════════════════════════ */
export default function App() {
  const [page,setPage]       = useState("dashboard");
  const [sideOpen,setSideOpen] = useState(true);
  const [notifOpen,setNotifOpen] = useState(false);
  const [modal,setModal]     = useState(null); // { type, record?, prefill? }
  const [delTarget,setDelTarget] = useState(null);
  const [toast,setToast]     = useState(null);
  const [loading,setLoading] = useState(true);

  const [bankLoans,    setBankLoans]    = useState([]);
  const [privateLoans, setPrivateLoans] = useState([]);
  const [emis,         setEmis]         = useState([]);
  const [sites,        setSites]        = useState([]);
  const [tanks,        setTanks]        = useState([]);
  const [tasks,        setTasks]        = useState([]);
  const [calls,        setCalls]        = useState([]);

  const TB = {bank:"bank_loans",private:"private_loans",emi:"emis",site:"sites",tank:"tanks",task:"tasks",call:"calls"};
  const ST = {bank:setBankLoans,private:setPrivateLoans,emi:setEmis,site:setSites,tank:setTanks,task:setTasks,call:setCalls};

  useEffect(()=>{
    (async()=>{
      setLoading(true);
      if (!IS_DEMO) {
        const pairs=[["bank_loans",setBankLoans],["private_loans",setPrivateLoans],["emis",setEmis],["sites",setSites],["tanks",setTanks],["tasks",setTasks],["calls",setCalls]];
        const results = await Promise.all(pairs.map(([t])=>DB.get(t)));
        const hasData = results.some(r=>r&&r.length>0);
        if(hasData){pairs.forEach(([,s],i)=>{ if(results[i]&&results[i].length>0) s(results[i]); });setLoading(false);return;}
      }
      const seed=mkSeed();
      setBankLoans(seed.bankLoans);setPrivateLoans(seed.privateLoans);setEmis(seed.emis);
      setSites(seed.sites);setTanks(seed.tanks);setTasks(seed.tasks);setCalls(seed.calls);
      setLoading(false);
    })();
  },[]);

  const alerts = useMemo(()=>computeAlerts(bankLoans,privateLoans,emis,tasks,calls),[bankLoans,privateLoans,emis,tasks,calls]);

  const showToast = (msg,type="success") => { setToast({msg,type}); setTimeout(()=>setToast(null),3000); };

  const handleSave = async (type, record) => {
    const isEdit = !!record.id;
    const newRec = isEdit ? record : {...record, id:gid()};
    const saved  = isEdit ? await DB.upd(TB[type],record.id,record) : await DB.ins(TB[type],newRec);
    ST[type](p=> isEdit ? p.map(x=>x.id===record.id?{...x,...saved}:x) : [...p,saved||newRec]);
    setModal(null); showToast(isEdit?"Record updated!":"Saved successfully!");
  };

  const handleDelete = async () => {
    const {type,id} = delTarget;
    await DB.del(TB[type],id);
    if(type==="site") setTanks(p=>p.filter(t=>t.siteId!==id));
    ST[type](p=>p.filter(x=>x.id!==id));
    setDelTarget(null); showToast("Record deleted.");
  };

  const quickComplete = id => {
    const t=tasks.find(x=>x.id===id); if(!t) return;
    const ns=t.status==="Done"?"Pending":"Done";
    setTasks(p=>p.map(x=>x.id===id?{...x,status:ns}:x));
    DB.upd("tasks",id,{status:ns});
  };

  const ctx = {bankLoans,privateLoans,emis,sites,tanks,tasks,calls,alerts,setModal,setDelTarget,quickComplete};

  const FORMS = {
    bank:    <BankForm    init={modal?.record} onSave={r=>handleSave("bank",r)}    onClose={()=>setModal(null)}/>,
    private: <PrivateForm init={modal?.record} onSave={r=>handleSave("private",r)} onClose={()=>setModal(null)}/>,
    emi:     <EMIForm     init={modal?.record} onSave={r=>handleSave("emi",r)}     onClose={()=>setModal(null)}/>,
    site:    <SiteForm    init={modal?.record} onSave={r=>handleSave("site",r)}    onClose={()=>setModal(null)}/>,
    tank:    <TankForm    init={modal?.record||{...modal?.prefill}} sites={sites} onSave={r=>handleSave("tank",r)} onClose={()=>setModal(null)}/>,
    task:    <TaskForm    init={modal?.record} onSave={r=>handleSave("task",r)}    onClose={()=>setModal(null)}/>,
    call:    <CallForm    init={modal?.record} onSave={r=>handleSave("call",r)}    onClose={()=>setModal(null)}/>,
  };

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Sora:wght@400;500;600;700;800&display=swap');
        *, *::before, *::after { box-sizing: border-box; }
        body { margin: 0; font-family: 'Sora', system-ui, sans-serif; }
        ::-webkit-scrollbar { width: 4px; height: 4px; }
        ::-webkit-scrollbar-thumb { background: #d1d5db; border-radius: 99px; }
        @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:.4} }
        @keyframes slideUp { from{opacity:0;transform:translateY(12px)} to{opacity:1;transform:translateY(0)} }
        select { appearance:none; background-image:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%239ca3af' stroke-width='2'%3E%3Cpolyline points='6 9 12 15 18 9'%3E%3C/polyline%3E%3C/svg%3E"); background-repeat:no-repeat; background-position:right 10px center; padding-right:32px !important; }
      `}</style>
      <div className="flex h-screen overflow-hidden bg-gray-50">
        <Sidebar page={page} setPage={(p)=>{setPage(p);setSideOpen(window.innerWidth>=1024);}} open={sideOpen} setOpen={setSideOpen} alerts={alerts}/>
        <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
          <Header page={page} alerts={alerts} sideOpen={sideOpen} setSideOpen={setSideOpen} notifOpen={notifOpen} setNotifOpen={setNotifOpen} loading={loading}/>
          <main className={`flex-1 min-h-0 ${page==="dashboard"?"overflow-hidden":"overflow-y-auto"}`}>
            {page==="dashboard" && <DashPage {...ctx}/>}
            {page==="bank"      && <BankPage {...ctx}/>}
            {page==="private"   && <PrivatePage {...ctx}/>}
            {page==="emi"       && <EMIPage {...ctx}/>}
            {page==="timeline"  && <TimelinePage {...ctx}/>}
            {page==="farm"      && <FarmPage {...ctx}/>}
            {page==="tasks"     && <TasksPage {...ctx}/>}
            {page==="calls"     && <CallsPage {...ctx}/>}
          </main>
        </div>
      </div>
      {modal && FORMS[modal.type]}
      {delTarget && <ConfirmDel onConfirm={handleDelete} onCancel={()=>setDelTarget(null)}/>}
      {toast && <Toast msg={toast.msg} type={toast.type}/>}
    </>
  );
}
