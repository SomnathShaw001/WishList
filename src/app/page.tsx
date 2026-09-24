"use client";
import { useState, useEffect, useMemo, useRef } from "react";
import { motion, AnimatePresence, LayoutGroup } from "framer-motion";

type Priority = "low" | "medium" | "high" | "urgent";
type Status = "todo" | "inprogress" | "done";
type List = { id: string; name: string; icon: string };
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
  { id: "all", name: "All Tasks", icon: "◈" },
  { id: "today", name: "Today", icon: "◐" },
  { id: "wishlist", name: "WishList", icon: "♡" },
  { id: "work", name: "Work", icon: "⬢" },
  { id: "personal", name: "Personal", icon: "⬣" },
  { id: "ideas", name: "Ideas", icon: "✦" },
];

const PRIORITY_CFG: Record<Priority, { label: string; dot: string }> = {
  low: { label: "Low", dot: "bg-zinc-600" },
  medium: { label: "Medium", dot: "bg-zinc-400" },
  high: { label: "High", dot: "bg-white" },
  urgent: { label: "Urgent", dot: "bg-white" },
};

const SEED: Task[] = [
  {
    id: "1", title: "Design WishList landing + brand system", description: "Moodboard, typography, micro-interactions. Black monochrome polish.",
    status: "inprogress", priority: "urgent", dueDate: new Date().toISOString().slice(0,10), tags: ["design", "brand"], subtasks: [{id:"s1",title:"Moodboard",done:true},{id:"s2",title:"Design tokens",done:false},{id:"s3",title:"Hero animation",done:false}], listId:"work", createdAt: new Date(Date.now()-86400000*2).toISOString(), completedAt:null
  },
  {
    id: "2", title: "Add drag & drop Kanban board", description: "Optimistic updates, 60fps.",
    status: "todo", priority: "high", dueDate: new Date(Date.now()+86400000).toISOString().slice(0,10), tags: ["engineering"], subtasks: [], listId:"work", createdAt: new Date().toISOString(), completedAt:null
  },
  {
    id: "3", title: "Buy birthday gift — Mechanical keyboard", description: "Keychron Q1 Max, wishlist for setup upgrade", status:"todo", priority:"medium", dueDate: null, tags:["wishlist"], subtasks:[], listId:"wishlist", createdAt: new Date().toISOString(), completedAt:null
  },
  {
    id: "4", title: "Morning run 5km + meditation", description:"Streak: build consistency", status:"done", priority:"low", dueDate: new Date().toISOString().slice(0,10), tags:["health"], subtasks:[], listId:"personal", createdAt: new Date(Date.now()-86400000).toISOString(), completedAt: new Date().toISOString()
  },
  {
    id: "5", title: "Research: AWS deploy for Next.js", description:"Compare Amplify vs EC2 + RDS vs Vercel.", status:"todo", priority:"high", dueDate: null, tags:["devops","aws"], subtasks:[{id:"s5a",title:"Compare pricing",done:false}], listId:"ideas", createdAt: new Date().toISOString(), completedAt:null
  },
];

