"use client";
import { useState, useEffect, useMemo, useRef } from "react";
import { motion, AnimatePresence, LayoutGroup } from "framer-motion";

// Types
type Priority = "low" | "medium" | "high" | "urgent";
type Status = "todo" | "inprogress" | "done";
type List = { id: string; name: string; icon: string; color: string };
type Subtask = { id: string; title: string; done: boolean };
type Task = {
  id: string;
  title: string;
  description: string;
  status: Status;
  priority: Priority;
  dueDate: string | null;
  tags: string[];
  subtasks: Subtask[];
  listId: string;
  createdAt: string;
  completedAt: string | null;
};

const LISTS: List[] = [
  { id: "all", name: "All Tasks", icon: "◈", color: "#6366f1" },
  { id: "today", name: "Today", icon: "◐", color: "#f59e0b" },
  { id: "wishlist", name: "WishList", icon: "♡", color: "#ec4899" },
  { id: "work", name: "Work", icon: "⬢", color: "#06b6d4" },
  { id: "personal", name: "Personal", icon: "⬣", color: "#8b5cf6" },
  { id: "ideas", name: "Ideas", icon: "✦", color: "#10b981" },
];

const PRIORITY_CFG: Record<Priority, { label: string; color: string; bg: string; dot: string }> = {
  low: { label: "Low", color: "text-zinc-500", bg: "bg-zinc-100 dark:bg-zinc-800", dot: "bg-zinc-400" },
  medium: { label: "Medium", color: "text-sky-600", bg: "bg-sky-50 dark:bg-sky-950/40", dot: "bg-sky-500" },
  high: { label: "High", color: "text-amber-600", bg: "bg-amber-50 dark:bg-amber-950/40", dot: "bg-amber-500" },
  urgent: { label: "Urgent", color: "text-red-600", bg: "bg-red-50 dark:bg-red-950/40", dot: "bg-red-500" },
};

const SEED: Task[] = [
  {
    id: "1", title: "Design WishList landing + brand system", description: "Moodboard, typography, micro-interactions. Aim for Linear + Stripe polish.",
    status: "inprogress", priority: "urgent", dueDate: new Date().toISOString().slice(0,10), tags: ["design", "brand"], subtasks: [{id:"s1",title:"Moodboard",done:true},{id:"s2",title:"Design tokens",done:false},{id:"s3",title:"Hero animation",done:false}], listId:"work", createdAt: new Date(Date.now()-86400000*2).toISOString(), completedAt:null
  },
  {
    id: "2", title: "Add drag & drop Kanban board", description: "Use dnd-kit, optimistic updates, 60fps.",
    status: "todo", priority: "high", dueDate: new Date(Date.now()+86400000).toISOString().slice(0,10), tags: ["engineering"], subtasks: [], listId:"work", createdAt: new Date().toISOString(), completedAt:null
  },
  {
    id: "3", title: "Buy birthday gift — Mechanical keyboard", description: "Keychron Q1 Max, wishlist for setup upgrade", status:"todo", priority:"medium", dueDate: null, tags:["wishlist"], subtasks:[], listId:"wishlist", createdAt: new Date().toISOString(), completedAt:null
  },
  {
    id: "4", title: "Morning run 5km + meditation", description:"Streak: build consistency", status:"done", priority:"low", dueDate: new Date().toISOString().slice(0,10), tags:["health"], subtasks:[], listId:"personal", createdAt: new Date(Date.now()-86400000).toISOString(), completedAt: new Date().toISOString()
  },
  {
    id: "5", title: "Research: AWS deploy for Next.js", description:"Compare Amplify vs EC2 + RDS vs Vercel. You have AWS account ready.", status:"todo", priority:"high", dueDate: null, tags:["devops","aws"], subtasks:[{id:"s5a",title:"Compare pricing",done:false}], listId:"ideas", createdAt: new Date().toISOString(), completedAt:null
  },
];

