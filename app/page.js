'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { Phone, Mic, Video, Heart, Settings, Play, Square, RotateCcw, QrCode, Images, CalendarDays, Users, Download, ChevronLeft, Camera, CheckCircle2 } from 'lucide-react'

const DEMO_EVENT = {
  title: "Olivia & James",
  subtitle: "October 18, 2026",
  prompt: "Leave us a message we'll keep forever ❤️",
  accent: "#B88A6A"
}

export default function Home() {
  const [view, setView] = useState('landing')
  const [mode, setMode] = useState('audio')
  const [event, setEvent] = useState(DEMO_EVENT)
  const [recording, setRecording] = useState(false)
  const [seconds, setSeconds] = useState(0)
  const [complete, setComplete] = useState(false)
  const [messages, setMessages] = useState([])
  const timerRef = useRef(null)

  useEffect(() => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('./sw.js').catch(() => {})
    }
  }, [])

  useEffect(() => {
    const saved = localStorage.getItem('voicemento_messages')
    if (saved) setMessages(JSON.parse(saved))
  }, [])

  useEffect(() => {
    if (recording) {
      timerRef.current = setInterval(() => setSeconds(s => s + 1), 1000)
    } else if (timerRef.current) {
      clearInterval(timerRef.current)
    }
    return () => timerRef.current && clearInterval(timerRef.current)
  }, [recording])

  const stats = useMemo(() => ({
    total: messages.length,
    audio: messages.filter(m => m.type === 'audio').length,
    video: messages.filter(m => m.type === 'video').length,
  }), [messages])

  function startRecording() {
    setSeconds(0)
    setComplete(false)
    setRecording(true)
  }

  function stopRecording() {
    setRecording(false)
    const item = {
      id: Date.now(),
      type: mode,
      duration: seconds || 1,
      time: new Date().toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'}),
      guest: `Guest ${messages.length + 1}`
    }
    const next = [item, ...messages]
    setMessages(next)
    localStorage.setItem('voicemento_messages', JSON.stringify(next))
    setComplete(true)
  }

  function resetDemo() {
    setRecording(false)
    setSeconds(0)
    setComplete(false)
  }

  if (view === 'booth') {
    return (
      <main className="booth" style={{'--accent': event.accent}}>
        <button className="backBtn" onClick={() => {resetDemo(); setView('landing')}}><ChevronLeft size={20}/> Admin</button>
        <div className="boothCard">
          <div className="tinyLabel">DIGITAL GUESTBOOK</div>
          <h1>{event.title}</h1>
          <p className="dateLine">{event.subtitle}</p>
          <div className="phoneOrb"><Phone size={46} strokeWidth={1.8}/></div>
          <h2>{event.prompt}</h2>
          <p className="helper">Pick how you'd like to leave your message.</p>

          <div className="modeRow">
            <button className={mode==='audio' ? 'mode active' : 'mode'} onClick={() => setMode('audio')} disabled={recording}>
              <Mic size={24}/><span>Audio</span>
            </button>
            <button className={mode==='video' ? 'mode active' : 'mode'} onClick={() => setMode('video')} disabled={recording}>
              <Video size={24}/><span>Video</span>
            </button>
          </div>

          {!complete ? (
            <div className="recordArea">
              <div className={recording ? 'timer recording' : 'timer'}>{String(Math.floor(seconds/60)).padStart(2,'0')}:{String(seconds%60).padStart(2,'0')}</div>
              {!recording ? (
                <button className="recordBtn" onClick={startRecording}><Play size={24} fill="currentColor"/> Start {mode === 'audio' ? 'Message' : 'Video'}</button>
              ) : (
                <button className="stopBtn" onClick={stopRecording}><Square size={22} fill="currentColor"/> Finish Message</button>
              )}
              <p className="privacy">Your message is saved privately to this event.</p>
            </div>
          ) : (
            <div className="successBox">
              <CheckCircle2 size={42}/>
              <h3>Message saved!</h3>
              <p>Thank you for leaving a memory for {event.title}.</p>
              <button className="recordBtn" onClick={resetDemo}><RotateCcw size={20}/> Leave Another</button>
            </div>
          )}
        </div>
      </main>
    )
  }

  return (
    <main className="appShell">
      <aside className="sidebar">
        <div className="brand"><div className="brandMark"><Phone size={23}/></div><div><strong>VoiceMento</strong><span>Events</span></div></div>
        <nav>
          <button className="nav active"><CalendarDays size={20}/> Events</button>
          <button className="nav"><Images size={20}/> Galleries</button>
          <button className="nav"><Users size={20}/> Clients</button>
          <button className="nav"><Settings size={20}/> Settings</button>
        </nav>
        <div className="sidebarFoot">Digital guestbook dashboard</div>
      </aside>

      <section className="content">
        <header>
          <div><div className="eyebrow">EVENT DASHBOARD</div><h1>{event.title}</h1><p>{event.subtitle} · Wedding</p></div>
          <button className="launch" onClick={() => setView('booth')}><Play size={19} fill="currentColor"/> Launch Booth Mode</button>
        </header>

        <div className="statsGrid">
          <Stat icon={<Heart/>} label="Messages" value={stats.total}/>
          <Stat icon={<Mic/>} label="Audio" value={stats.audio}/>
          <Stat icon={<Video/>} label="Video" value={stats.video}/>
          <Stat icon={<Users/>} label="Guests" value={stats.total}/>
        </div>

        <div className="grid2">
          <section className="panel">
            <div className="panelHead"><div><span>Event setup</span><small>Customize the guest experience</small></div><Settings size={20}/></div>
            <label>Event title<input value={event.title} onChange={e=>setEvent({...event,title:e.target.value})}/></label>
            <label>Date / subtitle<input value={event.subtitle} onChange={e=>setEvent({...event,subtitle:e.target.value})}/></label>
            <label>Guest prompt<textarea value={event.prompt} onChange={e=>setEvent({...event,prompt:e.target.value})}/></label>
            <label>Accent color<div className="colorRow"><input type="color" value={event.accent} onChange={e=>setEvent({...event,accent:e.target.value})}/><span>{event.accent}</span></div></label>
          </section>

          <section className="panel sharePanel">
            <div className="panelHead"><div><span>Guest access</span><small>Let guests contribute from their phones</small></div><QrCode size={20}/></div>
            <div className="fakeQr"><QrCode size={100} strokeWidth={1.3}/></div>
            <div className="eventCode">EVENT CODE <strong>OLIVIA26</strong></div>
            <button className="secondary"><Download size={18}/> Download QR</button>
          </section>
        </div>

        <section className="panel messagesPanel">
          <div className="panelHead"><div><span>Recent messages</span><small>Audio and video guestbook submissions</small></div><button className="secondary"><Download size={18}/> Export All</button></div>
          {messages.length === 0 ? (
            <div className="empty"><Camera size={42}/><h3>No messages yet</h3><p>Launch Booth Mode and record a demo message.</p></div>
          ) : (
            <div className="messageList">
              {messages.slice(0,8).map(m => <div className="message" key={m.id}><div className="msgIcon">{m.type==='audio'?<Mic size={19}/>:<Video size={19}/>}</div><div><strong>{m.guest}</strong><span>{m.type==='audio'?'Audio message':'Video message'} · {m.duration}s</span></div><time>{m.time}</time><button><Play size={17}/></button></div>)}
            </div>
          )}
        </section>
      </section>
    </main>
  )
}

function Stat({icon,label,value}){
  return <div className="stat"><div className="statIcon">{icon}</div><div><span>{label}</span><strong>{value}</strong></div></div>
}
