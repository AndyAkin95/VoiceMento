'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import {
  Phone, Mic, Video, Heart, Settings, Play, Square, RotateCcw, QrCode,
  Images, CalendarDays, Users, Download, ChevronLeft, Camera,
  CheckCircle2, LockKeyhole, X, Sparkles, LogOut
} from 'lucide-react'

const DEMO_EVENT = {
  title: "Olivia & James",
  subtitle: "October 18, 2026",
  prompt: "Leave us a message we'll keep forever",
  accent: "#B58B6A"
}

const DEFAULT_ADMIN_PIN = '2468'

export default function Home() {
  const [view, setView] = useState('entrance')
  const [entering, setEntering] = useState(false)
  const [mode, setMode] = useState('audio')
  const [event, setEvent] = useState(DEMO_EVENT)
  const [recording, setRecording] = useState(false)
  const [seconds, setSeconds] = useState(0)
  const [complete, setComplete] = useState(false)
  const [messages, setMessages] = useState([])
  const [showAdminGate, setShowAdminGate] = useState(false)
  const [pin, setPin] = useState('')
  const [pinError, setPinError] = useState(false)
  const [adminPinDraft, setAdminPinDraft] = useState('')
  const timerRef = useRef(null)

  useEffect(() => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('./sw.js').catch(() => {})
    }

    try {
      const savedMessages = localStorage.getItem('voicemento_messages')
      if (savedMessages) setMessages(JSON.parse(savedMessages))

      const savedEvent = localStorage.getItem('voicemento_event')
      if (savedEvent) setEvent({...DEMO_EVENT, ...JSON.parse(savedEvent)})

      setAdminPinDraft(localStorage.getItem('voicemento_admin_pin') || DEFAULT_ADMIN_PIN)
    } catch {}
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

  function saveEvent(next) {
    setEvent(next)
    localStorage.setItem('voicemento_event', JSON.stringify(next))
  }

  function enterBooth() {
    if (entering) return
    setEntering(true)
    setTimeout(() => {
      setView('booth')
      setEntering(false)
      resetDemo()
    }, 1750)
  }

  function openAdmin() {
    setPin('')
    setPinError(false)
    setShowAdminGate(true)
  }

  function submitAdmin(e) {
    e.preventDefault()
    const currentPin = localStorage.getItem('voicemento_admin_pin') || DEFAULT_ADMIN_PIN
    if (pin === currentPin) {
      setShowAdminGate(false)
      setPin('')
      setPinError(false)
      setView('admin')
    } else {
      setPinError(true)
      setPin('')
    }
  }

  function saveAdminPin() {
    const cleaned = adminPinDraft.replace(/\D/g, '').slice(0, 8)
    if (cleaned.length < 4) return
    localStorage.setItem('voicemento_admin_pin', cleaned)
    setAdminPinDraft(cleaned)
  }

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

  if (view === 'entrance') {
    return (
      <main className={entering ? 'weddingEntrance entering' : 'weddingEntrance'} style={{'--accent': event.accent}}>
        <div className="paperTexture" />
        <div className="petals" aria-hidden="true">
          <i/><i/><i/><i/><i/><i/><i/><i/>
        </div>

        <button className="adminLock" onClick={openAdmin}>
          <LockKeyhole size={16}/> Admin
        </button>

        <section className="entranceCopy">
          <div className="monogram"><span>V</span><Heart size={14} fill="currentColor"/><span>M</span></div>
          <p className="scriptLine">A little piece of tonight, forever.</p>
          <h1>{event.title}</h1>
          <div className="ornament"><span/><Sparkles size={16}/><span/></div>
          <p className="eventDate">{event.subtitle}</p>
          <p className="entranceHint">Tap the booth to leave a message for the happy couple.</p>
        </section>

        <button className="boothStage" onClick={enterBooth} aria-label="Enter the VoiceMento phone booth">
          <span className="floorShadow"/>
          <span className="boothGlow"/>
          <span className="phoneBooth">
            <span className="boothTopCap"/>
            <span className="boothCrown">VOICEMENTO</span>
            <span className="boothBody">
              <span className="boothInterior">
                <Phone size={48} strokeWidth={1.4}/>
                <small>COME IN</small>
              </span>

              <span className="boothDoor boothDoorLeft">
                <span className="doorGlass">
                  <span/><span/><span/><span/><span/><span/>
                </span>
                <span className="doorPanelDetail"/>
                <span className="doorHandle"/>
              </span>

              <span className="boothDoor boothDoorRight">
                <span className="doorGlass">
                  <span/><span/><span/><span/><span/><span/>
                </span>
                <span className="doorPanelDetail"/>
                <span className="doorHandle"/>
              </span>
            </span>
            <span className="boothBase"/>
          </span>
          <span className="tapLabel">{entering ? 'Come on in…' : 'Tap to enter'}</span>
        </button>

        <p className="poweredBy">VOICE MEMENTO · DIGITAL GUESTBOOK</p>

        {showAdminGate && (
          <div className="modalBackdrop" onMouseDown={() => setShowAdminGate(false)}>
            <form className={pinError ? 'pinModal shake' : 'pinModal'} onSubmit={submitAdmin} onMouseDown={e => e.stopPropagation()}>
              <button type="button" className="modalClose" onClick={() => setShowAdminGate(false)}><X size={19}/></button>
              <div className="lockSeal"><LockKeyhole size={24}/></div>
              <p className="tinyLabel">PRIVATE AREA</p>
              <h2>Admin access</h2>
              <p>Enter the event administrator code.</p>
              <input
                autoFocus
                inputMode="numeric"
                pattern="[0-9]*"
                maxLength={8}
                type="password"
                value={pin}
                onChange={e => {setPin(e.target.value.replace(/\D/g,'')); setPinError(false)}}
                placeholder="••••"
                aria-label="Admin PIN"
              />
              {pinError && <span className="pinError">That code isn't correct.</span>}
              <button className="unlockBtn" type="submit">Unlock dashboard</button>
            </form>
          </div>
        )}
      </main>
    )
  }

  if (view === 'booth') {
    return (
      <main className="boothExperience" style={{'--accent': event.accent}}>
        <div className="floralCorner floralTop"/>
        <div className="floralCorner floralBottom"/>
        <button className="guestExit" onClick={() => {resetDemo(); setView('entrance')}}>
          <ChevronLeft size={19}/> Exit booth
        </button>
        <button className="adminLock boothAdmin" onClick={openAdmin}><LockKeyhole size={16}/> Admin</button>

        <section className="recordingCard">
          <div className="cardMonogram">V<span>♥</span>M</div>
          <p className="tinyLabel">A MESSAGE FOR</p>
          <h1>{event.title}</h1>
          <p className="dateLine">{event.subtitle}</p>
          <div className="fineRule"><span/><Heart size={13} fill="currentColor"/><span/></div>

          <div className="receiverMedallion"><Phone size={38} strokeWidth={1.6}/></div>
          <h2>{event.prompt}</h2>
          <p className="helper">Choose audio or video, then speak from the heart.</p>

          <div className="modeRow">
            <button className={mode==='audio' ? 'mode active' : 'mode'} onClick={() => setMode('audio')} disabled={recording}>
              <Mic size={22}/><span>Voice message</span>
            </button>
            <button className={mode==='video' ? 'mode active' : 'mode'} onClick={() => setMode('video')} disabled={recording}>
              <Video size={22}/><span>Video message</span>
            </button>
          </div>

          {!complete ? (
            <div className="recordArea">
              <div className={recording ? 'timer recording' : 'timer'}>
                {String(Math.floor(seconds/60)).padStart(2,'0')}:{String(seconds%60).padStart(2,'0')}
              </div>
              {!recording ? (
                <button className="recordBtn" onClick={startRecording}><Play size={22} fill="currentColor"/> Begin recording</button>
              ) : (
                <button className="stopBtn" onClick={stopRecording}><Square size={20} fill="currentColor"/> Finish message</button>
              )}
              <p className="privacy">A private keepsake for {event.title}.</p>
            </div>
          ) : (
            <div className="successBox">
              <CheckCircle2 size={42}/>
              <h3>Beautiful. It's saved.</h3>
              <p>Thank you for adding your voice to their story.</p>
              <button className="recordBtn" onClick={resetDemo}><RotateCcw size={19}/> Leave another</button>
            </div>
          )}
        </section>

        {showAdminGate && (
          <div className="modalBackdrop" onMouseDown={() => setShowAdminGate(false)}>
            <form className={pinError ? 'pinModal shake' : 'pinModal'} onSubmit={submitAdmin} onMouseDown={e => e.stopPropagation()}>
              <button type="button" className="modalClose" onClick={() => setShowAdminGate(false)}><X size={19}/></button>
              <div className="lockSeal"><LockKeyhole size={24}/></div>
              <p className="tinyLabel">PRIVATE AREA</p>
              <h2>Admin access</h2>
              <p>Enter the event administrator code.</p>
              <input autoFocus inputMode="numeric" pattern="[0-9]*" maxLength={8} type="password" value={pin}
                onChange={e => {setPin(e.target.value.replace(/\D/g,'')); setPinError(false)}} placeholder="••••" />
              {pinError && <span className="pinError">That code isn't correct.</span>}
              <button className="unlockBtn" type="submit">Unlock dashboard</button>
            </form>
          </div>
        )}
      </main>
    )
  }

  return (
    <main className="appShell">
      <aside className="sidebar">
        <div className="brand">
          <div className="brandMark"><Phone size={23}/></div>
          <div><strong>VoiceMento</strong><span>Events</span></div>
        </div>
        <nav>
          <button className="nav active"><CalendarDays size={20}/> Event</button>
          <button className="nav"><Images size={20}/> Gallery</button>
          <button className="nav"><Users size={20}/> Guests</button>
          <button className="nav"><Settings size={20}/> Settings</button>
        </nav>
        <button className="lockOut" onClick={() => setView('entrance')}><LogOut size={18}/> Lock admin</button>
        <div className="sidebarFoot">VoiceMento · Private dashboard</div>
      </aside>

      <section className="content">
        <header>
          <div>
            <div className="eyebrow">WEDDING EVENT</div>
            <h1>{event.title}</h1>
            <p>{event.subtitle}</p>
          </div>
          <button className="launch" onClick={() => setView('entrance')}><Play size={18} fill="currentColor"/> Preview guest experience</button>
        </header>

        <div className="statsGrid">
          <Stat icon={<Heart/>} label="Messages" value={stats.total}/>
          <Stat icon={<Mic/>} label="Audio" value={stats.audio}/>
          <Stat icon={<Video/>} label="Video" value={stats.video}/>
          <Stat icon={<Users/>} label="Guests" value={stats.total}/>
        </div>

        <div className="grid2">
          <section className="panel">
            <div className="panelHead">
              <div><span>Event styling</span><small>Everything guests see at the booth</small></div>
              <Settings size={20}/>
            </div>
            <label>Couple / event name
              <input value={event.title} onChange={e=>saveEvent({...event,title:e.target.value})}/>
            </label>
            <label>Date / subtitle
              <input value={event.subtitle} onChange={e=>saveEvent({...event,subtitle:e.target.value})}/>
            </label>
            <label>Recording prompt
              <textarea value={event.prompt} onChange={e=>saveEvent({...event,prompt:e.target.value})}/>
            </label>
            <label>Wedding accent
              <div className="colorRow">
                <input type="color" value={event.accent} onChange={e=>saveEvent({...event,accent:e.target.value})}/>
                <span>{event.accent}</span>
              </div>
            </label>
          </section>

          <section className="panel sharePanel">
            <div className="panelHead">
              <div><span>Guest access</span><small>Share the event from table cards</small></div>
              <QrCode size={20}/>
            </div>
            <div className="fakeQr"><QrCode size={100} strokeWidth={1.2}/></div>
            <div className="eventCode">EVENT CODE <strong>OLIVIA26</strong></div>
            <button className="secondary"><Download size={18}/> Download QR</button>
          </section>
        </div>

        <div className="grid2 adminSecondRow">
          <section className="panel">
            <div className="panelHead">
              <div><span>Admin security</span><small>Change the local dashboard PIN</small></div>
              <LockKeyhole size={20}/>
            </div>
            <label>Admin PIN
              <input
                inputMode="numeric"
                pattern="[0-9]*"
                maxLength={8}
                value={adminPinDraft}
                onChange={e=>setAdminPinDraft(e.target.value.replace(/\D/g,''))}
                placeholder="4–8 digits"
              />
            </label>
            <button className="secondary" onClick={saveAdminPin}>Save admin PIN</button>
            <p className="securityNote">For this demo, the PIN is stored on this device. A production version should use a real login/backend.</p>
          </section>

          <section className="panel miniPreview">
            <p className="tinyLabel">GUEST ENTRANCE</p>
            <div className="miniBooth"><Phone size={28}/></div>
            <h3>Vintage wedding booth</h3>
            <p>Guests tap the booth, the doors open, and the recording experience begins.</p>
            <button className="secondary" onClick={() => setView('entrance')}>View entrance</button>
          </section>
        </div>

        <section className="panel messagesPanel">
          <div className="panelHead">
            <div><span>Recent messages</span><small>Audio and video guestbook submissions</small></div>
            <button className="secondary"><Download size={18}/> Export all</button>
          </div>
          {messages.length === 0 ? (
            <div className="empty"><Camera size={42}/><h3>No messages yet</h3><p>Open the guest experience and record a demo message.</p></div>
          ) : (
            <div className="messageList">
              {messages.slice(0,8).map(m => (
                <div className="message" key={m.id}>
                  <div className="msgIcon">{m.type==='audio'?<Mic size={19}/>:<Video size={19}/>}</div>
                  <div><strong>{m.guest}</strong><span>{m.type==='audio'?'Audio message':'Video message'} · {m.duration}s</span></div>
                  <time>{m.time}</time>
                  <button><Play size={17}/></button>
                </div>
              ))}
            </div>
          )}
        </section>
      </section>
    </main>
  )
}

function Stat({icon,label,value}) {
  return <div className="stat"><div className="statIcon">{icon}</div><div><span>{label}</span><strong>{value}</strong></div></div>
}
