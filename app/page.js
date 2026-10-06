'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import {
  Phone, Mic, Video, Heart, Settings, Play, Square, RotateCcw,
  QrCode, Images, CalendarDays, Users, Download, ChevronLeft,
  Camera, CheckCircle2, LockKeyhole, X, Sparkles, LogOut
} from 'lucide-react'

const DEFAULT_EVENT = {
  title: 'Olivia & James',
  subtitle: 'October 18, 2026',
  prompt: "Leave us a message we'll keep forever",
  accent: '#B58B6A'
}

const DEFAULT_ADMIN_PIN = '8886'

function openMessageDb() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('voicemento-db', 1)
    request.onupgradeneeded = () => {
      const db = request.result
      if (!db.objectStoreNames.contains('messages')) {
        db.createObjectStore('messages', { keyPath: 'id' })
      }
    }
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error)
  })
}

async function saveStoredMessage(message) {
  const db = await openMessageDb()
  return new Promise((resolve, reject) => {
    const tx = db.transaction('messages', 'readwrite')
    tx.objectStore('messages').put(message)
    tx.oncomplete = () => { db.close(); resolve() }
    tx.onerror = () => { db.close(); reject(tx.error) }
  })
}

async function readStoredMessages() {
  const db = await openMessageDb()
  return new Promise((resolve, reject) => {
    const tx = db.transaction('messages', 'readonly')
    const request = tx.objectStore('messages').getAll()
    request.onsuccess = () => {
      const items = request.result
        .sort((a,b) => b.id - a.id)
        .map(item => ({
          ...item,
          playable: !!item.blob,
          url: item.blob ? URL.createObjectURL(item.blob) : null
        }))
      db.close()
      resolve(items)
    }
    request.onerror = () => { db.close(); reject(request.error) }
  })
}