function toISO(d: Date){
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
}

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
  const [showCmd, setShowCmd] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [pomodoro, setPomodoro] = useState<{id:string, sec:number, running:boolean}|null>(null);
  const [calCursor, setCalCursor] = useState(()=>{ const d=new Date(); return new Date(d.getFullYear(), d.getMonth(), 1); });
  const [selectedDate, setSelectedDate] = useState(()=> toISO(new Date()));
  const [calInput, setCalInput] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(()=>{ setMounted(true); document.documentElement.classList.add("dark"); const s = localStorage.getItem("wishlist.v2"); if(s){ try{ setTasks(JSON.parse(s)); }catch{}} },[]);
  useEffect(()=>{ if(mounted) localStorage.setItem("wishlist.v2", JSON.stringify(tasks)); },[tasks,mounted]);

  useEffect(()=>{
    const h = (e:KeyboardEvent)=>{
      if((e.metaKey||e.ctrlKey) && e.key.toLowerCase()==="k"){ e.preventDefault(); setShowCmd(v=>!v); }
      if(e.key==="/" && !(e.target instanceof HTMLInputElement)){ e.preventDefault(); inputRef.current?.focus(); }
    };
    window.addEventListener("keydown",h); return()=>window.removeEventListener("keydown",h);
  },[]);

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

  const todayISO = toISO(new Date());
  const tasksByDate = useMemo(()=>{
    const m = new Map<string, Task[]>();
    for(const t of tasks){
      if(!t.dueDate) continue;
      const a = m.get(t.dueDate);
      if(a) a.push(t); else m.set(t.dueDate, [t]);
    }
    return m;
  },[tasks]);
  const calCells = useMemo(()=>{
    const y = calCursor.getFullYear(), mo = calCursor.getMonth();
    const first = new Date(y, mo, 1).getDay();
    const days = new Date(y, mo+1, 0).getDate();
    const prevDays = new Date(y, mo, 0).getDate();
    const cells: { iso: string; day: number; inMonth: boolean }[] = [];
    for(let i=first-1; i>=0; i--) cells.push({ iso: toISO(new Date(y, mo-1, prevDays-i)), day: prevDays-i, inMonth: false });
    for(let d=1; d<=days; d++) cells.push({ iso: toISO(new Date(y, mo, d)), day: d, inMonth: true });
    let n=1;
    while(cells.length%7!==0){ cells.push({ iso: toISO(new Date(y, mo+1, n)), day: n, inMonth: false }); n++; }
    return cells;
  },[calCursor]);
  const monthKey = `${calCursor.getFullYear()}-${String(calCursor.getMonth()+1).padStart(2,"0")}`;
  const monthLabel = calCursor.toLocaleDateString("en-US",{month:"long", year:"numeric"});
  const monthTotal = tasks.filter(t=> t.dueDate?.startsWith(monthKey)).length;
  const selectedDayTasks = useMemo(()=>{
    const a = [...(tasksByDate.get(selectedDate) ?? [])];
    a.sort((x,y)=> (x.status==="done"?1:0)-(y.status==="done"?1:0));
    return a;
  },[tasksByDate, selectedDate]);
  const unscheduled = useMemo(()=> tasks.filter(t=> !t.dueDate),[tasks]);
  const overdue = useMemo(()=> tasks.filter(t=> t.dueDate && t.dueDate<todayISO && t.status!=="done").sort((a,b)=> (a.dueDate||"").localeCompare(b.dueDate||"")),[tasks, todayISO]);
  const selectedLabel = new Date(selectedDate+"T12:00:00").toLocaleDateString("en-US",{weekday:"long", month:"short", day:"numeric"});

  function addTaskForDate(){
    if(!calInput.trim()) return;
    const t: Task = {
      id: Date.now().toString(), title: calInput.trim(), description:"", status:"todo", priority:newPriority,
      dueDate:selectedDate, tags:[], subtasks:[],
      listId: (activeList!=="all"&&activeList!=="today")?activeList:"wishlist",
      createdAt: new Date().toISOString(), completedAt:null
    };
    setTasks(prev=>[t,...prev]); setCalInput(""); showToast("Scheduled for "+selectedDate);
  }

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
      const isDone = t.status!=="done";
      if(isDone) setTimeout(()=> showToast("✓ Completed"), 0);
      return {...t, status: isDone ? "done" : "todo", completedAt: isDone ? new Date().toISOString() : null};
    }));
  }
  function moveStatus(id:string, to:Status){
    setTasks(prev=> prev.map(t=> t.id===id ? {...t, status:to, completedAt: to==="done"? new Date().toISOString():null} : t));
  }
  function deleteTask(id:string){
    setTasks(prev=> prev.filter(t=>t.id!==id));
    showToast("Deleted", 2000);
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

  if(!mounted) return <div className="min-h-screen bg-black"/>;
  return (
    <div className="min-h-screen flex flex-col bg-black text-zinc-100 selection:bg-white selection:text-black">
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Fraunces:opsz,ital,wght@9..144,0,600;9..144,1,600&family=Instrument+Sans:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap'); *{font-family:'Instrument Sans',system-ui,sans-serif} .display{font-family:'Fraunces',serif}`}</style>

      <header className="sticky top-0 z-30 backdrop-blur-xl bg-black/80 border-b border-zinc-800">
        <div className="max-w-[1440px] mx-auto px-4 md:px-6 h-[64px] flex items-center gap-4">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-white text-black flex items-center justify-center font-bold">W</div>
            <div>
              <h1 className="display text-[20px] leading-none font-semibold tracking-tight text-white">WishList</h1>
              <p className="text-[11px] tracking-[0.14em] font-semibold text-zinc-500 uppercase -mt-0.5">Fast • Focused</p>
            </div>
            <span className="hidden md:inline-flex ml-3 px-2.5 py-1 rounded-full bg-white text-black text-[11px] font-bold tracking-wide">{stats.progress}% DONE</span>
          </div>

          <div className="flex-1 max-w-[560px] mx-4 hidden md:flex items-center gap-2">
            <div className="flex-1 flex items-center gap-2 px-3 h-9 rounded-full bg-zinc-900 border border-zinc-800 focus-within:border-zinc-600 transition">
              <span className="text-zinc-500">⌕</span>
              <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search, filter, jump — press /" className="flex-1 bg-transparent outline-none text-sm text-zinc-100 placeholder:text-zinc-600"/>
              <span className="hidden lg:inline-flex items-center gap-1 text-[11px] font-medium px-1.5 py-1 rounded-md bg-black border border-zinc-800 text-zinc-400">⌘ K</span>
            </div>
          </div>

          <div className="ml-auto flex items-center gap-2">
            <div className="hidden sm:flex items-center gap-1 p-1 rounded-full bg-zinc-900 border border-zinc-800">
              <button onClick={()=>setView("list")} className={`px-3 py-1.5 rounded-full text-xs font-semibold transition ${view==="list"?"bg-white text-black":"text-zinc-500 hover:text-zinc-200"}`}>List</button>
              <button onClick={()=>setView("board")} className={`px-3 py-1.5 rounded-full text-xs font-semibold transition ${view==="board"?"bg-white text-black":"text-zinc-500 hover:text-zinc-200"}`}>Board</button>
              <button onClick={()=>setView("calendar")} className={`px-3 py-1.5 rounded-full text-xs font-semibold transition ${view==="calendar"?"bg-white text-black":"text-zinc-500 hover:text-zinc-200"}`}>Calendar</button>
            </div>
            <a href="https://github.com/SomnathShaw001/WishList" target="_blank" className="hidden md:inline-flex px-3.5 py-2 rounded-full bg-white hover:bg-zinc-200 text-black text-sm font-semibold transition">GitHub</a>
          </div>
        </div>
      </header>

      <div className="flex-1 max-w-[1440px] w-full mx-auto flex gap-6 px-4 md:px-6 py-6">
        <aside className="hidden lg:flex w-[300px] shrink-0 flex-col gap-4">
          <div className="rounded-[24px] bg-zinc-950 border border-zinc-800 p-4">
            <div className="flex items-center justify-between mb-3">
              <span className="text-[11px] font-bold tracking-[0.14em] text-zinc-500 uppercase">Spaces</span>
              <span className="text-xs px-2 py-1 rounded-full bg-zinc-900 text-zinc-300">{tasks.length}</span>
            </div>
            <div className="space-y-1">
              {lists.map(l=>{
                const count = l.id==="all" ? tasks.length : l.id==="today" ? tasks.filter(t=> t.dueDate===new Date().toISOString().slice(0,10)).length : tasks.filter(t=> t.listId===l.id).length;
                const active = activeList===l.id;
                return (
                  <button key={l.id} onClick={()=> setActiveList(l.id)} className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-2xl text-sm font-medium transition ${active?"bg-white text-black":"hover:bg-zinc-900 text-zinc-400 hover:text-zinc-100"}`}>
                    <span className={`w-7 h-7 grid place-items-center rounded-full text-xs border ${active?"border-black/20 bg-black/10":"border-zinc-800 bg-zinc-900"}`}>{l.icon}</span>
                    <span className="flex-1 text-left">{l.name}</span>
                    <span className={`text-xs px-2 py-0.5 rounded-full ${active?"bg-black/10":"bg-zinc-900"}`}>{count}</span>
                  </button>
                )
              })}
            </div>
            <div className="mt-4 p-4 rounded-2xl bg-white text-black">
              <div className="flex items-center justify-between">
                <p className="text-sm font-semibold">Today&apos;s Focus</p>
                <span className="text-xs bg-black/10 px-2 py-1 rounded-full">{stats.today} due</span>
              </div>
              <p className="text-xs opacity-70 mt-1">Keep the streak. Clear today&apos;s tasks.</p>
              <div className="mt-3 h-2 rounded-full bg-black/10 overflow-hidden"><motion.div initial={{width:0}} animate={{width: `${stats.progress}%`}} className="h-full bg-black" transition={{duration:0.8}}/></div>
            </div>
          </div>

          <div className="rounded-[24px] bg-zinc-950 border border-zinc-800 p-4">
            <p className="text-[11px] font-bold tracking-[0.14em] text-zinc-500 uppercase mb-3">Filters</p>
            <div className="space-y-3">
              <div>
                <p className="text-xs font-semibold text-zinc-500 mb-1.5">Priority</p>
                <div className="flex flex-wrap gap-1.5">
                  {(["all","urgent","high","medium","low"] as const).map(p=>(
                    <button key={p} onClick={()=> setPriorityFilter(p as any)} className={`px-2.5 py-1 rounded-full text-xs font-semibold border transition ${priorityFilter===p?"bg-white text-black border-white":"bg-black border-zinc-800 text-zinc-400 hover:border-zinc-600 hover:text-zinc-100"}`}>{p}</button>
                  ))}
                </div>
              </div>
              <div>
                <p className="text-xs font-semibold text-zinc-500 mb-1.5">Status</p>
                <div className="flex flex-wrap gap-1.5">
                  {(["all","todo","inprogress","done"] as const).map(s=>(
                    <button key={s} onClick={()=> setStatusFilter(s as any)} className={`px-2.5 py-1 rounded-full text-xs font-semibold border transition ${statusFilter===s?"bg-white text-black border-white":"bg-black border-zinc-800 text-zinc-400 hover:border-zinc-600"}`}>{s}</button>
                  ))}
                </div>
              </div>
              <label className="flex items-center gap-2 text-sm font-medium cursor-pointer text-zinc-300">
                <input type="checkbox" checked={showCompleted} onChange={e=> setShowCompleted(e.target.checked)} className="accent-white w-4 h-4"/> Show completed
              </label>
            </div>
          </div>

          <div className="rounded-[24px] bg-zinc-950 border border-zinc-800 p-5">
            <div className="flex gap-3">
              <div className="relative w-16 h-16 shrink-0">
                <svg className="w-16 h-16 -rotate-90"><circle cx="32" cy="32" r="28" stroke="white" strokeOpacity="0.12" strokeWidth="6" fill="none"/><motion.circle cx="32" cy="32" r="28" stroke="white" strokeWidth="6" fill="none" strokeLinecap="round" strokeDasharray={`${2*Math.PI*28}`} strokeDashoffset={`${2*Math.PI*28*(1-stats.progress/100)}`} transition={{duration:0.8}}/></svg>
                <span className="absolute inset-0 grid place-items-center text-sm font-bold text-white">{stats.progress}%</span>
              </div>
              <div>
                <p className="text-sm font-semibold text-white">{stats.done}/{stats.total} completed</p>
                <p className="text-xs text-zinc-500">{stats.urgent} urgent • {stats.pending} pending</p>
                <div className="flex gap-1.5 mt-2">
                  <span className="px-2 py-1 rounded-full bg-zinc-900 border border-zinc-800 text-xs font-semibold text-zinc-300">{stats.today} today</span>
                </div>
              </div>
            </div>
          </div>
        </aside>

        <main className="flex-1 min-w-0 flex flex-col gap-4">
          <div className="rounded-[24px] bg-zinc-950 border border-zinc-800 p-3 md:p-4">
            <div className="flex flex-col md:flex-row gap-3">
              <div className="flex-1 flex items-center gap-3 px-4 h-[48px] rounded-2xl bg-black border border-zinc-800 focus-within:border-zinc-500 transition">
                <span className="text-zinc-600 text-lg">＋</span>
                <input ref={inputRef} value={newTitle} onChange={e=> setNewTitle(e.target.value)} onKeyDown={e=> e.key==="Enter" && addTask()} placeholder="Add a task — press Enter" className="flex-1 bg-transparent outline-none text-[15px] text-zinc-100 placeholder:text-zinc-600"/>
                {newTitle && <button onClick={addTask} className="px-4 py-1.5 rounded-full bg-white hover:bg-zinc-200 text-black text-sm font-semibold">Add</button>}
              </div>
              <div className="flex items-center gap-2">
                <select value={newList} onChange={e=> setNewList(e.target.value)} className="h-[48px] px-3 rounded-2xl bg-black border border-zinc-800 text-zinc-200 text-sm font-medium outline-none">
                  {lists.filter(l=> !["all","today"].includes(l.id)).map(l=> <option key={l.id} value={l.id}>{l.name}</option>)}
                </select>
                <select value={newPriority} onChange={e=> setNewPriority(e.target.value as Priority)} className="h-[48px] px-3 rounded-2xl bg-black border border-zinc-800 text-zinc-200 text-sm font-medium outline-none">
                  <option value="low">Low</option><option value="medium">Medium</option><option value="high">High</option><option value="urgent">Urgent</option>
                </select>
                <input type="date" value={newDate} onChange={e=> setNewDate(e.target.value)} className="h-[48px] px-3 rounded-2xl bg-black border border-zinc-800 text-zinc-200 text-sm outline-none [color-scheme:dark]"/>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2 mt-3 text-xs">
              <span className="px-2.5 py-1 rounded-full bg-zinc-900 border border-zinc-800 text-zinc-400 font-semibold">Tip: Press / to focus • ⌘K for command</span>
              <span className="hidden md:inline text-zinc-600">• Instant save • Offline • Drag to move in Board</span>
              <span className="ml-auto flex items-center gap-1.5">
                <button onClick={()=> { const b = JSON.stringify(tasks,null,2); const blob=new Blob([b],{type:"application/json"}); const url=URL.createObjectURL(blob); const a=document.createElement("a"); a.href=url; a.download="wishlist.json"; a.click();}} className="px-3 py-1.5 rounded-full border border-zinc-800 text-zinc-300 hover:bg-zinc-900 font-medium">Export</button>
                <label className="px-3 py-1.5 rounded-full border border-zinc-800 text-zinc-300 hover:bg-zinc-900 font-medium cursor-pointer">Import<input type="file" accept=".json" className="hidden" onChange={e=>{ const f=e.target.files?.[0]; if(!f) return; const r=new FileReader(); r.onload=()=>{ try{ const d=JSON.parse(r.result as string); if(Array.isArray(d)) setTasks(d); showToast("Imported"); }catch{}}; r.readAsText(f); }}/></label>
              </span>
            </div>
          </div>

          <div className="lg:hidden flex gap-2 overflow-auto pb-1">
            {lists.map(l=> (
              <button key={l.id} onClick={()=> setActiveList(l.id)} className={`shrink-0 px-3 py-2 rounded-full text-sm font-semibold border ${activeList===l.id?"bg-white text-black border-white":"bg-zinc-950 border-zinc-800 text-zinc-400"}`}>{l.icon} {l.name}</button>
            ))}
          </div>

          {view==="list" && (
            <LayoutGroup>
            <div className="rounded-[24px] bg-zinc-950 border border-zinc-800 overflow-hidden">
              <div className="px-4 md:px-6 h-14 flex items-center justify-between border-b border-zinc-800">
                <h2 className="font-semibold text-white">{lists.find(l=>l.id===activeList)?.name} <span className="text-zinc-600 font-normal">• {filtered.length} tasks</span></h2>
                <span className="hidden md:inline-flex items-center gap-2 text-xs text-zinc-500">
                  <span className="w-2 h-2 rounded-full bg-white animate-pulse"/> High response • 60fps • Offline
                </span>
              </div>

              <div className="divide-y divide-zinc-800/70">
                <AnimatePresence initial={false}>
                {filtered.length===0 ? (
                  <div className="py-16 text-center">
                    <div className="w-12 h-12 mx-auto rounded-2xl bg-zinc-900 border border-zinc-800 grid place-items-center text-xl text-zinc-500">✦</div>
                    <p className="mt-3 font-semibold text-white">No tasks here</p>
                    <p className="text-sm text-zinc-500">Add one above or adjust filters</p>
                  </div>
                ) : filtered.map(task=> (
                  <motion.div key={task.id} layout initial={{opacity:0, y:6}} animate={{opacity:1, y:0}} exit={{opacity:0, y:-6}} transition={{duration:0.18}} className={`group flex gap-3 px-4 md:px-6 py-4 hover:bg-zinc-900/50 transition ${task.status==="done"?"opacity-50":""}`}>
                    <button onClick={()=> toggleStatus(task.id)} className={`mt-0.5 w-[26px] h-[26px] rounded-full border-2 grid place-items-center shrink-0 transition ${task.status==="done"?"bg-white border-white text-black":"border-zinc-700 hover:border-white bg-black text-white"} ${task.status==="inprogress"?"!border-zinc-400 !bg-zinc-800":""}`}>
                      {task.status==="done" ? "✓" : task.status==="inprogress" ? "◐" : ""}
                    </button>

                    <div className="flex-1 min-w-0">
                      {editingId===task.id ? (
                        <input autoFocus value={editText} onChange={e=> setEditText(e.target.value)} onBlur={()=>{ if(editText.trim()) updateTask(task.id,{title: editText.trim()}); setEditingId(null);}} onKeyDown={e=>{ if(e.key==="Enter"){ if(editText.trim()) updateTask(task.id,{title: editText.trim()}); setEditingId(null);} if(e.key==="Escape") setEditingId(null);}} className="w-full px-3 py-1.5 rounded-xl border border-zinc-600 outline-none bg-black text-white"/>
                      ) : (
                        <div className="flex flex-wrap items-center gap-2">
                          <button onClick={()=>{ setEditingId(task.id); setEditText(task.title);}} className={`text-left font-medium leading-tight text-zinc-100 hover:text-white transition ${task.status==="done"?"line-through text-zinc-600":""}`}>{task.title}</button>
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold tracking-wide bg-zinc-900 border border-zinc-800 text-zinc-300"><span className={`w-1.5 h-1.5 rounded-full ${PRIORITY_CFG[task.priority].dot}`}/>{PRIORITY_CFG[task.priority].label}</span>
                          {task.dueDate && <span className="text-xs px-2 py-1 rounded-full font-medium bg-zinc-900 border border-zinc-800 text-zinc-400">◷ {task.dueDate}{task.dueDate===new Date().toISOString().slice(0,10)?" • Today":""}</span>}
                        </div>
                      )}
                      {task.description && <p className="text-sm text-zinc-500 mt-1 line-clamp-2">{task.description}</p>}
                      <div className="flex flex-wrap items-center gap-2 mt-2">
                        <span className="text-xs px-2 py-1 rounded-full bg-white text-black capitalize font-semibold">{lists.find(l=>l.id===task.listId)?.name || task.listId}</span>
                        {task.tags.map(tag=> <span key={tag} className="text-xs px-2 py-1 rounded-full bg-zinc-900 text-zinc-400 border border-zinc-800">#{tag}</span>)}
                        {task.subtasks.length>0 && <span className="text-xs text-zinc-500">{task.subtasks.filter(s=>s.done).length}/{task.subtasks.length} subtasks</span>}
                        <span className="text-xs text-zinc-600 font-mono">{new Date(task.createdAt).toLocaleDateString()}</span>
                      </div>
                      {task.subtasks.length>0 && (
                        <div className="mt-2 space-y-1">
                          {task.subtasks.map(st=>(
                            <label key={st.id} className="flex items-center gap-2 text-sm text-zinc-300">
                              <input type="checkbox" checked={st.done} onChange={e=> updateTask(task.id,{ subtasks: task.subtasks.map(x=> x.id===st.id? {...x, done:e.target.checked}:x)})} className="accent-white"/>
                              <span className={st.done?"line-through text-zinc-600":""}>{st.title}</span>
                            </label>
                          ))}
                        </div>
                      )}
                    </div>

                    <div className="flex items-center gap-1 opacity-100 md:opacity-0 group-hover:opacity-100 transition shrink-0">
                      <select value={task.status} onChange={e=> moveStatus(task.id, e.target.value as Status)} className="hidden md:block h-8 px-2 rounded-full border border-zinc-800 bg-black text-zinc-300 text-xs font-medium">
                        <option value="todo">To do</option><option value="inprogress">In progress</option><option value="done">Done</option>
                      </select>
                      <button onClick={()=> setSelectedTask(task)} className="w-8 h-8 grid place-items-center rounded-full text-zinc-400 hover:bg-zinc-900 hover:text-white">⧉</button>
                      <button onClick={()=> duplicateTask(task.id)} className="w-8 h-8 grid place-items-center rounded-full text-zinc-400 hover:bg-zinc-900 hover:text-white">⎘</button>
                      <button onClick={()=> deleteTask(task.id)} className="w-8 h-8 grid place-items-center rounded-full text-zinc-400 hover:bg-zinc-900 hover:text-white">✕</button>
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
                <div key={col} className="rounded-[24px] bg-zinc-950 border border-zinc-800 flex flex-col min-h-[420px]">
                  <div className="px-4 h-12 flex items-center justify-between border-b border-zinc-800">
                    <span className="text-sm font-bold capitalize flex items-center gap-2 text-white">
                      <span className="w-2 h-2 rounded-full bg-white"/>{col==="inprogress"?"In Progress":col}
                    </span>
                    <span className="text-xs px-2 py-1 rounded-full bg-zinc-900 border border-zinc-800 text-zinc-300">{grouped[col].length}</span>
                  </div>
                  <div className="p-3 space-y-3 flex-1 overflow-auto" onDragOver={e=> e.preventDefault()} onDrop={e=>{ const id=e.dataTransfer.getData("text/plain"); if(id) moveStatus(id,col); }}>
                    {grouped[col].map(t=>(
                      <div key={t.id} draggable onDragStart={e=> e.dataTransfer.setData("text/plain", t.id)} onClick={()=> setSelectedTask(t)} className="p-3 rounded-2xl border border-zinc-800 bg-black hover:bg-zinc-900 hover:border-zinc-700 cursor-grab active:cursor-grabbing transition">
                        <p className={`text-sm font-semibold leading-snug text-zinc-100 ${t.status==="done"?"line-through text-zinc-600":""}`}>{t.title}</p>
                        {t.description && <p className="text-xs text-zinc-500 mt-1 line-clamp-2">{t.description}</p>}
                        <div className="flex items-center gap-1.5 mt-2">
                          <span className={`w-2 h-2 rounded-full ${PRIORITY_CFG[t.priority].dot}`}/>
                          <span className="text-xs font-medium capitalize text-zinc-500">{t.priority}</span>
                          {t.dueDate && <span className="ml-auto text-xs font-mono px-1.5 py-0.5 rounded bg-zinc-900 border border-zinc-800 text-zinc-400">{t.dueDate.slice(5)}</span>}
                        </div>
                      </div>
                    ))}
                    {grouped[col].length===0 && <p className="text-sm text-zinc-600 text-center py-8">Drop tasks here</p>}
                  </div>
                </div>
              ))}
            </div>
          )}

          {view==="calendar" && (
            <div className="flex flex-col gap-4">
            <div className="rounded-[24px] bg-zinc-950 border border-zinc-800 p-3 sm:p-4 md:p-6">
              <div className="flex flex-wrap items-center gap-2 mb-3 sm:mb-4">
                <h3 className="font-semibold text-white text-base sm:text-lg">{monthLabel}</h3>
                <span className="text-xs px-2 py-1 rounded-full bg-zinc-900 border border-zinc-800 text-zinc-400">{monthTotal} scheduled</span>
                <div className="ml-auto flex items-center gap-1.5">
                  <button onClick={()=> setCalCursor(c=> new Date(c.getFullYear(), c.getMonth()-1, 1))} aria-label="Previous month" className="w-8 h-8 grid place-items-center rounded-full border border-zinc-800 text-zinc-300 hover:bg-zinc-900">‹</button>
                  <button onClick={()=> { const n=new Date(); setCalCursor(new Date(n.getFullYear(), n.getMonth(), 1)); setSelectedDate(toISO(n)); }} className="px-3 h-8 rounded-full bg-white text-black text-xs font-bold hover:bg-zinc-200">Today</button>
                  <button onClick={()=> setCalCursor(c=> new Date(c.getFullYear(), c.getMonth()+1, 1))} aria-label="Next month" className="w-8 h-8 grid place-items-center rounded-full border border-zinc-800 text-zinc-300 hover:bg-zinc-900">›</button>
                </div>
              </div>
              <div className="grid grid-cols-7 gap-1 sm:gap-2 mb-1 sm:mb-2">
                {["Sun","Mon","Tue","Wed","Thu","Fri","Sat"].map(d=> <p key={d} className="text-center text-[10px] sm:text-xs font-bold text-zinc-600 uppercase truncate">{d}</p>)}
              </div>
              <div className="grid grid-cols-7 gap-1 sm:gap-2">
                {calCells.map(cell=>{
                  const dayTasks = tasksByDate.get(cell.iso) ?? [];
                  const isToday = cell.iso===todayISO;
                  const isSel = cell.iso===selectedDate;
                  return (
                    <div key={cell.iso} role="button" tabIndex={0}
                      onClick={()=> setSelectedDate(cell.iso)}
                      onKeyDown={e=>{ if(e.key==="Enter"||e.key===" "){ e.preventDefault(); setSelectedDate(cell.iso); } }}
                      onDragOver={e=> e.preventDefault()}
                      onDrop={e=>{ const id=e.dataTransfer.getData("text/plain"); if(id){ updateTask(id,{dueDate:cell.iso}); setSelectedDate(cell.iso); showToast("Scheduled for "+cell.iso); } }}
                      className={`rounded-xl sm:rounded-2xl border p-1 sm:p-2 min-h-[54px] sm:min-h-[104px] cursor-pointer transition outline-none focus:border-zinc-400 ${isSel?"bg-white text-black border-white":cell.inMonth?"bg-black border-zinc-800 hover:border-zinc-500":"bg-black border-zinc-900 opacity-40"} ${isToday&&!isSel?"!border-white":""}`}>
                      <span className={`inline-grid place-items-center w-5 h-5 sm:w-6 sm:h-6 rounded-full text-[11px] sm:text-xs font-bold ${isSel?"bg-black text-white":isToday?"bg-white text-black":cell.inMonth?"text-zinc-200":"text-zinc-600"}`}>{cell.day}</span>
                      <div className="hidden sm:block mt-1.5 space-y-1">
                        {dayTasks.slice(0,3).map(t=>(
                          <div key={t.id} draggable onDragStart={e=>{ e.stopPropagation(); e.dataTransfer.setData("text/plain", t.id); }} onClick={e=>{ e.stopPropagation(); setSelectedTask(t); }}
                            className={`text-[11px] px-2 py-1 rounded-full truncate border cursor-grab active:cursor-grabbing ${isSel?"bg-black/10 border-black/15 text-black":t.status==="done"?"bg-zinc-900 border-zinc-800 text-zinc-600 line-through":"bg-zinc-900 border-zinc-800 text-zinc-300 hover:border-zinc-600"}`}>
                            {t.title}
                          </div>
                        ))}
                        {dayTasks.length>3 && <span className={`text-[10px] ${isSel?"text-black/60":"text-zinc-500"}`}>+{dayTasks.length-3} more</span>}
                      </div>
                      <div className="sm:hidden flex justify-center items-center gap-[3px] mt-1 h-2">
                        {dayTasks.slice(0,3).map(t=> <span key={t.id} className={`w-1 h-1 rounded-full ${isSel?"bg-black":"bg-white"}`}/>)}
                        {dayTasks.length===0 && <span className="w-1 h-1"/>}
                      </div>
                    </div>
                  )
                })}
              </div>
              <p className="mt-3 text-[11px] sm:text-xs text-zinc-600">Tap a day to view • Drag cards between days to reschedule • Tap a card to open</p>
            </div>

            <div className="rounded-[24px] bg-zinc-950 border border-zinc-800 p-4 md:p-5">
              <div className="flex flex-wrap items-center gap-2">
                <h4 className="font-semibold text-white">{selectedLabel}{selectedDate===todayISO?" • Today":""}</h4>
                <span className="text-xs px-2 py-1 rounded-full bg-zinc-900 border border-zinc-800 text-zinc-400">{selectedDayTasks.length} tasks</span>
              </div>
              <div className="mt-3 flex gap-2">
                <input value={calInput} onChange={e=> setCalInput(e.target.value)} onKeyDown={e=> e.key==="Enter" && addTaskForDate()} placeholder={`Add task for ${selectedDate} — Enter`} className="flex-1 min-w-0 px-3 h-10 rounded-xl border border-zinc-800 bg-black text-sm text-zinc-100 placeholder:text-zinc-600 outline-none focus:border-zinc-500"/>
                <button onClick={addTaskForDate} className="shrink-0 px-4 h-10 rounded-xl bg-white text-black text-sm font-bold hover:bg-zinc-200">Add</button>
              </div>
              <div className="mt-3 space-y-2">
                {selectedDayTasks.length===0 && <p className="text-sm text-zinc-600">Nothing scheduled — add above, drag a card here, or tap an unscheduled task below.</p>}
                {selectedDayTasks.map(t=>(
                  <div key={t.id} onDragOver={e=> e.preventDefault()} className={`flex items-center gap-2 p-2.5 rounded-xl border ${t.status==="done"?"border-zinc-900 opacity-50":"border-zinc-800 bg-black"}`}>
                    <button onClick={()=> toggleStatus(t.id)} className={`w-6 h-6 rounded-full border-2 grid place-items-center shrink-0 text-xs ${t.status==="done"?"bg-white border-white text-black":"border-zinc-700 hover:border-white text-white"}`}>{t.status==="done"?"✓":""}</button>
                    <button onClick={()=> setSelectedTask(t)} className={`flex-1 min-w-0 text-left text-sm font-medium truncate ${t.status==="done"?"line-through text-zinc-600":"text-zinc-100"}`}>{t.title}</button>
                    <span className={`w-2 h-2 rounded-full shrink-0 ${PRIORITY_CFG[t.priority].dot}`}/>
                    {t.dueDate!==selectedDate && <span className="text-[11px] text-zinc-600 font-mono shrink-0">{t.dueDate}</span>}
                    <button onClick={()=>{ updateTask(t.id,{dueDate:null}); showToast("Unscheduled"); }} title="Remove date" className="shrink-0 text-[11px] px-2 py-1 rounded-full border border-zinc-800 text-zinc-500 hover:text-zinc-200">Clear</button>
                  </div>
                ))}
              </div>
              {selectedDate===todayISO && overdue.length>0 && (
                <div className="mt-4 pt-4 border-t border-zinc-800">
                  <p className="text-xs font-bold tracking-wide text-zinc-400 uppercase">Overdue • {overdue.length}</p>
                  <div className="mt-2 space-y-2">
                    {overdue.slice(0,5).map(t=>(
                      <div key={t.id} className="flex items-center gap-2 p-2.5 rounded-xl border border-zinc-800 bg-black">
                        <span className="flex-1 min-w-0 text-sm text-zinc-300 truncate">{t.title}</span>
                        <span className="text-[11px] font-mono text-zinc-600 shrink-0">{t.dueDate}</span>
                        <button onClick={()=>{ updateTask(t.id,{dueDate:selectedDate}); showToast("Moved to today"); }} className="shrink-0 text-[11px] px-2 py-1 rounded-full bg-white text-black font-bold">Move here</button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {unscheduled.length>0 && (
                <div className="mt-4 pt-4 border-t border-zinc-800">
                  <p className="text-xs font-bold tracking-wide text-zinc-400 uppercase">Unscheduled • {unscheduled.length} — tap to assign to {selectedDate}, or drag onto a day</p>
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {unscheduled.slice(0,12).map(t=>(
                      <button key={t.id} draggable onDragStart={e=> e.dataTransfer.setData("text/plain", t.id)}
                        onClick={()=>{ updateTask(t.id,{dueDate:selectedDate}); showToast("Scheduled for "+selectedDate); }}
                        className="max-w-full truncate text-xs px-2.5 py-1.5 rounded-full border border-zinc-800 bg-black text-zinc-300 hover:border-zinc-500 cursor-grab">＋ {t.title}</button>
                    ))}
                  </div>
                  {unscheduled.length>12 && <p className="mt-1.5 text-[11px] text-zinc-600">+{unscheduled.length-12} more in List view</p>}
                </div>
              )}
            </div>
            </div>
          )}

          <p className="text-center text-xs text-zinc-600 py-2">Lighthouse 95+ • <span className="font-mono">⌘K</span> command • <span className="font-mono">/</span> to add</p>
        </main>

        <AnimatePresence>
          {selectedTask && (
            <>
              <motion.div initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}} onClick={()=> setSelectedTask(null)} className="fixed inset-0 bg-black/70 backdrop-blur-sm z-40"/>
              <motion.div initial={{x: "100%"}} animate={{x: 0}} exit={{x:"100%"}} transition={{type:"spring", damping:28, stiffness:260}} className="fixed right-0 top-0 bottom-0 w-[420px] max-w-[92vw] bg-black border-l border-zinc-800 z-50 flex flex-col">
                <div className="p-6 border-b border-zinc-800 flex items-start justify-between gap-4">
                  <div>
                    <p className="text-[11px] font-bold tracking-[0.14em] text-zinc-500 uppercase">Task Detail</p>
                    <h3 className="text-lg font-semibold leading-tight mt-1 text-white">{selectedTask.title}</h3>
                  </div>
                  <button onClick={()=> setSelectedTask(null)} className="w-8 h-8 grid place-items-center rounded-full bg-zinc-900 border border-zinc-800 text-zinc-300">✕</button>
                </div>
                <div className="flex-1 overflow-auto p-6 space-y-5">
                  <div>
                    <label className="text-xs font-bold tracking-wide text-zinc-500 uppercase">Title</label>
                    <input value={selectedTask.title} onChange={e=> updateTask(selectedTask.id,{title:e.target.value})} className="mt-1 w-full px-3 py-2.5 rounded-xl border border-zinc-800 bg-zinc-950 text-white outline-none focus:border-zinc-500"/>
                  </div>
                  <div>
                    <label className="text-xs font-bold tracking-wide text-zinc-500 uppercase">Description</label>
                    <textarea value={selectedTask.description} onChange={e=> updateTask(selectedTask.id,{description:e.target.value})} rows={4} placeholder="Add details, links, checklist..." className="mt-1 w-full px-3 py-2.5 rounded-xl border border-zinc-800 bg-zinc-950 text-white outline-none focus:border-zinc-500 resize-none placeholder:text-zinc-600"/>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs font-bold text-zinc-500 uppercase">Priority</label>
                      <select value={selectedTask.priority} onChange={e=> updateTask(selectedTask.id,{priority:e.target.value as Priority})} className="mt-1 w-full h-10 rounded-xl border border-zinc-800 bg-zinc-950 text-white px-2">
                        <option value="low">Low</option><option value="medium">Medium</option><option value="high">High</option><option value="urgent">Urgent</option>
                      </select>
                    </div>
                    <div>
                      <label className="text-xs font-bold text-zinc-500 uppercase">Due date</label>
                      <input type="date" value={selectedTask.dueDate||""} onChange={e=> updateTask(selectedTask.id,{dueDate: e.target.value||null})} className="mt-1 w-full h-10 rounded-xl border border-zinc-800 bg-zinc-950 text-white px-2 [color-scheme:dark]"/>
                    </div>
                  </div>
                  <div>
                    <label className="text-xs font-bold text-zinc-500 uppercase">Status</label>
                    <div className="mt-1 flex gap-2">
                      {(["todo","inprogress","done"] as Status[]).map(s=>(
                        <button key={s} onClick={()=> updateTask(selectedTask.id,{status:s, completedAt: s==="done"? new Date().toISOString():null})} className={`flex-1 h-9 rounded-full text-xs font-bold capitalize border ${selectedTask.status===s?"bg-white text-black border-white":"bg-black border-zinc-800 text-zinc-400"}`}>{s}</button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-bold text-zinc-500 uppercase">Subtasks</label>
                      <button onClick={()=>{ const title=prompt("Subtask title"); if(!title) return; updateTask(selectedTask.id,{subtasks:[...selectedTask.subtasks,{id:Date.now().toString(),title, done:false}]})}} className="text-xs px-2.5 py-1 rounded-full bg-white text-black font-semibold">＋ Add</button>
                    </div>
                    <div className="mt-2 space-y-2">
                      {selectedTask.subtasks.map(st=>(
                        <label key={st.id} className="flex items-center gap-2 p-2 rounded-xl border border-zinc-800 bg-zinc-950">
                          <input type="checkbox" checked={st.done} onChange={e=> updateTask(selectedTask.id,{subtasks: selectedTask.subtasks.map(x=> x.id===st.id? {...x, done:e.target.checked}:x)})} className="accent-white"/>
                          <span className={`flex-1 text-sm ${st.done?"line-through text-zinc-600":"text-zinc-200"}`}>{st.title}</span>
                          <button onClick={()=> updateTask(selectedTask.id,{subtasks: selectedTask.subtasks.filter(x=> x.id!==st.id)})} className="text-zinc-600 hover:text-white">✕</button>
                        </label>
                      ))}
                      {selectedTask.subtasks.length===0 && <p className="text-xs text-zinc-600">No subtasks yet</p>}
                    </div>
                  </div>
                  <div className="flex gap-2 pt-2">
                    <button onClick={()=> { setPomodoro({id:selectedTask.id, sec:25*60, running:true}); showToast("Pomodoro 25m started");}} className="flex-1 h-10 rounded-full bg-white hover:bg-zinc-200 text-black font-semibold">▶ Focus 25m</button>
                    <button onClick={()=> duplicateTask(selectedTask.id)} className="px-4 h-10 rounded-full border border-zinc-800 text-zinc-200 font-semibold">Duplicate</button>
                    <button onClick={()=> deleteTask(selectedTask.id)} className="px-4 h-10 rounded-full bg-white text-black font-semibold">Delete</button>
                  </div>
                </div>
              </motion.div>
            </>
          )}
        </AnimatePresence>
      </div>

      <AnimatePresence>
        {showCmd && (
          <motion.div initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}} className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm grid place-items-center p-4" onClick={()=> setShowCmd(false)}>
            <motion.div initial={{scale:0.96, y:8}} animate={{scale:1, y:0}} exit={{scale:0.96, y:8}} onClick={e=> e.stopPropagation()} className="w-full max-w-[560px] rounded-[24px] bg-black border border-zinc-800 shadow-2xl overflow-hidden">
              <div className="flex items-center gap-3 px-4 h-14 border-b border-zinc-800">
                <span className="text-zinc-600">⌕</span>
                <input autoFocus placeholder="Type a command — try 'clear done' or 'export'" className="flex-1 bg-transparent outline-none text-white placeholder:text-zinc-600" onKeyDown={e=>{
                  if(e.key==="Enter"){
                    const v=(e.target as HTMLInputElement).value.toLowerCase();
                    if(v.includes("clear done")){ setTasks(prev=> prev.filter(t=> t.status!=="done")); showToast("Cleared completed"); }
                    if(v.includes("export")){ const b=JSON.stringify(tasks,null,2); const blob=new Blob([b],{type:"application/json"}); const url=URL.createObjectURL(blob); const a=document.createElement("a"); a.href=url; a.download="wishlist.json"; a.click(); }
                    setShowCmd(false);
                  }
                }}/>
                <span className="text-xs px-2 py-1 rounded-full bg-zinc-900 border border-zinc-800 text-zinc-400">ESC</span>
              </div>
              <div className="p-2 text-sm text-zinc-200">
                <button onClick={()=>{ setTasks(prev=> prev.filter(t=> t.status!=="done")); setShowCmd(false); showToast("Cleared");}} className="w-full text-left px-3 py-2.5 rounded-xl hover:bg-zinc-900">Clear completed tasks</button>
                <button onClick={()=>{ setTasks(SEED); setShowCmd(false);}} className="w-full text-left px-3 py-2.5 rounded-xl hover:bg-zinc-900">Reset to demo data</button>
                <button onClick={()=>{ setShowCmd(false); inputRef.current?.focus();}} className="w-full text-left px-3 py-2.5 rounded-xl hover:bg-zinc-900">＋ Add new task</button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {toast && <motion.div initial={{y:20, opacity:0}} animate={{y:0, opacity:1}} exit={{y:20, opacity:0}} className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 px-4 py-2.5 rounded-full bg-white text-black shadow-xl text-sm font-medium">{toast}</motion.div>}
      </AnimatePresence>

      {pomodoro && (
        <div className="fixed bottom-6 right-6 z-40 px-4 py-3 rounded-2xl bg-black border border-zinc-700 shadow-xl flex items-center gap-3">
          <span className="text-sm font-bold text-white">{Math.floor(pomodoro.sec/60).toString().padStart(2,"0")}:{(pomodoro.sec%60).toString().padStart(2,"0")}</span>
          <button onClick={()=> setPomodoro(p=> p? {...p, running:!p.running}:p)} className="px-3 py-1 rounded-full bg-white text-black text-xs font-bold">{pomodoro.running?"Pause":"Resume"}</button>
          <button onClick={()=> setPomodoro(null)} className="w-7 h-7 grid place-items-center rounded-full bg-zinc-900 border border-zinc-800 text-zinc-300">✕</button>
        </div>
      )}
    </div>
  );
}