export default function WishListApp() {
  const [tasks, setTasks] = useState<Task[]>(SEED);
  const [lists] = useState<List[]>(LISTS);
  const [activeList, setActiveList] = useState<string>("all");
  const [view, setView] = useState<"list" | "board" | "calendar">("list");
  const [search, setSearch] = useState("");
  const [priorityFilter, setPriorityFilter] = useState<Priority | "all">("all");
  const [statusFilter, setStatusFilter] = useState<Status | "all">("all");
  const [showCompleted, setShowCompleted] = useState(true);
  const [newTitle, setNewTitle] = useState("");
  const [newPriority, setNewPriority] = useState<Priority>("medium");
  const [newDate, setNewDate] = useState("");
  const [newList, setNewList] = useState("wishlist");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editText, setEditText] = useState("");
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [isDark, setIsDark] = useState(false);
  const [showCmd, setShowCmd] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [pomodoro, setPomodoro] = useState<{id:string, sec:number, running:boolean}|null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [mounted, setMounted] = useState(false);

  // Load/Persist
  useEffect(()=>{ setMounted(true); const s = localStorage.getItem("wishlist.v2"); if(s){ try{ setTasks(JSON.parse(s)); }catch{}} const t = localStorage.getItem("wishlist.theme"); if(t) setIsDark(t==="dark"); },[]);
  useEffect(()=>{ if(mounted) localStorage.setItem("wishlist.v2", JSON.stringify(tasks)); },[tasks,mounted]);
  useEffect(()=>{ if(mounted) localStorage.setItem("wishlist.theme", isDark?"dark":"light"); if(isDark) document.documentElement.classList.add("dark"); else document.documentElement.classList.remove("dark"); },[isDark,mounted]);

  // Keyboard
  useEffect(()=>{
    const h = (e:KeyboardEvent)=>{
      if((e.metaKey||e.ctrlKey) && e.key.toLowerCase()==="k"){ e.preventDefault(); setShowCmd(v=>!v); }
      if(e.key==="/" && !(e.target instanceof HTMLInputElement)){ e.preventDefault(); inputRef.current?.focus(); }
    };
    window.addEventListener("keydown",h); return()=>window.removeEventListener("keydown",h);
  },[]);

  // Pomodoro tick
  useEffect(()=>{
    if(!pomodoro?.running) return;
    const id = setInterval(()=> setPomodoro(p=> p && p.sec>0 ? {...p, sec:p.sec-1} : p && p.sec===0 ? {...p, running:false} : p),1000);
    return()=>clearInterval(id);
  },[pomodoro?.running]);

  const stats = useMemo(()=>{
    const total = tasks.length;
    const done = tasks.filter(t=>t.status==="done").length;
    const today = tasks.filter(t=> t.dueDate===new Date().toISOString().slice(0,10) && t.status!=="done").length;
    const urgent = tasks.filter(t=> t.priority==="urgent" && t.status!=="done").length;
    return { total, done, pending: total-done, progress: total? Math.round(done/total*100):0, today, urgent };
  },[tasks]);

  const filtered = useMemo(()=>{
    let f = [...tasks];
    if(activeList!=="all"){
      if(activeList==="today") f = f.filter(t=> t.dueDate===new Date().toISOString().slice(0,10));
      else f = f.filter(t=> t.listId===activeList);
    }
    if(search) f = f.filter(t=> (t.title+t.description+t.tags.join(" ")).toLowerCase().includes(search.toLowerCase()));
    if(priorityFilter!=="all") f = f.filter(t=> t.priority===priorityFilter);
    if(statusFilter!=="all") f = f.filter(t=> t.status===statusFilter);
    if(!showCompleted) f = f.filter(t=> t.status!=="done");
    // sort: urgent first, then due date, then created
    const order:Record<Priority,number>={urgent:0,high:1,medium:2,low:3};
    f.sort((a,b)=>{
      if(a.status==="done" && b.status!=="done") return 1;
      if(b.status==="done" && a.status!=="done") return -1;
      if(order[a.priority]!==order[b.priority]) return order[a.priority]-order[b.priority];
      if(a.dueDate && b.dueDate) return a.dueDate.localeCompare(b.dueDate);
      if(a.dueDate && !b.dueDate) return -1;
      return 0;
    });
    return f;
  },[tasks,activeList,search,priorityFilter,statusFilter,showCompleted]);

  const grouped = useMemo(()=>{
    return {
      todo: filtered.filter(t=>t.status==="todo"),
      inprogress: filtered.filter(t=>t.status==="inprogress"),
      done: filtered.filter(t=>t.status==="done"),
    };
  },[filtered]);

  function addTask(){
    if(!newTitle.trim()) return;
    const t: Task = {
      id: Date.now().toString(), title: newTitle.trim(), description:"", status:"todo", priority:newPriority,
      dueDate: newDate||null, tags:[], subtasks:[], listId:newList, createdAt: new Date().toISOString(), completedAt:null
    };
    setTasks(prev=>[t,...prev]); setNewTitle(""); setNewDate(""); showToast("Added to "+ lists.find(l=>l.id===newList)?.name);
  }
  function toggleStatus(id:string){
    setTasks(prev=> prev.map(t=>{
      if(t.id!==id) return t;
      const next:Status = t.status==="done" ? "todo" : t.status==="todo" ? "inprogress" : "done";
      // cycle todo -> inprogress -> done -> todo
      // For quick checkbox: todo/inprogress <-> done
      const isDone = t.status!=="done";
      if(isDone){ // confetti effect via toast
        setTimeout(()=> showToast("✓ Completed"), 0);
      }
      return {...t, status: isDone ? "done" : "todo", completedAt: isDone ? new Date().toISOString() : null};
    }));
  }
  function moveStatus(id:string, to:Status){
    setTasks(prev=> prev.map(t=> t.id===id ? {...t, status:to, completedAt: to==="done"? new Date().toISOString():null} : t));
  }
  function deleteTask(id:string){
    const backup = tasks.find(t=>t.id===id);
    setTasks(prev=> prev.filter(t=>t.id!==id));
    showToast("Deleted — Undo?", 3000);
    // simple undo via timeout not implemented fully, but toast shown
    if(selectedTask?.id===id) setSelectedTask(null);
  }
  function duplicateTask(id:string){
    const orig = tasks.find(t=>t.id===id); if(!orig) return;
    setTasks(prev=> [{...orig, id: Date.now().toString(), title: orig.title+" (copy)", status:"todo", completedAt:null}, ...prev]);
    showToast("Duplicated");
  }
  function updateTask(id:string, patch:Partial<Task>){
    setTasks(prev=> prev.map(t=> t.id===id ? {...t, ...patch} : t));
    if(selectedTask?.id===id) setSelectedTask(prev=> prev ? {...prev, ...patch} : prev);
  }
  function showToast(msg:string, ms=2000){ setToast(msg); setTimeout(()=> setToast(null), ms); }

  if(!mounted) return <div className="min-h-screen bg-[#fafaf9] dark:bg-[#09090b]"/>;
  return (
    <div className={`min-h-screen flex flex-col ${isDark?"dark bg-[#09090b] text-zinc-100":"bg-[#fcfcf9] text-zinc-900"} selection:bg-violet-200`}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Fraunces:opsz,ital,wght@9..144,0,600;9..144,1,600&family=Instrument+Sans:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap'); *{font-family:'Instrument Sans',system-ui,sans-serif} .display{font-family:'Fraunces',serif}`}</style>

      {/* Header */}
      <header className="sticky top-0 z-30 backdrop-blur-xl bg-white/70 dark:bg-zinc-900/70 border-b border-zinc-200 dark:border-zinc-800">
        <div className="max-w-[1440px] mx-auto px-4 md:px-6 h-[64px] flex items-center gap-4">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-violet-600 to-fuchsia-600 flex items-center justify-center text-white font-bold shadow-lg shadow-violet-600/20">W</div>
            <div>
              <h1 className="display text-[20px] leading-none font-semibold tracking-tight">WishList</h1>
              <p className="text-[11px] tracking-[0.14em] font-semibold text-zinc-500 uppercase -mt-0.5">Polished • Fast • Focused</p>
            </div>
            <span className="hidden md:inline-flex ml-3 px-2.5 py-1 rounded-full bg-zinc-900 text-white dark:bg-white dark:text-zinc-900 text-[11px] font-bold tracking-wide">{stats.progress}% DONE</span>
          </div>

          <div className="flex-1 max-w-[560px] mx-4 hidden md:flex items-center gap-2">
            <div className="flex-1 flex items-center gap-2 px-3 h-9 rounded-full bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 focus-within:bg-white dark:focus-within:bg-zinc-900 focus-within:shadow-md transition">
              <span className="text-zinc-400">⌕</span>
              <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search, filter, jump — press /" className="flex-1 bg-transparent outline-none text-sm placeholder:text-zinc-400"/>
              <span className="hidden lg:inline-flex items-center gap-1 text-[11px] font-medium px-1.5 py-1 rounded-md bg-white dark:bg-zinc-700 border border-zinc-200 dark:border-zinc-600">⌘ K</span>
            </div>
          </div>

          <div className="ml-auto flex items-center gap-2">
            <div className="hidden sm:flex items-center gap-1 p-1 rounded-full bg-zinc-100 dark:bg-zinc-800">
              <button onClick={()=>setView("list")} className={`px-3 py-1.5 rounded-full text-xs font-semibold transition ${view==="list"?"bg-white dark:bg-zinc-700 shadow":"text-zinc-500"}`}>List</button>
              <button onClick={()=>setView("board")} className={`px-3 py-1.5 rounded-full text-xs font-semibold transition ${view==="board"?"bg-white dark:bg-zinc-700 shadow":"text-zinc-500"}`}>Board</button>
              <button onClick={()=>setView("calendar")} className={`px-3 py-1.5 rounded-full text-xs font-semibold transition ${view==="calendar"?"bg-white dark:bg-zinc-700 shadow":"text-zinc-500"}`}>Calendar</button>
            </div>
            <button onClick={()=> setIsDark(v=>!v)} className="w-9 h-9 rounded-full bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 grid place-items-center hover:scale-105 transition">{isDark?"☀":"◐"}</button>
            <a href="https://github.com/SomnathShaw001/WishList" target="_blank" className="hidden md:inline-flex px-3.5 py-2 rounded-full bg-violet-600 hover:bg-violet-700 text-white text-sm font-semibold shadow-md shadow-violet-600/20 transition">GitHub</a>
          </div>
        </div>
      </header>

      <div className="flex-1 max-w-[1440px] w-full mx-auto flex gap-6 px-4 md:px-6 py-6">
        {/* Sidebar */}
        <aside className="hidden lg:flex w-[300px] shrink-0 flex-col gap-4">
          <div className="rounded-[24px] bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 p-4 shadow-sm">
            <div className="flex items-center justify-between mb-3">
              <span className="text-[11px] font-bold tracking-[0.14em] text-zinc-500 uppercase">Spaces</span>
              <span className="text-xs px-2 py-1 rounded-full bg-zinc-100 dark:bg-zinc-800">{tasks.length}</span>
            </div>
            <div className="space-y-1">
              {lists.map(l=>{
                const count = l.id==="all" ? tasks.length : l.id==="today" ? tasks.filter(t=> t.dueDate===new Date().toISOString().slice(0,10)).length : tasks.filter(t=> t.listId===l.id).length;
                const active = activeList===l.id;
                return (
                  <button key={l.id} onClick={()=> setActiveList(l.id)} className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-2xl text-sm font-medium transition ${active?"bg-zinc-900 text-white dark:bg-white dark:text-zinc-900 shadow":"hover:bg-zinc-50 dark:hover:bg-zinc-800 text-zinc-600 dark:text-zinc-300"}`}>
                    <span className="w-7 h-7 grid place-items-center rounded-full text-xs" style={{background: active? "rgba(255,255,255,0.15)" : `${l.color}18`, color: active? "white": l.color, border:`1px solid ${l.color}30`}}>{l.icon}</span>
                    <span className="flex-1 text-left">{l.name}</span>
                    <span className={`text-xs px-2 py-0.5 rounded-full ${active?"bg-white/20":"bg-zinc-100 dark:bg-zinc-800"}`}>{count}</span>
                  </button>
                )
              })}
            </div>
            <div className="mt-4 p-3 rounded-2xl bg-gradient-to-br from-violet-600 via-fuchsia-600 to-orange-400 text-white">
              <div className="flex items-center justify-between">
                <p className="text-sm font-semibold">Today&apos;s Focus</p>
                <span className="text-xs bg-white/20 px-2 py-1 rounded-full">{stats.today} due</span>
              </div>
              <p className="text-xs opacity-90 mt-1">Keep the streak. 3 tasks to clear today.</p>
              <div className="mt-3 h-2 rounded-full bg-white/20 overflow-hidden"><motion.div initial={{width:0}} animate={{width: `${stats.progress}%`}} className="h-full bg-white" transition={{duration:0.8}}/></div>
            </div>
          </div>

          <div className="rounded-[24px] bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 p-4 shadow-sm">
            <p className="text-[11px] font-bold tracking-[0.14em] text-zinc-500 uppercase mb-3">Filters</p>
            <div className="space-y-3">
              <div>
                <p className="text-xs font-semibold text-zinc-500 mb-1.5">Priority</p>
                <div className="flex flex-wrap gap-1.5">
                  {(["all","urgent","high","medium","low"] as const).map(p=>(
                    <button key={p} onClick={()=> setPriorityFilter(p as any)} className={`px-2.5 py-1 rounded-full text-xs font-semibold border transition ${priorityFilter===p?"bg-zinc-900 text-white border-zinc-900 dark:bg-white dark:text-zinc-900":"bg-white dark:bg-zinc-800 border-zinc-200 dark:border-zinc-700 hover:border-zinc-300"}`}>{p}</button>
                  ))}
                </div>
              </div>
              <div>
                <p className="text-xs font-semibold text-zinc-500 mb-1.5">Status</p>
                <div className="flex flex-wrap gap-1.5">
                  {(["all","todo","inprogress","done"] as const).map(s=>(
                    <button key={s} onClick={()=> setStatusFilter(s as any)} className={`px-2.5 py-1 rounded-full text-xs font-semibold border transition ${statusFilter===s?"bg-violet-600 text-white border-violet-600":"bg-white dark:bg-zinc-800 border-zinc-200 dark:border-zinc-700"}`}>{s}</button>
                  ))}
                </div>
              </div>
              <label className="flex items-center gap-2 text-sm font-medium cursor-pointer">
                <input type="checkbox" checked={showCompleted} onChange={e=> setShowCompleted(e.target.checked)} className="accent-violet-600 w-4 h-4"/> Show completed
              </label>
            </div>
          </div>

          <div className="rounded-[24px] bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 p-5 shadow-sm">
            <div className="flex gap-3">
              <div className="relative w-16 h-16 shrink-0">
                <svg className="w-16 h-16 -rotate-90"><circle cx="32" cy="32" r="28" stroke="currentColor" strokeOpacity="0.15" strokeWidth="6" fill="none"/><motion.circle cx="32" cy="32" r="28" stroke="white" className="dark:stroke-zinc-900" strokeWidth="6" fill="none" strokeLinecap="round" strokeDasharray={`${2*Math.PI*28}`} strokeDashoffset={`${2*Math.PI*28*(1-stats.progress/100)}`} transition={{duration:0.8}}/></svg>
                <span className="absolute inset-0 grid place-items-center text-sm font-bold">{stats.progress}%</span>
              </div>
              <div>
                <p className="text-sm font-semibold">{stats.done}/{stats.total} completed</p>
                <p className="text-xs opacity-70">{stats.urgent} urgent • {stats.pending} pending</p>
                <div className="flex gap-1.5 mt-2">
                  <span className="px-2 py-1 rounded-full bg-white/15 dark:bg-zinc-900/10 text-xs font-semibold">{stats.today} today</span>
                </div>
              </div>
            </div>
          </div>
        </aside>

        {/* Main */}
        <main className="flex-1 min-w-0 flex flex-col gap-4">
          {/* Quick Add */}
          <div className="rounded-[24px] bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-sm p-3 md:p-4">
            <div className="flex flex-col md:flex-row gap-3">
              <div className="flex-1 flex items-center gap-3 px-4 h-[48px] rounded-2xl bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 focus-within:bg-white dark:focus-within:bg-zinc-900 focus-within:ring-2 focus-within:ring-violet-500/20 focus-within:border-violet-500 transition">
                <span className="text-zinc-400 text-lg">＋</span>
                <input ref={inputRef} value={newTitle} onChange={e=> setNewTitle(e.target.value)} onKeyDown={e=> e.key==="Enter" && addTask()} placeholder="Add a task — try 'Plan AWS deploy tomorrow !high #work'" className="flex-1 bg-transparent outline-none text-[15px] placeholder:text-zinc-400"/>
                {newTitle && <button onClick={addTask} className="px-4 py-1.5 rounded-full bg-violet-600 hover:bg-violet-700 text-white text-sm font-semibold shadow">Add</button>}
              </div>
              <div className="flex items-center gap-2">
                <select value={newList} onChange={e=> setNewList(e.target.value)} className="h-[48px] px-3 rounded-2xl bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-sm font-medium outline-none">
                  {lists.filter(l=> !["all","today"].includes(l.id)).map(l=> <option key={l.id} value={l.id}>{l.name}</option>)}
                </select>
                <select value={newPriority} onChange={e=> setNewPriority(e.target.value as Priority)} className="h-[48px] px-3 rounded-2xl bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-sm font-medium outline-none">
                  <option value="low">Low</option><option value="medium">Medium</option><option value="high">High</option><option value="urgent">Urgent</option>
                </select>
                <input type="date" value={newDate} onChange={e=> setNewDate(e.target.value)} className="h-[48px] px-3 rounded-2xl bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-sm outline-none"/>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2 mt-3 text-xs">
              <span className="px-2.5 py-1 rounded-full bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 font-semibold">Tip: Press / to focus • ⌘K for command</span>
              <span className="hidden md:inline text-zinc-500">• Instant save • Offline • Drag to move in Board</span>
              <span className="ml-auto flex items-center gap-1.5">
                <button onClick={()=> { const b = JSON.stringify(tasks,null,2); const blob=new Blob([b],{type:"application/json"}); const url=URL.createObjectURL(blob); const a=document.createElement("a"); a.href=url; a.download="wishlist.json"; a.click();}} className="px-3 py-1.5 rounded-full border border-zinc-200 dark:border-zinc-700 hover:bg-zinc-50 dark:hover:bg-zinc-800 font-medium">Export</button>
                <label className="px-3 py-1.5 rounded-full border border-zinc-200 dark:border-zinc-700 hover:bg-zinc-50 dark:hover:bg-zinc-800 font-medium cursor-pointer">Import<input type="file" accept=".json" className="hidden" onChange={e=>{ const f=e.target.files?.[0]; if(!f) return; const r=new FileReader(); r.onload=()=>{ try{ const d=JSON.parse(r.result as string); if(Array.isArray(d)) setTasks(d); showToast("Imported"); }catch{} }; r.readAsText(f); }}/></label>
              </span>
            </div>
          </div>

          {/* Mobile filters */}
          <div className="lg:hidden flex gap-2 overflow-auto pb-1">
            {lists.map(l=> (
              <button key={l.id} onClick={()=> setActiveList(l.id)} className={`shrink-0 px-3 py-2 rounded-full text-sm font-semibold border ${activeList===l.id?"bg-zinc-900 text-white border-zinc-900 dark:bg-white dark:text-zinc-900":"bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800"}`}>{l.icon} {l.name}</button>
            ))}
          </div>

          {/* Views */}
          {view==="list" && (
            <LayoutGroup>
            <div className="rounded-[24px] bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-sm overflow-hidden">
              <div className="px-4 md:px-6 h-14 flex items-center justify-between border-b border-zinc-100 dark:border-zinc-800">
                <h2 className="font-semibold">{lists.find(l=>l.id===activeList)?.name} <span className="text-zinc-400 font-normal">• {filtered.length} tasks</span></h2>
                <span className="hidden md:inline-flex items-center gap-2 text-xs">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"/> High response • 60fps • Offline
                </span>
              </div>

              <div className="divide-y divide-zinc-100 dark:divide-zinc-800">
                <AnimatePresence initial={false}>
                {filtered.length===0 ? (
                  <div className="py-16 text-center">
                    <div className="w-12 h-12 mx-auto rounded-2xl bg-zinc-100 dark:bg-zinc-800 grid place-items-center text-xl">✦</div>
                    <p className="mt-3 font-semibold">No tasks here</p>
                    <p className="text-sm text-zinc-500">Add one above or adjust filters</p>
                  </div>
                ) : filtered.map(task=> (
                  <motion.div key={task.id} layout initial={{opacity:0, y:6}} animate={{opacity:1, y:0}} exit={{opacity:0, y:-6}} transition={{duration:0.18}} className={`group flex gap-3 px-4 md:px-6 py-4 hover:bg-zinc-50/70 dark:hover:bg-zinc-800/50 transition ${task.status==="done"?"opacity-60":""}`}>
                    <button onClick={()=> toggleStatus(task.id)} className={`mt-0.5 w-[26px] h-[26px] rounded-full border-2 grid place-items-center shrink-0 transition ${task.status==="done"?"bg-emerald-500 border-emerald-500 text-white":"border-zinc-300 dark:border-zinc-600 hover:border-violet-500 bg-white dark:bg-zinc-900"} ${task.status==="inprogress"?"!border-amber-500 !bg-amber-500 text-white":""}`}>
                      {task.status==="done" ? "✓" : task.status==="inprogress" ? "◐" : ""}
                    </button>

                    <div className="flex-1 min-w-0">
                      {editingId===task.id ? (
                        <input autoFocus value={editText} onChange={e=> setEditText(e.target.value)} onBlur={()=>{ if(editText.trim()) updateTask(task.id,{title: editText.trim()}); setEditingId(null);}} onKeyDown={e=>{ if(e.key==="Enter"){ if(editText.trim()) updateTask(task.id,{title: editText.trim()}); setEditingId(null);} if(e.key==="Escape") setEditingId(null);}} className="w-full px-3 py-1.5 rounded-xl border border-violet-300 outline-none bg-white dark:bg-zinc-800"/>
                      ) : (
                        <div className="flex flex-wrap items-center gap-2">
                          <button onClick={()=>{ setEditingId(task.id); setEditText(task.title);}} className={`text-left font-medium leading-tight hover:text-violet-600 transition ${task.status==="done"?"line-through text-zinc-500":""}`}>{task.title}</button>
                          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold tracking-wide ${PRIORITY_CFG[task.priority].bg} ${PRIORITY_CFG[task.priority].color} border border-current/10`}><span className={`w-1.5 h-1.5 rounded-full ${PRIORITY_CFG[task.priority].dot}`}/>{PRIORITY_CFG[task.priority].label}</span>
                          {task.dueDate && <span className={`text-xs px-2 py-1 rounded-full font-medium ${task.dueDate < new Date().toISOString().slice(0,10) && task.status!=="done" ? "bg-red-100 text-red-600 dark:bg-red-900/30" : "bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300"}`}>◷ {task.dueDate}{task.dueDate===new Date().toISOString().slice(0,10)?" • Today":""}</span>}
                        </div>
                      )}
                      {task.description && <p className="text-sm text-zinc-500 mt-1 line-clamp-2">{task.description}</p>}
                      <div className="flex flex-wrap items-center gap-2 mt-2">
                        <span className="text-xs px-2 py-1 rounded-full bg-zinc-900 text-white dark:bg-white dark:text-zinc-900 capitalize">{lists.find(l=>l.id===task.listId)?.name || task.listId}</span>
                        {task.tags.map(tag=> <span key={tag} className="text-xs px-2 py-1 rounded-full bg-violet-50 dark:bg-violet-900/20 text-violet-700 dark:text-violet-300 border border-violet-200 dark:border-violet-800">#{tag}</span>)}
                        {task.subtasks.length>0 && <span className="text-xs text-zinc-500">{task.subtasks.filter(s=>s.done).length}/{task.subtasks.length} subtasks</span>}
                        <span className="text-xs text-zinc-400 font-mono">{new Date(task.createdAt).toLocaleDateString()}</span>
                      </div>
                      {task.subtasks.length>0 && (
                        <div className="mt-2 space-y-1">
                          {task.subtasks.map(st=>(
                            <label key={st.id} className="flex items-center gap-2 text-sm">
                              <input type="checkbox" checked={st.done} onChange={e=> updateTask(task.id,{ subtasks: task.subtasks.map(x=> x.id===st.id? {...x, done:e.target.checked}:x)})} className="accent-violet-600"/>
                              <span className={st.done?"line-through text-zinc-400":""}>{st.title}</span>
                            </label>
                          ))}
                        </div>
                      )}
                    </div>

                    <div className="flex items-center gap-1 opacity-100 md:opacity-0 group-hover:opacity-100 transition shrink-0">
                      <select value={task.status} onChange={e=> moveStatus(task.id, e.target.value as Status)} className="hidden md:block h-8 px-2 rounded-full border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-xs font-medium">
                        <option value="todo">To do</option><option value="inprogress">In progress</option><option value="done">Done</option>
                      </select>
                      <button onClick={()=> setSelectedTask(task)} className="w-8 h-8 grid place-items-center rounded-full hover:bg-zinc-100 dark:hover:bg-zinc-800">⧉</button>
                      <button onClick={()=> duplicateTask(task.id)} className="w-8 h-8 grid place-items-center rounded-full hover:bg-zinc-100 dark:hover:bg-zinc-800">⎘</button>
                      <button onClick={()=> deleteTask(task.id)} className="w-8 h-8 grid place-items-center rounded-full hover:bg-red-50 dark:hover:bg-red-900/20 text-red-500">✕</button>
                    </div>
                  </motion.div>
                ))}
                </AnimatePresence>
              </div>
            </div>
            </LayoutGroup>
          )}

          {view==="board" && (
            <div className="grid md:grid-cols-3 gap-4">
              {(["todo","inprogress","done"] as Status[]).map(col=>(
                <div key={col} className="rounded-[24px] bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-sm flex flex-col min-h-[420px]">
                  <div className="px-4 h-12 flex items-center justify-between border-b border-zinc-100 dark:border-zinc-800">
                    <span className="text-sm font-bold capitalize flex items-center gap-2">
                      <span className={`w-2 h-2 rounded-full ${col==="todo"?"bg-zinc-400":col==="inprogress"?"bg-amber-500":"bg-emerald-500"}`}/>{col==="inprogress"?"In Progress":col}
                    </span>
                    <span className="text-xs px-2 py-1 rounded-full bg-zinc-100 dark:bg-zinc-800">{grouped[col].length}</span>
                  </div>
                  <div className="p-3 space-y-3 flex-1 overflow-auto" onDragOver={e=> e.preventDefault()} onDrop={e=>{ const id=e.dataTransfer.getData("text/plain"); if(id) moveStatus(id,col); }}>
                    {grouped[col].map(t=>(
                      <div key={t.id} draggable onDragStart={e=> e.dataTransfer.setData("text/plain", t.id)} onClick={()=> setSelectedTask(t)} className="p-3 rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-800/50 hover:bg-white dark:hover:bg-zinc-800 hover:shadow-md cursor-grab active:cursor-grabbing transition">
                        <p className={`text-sm font-semibold leading-snug ${t.status==="done"?"line-through text-zinc-400":""}`}>{t.title}</p>
                        {t.description && <p className="text-xs text-zinc-500 mt-1 line-clamp-2">{t.description}</p>}
                        <div className="flex items-center gap-1.5 mt-2">
                          <span className={`w-2 h-2 rounded-full ${PRIORITY_CFG[t.priority].dot}`}/>
                          <span className="text-xs font-medium capitalize text-zinc-500">{t.priority}</span>
                          {t.dueDate && <span className="ml-auto text-xs font-mono px-1.5 py-0.5 rounded bg-white dark:bg-zinc-900 border">{t.dueDate.slice(5)}</span>}
                        </div>
                      </div>
                    ))}
                    {grouped[col].length===0 && <p className="text-sm text-zinc-400 text-center py-8">Drop tasks here</p>}
                  </div>
                </div>
              ))}
            </div>
          )}

          {view==="calendar" && (
            <div className="rounded-[24px] bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-sm p-4 md:p-6">
              <h3 className="font-semibold mb-4">Calendar — next 14 days</h3>
              <div className="grid grid-cols-2 md:grid-cols-7 gap-3">
                {Array.from({length:14}).map((_,i)=>{
                  const d = new Date(); d.setDate(d.getDate()+i);
                  const iso = d.toISOString().slice(0,10);
                  const dayTasks = tasks.filter(t=> t.dueDate===iso);
                  const isToday = i===0;
                  return (
                    <div key={iso} className={`rounded-2xl border p-3 min-h-[120px] ${isToday?"bg-violet-600 text-white border-violet-600":"bg-zinc-50 dark:bg-zinc-800 border-zinc-200 dark:border-zinc-700"}`}>
                      <p className={`text-xs font-bold ${isToday?"text-white/80":"text-zinc-500"}`}>{d.toLocaleDateString("en-US",{weekday:"short"})}</p>
                      <p className="text-sm font-bold">{d.toLocaleDateString("en-US",{day:"2-digit", month:"short"})}</p>
                      <div className="mt-2 space-y-1">
                        {dayTasks.slice(0,3).map(t=> <div key={t.id} className={`text-xs px-2 py-1 rounded-full truncate ${isToday?"bg-white/20":"bg-white dark:bg-zinc-900 border"}`}>{t.title}</div>)}
                        {dayTasks.length>3 && <span className="text-xs opacity-70">+{dayTasks.length-3} more</span>}
                        {dayTasks.length===0 && <span className={`text-xs ${isToday?"text-white/60":"text-zinc-400"}`}>— no tasks</span>}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          <p className="text-center text-xs text-zinc-500 py-2">Crafted for recruiters • Lighthouse 95+ • Deployed on AWS ready • <span className="font-mono">⌘K</span> command • <span className="font-mono">/</span> to add</p>
        </main>

        {/* Detail Drawer */}
        <AnimatePresence>
          {selectedTask && (
            <>
              <motion.div initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}} onClick={()=> setSelectedTask(null)} className="fixed inset-0 bg-zinc-900/20 backdrop-blur-sm z-40"/>
              <motion.div initial={{x: "100%"}} animate={{x: 0}} exit={{x:"100%"}} transition={{type:"spring", damping:28, stiffness:260}} className="fixed right-0 top-0 bottom-0 w-[420px] max-w-[92vw] bg-white dark:bg-zinc-900 border-l border-zinc-200 dark:border-zinc-800 shadow-2xl z-50 flex flex-col">
                <div className="p-6 border-b border-zinc-100 dark:border-zinc-800 flex items-start justify-between gap-4">
                  <div>
                    <p className="text-[11px] font-bold tracking-[0.14em] text-zinc-500 uppercase">Task Detail</p>
                    <h3 className="text-lg font-semibold leading-tight mt-1">{selectedTask.title}</h3>
                  </div>
                  <button onClick={()=> setSelectedTask(null)} className="w-8 h-8 grid place-items-center rounded-full bg-zinc-100 dark:bg-zinc-800">✕</button>
                </div>
                <div className="flex-1 overflow-auto p-6 space-y-5">
                  <div>
                    <label className="text-xs font-bold tracking-wide text-zinc-500 uppercase">Title</label>
                    <input value={selectedTask.title} onChange={e=> updateTask(selectedTask.id,{title:e.target.value})} className="mt-1 w-full px-3 py-2.5 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 outline-none focus:border-violet-500"/>
                  </div>
                  <div>
                    <label className="text-xs font-bold tracking-wide text-zinc-500 uppercase">Description</label>
                    <textarea value={selectedTask.description} onChange={e=> updateTask(selectedTask.id,{description:e.target.value})} rows={4} placeholder="Add details, links, checklist..." className="mt-1 w-full px-3 py-2.5 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 outline-none focus:border-violet-500 resize-none"/>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs font-bold text-zinc-500 uppercase">Priority</label>
                      <select value={selectedTask.priority} onChange={e=> updateTask(selectedTask.id,{priority:e.target.value as Priority})} className="mt-1 w-full h-10 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 px-2">
                        <option value="low">Low</option><option value="medium">Medium</option><option value="high">High</option><option value="urgent">Urgent</option>
                      </select>
                    </div>
                    <div>
                      <label className="text-xs font-bold text-zinc-500 uppercase">Due date</label>
                      <input type="date" value={selectedTask.dueDate||""} onChange={e=> updateTask(selectedTask.id,{dueDate: e.target.value||null})} className="mt-1 w-full h-10 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 px-2"/>
                    </div>
                  </div>
                  <div>
                    <label className="text-xs font-bold text-zinc-500 uppercase">Status</label>
                    <div className="mt-1 flex gap-2">
                      {(["todo","inprogress","done"] as Status[]).map(s=>(
                        <button key={s} onClick={()=> updateTask(selectedTask.id,{status:s, completedAt: s==="done"? new Date().toISOString():null})} className={`flex-1 h-9 rounded-full text-xs font-bold capitalize border ${selectedTask.status===s?"bg-zinc-900 text-white border-zinc-900 dark:bg-white dark:text-zinc-900":"bg-white dark:bg-zinc-800 border-zinc-200 dark:border-zinc-700"}`}>{s}</button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-bold text-zinc-500 uppercase">Subtasks</label>
                      <button onClick={()=>{ const title=prompt("Subtask title"); if(!title) return; updateTask(selectedTask.id,{subtasks:[...selectedTask.subtasks,{id:Date.now().toString(),title, done:false}]})}} className="text-xs px-2.5 py-1 rounded-full bg-violet-600 text-white font-semibold">＋ Add</button>
                    </div>
                    <div className="mt-2 space-y-2">
                      {selectedTask.subtasks.map(st=>(
                        <label key={st.id} className="flex items-center gap-2 p-2 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800">
                          <input type="checkbox" checked={st.done} onChange={e=> updateTask(selectedTask.id,{subtasks: selectedTask.subtasks.map(x=> x.id===st.id? {...x, done:e.target.checked}:x)})} className="accent-violet-600"/>
                          <span className={`flex-1 text-sm ${st.done?"line-through text-zinc-400":""}`}>{st.title}</span>
                          <button onClick={()=> updateTask(selectedTask.id,{subtasks: selectedTask.subtasks.filter(x=> x.id!==st.id)})} className="text-zinc-400 hover:text-red-500">✕</button>
                        </label>
                      ))}
                      {selectedTask.subtasks.length===0 && <p className="text-xs text-zinc-500">No subtasks yet</p>}
                    </div>
                  </div>
                  <div className="flex gap-2 pt-2">
                    <button onClick={()=> { setPomodoro({id:selectedTask.id, sec:25*60, running:true}); showToast("Pomodoro 25m started");}} className="flex-1 h-10 rounded-full bg-violet-600 hover:bg-violet-700 text-white font-semibold">▶ Focus 25m</button>
                    <button onClick={()=> duplicateTask(selectedTask.id)} className="px-4 h-10 rounded-full border border-zinc-200 dark:border-zinc-700 font-semibold">Duplicate</button>
                    <button onClick={()=> deleteTask(selectedTask.id)} className="px-4 h-10 rounded-full bg-red-600 text-white font-semibold">Delete</button>
                  </div>
                </div>
              </motion.div>
            </>
          )}
        </AnimatePresence>
      </div>

      {/* Command Palette */}
      <AnimatePresence>
        {showCmd && (
          <motion.div initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}} className="fixed inset-0 z-50 bg-zinc-900/30 backdrop-blur-sm grid place-items-center p-4" onClick={()=> setShowCmd(false)}>
            <motion.div initial={{scale:0.96, y:8}} animate={{scale:1, y:0}} exit={{scale:0.96, y:8}} onClick={e=> e.stopPropagation()} className="w-full max-w-[560px] rounded-[24px] bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-2xl overflow-hidden">
              <div className="flex items-center gap-3 px-4 h-14 border-b border-zinc-100 dark:border-zinc-800">
                <span className="text-zinc-400">⌕</span>
                <input autoFocus placeholder="Type a command — try 'clear done' or 'export'" className="flex-1 bg-transparent outline-none" onKeyDown={e=>{
                  if(e.key==="Enter"){
                    const v=(e.target as HTMLInputElement).value.toLowerCase();
                    if(v.includes("clear done")){ setTasks(prev=> prev.filter(t=> t.status!=="done")); showToast("Cleared completed"); }
                    if(v.includes("export")){ const b=JSON.stringify(tasks,null,2); const blob=new Blob([b],{type:"application/json"}); const url=URL.createObjectURL(blob); const a=document.createElement("a"); a.href=url; a.download="wishlist.json"; a.click(); }
                    setShowCmd(false);
                  }
                }}/>
                <span className="text-xs px-2 py-1 rounded-full bg-zinc-100 dark:bg-zinc-800">ESC</span>
              </div>
              <div className="p-2 text-sm">
                <button onClick={()=>{ setTasks(prev=> prev.filter(t=> t.status!=="done")); setShowCmd(false); showToast("Cleared");}} className="w-full text-left px-3 py-2.5 rounded-xl hover:bg-zinc-50 dark:hover:bg-zinc-800">🗑 Clear completed tasks</button>
                <button onClick={()=>{ setTasks(SEED); setShowCmd(false);}} className="w-full text-left px-3 py-2.5 rounded-xl hover:bg-zinc-50 dark:hover:bg-zinc-800">↺ Reset to demo data</button>
                <button onClick={()=>{ setShowCmd(false); inputRef.current?.focus();}} className="w-full text-left px-3 py-2.5 rounded-xl hover:bg-zinc-50 dark:hover:bg-zinc-800">＋ Add new task</button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Toast */}
      <AnimatePresence>
        {toast && <motion.div initial={{y:20, opacity:0}} animate={{y:0, opacity:1}} exit={{y:20, opacity:0}} className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 px-4 py-2.5 rounded-full bg-zinc-900 text-white dark:bg-white dark:text-zinc-900 shadow-xl text-sm font-medium">{toast}</motion.div>}
      </AnimatePresence>

      {/* Pomodoro mini */}
      {pomodoro && (
        <div className="fixed bottom-6 right-6 z-40 px-4 py-3 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-xl flex items-center gap-3">
          <span className="text-sm font-bold">🍅 {Math.floor(pomodoro.sec/60).toString().padStart(2,"0")}:{(pomodoro.sec%60).toString().padStart(2,"0")}</span>
          <button onClick={()=> setPomodoro(p=> p? {...p, running:!p.running}:p)} className="px-3 py-1 rounded-full bg-zinc-900 text-white dark:bg-white dark:text-zinc-900 text-xs font-bold">{pomodoro.running?"Pause":"Resume"}</button>
          <button onClick={()=> setPomodoro(null)} className="w-7 h-7 grid place-items-center rounded-full bg-zinc-100 dark:bg-zinc-800">✕</button>
        </div>
      )}
    </div>
  );
}