export default function Home() {
  const [view, setView] = useState('entrance')
  const [entering, setEntering] = useState(false)
  const [mode, setMode] = useState('audio')
  const [event, setEvent] = useState(DEFAULT_EVENT)
  const [recording, setRecording] = useState(false)
  const [seconds, setSeconds] = useState(0)
  const [complete, setComplete] = useState(false)
  const [messages, setMessages] = useState([])
  const [showAdminGate, setShowAdminGate] = useState(false)
  const [pin, setPin] = useState('')
  const [pinError, setPinError] = useState(false)
  const [adminPinDraft, setAdminPinDraft] = useState(DEFAULT_ADMIN_PIN)
  const [pinSaved, setPinSaved] = useState(false)
  const [recordError, setRecordError] = useState('')
  const [preparing, setPreparing] = useState(false)
  const [selectedMessage, setSelectedMessage] = useState(null)
  const timerRef = useRef(null)
  const mediaRecorderRef = useRef(null)
  const chunksRef = useRef([])
  const streamRef = useRef(null)
  const videoPreviewRef = useRef(null)
  const startedAtRef = useRef(0)

  useEffect(() => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('./sw.js').catch(() => {})
    }
    try {
      readStoredMessages().then(stored => {
        if (stored.length) {
          setMessages(stored)
          return
        }
        const legacy = localStorage.getItem('voicemento_messages')
        if (legacy) {
          const demoItems = JSON.parse(legacy).map(item => ({...item, playable:false, legacy:true}))
          setMessages(demoItems)
        }
      }).catch(() => {
        const legacy = localStorage.getItem('voicemento_messages')
        if (legacy) setMessages(JSON.parse(legacy).map(item => ({...item, playable:false, legacy:true})))
      })
      const savedEvent = localStorage.getItem('voicemento_event')
      if (savedEvent) setEvent({ ...DEFAULT_EVENT, ...JSON.parse(savedEvent) })
      const savedPin = localStorage.getItem('voicemento_admin_pin')
      if (!savedPin || savedPin === '2468') {
        localStorage.setItem('voicemento_admin_pin', DEFAULT_ADMIN_PIN)
        setAdminPinDraft(DEFAULT_ADMIN_PIN)
      } else {
        setAdminPinDraft(savedPin)
      }
    } catch {}
  }, [])

  useEffect(() => {
    if (recording) timerRef.current = setInterval(() => setSeconds(s => s + 1), 1000)
    else if (timerRef.current) clearInterval(timerRef.current)
    return () => timerRef.current && clearInterval(timerRef.current)
  }, [recording])

  const stats = useMemo(() => ({
    total: messages.length,
    audio: messages.filter(m => m.type === 'audio').length,
    video: messages.filter(m => m.type === 'video').length,
  }), [messages])

  function saveEvent(next) {
    setEvent(next)
    try { localStorage.setItem('voicemento_event', JSON.stringify(next)) } catch {}
  }

  function enterBooth() {
    if (entering) return
    setEntering(true)
    setTimeout(() => {
      resetDemo()
      setView('booth')
      setEntering(false)
    }, 1800)
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
    setPinSaved(true)
    setTimeout(() => setPinSaved(false), 1800)
  }

  function stopTracks() {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop())
      streamRef.current = null
    }
    if (videoPreviewRef.current) videoPreviewRef.current.srcObject = null
  }

  function preferredMime(type) {
    const candidates = type === 'video'
      ? ['video/mp4', 'video/webm;codecs=vp9,opus', 'video/webm;codecs=vp8,opus', 'video/webm']
      : ['audio/mp4', 'audio/webm;codecs=opus', 'audio/webm', 'audio/ogg;codecs=opus']
    if (typeof MediaRecorder === 'undefined') return ''
    return candidates.find(candidate => MediaRecorder.isTypeSupported(candidate)) || ''
  }

  async function startRecording() {
    setRecordError('')
    setSeconds(0)
    setComplete(false)
    setPreparing(true)

    try {
      if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === 'undefined') {
        throw new Error('Recording is not supported by this browser.')
      }

      const constraints = mode === 'video'
        ? { audio: true, video: { facingMode: 'user' } }
        : { audio: true }

      const stream = await navigator.mediaDevices.getUserMedia(constraints)
      streamRef.current = stream

      if (mode === 'video' && videoPreviewRef.current) {
        videoPreviewRef.current.srcObject = stream
        videoPreviewRef.current.muted = true
        await videoPreviewRef.current.play().catch(() => {})
      }

      const mimeType = preferredMime(mode)
      const recorder = mimeType ? new MediaRecorder(stream, { mimeType }) : new MediaRecorder(stream)
      mediaRecorderRef.current = recorder
      chunksRef.current = []
      startedAtRef.current = Date.now()

      recorder.ondataavailable = event => {
        if (event.data && event.data.size > 0) chunksRef.current.push(event.data)
      }

      recorder.onerror = () => {
        setRecordError('The recording stopped unexpectedly. Please try again.')
        setRecording(false)
        setPreparing(false)
        stopTracks()
      }

      recorder.onstop = async () => {
        const duration = Math.max(1, Math.round((Date.now() - startedAtRef.current) / 1000))
        const blobType = recorder.mimeType || (mode === 'video' ? 'video/mp4' : 'audio/mp4')
        const blob = new Blob(chunksRef.current, { type: blobType })
        stopTracks()

        if (!blob.size) {
          setRecordError('No audio or video was captured. Please check microphone/camera permission and try again.')
          setPreparing(false)
          return
        }

        const item = {
          id: Date.now(),
          type: mode,
          duration,
          time: new Date().toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'}),
          guest: `Guest ${messages.length + 1}`,
          mimeType: blob.type,
          blob
        }

        try {
          await saveStoredMessage(item)
          const playableItem = {...item, playable:true, url:URL.createObjectURL(blob)}
          setMessages(prev => [playableItem, ...prev])
          localStorage.removeItem('voicemento_messages')
          setComplete(true)
        } catch {
          setRecordError('The message recorded, but this device could not save it locally.')
        } finally {
          setPreparing(false)
        }
      }

      recorder.start(250)
      setRecording(true)
      setPreparing(false)
    } catch (error) {
      stopTracks()
      setRecording(false)
      setPreparing(false)
      if (error?.name === 'NotAllowedError') {
        setRecordError('Microphone/camera permission was denied. Allow access in Safari settings, then try again.')
      } else {
        setRecordError(error?.message || 'Unable to start recording. Please try again.')
      }
    }
  }

  function stopRecording() {
    setRecording(false)
    const recorder = mediaRecorderRef.current
    if (recorder && recorder.state !== 'inactive') recorder.stop()
    else stopTracks()
  }

  function resetDemo() {
    if (mediaRecorderRef.current?.state && mediaRecorderRef.current.state !== 'inactive') {
      try { mediaRecorderRef.current.stop() } catch {}
    }
    stopTracks()
    setRecording(false)
    setPreparing(false)
    setRecordError('')
    setSeconds(0)
    setComplete(false)
  }

  if (view === 'entrance') {
    return (
      <main className={entering ? 'weddingEntrance entering' : 'weddingEntrance'} style={{'--accent': event.accent}}>
        <div className="paperTexture" />
        <RosePetals />

        <button className="adminLock" onClick={openAdmin}>
          <LockKeyhole size={16}/> Admin
        </button>

        <section className="entranceCopy">
          <div className="monogram"><span>V</span><Heart size={14} fill="currentColor"/><span>M</span></div>
          <p className="scriptLine">A little piece of tonight, forever.</p>
          <h1>{event.title}</h1>
          <div className="ornament"><span/><Sparkles size={16}/><span/></div>
          <p className="eventDate">{event.subtitle}</p>
          <p className="entranceHint">Step inside and leave a memory for the newlyweds.</p>
        </section>

        <button className="boothStage" onClick={enterBooth} aria-label="Enter the VoiceMento phone booth">
          <span className="floorShadow"/>
          <span className="boothGlow"/>
          <span className="phoneBooth">
            <span className="boothTopCap"/>
            <span className="boothCrown">VOICEMENTO</span>
            <span className="boothBody">
              <span className="boothInterior"><Phone size={48} strokeWidth={1.4}/><small>STEP INSIDE</small></span>
              <span className="boothDoor boothDoorLeft">
                <span className="doorGlass"><span/><span/><span/><span/><span/><span/></span>
                <span className="doorPanelDetail"/><span className="doorHandle"/>
              </span>
              <span className="boothDoor boothDoorRight">
                <span className="doorGlass"><span/><span/><span/><span/><span/><span/></span>
                <span className="doorPanelDetail"/><span className="doorHandle"/>
              </span>
            </span>
            <span className="boothBase"/>
          </span>
          <span className="tapLabel">{entering ? 'Come on in…' : 'Tap the booth to enter'}</span>
        </button>

        <p className="poweredBy">VOICEMENTO · DIGITAL WEDDING GUESTBOOK</p>
        <AdminGate open={showAdminGate} onClose={() => setShowAdminGate(false)} pin={pin} setPin={setPin} error={pinError} setError={setPinError} onSubmit={submitAdmin}/>
      </main>
    )
  }

  if (view === 'booth') {
    return (
      <main className="boothExperience" style={{'--accent': event.accent}}>
        <RosePetals subtle />
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
            <button className={mode==='audio' ? 'mode active' : 'mode'} onClick={() => setMode('audio')} disabled={recording || preparing}>
              <Mic size={22}/><span>Voice message</span>
            </button>
            <button className={mode==='video' ? 'mode active' : 'mode'} onClick={() => setMode('video')} disabled={recording || preparing}>
              <Video size={22}/><span>Video message</span>
            </button>
          </div>

          {mode === 'video' && !complete && (
            <div className={recording ? 'videoPreview live' : 'videoPreview'}>
              <video ref={videoPreviewRef} muted playsInline />
              {!recording && <div className="previewPlaceholder"><Video size={24}/><span>Your camera preview appears here</span></div>}
            </div>
          )}

          {recordError && <p className="recordError">{recordError}</p>}

          {!complete ? (
            <div className="recordArea">
              <div className={recording ? 'timer recording' : 'timer'}>{String(Math.floor(seconds/60)).padStart(2,'0')}:{String(seconds%60).padStart(2,'0')}</div>
              {!recording ? (
                <button className="recordBtn" onClick={startRecording} disabled={preparing}><Play size={22} fill="currentColor"/> {preparing ? 'Preparing…' : 'Begin recording'}</button>
              ) : (
                <button className="stopBtn" onClick={stopRecording}><Square size={20} fill="currentColor"/> Finish message</button>
              )}
              <p className="privacy">Your message becomes part of their love story.</p>
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
        <AdminGate open={showAdminGate} onClose={() => setShowAdminGate(false)} pin={pin} setPin={setPin} error={pinError} setError={setPinError} onSubmit={submitAdmin}/>
      </main>
    )
  }

  return (
    <main className="appShell">
      <aside className="sidebar">
        <div className="brand"><div className="brandMark"><Phone size={23}/></div><div><strong>VoiceMento</strong><span>Events</span></div></div>
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
          <div><div className="eyebrow">WEDDING EVENT</div><h1>{event.title}</h1><p>{event.subtitle}</p></div>
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
            <div className="panelHead"><div><span>Event styling</span><small>Everything guests see at the booth</small></div><Settings size={20}/></div>
            <label>Couple / event name<input value={event.title} onChange={e=>saveEvent({...event,title:e.target.value})}/></label>
            <label>Date / subtitle<input value={event.subtitle} onChange={e=>saveEvent({...event,subtitle:e.target.value})}/></label>
            <label>Recording prompt<textarea value={event.prompt} onChange={e=>saveEvent({...event,prompt:e.target.value})}/></label>
            <label>Wedding accent<div className="colorRow"><input type="color" value={event.accent} onChange={e=>saveEvent({...event,accent:e.target.value})}/><span>{event.accent}</span></div></label>
          </section>

          <section className="panel sharePanel">
            <div className="panelHead"><div><span>Guest access</span><small>Share the event from table cards</small></div><QrCode size={20}/></div>
            <div className="fakeQr"><QrCode size={100} strokeWidth={1.2}/></div>
            <div className="eventCode">EVENT CODE <strong>OLIVIA26</strong></div>
            <button className="secondary"><Download size={18}/> Download QR</button>
          </section>
        </div>

        <div className="grid2 adminSecondRow">
          <section className="panel">
            <div className="panelHead"><div><span>Admin security</span><small>Change the dashboard PIN</small></div><LockKeyhole size={20}/></div>
            <label>Admin PIN
              <input inputMode="numeric" pattern="[0-9]*" maxLength={8} value={adminPinDraft} onChange={e=>setAdminPinDraft(e.target.value.replace(/\D/g,''))} placeholder="4–8 digits"/>
            </label>
            <button className="secondary" onClick={saveAdminPin}>{pinSaved ? 'Saved ✓' : 'Save admin PIN'}</button>
            <p className="securityNote">Default PIN is 8886. This demo stores the PIN on this device; a production version should use secure server-side authentication.</p>
          </section>

          <section className="panel miniPreview">
            <p className="tinyLabel">GUEST ENTRANCE</p>
            <div className="miniBooth"><Phone size={28}/></div>
            <h3>Romantic Floral</h3>
            <p>Ivory and champagne styling, rose petals, vintage booth doors and a cinematic entrance.</p>
            <button className="secondary" onClick={() => setView('entrance')}>View entrance</button>
          </section>
        </div>

        <section className="panel messagesPanel">
          <div className="panelHead"><div><span>Recent messages</span><small>Audio and video guestbook submissions</small></div><button className="secondary"><Download size={18}/> Export all</button></div>
          {messages.length === 0 ? (
            <div className="empty"><Camera size={42}/><h3>No messages yet</h3><p>Open the guest experience and record a demo message.</p></div>
          ) : (
            <div className="messageList">
              {messages.slice(0,8).map(m => (
                <div className="message" key={m.id}>
                  <div className="msgIcon">{m.type==='audio'?<Mic size={19}/>:<Video size={19}/>}</div>
                  <div><strong>{m.guest}</strong><span>{m.playable ? `${m.type==='audio'?'Audio message':'Video message'} · ${m.duration}s` : 'Old demo entry · no media was captured'}</span></div>
                  <time>{m.time}</time>
                  <button disabled={!m.playable} onClick={() => m.playable && setSelectedMessage(m)} title={m.playable ? 'Play message' : 'This older demo entry has no recording'}>
                    <Play size={17}/>
                  </button>
                </div>
              ))}
            </div>
          )}
        </section>
      </section>
      {selectedMessage && <MediaPlayer message={selectedMessage} onClose={() => setSelectedMessage(null)} />}
    </main>
  )
}

function RosePetals({subtle=false}) {
  return <div className={subtle ? 'rosePetals subtle' : 'rosePetals'} aria-hidden="true">{Array.from({length:18}).map((_,i)=><i key={i}/>)}</div>
}

function AdminGate({open,onClose,pin,setPin,error,setError,onSubmit}) {
  if (!open) return null
  return (
    <div className="modalBackdrop" onMouseDown={onClose}>
      <form className={error ? 'pinModal shake' : 'pinModal'} onSubmit={onSubmit} onMouseDown={e=>e.stopPropagation()}>
        <button type="button" className="modalClose" onClick={onClose}><X size={19}/></button>
        <div className="lockSeal"><LockKeyhole size={24}/></div>
        <p className="tinyLabel">PRIVATE AREA</p>
        <h2>Admin access</h2>
        <p>Enter the event administrator code.</p>
        <input autoFocus inputMode="numeric" pattern="[0-9]*" maxLength={8} type="password" value={pin}
          onChange={e=>{setPin(e.target.value.replace(/\D/g,''));setError(false)}} placeholder="••••"/>
        {error && <span className="pinError">That code isn't correct.</span>}
        <button className="unlockBtn" type="submit">Unlock dashboard</button>
      </form>
    </div>
  )
}

function MediaPlayer({message,onClose}) {
  return (
    <div className="modalBackdrop" onMouseDown={onClose}>
      <div className="playerModal" onMouseDown={e=>e.stopPropagation()}>
        <button className="modalClose" onClick={onClose}><X size={19}/></button>
        <p className="tinyLabel">{message.type === 'video' ? 'VIDEO MESSAGE' : 'VOICE MESSAGE'}</p>
        <h2>{message.guest}</h2>
        <p className="playerMeta">{message.time} · {message.duration}s</p>
        {message.type === 'video'
          ? <video className="mediaPlayer" src={message.url} controls autoPlay playsInline />
          : <audio className="mediaPlayer audioPlayer" src={message.url} controls autoPlay />
        }
        <a className="downloadMedia" href={message.url} download={`VoiceMento-${message.id}.${message.type === 'video' ? 'mp4' : 'm4a'}`}>
          <Download size={17}/> Save this message
        </a>
      </div>
    </div>
  )
}

function Stat({icon,label,value}) {
  return <div className="stat"><div className="statIcon">{icon}</div><div><span>{label}</span><strong>{value}</strong></div></div>
}
