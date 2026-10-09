'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import {
  Phone, Mic, Video, Heart, Settings, Play, Square, RotateCcw,
  QrCode, Images, CalendarDays, Users, Download, ChevronLeft,
  Camera, CheckCircle2, LockKeyhole, X, Sparkles, LogOut,
  FileText, Image as ImageIcon, SwitchCamera, Eye, Save, SkipForward,
  Star, Upload, Volume2, Search, Check, MonitorPlay, ChevronRight
} from 'lucide-react'
import { EMPTY_CLOUD_CONFIG, validCloudEvent, cloudClient, uploadCloudMemory, fetchCloudMemories } from './voicementoCloud'

const DEFAULT_EVENT = {
  title: 'Olivia & James',
  subtitle: 'October 18, 2026',
  prompt: "Leave us a message we'll keep forever",
  accent: '#B58B6A',
  ambience: 'rose',
  ambienceIntensity: 'normal',
  theme: 'romantic',
  frame: 'floral',
  welcomeText: 'A little piece of tonight, forever.',
  thankYouText: 'Thank you for adding your memory to our story.',
  hashtag: '#OliviaAndJames',
  monogram: 'O ♥ J',
  privacy: 'private',
  package: 'full',
  features: { audio:true, video:true, photo:true, note:true },
  logoData: '',
  backgroundData: '',
  greetingData: '',
  autoMatchTheme: true,
  boothStyle: 'ivory',
  boothCustom: false,
  booth: {
    panel: '#EEE2D2',
    trim: '#B58B6A',
    interior: '#584639',
    sign: 'VOICEMENTO',
    caption: 'STEP INSIDE',
    size: 112,
    door: 'glass'
  },
  phone: {
    body: '#D7B58C',
    handset: '#2A211D',
    trim: '#B58B6A',
    cord: '#2F2925',
    finish: 'glossy',
    plaque: 'VOICEMENTO'
  }
}

const DEFAULT_ADMIN_PIN = '8886'
const RESET_SECONDS = 8
const MAX_RECORD_SECONDS = 180
const BOOTH_ENTRY_MS = 3450

const THEME_PRESETS = {
  romantic:{label:'Romantic Floral',accent:'#B58B6A',ambience:'rose',frame:'floral'},
  blackTie:{label:'Black Tie',accent:'#B9975B',ambience:'sparkles',frame:'blacktie'},
  rustic:{label:'Rustic Autumn',accent:'#9B6A3E',ambience:'leaves',frame:'vintage'},
  winter:{label:'Winter Wedding',accent:'#9AAEB8',ambience:'snow',frame:'gold'},
  garden:{label:'Garden Party',accent:'#7E9B79',ambience:'blossoms',frame:'floral'},
  minimal:{label:'Modern Minimal',accent:'#8A817B',ambience:'none',frame:'none'},
  vintage:{label:'Vintage',accent:'#A17855',ambience:'sparkles',frame:'vintage'},
  birthday:{label:'Birthday',accent:'#B8789D',ambience:'confetti',frame:'polaroid'},
  graduation:{label:'Graduation',accent:'#806B48',ambience:'confetti',frame:'gold'},
  baby:{label:'Baby Shower',accent:'#9AAFC1',ambience:'blossoms',frame:'polaroid'},
  corporate:{label:'Corporate',accent:'#66727C',ambience:'none',frame:'none'}
}

const THEME_PHONE = {
  romantic:{body:'#D9B88F',handset:'#2A211D',trim:'#B58B6A',cord:'#2F2925',finish:'glossy',booth:'ivory'},
  blackTie:{body:'#1D1A18',handset:'#0E0D0C',trim:'#C5A45F',cord:'#171513',finish:'glossy',booth:'blackGold'},
  rustic:{body:'#7B5134',handset:'#35241B',trim:'#B38654',cord:'#34251E',finish:'aged',booth:'walnut'},
  winter:{body:'#EEECE6',handset:'#47535A',trim:'#A7B3B9',cord:'#4A5156',finish:'glossy',booth:'winter'},
  garden:{body:'#AAB79A',handset:'#413C32',trim:'#B89C70',cord:'#39342D',finish:'matte',booth:'garden'},
  minimal:{body:'#E8E5DF',handset:'#292929',trim:'#8F8A86',cord:'#292929',finish:'matte',booth:'modern'},
  vintage:{body:'#7F3136',handset:'#2B1D1A',trim:'#B9915F',cord:'#2B211E',finish:'aged',booth:'walnut'},
  birthday:{body:'#D99CB9',handset:'#6B4256',trim:'#C49A63',cord:'#6B4256',finish:'glossy',booth:'ivory'},
  graduation:{body:'#253956',handset:'#111A27',trim:'#C3A05A',cord:'#172233',finish:'glossy',booth:'blackGold'},
  baby:{body:'#BFD4E0',handset:'#5B6870',trim:'#C5BBAE',cord:'#66737A',finish:'matte',booth:'winter'},
  corporate:{body:'#5D6870',handset:'#20262A',trim:'#AAB0B4',cord:'#242A2E',finish:'matte',booth:'modern'}
}

const BOOTH_STYLES = {
  ivory:'Ivory Wedding',
  blackGold:'Black & Gold',
  walnut:'Walnut & Brass',
  classicRed:'Classic Red',
  garden:'Garden White',
  winter:'Winter Silver',
  modern:'Modern Minimal'
}

const PACKAGE_FEATURES = {
  voice:{label:'Voice Only',features:{audio:true,video:false,photo:false,note:false}},
  voicePhoto:{label:'Voice + Photo',features:{audio:true,video:false,photo:true,note:false}},
  premium:{label:'Premium Video',features:{audio:true,video:true,photo:true,note:false}},
  full:{label:'Full Experience',features:{audio:true,video:true,photo:true,note:true}}
}

function openDb() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('voicemento-db', 2)
    request.onupgradeneeded = () => {
      const db = request.result
      if (!db.objectStoreNames.contains('messages')) db.createObjectStore('messages', { keyPath: 'id' })
    }
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error)
  })
}

async function dbPut(item) {
  const db = await openDb()
  return new Promise((resolve, reject) => {
    const tx = db.transaction('messages', 'readwrite')
    tx.objectStore('messages').put(item)
    tx.oncomplete = () => { db.close(); resolve() }
    tx.onerror = () => { db.close(); reject(tx.error) }
  })
}

async function dbGetAll() {
  const db = await openDb()
  return new Promise((resolve, reject) => {
    const tx = db.transaction('messages', 'readonly')
    const req = tx.objectStore('messages').getAll()
    req.onsuccess = () => {
      const items = req.result.sort((a,b) => b.id - a.id).map(hydrateItem)
      db.close()
      resolve(items)
    }
    req.onerror = () => { db.close(); reject(req.error) }
  })
}

function hydrateItem(item) {
  return {
    ...item,
    playable: !!item.blob || !!item.photoBlob || !!item.note,
    url: item.blob ? URL.createObjectURL(item.blob) : null,
    photoUrl: item.photoBlob ? URL.createObjectURL(item.photoBlob) : null
  }
}

function stopStream(ref, videoRef) {
  if (ref.current) {
    ref.current.getTracks().forEach(t => t.stop())
    ref.current = null
  }
  if (videoRef.current) videoRef.current.srcObject = null
}

function bestMime(type) {
  if (typeof MediaRecorder === 'undefined') return ''
  const candidates = type === 'video'
    ? ['video/mp4','video/webm;codecs=vp9,opus','video/webm;codecs=vp8,opus','video/webm']
    : ['audio/mp4','audio/webm;codecs=opus','audio/webm']
  return candidates.find(x => MediaRecorder.isTypeSupported(x)) || ''
}

function storedItem(item) {
  const {url,photoUrl,playable,...clean}=item
  return clean
}

function fileToDataUrl(file,maxBytes) {
  return new Promise((resolve,reject)=>{
    if (!file) return resolve('')
    if (file.size > maxBytes) return reject(new Error('That file is too large for local event storage.'))
    const reader=new FileReader()
    reader.onload=()=>resolve(reader.result)
    reader.onerror=()=>reject(new Error('Could not read that file.'))
    reader.readAsDataURL(file)
  })
}

function formatBytes(bytes) {
  if (!bytes) return '0 MB'
  if (bytes < 1024*1024) return (bytes/1024).toFixed(1)+' KB'
  return (bytes/1024/1024).toFixed(1)+' MB'
}

function getPhoneConfig(event) {
  const manual={...DEFAULT_EVENT.phone,...(event.phone||{})}
  if (event.autoMatchTheme !== false) {
    return {...manual,...(THEME_PHONE[event.theme]||THEME_PHONE.romantic),plaque:manual.plaque}
  }
  return manual
}

function getBoothStyle(event) {
  if (!event.boothCustom && event.autoMatchTheme !== false) return (THEME_PHONE[event.theme]||THEME_PHONE.romantic).booth
  return event.boothStyle || 'ivory'
}


function makeTableGuestUrl(event,cloud) {
  if (typeof window === 'undefined') return ''
  const url=new URL(window.location.href)
  url.search=''
  url.hash=''
  const q=url.searchParams
  q.set('guest','table')
  q.set('t',(event.title||'VoiceMento').slice(0,80))
  q.set('d',(event.subtitle||'').slice(0,80))
  q.set('th',event.theme||'romantic')
  q.set('a',event.accent||'#B58B6A')
  q.set('mo',(event.monogram||'').slice(0,24))
  q.set('f',['audio','video','photo','note'].map(k=>event.features?.[k]?'1':'0').join(''))
  q.set('frame',event.frame||'floral')
  if(validCloudEvent(cloud)) {
    q.set('cu',cloud.url)
    q.set('ck',cloud.key)
    q.set('ce',cloud.eventId)
    q.set('cg',cloud.guestCode)
  }
  return url.toString()
}

function readTableGuestEvent() {
  const query=new URLSearchParams(window.location.search)
  if (query.get('guest')!=='table') return null
  const theme=query.get('th')
  const accent=query.get('a')
  const features=query.get('f')||''
  const next={
    ...DEFAULT_EVENT,
    title:(query.get('t')||DEFAULT_EVENT.title).slice(0,80),
    subtitle:(query.get('d')||DEFAULT_EVENT.subtitle).slice(0,80),
    monogram:(query.get('mo')||DEFAULT_EVENT.monogram).slice(0,24),
    theme:theme && THEME_PRESETS[theme]?theme:DEFAULT_EVENT.theme,
    accent:accent && /^#[0-9a-fA-F]{6}$/.test(accent)?accent:DEFAULT_EVENT.accent,
    frame:['floral','vintage','blacktie','gold','polaroid','none'].includes(query.get('frame'))?query.get('frame'):DEFAULT_EVENT.frame
  }
  next.ambience=THEME_PRESETS[next.theme]?.ambience||DEFAULT_EVENT.ambience
  if (/^[01]{4}$/.test(features) && features.includes('1')) {
    next.features=Object.fromEntries(['audio','video','photo','note'].map((key,i)=>[key,features[i]==='1']))
  }
  return next
}

function readCloudFromGuestLink() {
  const q=new URLSearchParams(window.location.search)
  return {
    url:q.get('cu')||'',
    key:q.get('ck')||'',
    eventId:q.get('ce')||'',
    guestCode:q.get('cg')||''
  }
}

function guestShareFiles(item) {
  if (!item) return []
  if (item.type==='note') return [new File([item.note||''],'VoiceMento-note-'+item.id+'.txt',{type:'text/plain'})]
  const mime=item.blob?.type||''
  const ext=item.type==='photo'?'jpg':mime.includes('webm')?'webm':mime.includes('ogg')?'ogg':mime.includes('mp4')?'mp4':'bin'
  const result=item.blob?[new File([item.blob],'VoiceMento-'+item.type+'-'+item.id+'.'+ext,{type:mime||'application/octet-stream'})]:[]
  if (item.photoBlob && item.type!=='photo') {
    result.push(new File([item.photoBlob],'VoiceMento-photo-'+item.id+'.jpg',{type:item.photoBlob.type||'image/jpeg'}))
  }
  return result
}

export default function VoiceMentoPhase1() {
  const [view, setView] = useState('entrance')
  const [tableGuest, setTableGuest] = useState(false)
  const [tableGuestUrl, setTableGuestUrl] = useState('')
  const [tableQrDataUrl, setTableQrDataUrl] = useState('')
  const [tableQrError, setTableQrError] = useState('')
  const [tableQrStatus, setTableQrStatus] = useState('')
  const [lastGuestItem, setLastGuestItem] = useState(null)
  const [guestShareStatus, setGuestShareStatus] = useState('')
  const [cloudConfig,setCloudConfig] = useState(EMPTY_CLOUD_CONFIG)
  const [cloudEmail,setCloudEmail] = useState('')
  const [cloudPassword,setCloudPassword] = useState('')
  const [cloudUser,setCloudUser] = useState(null)
  const [cloudStatus,setCloudStatus] = useState('')
  const [cloudSaveStatus,setCloudSaveStatus] = useState('idle')
  const [cloudSaveError,setCloudSaveError] = useState('')
  const [cloudItems,setCloudItems] = useState([])
  const [cloudGalleryStatus,setCloudGalleryStatus] = useState('')
  const [cloudGalleryBusy,setCloudGalleryBusy] = useState(false)
  const cloud=useMemo(()=>cloudClient(cloudConfig),[cloudConfig.url,cloudConfig.key])
  const [entering, setEntering] = useState(false)
  const [boothZoomStyle, setBoothZoomStyle] = useState(null)
  const [arrivalPhoneScale, setArrivalPhoneScale] = useState(null)
  const [event, setEvent] = useState(DEFAULT_EVENT)
  const [messages, setMessages] = useState([])
  const [guestName, setGuestName] = useState('')
  const [boothStep, setBoothStep] = useState('choose')
  const [mode, setMode] = useState(null)
  const [recording, setRecording] = useState(false)
  const [preparing, setPreparing] = useState(false)
  const [seconds, setSeconds] = useState(0)
  const [countdown, setCountdown] = useState(0)
  const [recordError, setRecordError] = useState('')
  const [pending, setPending] = useState(null)
  const [attachedPhoto, setAttachedPhoto] = useState(null)
  const [photoCount, setPhotoCount] = useState(1)
  const [photoShots, setPhotoShots] = useState([])
  const [cameraFacing, setCameraFacing] = useState('user')
  const [noteText, setNoteText] = useState('')
  const [resetCountdown, setResetCountdown] = useState(RESET_SECONDS)
  const [selectedMessage, setSelectedMessage] = useState(null)
  const [storageInfo, setStorageInfo] = useState({usage:0,quota:0})
  const [assetError, setAssetError] = useState('')
  const [galleryTab, setGalleryTab] = useState('all')
  const [gallerySearch, setGallerySearch] = useState('')
  const [slideshowOpen, setSlideshowOpen] = useState(false)
  const [slideIndex, setSlideIndex] = useState(0)

  const [showAdminGate, setShowAdminGate] = useState(false)
  const [pin, setPin] = useState('')
  const [pinError, setPinError] = useState(false)
  const [adminPinDraft, setAdminPinDraft] = useState(DEFAULT_ADMIN_PIN)
  const [pinSaved, setPinSaved] = useState(false)

  const timerRef = useRef(null)
  const recordLimitRef = useRef(null)
  const mediaRecorderRef = useRef(null)
  const chunksRef = useRef([])
  const streamRef = useRef(null)
  const videoPreviewRef = useRef(null)
  const startedAtRef = useRef(0)
  const attractRef = useRef(null)
  const entranceTimerRef = useRef(null)
  const arrivalTimerRef = useRef(null)

  useEffect(() => () => {
    if (entranceTimerRef.current) clearTimeout(entranceTimerRef.current)
    if (arrivalTimerRef.current) clearTimeout(arrivalTimerRef.current)
    if (recordLimitRef.current) clearTimeout(recordLimitRef.current)
  }, [])

  useEffect(() => {
    if ('serviceWorker' in navigator) navigator.serviceWorker.register('./sw.js').catch(() => {})
    try {
      const linkedGuest=readTableGuestEvent()
      if (linkedGuest) {
        setTableGuest(true)
        setEvent(linkedGuest)
        const config=readCloudFromGuestLink()
        if(validCloudEvent(config))setCloudConfig(config)
        setView('booth')
      }else{
        const savedCloud=localStorage.getItem('voicemento_cloud_config')
        if(savedCloud)setCloudConfig({...EMPTY_CLOUD_CONFIG,...JSON.parse(savedCloud)})
      }
      const savedEvent = localStorage.getItem('voicemento_event')
      if (!linkedGuest && savedEvent) {
        const parsed=JSON.parse(savedEvent)
        setEvent({
          ...DEFAULT_EVENT,
          ...parsed,
          phone:{...DEFAULT_EVENT.phone,...(parsed.phone||{})},
          booth:{...DEFAULT_EVENT.booth,...(parsed.booth||{})},
          features:{...DEFAULT_EVENT.features,...(parsed.features||{})}
        })
      }
      const savedPin = localStorage.getItem('voicemento_admin_pin')
      if (!savedPin || savedPin === '2468') {
        localStorage.setItem('voicemento_admin_pin', DEFAULT_ADMIN_PIN)
        setAdminPinDraft(DEFAULT_ADMIN_PIN)
      } else setAdminPinDraft(savedPin)
    } catch {}
    dbGetAll().then(setMessages).catch(() => {})
  }, [])

  useEffect(() => {
    if (view!=='admin'||tableGuest) return
    const url=makeTableGuestUrl(event,cloudConfig)
    setTableGuestUrl(url)
    setTableQrDataUrl('')
    setTableQrError('')
    let active=true
    import('qrcode').then(mod=>mod.default.toDataURL(url,{
      errorCorrectionLevel:'M',margin:3,width:720,
      color:{dark:'#302923',light:'#FFFFFF'}
    })).then(src=>{if(active)setTableQrDataUrl(src)})
      .catch(()=>{if(active)setTableQrError('QR preview unavailable. You can still copy the guest link.')})
    return ()=>{active=false}
  },[view,tableGuest,event,cloudConfig])

  useEffect(()=>{
    if(tableGuest||!cloud)return
    let alive=true
    cloud.auth.getUser().then(({data})=>{if(alive)setCloudUser(data.user||null)})
      .catch(()=>{if(alive)setCloudUser(null)})
    const {data:subscription}=cloud.auth.onAuthStateChange((_event,session)=>{
      if(alive)setCloudUser(session?.user||null)
    })
    return ()=>{alive=false;subscription.subscription.unsubscribe()}
  },[cloud,tableGuest])

  useEffect(() => {
    if (navigator.storage?.estimate) {
      navigator.storage.estimate().then(({usage=0,quota=0})=>setStorageInfo({usage,quota})).catch(()=>{})
    }
  }, [messages])

  useEffect(() => {
    if (recording) timerRef.current = setInterval(() => {
      const elapsed=Math.floor((Date.now()-startedAtRef.current)/1000)
      setSeconds(Math.min(MAX_RECORD_SECONDS,elapsed))
      if (elapsed >= MAX_RECORD_SECONDS) finishMedia()
    }, 250)
    else if (timerRef.current) clearInterval(timerRef.current)
    return () => timerRef.current && clearInterval(timerRef.current)
  }, [recording])

  useEffect(() => {
    const activity = () => {
      if (attractRef.current) clearTimeout(attractRef.current)
      if (!tableGuest && view === 'booth' && boothStep === 'choose' && !recording && !preparing) {
        attractRef.current = setTimeout(() => exitToEntrance(), 30000)
      }
    }
    activity()
    window.addEventListener('pointerdown', activity)
    window.addEventListener('keydown', activity)
    return () => {
      window.removeEventListener('pointerdown', activity)
      window.removeEventListener('keydown', activity)
      if (attractRef.current) clearTimeout(attractRef.current)
    }
  }, [view, boothStep, recording, preparing, tableGuest])

  useEffect(() => {
    if (boothStep !== 'saved' || tableGuest) return
    setResetCountdown(RESET_SECONDS)
    const interval = setInterval(() => {
      setResetCountdown(v => {
        if (v <= 1) {
          clearInterval(interval)
          exitToEntrance()
          return 0
        }
        return v - 1
      })
    }, 1000)
    return () => clearInterval(interval)
  }, [boothStep, tableGuest])

  const stats = useMemo(() => ({
    total: messages.length,
    audio: messages.filter(m => m.type === 'audio').length,
    video: messages.filter(m => m.type === 'video').length,
    photo: messages.filter(m => m.type === 'photo').length,
    note: messages.filter(m => m.type === 'note').length
  }), [messages])

  const galleryItems = useMemo(() => {
    const q=gallerySearch.trim().toLowerCase()
    return messages.filter(m => {
      const matchesSearch=!q || (m.guest||'').toLowerCase().includes(q) || (m.note||'').toLowerCase().includes(q)
      if (!matchesSearch) return false
      if (galleryTab==='favorites') return !!m.favorite
      if (galleryTab==='photos') return m.type==='photo' || !!m.photoBlob
      if (galleryTab==='audio') return m.type==='audio'
      if (galleryTab==='video') return m.type==='video'
      if (galleryTab==='notes') return m.type==='note'
      return true
    })
  },[messages,galleryTab,gallerySearch])

  const slideshowItems = useMemo(() =>
    messages.filter(m => m.approved && (m.type==='photo' || !!m.photoBlob) && (m.photoUrl || m.url))
  ,[messages])

  useEffect(() => {
    if (!slideshowOpen || slideshowItems.length < 2) return
    const timer=setInterval(()=>setSlideIndex(i=>(i+1)%slideshowItems.length),4500)
    return ()=>clearInterval(timer)
  },[slideshowOpen,slideshowItems.length])

  useEffect(() => {
    if (slideIndex >= slideshowItems.length) setSlideIndex(0)
  },[slideshowItems.length,slideIndex])

  function saveEvent(next) {
    setEvent(next)
    try { localStorage.setItem('voicemento_event', JSON.stringify(next)) } catch {}
  }

  function applyTheme(key) {
    const preset=THEME_PRESETS[key]
    if (!preset) return
    saveEvent({...event,theme:key,accent:preset.accent,ambience:preset.ambience,frame:preset.frame})
  }

  function applyPackage(key) {
    const preset=PACKAGE_FEATURES[key]
    if (!preset) return
    saveEvent({...event,package:key,features:{...preset.features}})
  }

  function toggleFeature(key) {
    saveEvent({...event,package:'custom',features:{...event.features,[key]:!event.features[key]}})
  }

  async function handleAssetUpload(e,field,maxBytes) {
    setAssetError('')
    const file=e.target.files?.[0]
    if (!file) return
    try {
      const data=await fileToDataUrl(file,maxBytes)
      saveEvent({...event,[field]:data})
    } catch(err) {
      setAssetError(err.message || 'Could not save that file.')
    } finally {
      e.target.value=''
    }
  }

  async function toggleFavorite(item) {
    const updated={...item,favorite:!item.favorite}
    try {
      await dbPut(storedItem(updated))
      setMessages(prev=>prev.map(x=>x.id===updated.id?updated:x))
      if (selectedMessage?.id===updated.id) setSelectedMessage(updated)
    } catch {}
  }

  async function toggleApproval(item) {
    const updated={...item,approved:!item.approved}
    try {
      await dbPut(storedItem(updated))
      setMessages(prev=>prev.map(x=>x.id===updated.id?updated:x))
      if (selectedMessage?.id===updated.id) setSelectedMessage(updated)
    } catch {}
  }

  function openGallery() {
    requestAnimationFrame(()=>document.getElementById('galleryWorkspace')?.scrollIntoView({behavior:'smooth',block:'start'}))
  }

  function openAdmin() {
    if (tableGuest) return
    setPin('')
    setPinError(false)
    setShowAdminGate(true)
  }

  function submitAdmin(e) {
    e.preventDefault()
    const current = localStorage.getItem('voicemento_admin_pin') || DEFAULT_ADMIN_PIN
    if (pin === current) {
      setShowAdminGate(false)
      setView('admin')
      setPin('')
    } else {
      setPinError(true)
      setPin('')
    }
  }

  function saveAdminPin() {
    const clean = adminPinDraft.replace(/\D/g,'').slice(0,8)
    if (clean.length < 4) return
    localStorage.setItem('voicemento_admin_pin', clean)
    setAdminPinDraft(clean)
    setPinSaved(true)
    setTimeout(() => setPinSaved(false), 1500)
  }

  function resetGuestSession() {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      try { mediaRecorderRef.current.stop() } catch {}
    }
    stopStream(streamRef, videoPreviewRef)
    setGuestName('')
    setBoothStep('choose')
    setMode(null)
    setRecording(false)
    setPreparing(false)
    setSeconds(0)
    setCountdown(0)
    setRecordError('')
    setPending(null)
    setAttachedPhoto(null)
    setPhotoShots([])
    setPhotoCount(1)
    setNoteText('')
  }

  function exitToEntrance() {
    if (entranceTimerRef.current) clearTimeout(entranceTimerRef.current)
    if (arrivalTimerRef.current) clearTimeout(arrivalTimerRef.current)
    entranceTimerRef.current = null
    arrivalTimerRef.current = null
    setEntering(false)
    setBoothZoomStyle(null)
    setArrivalPhoneScale(null)
    resetGuestSession()
    setLastGuestItem(null)
    setGuestShareStatus('')
    setCloudSaveStatus('idle')
    setCloudSaveError('')
    setView(tableGuest ? 'booth' : 'entrance')
  }

  function enterBooth(e) {
    if (entering) return

    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    if (reduceMotion) {
      resetGuestSession()
      setArrivalPhoneScale(null)
      setView('booth')
      return
    }

    // Start with a small, realistically sized telephone in the booth,
    // then move straight toward it until it takes up most of the viewport.
    // Actual measurements keep the phone centered across booth sizes and devices.
    const booth = e.currentTarget.querySelector('.phoneBooth')
    const phone = booth?.querySelector('.boothInterior .vintagePhone')
    let nextZoom = null

    if (booth && phone) {
      const boothRect = booth.getBoundingClientRect()
      const phoneRect = phone.getBoundingClientRect()
      const phoneCenterX = phoneRect.left + phoneRect.width / 2
      const phoneCenterY = phoneRect.top + phoneRect.height / 2
      const boothCenterX = boothRect.left + boothRect.width / 2
      const boothCenterY = boothRect.top + boothRect.height / 2

      // Fill the available width on a portrait phone, or about 80% of the
      // screen height on wide/landscape screens without cutting off the receiver.
      const viewportWidth = window.innerWidth
      const viewportHeight = window.innerHeight
      const phoneAspect = phoneRect.width / Math.max(1, phoneRect.height)
      const phoneTargetWidth = Math.min(
        viewportWidth * 0.92,
        viewportHeight * 0.80 * phoneAspect
      )
      const zoomFactor = Math.max(1, Math.min(14, phoneTargetWidth / Math.max(1, phoneRect.width)))
      const panX = viewportWidth / 2 - (boothCenterX + (phoneCenterX - boothCenterX) * zoomFactor)
      const panY = viewportHeight / 2 - (boothCenterY + (phoneCenterY - boothCenterY) * zoomFactor)
      setArrivalPhoneScale(Math.min(14, phoneTargetWidth / 190))

      nextZoom = {
        '--booth-zoom-factor': zoomFactor,
        '--booth-pan-x': panX + 'px',
        '--booth-pan-y': panY + 'px'
      }
    }

    setBoothZoomStyle(nextZoom)
    setEntering(true)
    entranceTimerRef.current = setTimeout(() => {
      resetGuestSession()
      setView('booth')
      setEntering(false)
      setBoothZoomStyle(null)
      entranceTimerRef.current = null
      arrivalTimerRef.current = setTimeout(() => {
        setArrivalPhoneScale(null)
        arrivalTimerRef.current = null
      }, 950)
    }, BOOTH_ENTRY_MS)
  }

  async function runCountdown() {
    for (const n of [3,2,1]) {
      setCountdown(n)
      await new Promise(r => setTimeout(r, 750))
    }
    setCountdown(0)
  }

  async function beginMedia(type) {
    setMode(type)
    setRecordError('')
    setPreparing(true)
    setSeconds(0)
    setBoothStep('record')
    try {
      if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === 'undefined') {
        throw new Error('Recording is not supported on this device.')
      }
      const constraints = type === 'video'
        ? { audio:true, video:{ facingMode:'user', width:{ideal:854}, height:{ideal:480} } }
        : { audio:true }
      const stream = await navigator.mediaDevices.getUserMedia(constraints)
      streamRef.current = stream
      if (type === 'video' && videoPreviewRef.current) {
        videoPreviewRef.current.srcObject = stream
        videoPreviewRef.current.muted = true
        await videoPreviewRef.current.play().catch(() => {})
        await runCountdown()
      }
      const mime = bestMime(type)
      const options={audioBitsPerSecond:64000,...(type==='video'?{videoBitsPerSecond:850000}:{})}
      if (mime) options.mimeType=mime
      const recorder=new MediaRecorder(stream,options)
      mediaRecorderRef.current = recorder
      chunksRef.current = []
      recorder.ondataavailable = e => { if (e.data && e.data.size) chunksRef.current.push(e.data) }
      recorder.onerror = () => {
        if (recordLimitRef.current) clearTimeout(recordLimitRef.current)
        recordLimitRef.current=null
        setRecordError('The recording stopped unexpectedly. Please try again.')
        setRecording(false)
        setPreparing(false)
        stopStream(streamRef, videoPreviewRef)
      }
      recorder.onstop = () => {
        if (recordLimitRef.current) clearTimeout(recordLimitRef.current)
        recordLimitRef.current=null
        const duration = Math.max(1,Math.min(MAX_RECORD_SECONDS,Math.round((Date.now()-startedAtRef.current)/1000)))
        const blob = new Blob(chunksRef.current,{type:recorder.mimeType || (type==='video'?'video/mp4':'audio/mp4')})
        stopStream(streamRef, videoPreviewRef)
        if (!blob.size) {
          setRecordError('No media was captured. Check permissions and try again.')
          setBoothStep('choose')
          return
        }
        setPending({
          type,
          blob,
          url:URL.createObjectURL(blob),
          duration,
          time:new Date().toLocaleTimeString([],{hour:'2-digit',minute:'2-digit'})
        })
        setBoothStep('review')
      }
      startedAtRef.current = Date.now()
      recorder.start(250)
      recordLimitRef.current=setTimeout(()=>finishMedia(),MAX_RECORD_SECONDS*1000)
      setRecording(true)
      setPreparing(false)
    } catch (err) {
      stopStream(streamRef, videoPreviewRef)
      setRecording(false)
      setPreparing(false)
      setBoothStep('choose')
      if (err && err.name === 'NotAllowedError') setRecordError('Camera or microphone permission was denied. Allow access in Safari Settings and try again.')
      else setRecordError((err && err.message) || 'Unable to start.')
    }
  }

  function finishMedia() {
    if (recordLimitRef.current) clearTimeout(recordLimitRef.current)
    recordLimitRef.current=null
    setSeconds(Math.min(MAX_RECORD_SECONDS,Math.floor((Date.now()-startedAtRef.current)/1000)))
    setRecording(false)
    const recorder = mediaRecorderRef.current
    if (recorder && recorder.state !== 'inactive') recorder.stop()
  }

  async function openPhotoCapture(count, asAttachment) {
    setMode(asAttachment ? 'attachment' : 'photo')
    setPhotoCount(count || 1)
    setPhotoShots([])
    setRecordError('')
    setBoothStep('photo')
    setPreparing(true)
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio:false,
        video:{ facingMode:cameraFacing, width:{ideal:1280}, height:{ideal:960} }
      })
      streamRef.current = stream
      if (videoPreviewRef.current) {
        videoPreviewRef.current.srcObject = stream
        videoPreviewRef.current.muted = true
        await videoPreviewRef.current.play().catch(() => {})
      }
      setPreparing(false)
    } catch (err) {
      setPreparing(false)
      setBoothStep(asAttachment ? 'review' : 'choose')
      setRecordError(err && err.name === 'NotAllowedError' ? 'Camera permission was denied.' : 'Unable to open the camera.')
    }
  }

  async function switchCamera() {
    const next = cameraFacing === 'user' ? 'environment' : 'user'
    setCameraFacing(next)
    stopStream(streamRef, videoPreviewRef)
    setPreparing(true)
    try {
      const stream = await navigator.mediaDevices.getUserMedia({video:{facingMode:next},audio:false})
      streamRef.current = stream
      if (videoPreviewRef.current) {
        videoPreviewRef.current.srcObject = stream
        videoPreviewRef.current.muted = true
        await videoPreviewRef.current.play().catch(() => {})
      }
    } catch {
      setRecordError('Could not switch cameras.')
    } finally {
      setPreparing(false)
    }
  }

  function canvasBlob(canvas, quality) {
    return new Promise(resolve => canvas.toBlob(resolve,'image/jpeg',quality || .9))
  }

  async function captureFrame() {
    await runCountdown()
    const video = videoPreviewRef.current
    if (!video || !video.videoWidth) return
    const maxW = 960
    const scale = Math.min(1,maxW/video.videoWidth)
    const canvas = document.createElement('canvas')
    canvas.width = Math.round(video.videoWidth*scale)
    canvas.height = Math.round(video.videoHeight*scale)
    const ctx = canvas.getContext('2d')
    if (cameraFacing === 'user') {
      ctx.translate(canvas.width,0)
      ctx.scale(-1,1)
    }
    ctx.drawImage(video,0,0,canvas.width,canvas.height)
    const blob = await canvasBlob(canvas,.88)
    const next = [...photoShots,blob]
    setPhotoShots(next)
    if (next.length >= photoCount) {
      stopStream(streamRef, videoPreviewRef)
      const rawBlob = photoCount === 1 ? next[0] : await buildStrip(next)
      const finalBlob = await applyPhotoFrame(rawBlob)
      const url = URL.createObjectURL(finalBlob)
      if (mode === 'attachment') {
        setAttachedPhoto({blob:finalBlob,url})
        setBoothStep('review')
      } else {
        setPending({
          type:'photo',
          blob:finalBlob,
          url,
          duration:0,
          photoCount,
          time:new Date().toLocaleTimeString([],{hour:'2-digit',minute:'2-digit'})
        })
        setBoothStep('review')
      }
    }
  }

  async function applyPhotoFrame(blob) {
    if (!blob || event.frame==='none') return blob
    const img=await new Promise(resolve=>{
      const x=new Image()
      x.onload=()=>resolve(x)
      x.src=URL.createObjectURL(blob)
    })
    const canvas=document.createElement('canvas')
    canvas.width=img.width
    canvas.height=img.height
    const ctx=canvas.getContext('2d')
    ctx.drawImage(img,0,0)
    const w=canvas.width,h=canvas.height
    if (event.frame==='vintage') {
      ctx.fillStyle='rgba(116,82,48,.12)'
      ctx.fillRect(0,0,w,h)
      ctx.strokeStyle='#8f6849';ctx.lineWidth=Math.max(12,w*.018);ctx.strokeRect(10,10,w-20,h-20)
    } else if (event.frame==='blacktie') {
      ctx.strokeStyle='#161414';ctx.lineWidth=Math.max(28,w*.035);ctx.strokeRect(0,0,w,h)
      ctx.strokeStyle='#c6a15d';ctx.lineWidth=Math.max(5,w*.007);ctx.strokeRect(22,22,w-44,h-44)
    } else if (event.frame==='gold') {
      ctx.strokeStyle='#c6a15d';ctx.lineWidth=Math.max(18,w*.024);ctx.strokeRect(10,10,w-20,h-20)
      ctx.strokeStyle='rgba(255,255,255,.8)';ctx.lineWidth=3;ctx.strokeRect(28,28,w-56,h-56)
    } else if (event.frame==='floral') {
      ctx.strokeStyle=event.accent;ctx.lineWidth=Math.max(12,w*.018);ctx.strokeRect(10,10,w-20,h-20)
      ctx.fillStyle=event.accent
      ;[[34,34],[w-34,34],[34,h-34],[w-34,h-34]].forEach(([x,y])=>{
        for(let i=0;i<5;i++){ctx.beginPath();ctx.arc(x+Math.cos(i*1.256)*12,y+Math.sin(i*1.256)*12,7,0,Math.PI*2);ctx.fill()}
      })
    } else if (event.frame==='polaroid') {
      ctx.fillStyle='rgba(255,255,255,.94)'
      ctx.fillRect(0,0,w,Math.max(18,h*.035));ctx.fillRect(0,0,Math.max(18,w*.035),h);ctx.fillRect(w-Math.max(18,w*.035),0,Math.max(18,w*.035),h);ctx.fillRect(0,h-Math.max(56,h*.09),w,Math.max(56,h*.09))
      ctx.fillStyle='#574b43';ctx.textAlign='center';ctx.font=Math.max(18,w*.03)+'px Georgia';ctx.fillText(event.title,w/2,h-Math.max(20,h*.035))
    }
    return await canvasBlob(canvas,.9)
  }

  async function buildStrip(blobs) {
    const images = await Promise.all(blobs.map(blob => new Promise(resolve => {
      const img = new Image()
      img.onload = () => resolve(img)
      img.src = URL.createObjectURL(blob)
    })))
    const width = 720
    const gap = 18
    const pad = 28
    const frameH = 540
    const canvas = document.createElement('canvas')
    canvas.width = width + pad*2
    canvas.height = pad*2 + images.length*frameH + (images.length-1)*gap + 100
    const ctx = canvas.getContext('2d')
    ctx.fillStyle = '#fffaf4'
    ctx.fillRect(0,0,canvas.width,canvas.height)
    images.forEach((img,i) => {
      const y = pad + i*(frameH+gap)
      const scale = Math.max(width/img.width,frameH/img.height)
      const dw = img.width*scale
      const dh = img.height*scale
      ctx.save()
      ctx.beginPath()
      ctx.rect(pad,y,width,frameH)
      ctx.clip()
      ctx.drawImage(img,pad+(width-dw)/2,y+(frameH-dh)/2,dw,dh)
      ctx.restore()
    })
    ctx.fillStyle = '#8e6d56'
    ctx.textAlign = 'center'
    ctx.font = '32px Georgia'
    ctx.fillText(event.title,canvas.width/2,canvas.height-58)
    ctx.font = '18px Georgia'
    ctx.fillText(event.subtitle,canvas.width/2,canvas.height-26)
    return await canvasBlob(canvas,.9)
  }

  function startNote() {
    setMode('note')
    setNoteText('')
    setPending(null)
    setBoothStep('note')
  }

  function reviewNote() {
    if (!noteText.trim()) return
    setPending({
      type:'note',
      note:noteText.trim(),
      duration:0,
      time:new Date().toLocaleTimeString([],{hour:'2-digit',minute:'2-digit'})
    })
    setBoothStep('review')
  }

  function retake() {
    if (pending && pending.url) URL.revokeObjectURL(pending.url)
    setPending(null)
    setAttachedPhoto(null)
    setRecordError('')
    if (mode === 'audio' || mode === 'video') beginMedia(mode)
    else if (mode === 'photo') openPhotoCapture(photoCount,false)
    else if (mode === 'note') setBoothStep('note')
    else setBoothStep('choose')
  }

  async function savePending() {
    if (!pending) return
    const item = {
      id:Date.now(),
      type:pending.type,
      guest:(guestName || '').trim() || 'Guest ' + (messages.length+1),
      time:pending.time,
      duration:pending.duration || 0,
      blob:pending.type === 'note' ? null : pending.blob,
      note:pending.note || null,
      photoBlob:attachedPhoto ? attachedPhoto.blob : (pending.type === 'photo' ? pending.blob : null),
      photoCount:pending.photoCount || 0,
      createdAt:new Date().toISOString(),
      approved:false,
      favorite:false
    }
    try {
      await dbPut(item)
      setMessages(prev => [hydrateItem(item),...prev])
      setLastGuestItem(item)
      setGuestShareStatus('')
      setBoothStep('saved')
      if(validCloudEvent(cloudConfig)) {
        await uploadSavedMemory(item)
      }else setCloudSaveStatus('idle')
    } catch {
      setRecordError('This message was captured but could not be saved on this device.')
    }
  }



  function updateCloudConfig(field,value) {
    setCloudConfig(previous=>{
      const next={...previous,[field]:value.trim()}
      localStorage.setItem('voicemento_cloud_config',JSON.stringify(next))
      return next
    })
    setCloudStatus('')
  }

  async function signInCloud() {
    if(!cloud) {setCloudStatus('Enter your project URL and publishable key first.');return}
    setCloudStatus('Signing in…')
    try {
      const {data,error}=await cloud.auth.signInWithPassword({email:cloudEmail.trim(),password:cloudPassword})
      if(error) throw error
      setCloudUser(data.user||null)
      setCloudPassword('')
      setCloudStatus('Cloud account connected.')
    }catch(error){setCloudStatus(error.message||'Could not sign in.')}
  }

  async function createCloudEvent() {
    if(!cloud||!cloudUser)return setCloudStatus('Sign in to your cloud account first.')
    setCloudStatus('Creating a private cloud event…')
    try {
      const {data,error}=await cloud.from('voicemento_events')
        .insert({title:(event.title||'VoiceMento').slice(0,120)})
        .select('id,guest_code').single()
      if(error)throw error
      const next={...cloudConfig,eventId:data.id,guestCode:data.guest_code}
      setCloudConfig(next)
      localStorage.setItem('voicemento_cloud_config',JSON.stringify(next))
      setCloudStatus('Cloud event ready. Download a NEW QR card so guests can upload directly.')
      setCloudItems([])
    }catch(error){setCloudStatus(error.message||'Could not create an event. Run the SQL setup first.')}
  }

  async function refreshCloudGallery() {
    if(!cloud||!cloudUser||!validCloudEvent(cloudConfig))return setCloudGalleryStatus('Connect and sign in to your cloud event first.')
    setCloudGalleryBusy(true)
    setCloudGalleryStatus('Loading your private cloud gallery…')
    try{
      const list=await fetchCloudMemories(cloud,cloudConfig)
      setCloudItems(list)
      setCloudGalleryStatus(list.length+' cloud '+(list.length===1?'memory':'memories')+' loaded.')
    }catch(error){setCloudGalleryStatus(error.message||'Could not load the cloud gallery.')}
    finally{setCloudGalleryBusy(false)}
  }

  async function toggleCloudApproval(item) {
    if(!cloud||!cloudUser)return
    const {error}=await cloud.from('voicemento_memories')
      .update({approved:!item.approved}).eq('id',item.id).eq('event_id',cloudConfig.eventId)
    if(error){setCloudGalleryStatus(error.message);return}
    setCloudItems(old=>old.map(x=>x.id===item.id?{...x,approved:!item.approved}:x))
  }

  async function uploadSavedMemory(item) {
    if(!validCloudEvent(cloudConfig)||!cloud)return false
    setCloudSaveStatus('uploading')
    setCloudSaveError('')
    try {
      await uploadCloudMemory(cloud,cloudConfig,item)
      setCloudSaveStatus('uploaded')
      return true
    } catch (error) {
      setCloudSaveStatus('error')
      setCloudSaveError((error?.message||'Cloud upload failed')+' Your on-device copy was preserved.')
      return false
    }
  }

  async function retryCloudSave() {
    if(lastGuestItem)await uploadSavedMemory(lastGuestItem)
  }

  function downloadGuestCopy() {
    const files=guestShareFiles(lastGuestItem)
    if (!files.length) return
    for (const file of files) {
      const objectUrl=URL.createObjectURL(file)
      const link=document.createElement('a')
      link.href=objectUrl
      link.download=file.name
      document.body.appendChild(link)
      link.click()
      link.remove()
      setTimeout(()=>URL.revokeObjectURL(objectUrl),30000)
    }
    setGuestShareStatus('A copy was downloaded. Please send it to the event host.')
  }

  async function shareGuestMemory() {
    const files=guestShareFiles(lastGuestItem)
    if (!files.length) return
    try {
      if (navigator.share && (!navigator.canShare || navigator.canShare({files}))) {
        await navigator.share({title:'VoiceMento memory',text:'A memory from '+event.title+' — '+lastGuestItem.guest,files})
        setGuestShareStatus('Sent through your phone’s share menu. Confirm the host received it.')
      } else downloadGuestCopy()
    } catch (error) {
      if (error?.name!=='AbortError') setGuestShareStatus('Sharing failed. Please download a copy instead.')
    }
  }

  async function copyTableGuestLink() {
    if (!tableGuestUrl) return
    try {
      await navigator.clipboard.writeText(tableGuestUrl)
      setTableQrStatus('Link copied')
    } catch {
      setTableQrStatus('Select and copy the link below')
    }
  }

  function removeAttachment() {
    if (attachedPhoto && attachedPhoto.url) URL.revokeObjectURL(attachedPhoto.url)
    setAttachedPhoto(null)
  }

  const activePhone=getPhoneConfig(event)
  const activeBoothStyle=getBoothStyle(event)

  if (view === 'entrance') {
    return (
      <main className={'weddingEntrance theme-' + event.theme + ' ambience-' + event.ambience + ' intensity-' + event.ambienceIntensity + (entering?' entering':'')} style={{'--accent':event.accent,...(event.backgroundData?{backgroundImage:'linear-gradient(rgba(250,246,241,.72),rgba(240,230,221,.82)),url("'+event.backgroundData+'")',backgroundSize:'cover',backgroundPosition:'center'}:{})}}>
        <div className="paperTexture"/>
        <Atmosphere type={event.ambience} intensity={event.ambienceIntensity}/>
        <button className="adminLock" onClick={openAdmin}><LockKeyhole size={16}/> Admin</button>
        <section className="entranceCopy">
          <div className="monogram customMonogram">{event.logoData?<img src={event.logoData} alt="Event logo"/>:<span>{event.monogram}</span>}</div>
          <p className="scriptLine">{event.welcomeText}</p>
          <h1>{event.title}</h1>
          <div className="ornament"><span/><Sparkles size={16}/><span/></div>
          <p className="eventDate">{event.subtitle}</p>
          <p className="entranceHint">Tap the booth and leave a memory for the happy couple.</p>
          {event.hashtag&&<p className="eventHashtag">{event.hashtag}</p>}
          {event.privacy==='guests'&&messages.some(m=>m.approved)&&<button className="guestGalleryButton" onClick={()=>setView('guestGallery')}><Images size={17}/> View event gallery</button>}
        </section>
        <button className="boothStage" onClick={enterBooth} style={boothZoomStyle||undefined} aria-label="Enter VoiceMento">
          <span className="floorShadow"/><span className="boothGlow"/>
          <BoothModel event={event} phone={activePhone}/>
          <span className="tapLabel">{entering?'Come on in…':'Tap the booth to enter'}</span>
        </button>
        <p className="poweredBy">VOICEMENTO · DIGITAL EVENT GUESTBOOK</p>
        <AdminGate open={showAdminGate} onClose={()=>setShowAdminGate(false)} pin={pin} setPin={setPin} error={pinError} setError={setPinError} onSubmit={submitAdmin}/>
      </main>
    )
  }

  if (view === 'guestGallery') {
    const approved=messages.filter(m=>m.approved)
    return (
      <main className={'guestGalleryScreen theme-'+event.theme} style={{'--accent':event.accent}}>
        <Atmosphere type={event.ambience} intensity="subtle" subtle/>
        <button className="guestExit" onClick={()=>setView('entrance')}><ChevronLeft size={19}/> Back</button>
        <header className="guestGalleryHeader">
          <p className="tinyLabel">THEIR STORY SO FAR</p>
          <h1>{event.title}</h1>
          <p>{event.hashtag}</p>
        </header>
        <div className="guestGalleryGrid">
          {approved.filter(m=>m.type==='photo'||m.photoUrl).map(m=><button key={m.id} className="guestGalleryTile" onClick={()=>setSelectedMessage(m)}><img src={m.photoUrl||m.url} alt={m.guest}/><span>{m.guest}</span></button>)}
          {approved.filter(m=>m.type==='note').map(m=><button key={m.id} className="guestNoteTile" onClick={()=>setSelectedMessage(m)}><FileText/><strong>{m.guest}</strong><span>{m.note}</span></button>)}
        </div>
        {approved.length===0&&<div className="guestGalleryEmpty"><Heart/><h2>The gallery is waiting for its first approved memory.</h2></div>}
        {selectedMessage&&<MemoryViewer message={selectedMessage} onClose={()=>setSelectedMessage(null)}/>}
      </main>
    )
  }

  if (view === 'booth') {
    return (
      <main className={'boothExperience theme-' + event.theme + ' ambience-' + event.ambience + ' intensity-' + event.ambienceIntensity + (arrivalPhoneScale ? ' boothJustArrived' : '')} style={{'--accent':event.accent,...(event.backgroundData?{backgroundImage:'linear-gradient(rgba(250,246,241,.82),rgba(240,230,221,.9)),url("'+event.backgroundData+'")',backgroundSize:'cover',backgroundPosition:'center'}:{})}}>
        <Atmosphere type={event.ambience} intensity={event.ambienceIntensity} subtle/>
        <div className="floralCorner floralTop"/><div className="floralCorner floralBottom"/>
        {arrivalPhoneScale && (
          <div className="boothArrivalOverlay" aria-hidden="true" style={{
            '--arrival-phone-scale':arrivalPhoneScale,
            '--booth-inside':(event.booth||DEFAULT_EVENT.booth).interior
          }}>
            <VintagePhone config={activePhone}/>
          </div>
        )}
        <button className="guestExit" onClick={exitToEntrance}><ChevronLeft size={19}/> {tableGuest?'Start over':'Exit booth'}</button>
        {!tableGuest && <button className="adminLock boothAdmin" onClick={openAdmin}><LockKeyhole size={16}/> Admin</button>}

        <section className="phaseCard">
          <div className="cardMonogram customCardMonogram">{event.logoData?<img src={event.logoData} alt="Event logo"/>:event.monogram}</div>
          <p className="tinyLabel">A MEMORY FOR</p>
          <h1>{event.title}</h1>

          {boothStep === 'choose' && (
            <>
              <div className="openedBoothPhone boothInteriorDisplay" style={{
                '--booth-panel':(event.booth||DEFAULT_EVENT.booth).panel,
                '--booth-metal':(event.booth||DEFAULT_EVENT.booth).trim,
                '--booth-inside':(event.booth||DEFAULT_EVENT.booth).interior
              }}>
                <BoothAlcove phone={activePhone} ringing/>
              </div>
              <p className="phasePrompt">Pick up a memory and leave something they’ll keep forever.</p>
              {event.greetingData&&<button className="greetingButton" onClick={()=>new Audio(event.greetingData).play().catch(()=>{})}><Volume2 size={17}/> Hear a welcome from the hosts</button>}
              <input className="guestNameInput" value={guestName} onChange={e=>setGuestName(e.target.value)} placeholder="Your name(s) — optional"/>
              <div className="memoryChoices">
                {event.features.audio&&<button onClick={()=>beginMedia('audio')}><Mic/><strong>Voice</strong><span>Leave a heartfelt message</span></button>}
                {event.features.video&&<button onClick={()=>beginMedia('video')}><Video/><strong>Video</strong><span>Record a video message</span></button>}
                {event.features.photo&&<button onClick={()=>openPhotoCapture(1,false)}><Camera/><strong>Photo Booth</strong><span>Single photo or photo strip</span></button>}
                {event.features.note&&<button onClick={startNote}><FileText/><strong>Written Note</strong><span>Write something they can keep</span></button>}
              </div>
              {recordError && <p className="recordError">{recordError}</p>}
            </>
          )}

          {boothStep === 'record' && (
            <>
              <p className="phasePrompt">{mode==='video'?'Look into the camera and speak from the heart.':'Speak into the receiver — we’re listening.'}</p>
              {mode==='audio' && <div className="recordingPhoneWrap"><VintagePhone active config={activePhone}/></div>}
              {mode==='video' && <div className="capturePreview"><video ref={videoPreviewRef} muted playsInline/></div>}
              {countdown>0 && <div className="bigCountdown">{countdown}</div>}
              <div className={recording?'timer recording':'timer'}>{String(Math.floor(seconds/60)).padStart(2,'0')}:{String(seconds%60).padStart(2,'0')} / 03:00</div>
              <p className="helper">Maximum recording length: 3 minutes. Recording stops automatically.</p>
              {preparing && <p className="helper">Preparing camera…</p>}
              {recording && <button className="stopBtn" onClick={finishMedia}><Square size={20} fill="currentColor"/> Finish message</button>}
              {recordError && <p className="recordError">{recordError}</p>}
            </>
          )}

          {boothStep === 'photo' && (
            <>
              <p className="phasePrompt">{mode==='attachment'?'Add a photo to your message':'Photo Booth · ' + photoShots.length + ' of ' + photoCount + ' captured'}</p>
              <div className="capturePreview">
                <video ref={videoPreviewRef} muted playsInline/>
                {countdown>0 && <div className="bigCountdown">{countdown}</div>}
              </div>
              <div className="captureActions">
                <button className="secondary" onClick={switchCamera}><SwitchCamera size={18}/> Flip camera</button>
                <button className="recordBtn" onClick={captureFrame} disabled={preparing}><Camera size={20}/> {photoShots.length+1 < photoCount?'Take next photo':'Take photo'}</button>
              </div>
              {recordError && <p className="recordError">{recordError}</p>}
            </>
          )}

          {boothStep === 'note' && (
            <>
              <p className="phasePrompt">Write a note they can revisit for years.</p>
              <textarea className="noteComposer" value={noteText} onChange={e=>setNoteText(e.target.value)} maxLength={1200} placeholder="Write your message here…"/>
              <div className="noteCount">{noteText.length}/1200</div>
              <button className="recordBtn" onClick={reviewNote} disabled={!noteText.trim()}><Eye size={19}/> Review note</button>
            </>
          )}

          {boothStep === 'review' && pending && (
            <>
              <p className="phasePrompt">Review your memory before saving it.</p>
              <div className="reviewMedia">
                {pending.type==='audio' && <audio src={pending.url} controls/>}
                {pending.type==='video' && <video src={pending.url} controls playsInline/>}
                {pending.type==='photo' && <img src={pending.url} alt="Photo booth preview"/>}
                {pending.type==='note' && <div className="noteReview">“{pending.note}”</div>}
              </div>

              {event.features.photo && (pending.type==='audio' || pending.type==='video') && (
                <div className="photoAttachment">
                  {attachedPhoto ? (
                    <div className="attachedPreview">
                      <img src={attachedPhoto.url} alt="Attached guest photo"/>
                      <button onClick={removeAttachment}><X size={16}/> Remove photo</button>
                    </div>
                  ) : (
                    <button className="secondary addPhotoBtn" onClick={()=>openPhotoCapture(1,true)}><Camera size={18}/> Add a photo to this message</button>
                  )}
                </div>
              )}

              <div className="reviewActions">
                <button className="secondary" onClick={retake}><RotateCcw size={18}/> Retake</button>
                <button className="recordBtn" onClick={savePending}><Save size={19}/> Keep it</button>
              </div>
            </>
          )}

          {boothStep === 'saved' && (
            <div className="savedMoment">
              <CheckCircle2 size={48}/>
              <h2>{cloudSaveStatus==='uploaded'?'Your memory is in the cloud':tableGuest?'Your memory is ready to send':'Added to their story.'}</h2>
              {cloudSaveStatus==='uploading' && <p>Uploading your memory to the private cloud. Keep this page open until it finishes.</p>}
              {cloudSaveStatus==='uploaded' && <p>Your memory is saved on this device and uploaded to the event's private cloud gallery.</p>}
              {cloudSaveStatus==='error' && (
                <>
                  <p className="recordError">{cloudSaveError}</p>
                  <button className="recordBtn" onClick={retryCloudSave}><Upload size={18}/> Retry cloud upload</button>
                </>
              )}
              {tableGuest ? (
                <>
                  {cloudSaveStatus==='idle' && <p>Your memory is saved on this phone only. Use Share to send it to the event host.</p>}
                  {cloudSaveStatus!=='uploaded' && <button className="recordBtn" onClick={shareGuestMemory}><Upload size={18}/> Share memory with host</button>}
                  <button className="secondary" onClick={downloadGuestCopy}><Download size={18}/> Save a copy</button>
                  {guestShareStatus && <p className="securityNote">{guestShareStatus}</p>}
                  <button className="secondary" onClick={exitToEntrance}><RotateCcw size={18}/> Leave another memory</button>
                </>
              ) : (
                <>
                  <p>{event.thankYouText}{guestName.trim()?' — '+guestName.trim():''}{cloudSaveStatus==='idle'?' Returning to the booth in '+resetCountdown+'s.':''}</p>
                  <button className="secondary" onClick={exitToEntrance}><SkipForward size={18}/> Done</button>
                </>
              )}
            </div>
          )}

          {boothStep==='choose' && event.features.photo && (
            <div className="photoStripPicker">
              <span>Photo Booth style:</span>
              {[1,3,4].map(n=><button key={n} className={photoCount===n?'active':''} onClick={()=>setPhotoCount(n)}>{n===1?'Single':n+'-Photo Strip'}</button>)}
              {photoCount!==1 && <button className="secondary compact" onClick={()=>openPhotoCapture(photoCount,false)}>Start {photoCount}-photo strip</button>}
            </div>
          )}
        </section>
        <AdminGate open={showAdminGate} onClose={()=>setShowAdminGate(false)} pin={pin} setPin={setPin} error={pinError} setError={setPinError} onSubmit={submitAdmin}/>
      </main>
    )
  }

  return (
    <main className="appShell">
      <aside className="sidebar">
        <div className="brand"><div className="brandMark"><Phone size={23}/></div><div><strong>VoiceMento</strong><span>Events</span></div></div>
        <nav>
          <button className="nav active" onClick={()=>window.scrollTo({top:0,behavior:'smooth'})}><CalendarDays size={20}/> Event</button>
          <button className="nav" onClick={openGallery}><Images size={20}/> Gallery</button>
          <button className="nav" onClick={()=>document.getElementById('tableQrPanel')?.scrollIntoView({behavior:'smooth',block:'start'})}><Users size={20}/> Guests & QR</button>
          <button className="nav"><Settings size={20}/> Settings</button>
        </nav>
        <button className="lockOut" onClick={()=>setView('entrance')}><LogOut size={18}/> Lock admin</button>
      </aside>

      <section className="content">
        <header>
          <div><div className="eyebrow">EVENT DASHBOARD</div><h1>{event.title}</h1><p>{event.subtitle}</p></div>
          <button className="launch" onClick={()=>setView('entrance')}><Play size={18} fill="currentColor"/> Preview guest experience</button>
        </header>

        <section className="panel tableQrPanel" id="tableQrPanel">
          <div className="panelHead"><div><span>Table QR code</span><small>Guests scan at their table to open VoiceMento directly</small></div><QrCode size={22}/></div>
          <div className="tableQrLayout">
            <div className="tableQrPrintCard" id="tableQrPrintCard" style={{'--qr-accent':event.accent}}>
              <p className="tableQrEyebrow">A MEMORY TO KEEP</p>
              <h2>{event.title}</h2>
              <p className="tableQrSubtitle">{event.subtitle}</p>
              <div className="tableQrImageBox">{tableQrDataUrl?<img src={tableQrDataUrl} alt="QR code linking to the guest recording page"/>:<QrCode size={95} strokeWidth={1}/>}</div>
              <p className="tableQrAction">SCAN TO LEAVE A MEMORY</p>
              <p className="tableQrFooter">Voice · Video · Photos · Notes</p>
              <p className="tableQrBrand">VOICEMENTO</p>
            </div>
            <div className="tableQrControls">
              <h3>Place one at every table</h3>
              <p>Guests scan with their phone's camera and go straight to the recording screen—no booth animation required.</p>
              <div className="tableQrButtons">
                <button className="secondary" onClick={copyTableGuestLink}><QrCode size={17}/> Copy guest link</button>
                {tableQrDataUrl && <a className="secondary" href={tableQrDataUrl} download="VoiceMento-table-QR.png"><Download size={17}/> Download QR</a>}
                <button className="secondary" onClick={()=>window.print()} disabled={!tableQrDataUrl}><Download size={17}/> Print table card</button>
                {tableGuestUrl && <a className="secondary" href={tableGuestUrl} target="_blank" rel="noopener noreferrer"><Eye size={17}/> Test guest link</a>}
              </div>
              <label className="tableQrUrlLabel">Guest link<input readOnly value={tableGuestUrl} onFocus={e=>e.target.select()} onClick={e=>e.target.select()}/></label>
              {tableQrStatus && <p className="securityNote">{tableQrStatus}</p>}
              {tableQrError && <p className="recordError">{tableQrError}</p>}
              <p className="tableQrWarning"><strong>Important:</strong> VoiceMento currently stores recordings on the phone that made them. QR guests must use “Share memory with host” after recording. Automatic delivery to this admin gallery requires shared cloud storage, which is not configured yet.</p>
            </div>
          </div>
        </section>

        <div className="statsGrid phaseStats">
          <Stat icon={<Heart/>} label="All memories" value={stats.total}/>
          <Stat icon={<Mic/>} label="Voice" value={stats.audio}/>
          <Stat icon={<Video/>} label="Video" value={stats.video}/>
          <Stat icon={<Camera/>} label="Photos" value={stats.photo}/>
        </div>

        <div className="grid2">
          <section className="panel">
            <div className="panelHead"><div><span>Event styling</span><small>Customize what guests see</small></div><Settings size={20}/></div>
            <label>Couple / event name<input value={event.title} onChange={e=>saveEvent({...event,title:e.target.value})}/></label>
            <label>Date / subtitle<input value={event.subtitle} onChange={e=>saveEvent({...event,subtitle:e.target.value})}/></label>
            <label>Recording prompt<textarea value={event.prompt} onChange={e=>saveEvent({...event,prompt:e.target.value})}/></label>
            <label>Wedding accent<div className="colorRow"><input type="color" value={event.accent} onChange={e=>saveEvent({...event,accent:e.target.value})}/><span>{event.accent}</span></div></label>
          </section>

          <section className="panel">
            <div className="panelHead"><div><span>Atmosphere</span><small>Change the animated event ambience</small></div><Sparkles size={20}/></div>
            <label>Effect
              <select value={event.ambience} onChange={e=>saveEvent({...event,ambience:e.target.value})}>
                <option value="rose">Rose Petals</option>
                <option value="leaves">Autumn Leaves</option>
                <option value="blossoms">Cherry Blossoms</option>
                <option value="snow">Snow</option>
                <option value="confetti">Gold Confetti</option>
                <option value="sparkles">Sparkles</option>
                <option value="fireflies">Fireflies</option>
                <option value="none">None</option>
              </select>
            </label>
            <label>Intensity
              <div className="segmentControl">
                {['subtle','normal','festive'].map(x=><button key={x} className={event.ambienceIntensity===x?'active':''} onClick={()=>saveEvent({...event,ambienceIntensity:x})}>{x[0].toUpperCase()+x.slice(1)}</button>)}
              </div>
            </label>
            <div className={'ambienceDemo ambience-' + event.ambience + ' intensity-' + event.ambienceIntensity}><Atmosphere type={event.ambience} intensity={event.ambienceIntensity}/><span>Live preview</span></div>
          </section>
        </div>

        <div className="grid2 phase2Grid">
          <section className="panel">
            <div className="panelHead"><div><span>Theme preset</span><small>Change the entire event mood at once</small></div><Sparkles size={20}/></div>
            <div className="themePresetGrid">
              {Object.entries(THEME_PRESETS).map(([key,t])=><button key={key} className={event.theme===key?'themePreset active':'themePreset'} onClick={()=>applyTheme(key)}><i style={{background:t.accent}}/><span>{t.label}</span></button>)}
            </div>
            <label>Photo frame
              <select value={event.frame} onChange={e=>saveEvent({...event,frame:e.target.value})}>
                <option value="none">None</option><option value="floral">Floral</option><option value="gold">Gold</option><option value="polaroid">Polaroid</option><option value="vintage">Vintage Film</option><option value="blacktie">Black-Tie Gold</option>
              </select>
            </label>
          </section>

          <section className="panel">
            <div className="panelHead"><div><span>Guest experience copy</span><small>Personalize the words guests see</small></div><FileText size={20}/></div>
            <label>Welcome line<input value={event.welcomeText} onChange={e=>saveEvent({...event,welcomeText:e.target.value})}/></label>
            <label>Thank-you message<textarea value={event.thankYouText} onChange={e=>saveEvent({...event,thankYouText:e.target.value})}/></label>
            <label>Event hashtag<input value={event.hashtag} onChange={e=>saveEvent({...event,hashtag:e.target.value})}/></label>
            <label>Monogram<input maxLength={16} value={event.monogram} onChange={e=>saveEvent({...event,monogram:e.target.value})}/></label>
          </section>
        </div>

        <div className="grid2 phase2Grid phoneStyleRow">
          <section className="panel phoneStylePanel">
            <div className="panelHead"><div><span>Vintage telephone</span><small>Choose the colors and finish of the guestbook phone</small></div><Phone size={20}/></div>
            <button className={event.autoMatchTheme!==false?'autoMatchToggle active':'autoMatchToggle'} onClick={()=>saveEvent({...event,autoMatchTheme:event.autoMatchTheme===false})}>
              <span><Sparkles size={17}/> Auto-match phone to event theme</span><i/>
            </button>
            <div className="phoneStylePreview">
              <VintagePhone config={activePhone}/>
              <div>
                <strong>{event.autoMatchTheme!==false?'Theme-matched phone':'Custom phone'}</strong>
                <span>{BOOTH_STYLES[activeBoothStyle]}</span>
              </div>
            </div>
            <div className={event.autoMatchTheme!==false?'phoneControls disabled':'phoneControls'}>
              <label>Phone body color<div className="colorInputLine"><input type="color" value={(event.phone||DEFAULT_EVENT.phone).body} disabled={event.autoMatchTheme!==false} onChange={e=>saveEvent({...event,phone:{...DEFAULT_EVENT.phone,...event.phone,body:e.target.value}})}/><span>{(event.phone||DEFAULT_EVENT.phone).body}</span></div></label>
              <label>Handset color<div className="colorInputLine"><input type="color" value={(event.phone||DEFAULT_EVENT.phone).handset} disabled={event.autoMatchTheme!==false} onChange={e=>saveEvent({...event,phone:{...DEFAULT_EVENT.phone,...event.phone,handset:e.target.value}})}/><span>{(event.phone||DEFAULT_EVENT.phone).handset}</span></div></label>
              <label>Metal trim<div className="colorInputLine"><input type="color" value={(event.phone||DEFAULT_EVENT.phone).trim} disabled={event.autoMatchTheme!==false} onChange={e=>saveEvent({...event,phone:{...DEFAULT_EVENT.phone,...event.phone,trim:e.target.value}})}/><span>{(event.phone||DEFAULT_EVENT.phone).trim}</span></div></label>
              <label>Cord color<div className="colorInputLine"><input type="color" value={(event.phone||DEFAULT_EVENT.phone).cord} disabled={event.autoMatchTheme!==false} onChange={e=>saveEvent({...event,phone:{...DEFAULT_EVENT.phone,...event.phone,cord:e.target.value}})}/><span>{(event.phone||DEFAULT_EVENT.phone).cord}</span></div></label>
              <label>Phone finish
                <select disabled={event.autoMatchTheme!==false} value={(event.phone||DEFAULT_EVENT.phone).finish} onChange={e=>saveEvent({...event,phone:{...DEFAULT_EVENT.phone,...event.phone,finish:e.target.value}})}>
                  <option value="glossy">Glossy Enamel</option><option value="matte">Matte</option><option value="aged">Aged / Vintage</option>
                </select>
              </label>
            </div>
            <label>Phone plaque text<input maxLength={20} value={(event.phone||DEFAULT_EVENT.phone).plaque} onChange={e=>saveEvent({...event,phone:{...DEFAULT_EVENT.phone,...event.phone,plaque:e.target.value.toUpperCase()}})} /></label>
          </section>

          <section className="panel phoneSwatchPanel">
            <div className="panelHead"><div><span>Quick phone colors</span><small>Turn off Auto-match to use a preset</small></div><Sparkles size={20}/></div>
            <div className="phoneSwatches">
              {[
                ['Ivory','#D7B58C','#2A211D','#B58B6A'],
                ['Black','#191716','#0D0C0B','#C5A45F'],
                ['Burgundy','#7F3136','#2B1D1A','#B9915F'],
                ['Forest','#465A47','#202A22','#B89A65'],
                ['Navy','#273C59','#111B29','#C3A05A'],
                ['Blush','#D7A1B5','#654753','#C39A68'],
                ['Champagne','#CDB38E','#4C3B30','#B79463']
              ].map(([name,body,handset,trim])=><button key={name} disabled={event.autoMatchTheme!==false} onClick={()=>saveEvent({...event,phone:{...DEFAULT_EVENT.phone,...event.phone,body,handset,trim}})}><i style={{background:body}}/><span>{name}</span></button>)}
            </div>
            <p className="securityNote">Auto-match uses the current event theme. Custom colors stay saved with this event.</p>
          </section>
        </div>

        <section className="panel boothDesignerPanel">
          <div className="panelHead"><div><span>Booth designer</span><small>Customize the entrance separately from the telephone</small></div><Sparkles size={20}/></div>
          <div className="boothDesignerLayout">
            <div className="boothDesignerPreview">
              <div className="boothStage boothStagePreview" aria-label="Live preview of your booth">
                <BoothModel event={event} phone={activePhone}/>
              </div>
              <span>Live booth preview</span>
            </div>
            <div className="boothDesignerSettings">
              <button className={event.boothCustom?'autoMatchToggle active':'autoMatchToggle'} onClick={()=>saveEvent({...event,boothCustom:!event.boothCustom,boothStyle:activeBoothStyle})}>
                <span><Sparkles size={17}/> Enable custom booth colors</span><i/>
              </button>
              <label>Booth design
                <select value={activeBoothStyle} disabled={!event.boothCustom && event.autoMatchTheme!==false} onChange={e=>saveEvent({...event,boothStyle:e.target.value})}>
                  {Object.entries(BOOTH_STYLES).map(([key,label])=><option key={key} value={key}>{label}</option>)}
                </select>
              </label>
              <div className="boothColorGrid">
                {[
                  ['Panel color','panel'],
                  ['Frame & metal trim','trim'],
                  ['Interior color','interior']
                ].map(([label,key])=><label key={key}>{label}<div className="colorInputLine"><input type="color" value={(event.booth||DEFAULT_EVENT.booth)[key]} disabled={!event.boothCustom} onChange={e=>saveEvent({...event,booth:{...DEFAULT_EVENT.booth,...event.booth,[key]:e.target.value}})}/><span>{(event.booth||DEFAULT_EVENT.booth)[key]}</span></div></label>)}
              </div>
              <div className="boothCopyGrid">
                <label>Top sign<input maxLength={20} value={(event.booth||DEFAULT_EVENT.booth).sign} onChange={e=>saveEvent({...event,booth:{...DEFAULT_EVENT.booth,...event.booth,sign:e.target.value.toUpperCase()}})}/></label>
                <label>Inside sign<input maxLength={22} value={(event.booth||DEFAULT_EVENT.booth).caption} onChange={e=>saveEvent({...event,booth:{...DEFAULT_EVENT.booth,...event.booth,caption:e.target.value.toUpperCase()}})}/></label>
              </div>
              <label>Door design
                <select value={(event.booth||DEFAULT_EVENT.booth).door} onChange={e=>saveEvent({...event,booth:{...DEFAULT_EVENT.booth,...event.booth,door:e.target.value}})}>
                  <option value="glass">Classic glass panels</option><option value="arched">Arched glass panels</option><option value="private">Private frosted glass</option>
                </select>
              </label>
              <label className="boothSizeLabel">Booth size <strong>{(event.booth||DEFAULT_EVENT.booth).size}%</strong>
                <input type="range" min="100" max="126" step="2" value={(event.booth||DEFAULT_EVENT.booth).size} onChange={e=>saveEvent({...event,booth:{...DEFAULT_EVENT.booth,...event.booth,size:Number(e.target.value)}})}/>
                <span>A little larger by default; adjust to suit the screen.</span>
              </label>
              <p className="securityNote">Sign, door and size settings are always available. Enable custom colors to override the event theme for the booth only.</p>
            </div>
          </div>
        </section>

        <div className="grid2 phase2Grid">
          <section className="panel">
            <div className="panelHead"><div><span>Branding & media</span><small>Stored locally on this booth device</small></div><Upload size={20}/></div>
            <div className="assetButtons">
              <label className="uploadTile"><Upload size={18}/><span>{event.logoData?'Replace logo':'Upload logo'}</span><input type="file" accept="image/*" onChange={e=>handleAssetUpload(e,'logoData',750000)}/></label>
              <label className="uploadTile"><ImageIcon size={18}/><span>{event.backgroundData?'Replace background':'Upload background'}</span><input type="file" accept="image/*" onChange={e=>handleAssetUpload(e,'backgroundData',1500000)}/></label>
              <label className="uploadTile"><Volume2 size={18}/><span>{event.greetingData?'Replace greeting':'Upload greeting'}</span><input type="file" accept="audio/*" onChange={e=>handleAssetUpload(e,'greetingData',1500000)}/></label>
            </div>
            <div className="assetClearRow">
              {event.logoData&&<button className="secondary compact" onClick={()=>saveEvent({...event,logoData:''})}>Clear logo</button>}
              {event.backgroundData&&<button className="secondary compact" onClick={()=>saveEvent({...event,backgroundData:''})}>Clear background</button>}
              {event.greetingData&&<button className="secondary compact" onClick={()=>saveEvent({...event,greetingData:''})}>Clear greeting</button>}
            </div>
            {assetError&&<p className="recordError">{assetError}</p>}
          </section>

          <section className="panel">
            <div className="panelHead"><div><span>Privacy & package</span><small>Control what the event includes</small></div><LockKeyhole size={20}/></div>
            <label>Gallery privacy
              <select value={event.privacy} onChange={e=>saveEvent({...event,privacy:e.target.value})}>
                <option value="private">Private — admin only</option>
                <option value="after">Guest access after event</option>
                <option value="guests">Guest-viewable gallery</option>
              </select>
            </label>
            <label>Package
              <select value={event.package} onChange={e=>applyPackage(e.target.value)}>
                {Object.entries(PACKAGE_FEATURES).map(([key,v])=><option key={key} value={key}>{v.label}</option>)}
                <option value="custom">Custom</option>
              </select>
            </label>
            <div className="featureToggles">
              {['audio','video','photo','note'].map(key=><button key={key} className={event.features[key]?'featureToggle on':'featureToggle'} onClick={()=>toggleFeature(key)}><span>{key==='audio'?'Voice':key[0].toUpperCase()+key.slice(1)}</span><i/></button>)}
            </div>
          </section>
        </div>

        <div className="grid2 phase2Grid">
          <section className="panel storagePanel">
            <div className="panelHead"><div><span>Booth storage</span><small>Browser storage used by this event device</small></div><Save size={20}/></div>
            <div className="storageNumbers"><strong>{formatBytes(storageInfo.usage)}</strong><span>of {storageInfo.quota?formatBytes(storageInfo.quota):'available device quota'}</span></div>
            <div className="storageBar"><i style={{width:(storageInfo.quota?Math.min(100,(storageInfo.usage/storageInfo.quota)*100):0)+'%'}}/></div>
            <p className="securityNote">{messages.length} saved memories on this device.</p>
          </section>
          <section className="panel miniPreview">
            <p className="tinyLabel">CURRENT EXPERIENCE</p>
            <h3>{THEME_PRESETS[event.theme]?.label || 'Custom Theme'}</h3>
            <p>{PACKAGE_FEATURES[event.package]?.label || 'Custom Package'} · {event.privacy==='private'?'Private gallery':event.privacy==='after'?'Gallery after event':'Guest-viewable gallery'}</p>
            <div className="phaseFeatureIcons">
              {event.features.audio&&<Mic/>}{event.features.video&&<Video/>}{event.features.photo&&<Camera/>}{event.features.note&&<FileText/>}
            </div>
          </section>
        </div>

        <div className="grid2 adminSecondRow">
          <section className="panel">
            <div className="panelHead"><div><span>Admin security</span><small>Change the dashboard PIN</small></div><LockKeyhole size={20}/></div>
            <label>Admin PIN<input inputMode="numeric" maxLength={8} value={adminPinDraft} onChange={e=>setAdminPinDraft(e.target.value.replace(/\D/g,''))}/></label>
            <button className="secondary" onClick={saveAdminPin}>{pinSaved?'Saved ✓':'Save admin PIN'}</button>
            <p className="securityNote">Default PIN: 8886</p>
          </section>
          <section className="panel miniPreview">
            <p className="tinyLabel">PHASE 1 ACTIVE</p>
            <div className="phaseFeatureIcons"><Mic/><Video/><Camera/><FileText/></div>
            <h3>Four ways to leave a memory</h3>
            <p>Voice, video, photo booth and written notes — with names, countdowns, review and retake.</p>
          </section>
        </div>

        <section className="panel galleryWorkspace" id="galleryWorkspace">
          <div className="galleryTopbar">
            <div><p className="eyebrow">PHASE 3</p><h2>Event Gallery</h2><span>Review, approve, favorite and present your memories.</span></div>
            <button className="launch" disabled={!slideshowItems.length} onClick={()=>{setSlideIndex(0);setSlideshowOpen(true)}}><MonitorPlay size={18}/> Start slideshow</button>
          </div>

          <div className="galleryToolbar">
            <div className="galleryTabs">
              {[
                ['all','All'],['favorites','Favorites'],['photos','Photos'],['audio','Voice'],['video','Video'],['notes','Notes']
              ].map(([key,label])=><button key={key} className={galleryTab===key?'active':''} onClick={()=>setGalleryTab(key)}>{label}</button>)}
            </div>
            <label className="gallerySearch"><Search size={17}/><input value={gallerySearch} onChange={e=>setGallerySearch(e.target.value)} placeholder="Search guest names…"/></label>
          </div>

          <div className="gallerySummary">
            <span><strong>{galleryItems.length}</strong> shown</span>
            <span><Check size={15}/> {messages.filter(m=>m.approved).length} approved</span>
            <span><Star size={15}/> {messages.filter(m=>m.favorite).length} favorites</span>
            <span><ImageIcon size={15}/> {slideshowItems.length} slideshow photos</span>
          </div>

          {galleryItems.length===0 ? (
            <div className="empty"><Images size={42}/><h3>No memories in this view</h3><p>Try a different tab or record a new memory.</p></div>
          ) : (
            <div className="galleryMasonry">
              {galleryItems.map(m=><GalleryCard key={m.id} item={m} onOpen={()=>setSelectedMessage(m)} onFavorite={()=>toggleFavorite(m)} onApprove={()=>toggleApproval(m)}/>)}
            </div>
          )}
        </section>
      </section>

      {selectedMessage && <MemoryViewer message={selectedMessage} onClose={()=>setSelectedMessage(null)}/>}
      {slideshowOpen&&<Slideshow items={slideshowItems} index={slideIndex} setIndex={setSlideIndex} event={event} onClose={()=>setSlideshowOpen(false)}/>}
    </main>
  )
}

function GalleryCard({item,onOpen,onFavorite,onApprove}) {
  const hasPhoto=!!(item.photoUrl || (item.type==='photo'&&item.url))
  return (
    <article className={'galleryCard galleryCard-'+item.type+(item.approved?' approved':'')}>
      {hasPhoto&&<button className="galleryVisual" onClick={onOpen}><img src={item.photoUrl||item.url} alt={item.guest}/><span className="galleryType">{item.type==='photo'?'Photo':item.type==='audio'?'Voice + Photo':'Video + Photo'}</span></button>}
      {!hasPhoto&&item.type==='note'&&<button className="galleryNote" onClick={onOpen}><FileText size={22}/><p>“{item.note}”</p></button>}
      {!hasPhoto&&item.type!=='note'&&<button className="galleryMedia" onClick={onOpen}>{item.type==='audio'?<Mic size={34}/>:<Video size={34}/>}<span>{labelFor(item)}</span><Play size={18}/></button>}
      <div className="galleryCardMeta">
        <div><strong>{item.guest}</strong><span>{labelFor(item)} · {item.time}</span></div>
        <div className="galleryCardActions">
          <button className={item.favorite?'active':''} onClick={onFavorite} title="Favorite"><Star size={16} fill={item.favorite?'currentColor':'none'}/></button>
          <button className={item.approved?'approvedBtn active':'approvedBtn'} onClick={onApprove} title={item.approved?'Approved for gallery':'Approve for gallery'}><Check size={16}/></button>
          <button onClick={onOpen} title="Open"><ChevronRight size={17}/></button>
        </div>
      </div>
    </article>
  )
}

function Slideshow({items,index,setIndex,event,onClose}) {
  if (!items.length) return null
  const item=items[index%items.length]
  const src=item.photoUrl||item.url
  return (
    <div className={'slideshowScreen theme-'+event.theme} style={{'--accent':event.accent}}>
      <Atmosphere type={event.ambience} intensity="subtle" subtle/>
      <button className="slideClose" onClick={onClose}><X size={22}/></button>
      <div className="slideBrand">{event.logoData?<img src={event.logoData} alt="Event logo"/>:<span>{event.monogram}</span>}</div>
      <div className="slideImageWrap"><img src={src} alt={item.guest}/></div>
      <div className="slideCaption"><strong>{item.guest}</strong><span>{event.title} · {event.hashtag}</span></div>
      <button className="slidePrev" onClick={()=>setIndex(i=>(i-1+items.length)%items.length)}>‹</button>
      <button className="slideNext" onClick={()=>setIndex(i=>(i+1)%items.length)}>›</button>
      <div className="slideProgress">{index%items.length+1} / {items.length}</div>
    </div>
  )
}

function labelFor(m) {
  if (m.type==='audio') return 'Voice message · '+(m.duration||0)+'s'
  if (m.type==='video') return 'Video message · '+(m.duration||0)+'s'
  if (m.type==='photo') return (m.photoCount>1?m.photoCount+'-photo strip':'Photo')
  return 'Written note'
}

function BoothModel({event,phone}) {
  const booth={...DEFAULT_EVENT.booth,...(event.booth||{})}
  const style=getBoothStyle(event)
  const scale=Math.max(1,Math.min(1.26,(Number(booth.size)||112)/100))
  return (
    <span
      className={'phoneBooth boothStyle-'+style+(event.boothCustom?' boothCustom':'')+' boothDoors-'+booth.door}
      style={{
        '--booth-scale':scale,
        '--booth-panel':booth.panel,
        '--booth-metal':booth.trim,
        '--booth-inside':booth.interior
      }}
    >
      <span className="boothTopCap"/><span className="boothCrown">{booth.sign || 'VOICEMENTO'}</span>
      <span className="boothBody">
        <span className="boothInterior">
          <BoothAlcove phone={phone} compact caption={booth.caption || 'STEP INSIDE'}/>
        </span>
        <span className="boothDoor boothDoorLeft"><span className="doorGlass"><span/><span/><span/><span/><span/><span/></span><span className="doorPanelDetail"/><span className="doorHandle"/></span>
        <span className="boothDoor boothDoorRight"><span className="doorGlass"><span/><span/><span/><span/><span/><span/></span><span className="doorPanelDetail"/><span className="doorHandle"/></span>
      </span>
      <span className="boothBase"/>
    </span>
  )
}

function BoothAlcove({phone,compact=false,ringing=false,caption=''}) {
  return (
    <span className={'boothAlcove '+(compact?'boothAlcoveMini':'boothAlcoveGuest')}>
      <span className="boothBackWall"/>
      <span className="boothWallTrim boothWallTrimLeft"/>
      <span className="boothWallTrim boothWallTrimRight"/>
      <span className="boothSideWall boothSideWallLeft"/>
      <span className="boothSideWall boothSideWallRight"/>
      <span className="boothCeilingGlow"><i/></span>
      <span className="boothPhoneMount"><i/><i/></span>
      <span className="boothShelfBracket boothShelfBracketLeft"/>
      <span className="boothShelfBracket boothShelfBracketRight"/>
      <span className="boothPhoneShelf"/>
      <span className="boothPhoneWrap"><VintagePhone compact={compact} ringing={ringing} config={phone}/></span>
      <span className="boothFloor"/>
      {caption && <small className="boothInteriorCaption">{caption}</small>}
    </span>
  )
}

function VintagePhone({compact=false,ringing=false,active=false,config}) {
  const phone={...DEFAULT_EVENT.phone,...(config||{})}
  return (
    <div
      className={'vintagePhone finish-'+phone.finish+(compact?' compact':'')+(ringing?' ringing':'')+(active?' active':'')}
      style={{
        '--phone-body':phone.body,
        '--phone-handset':phone.handset,
        '--phone-trim':phone.trim,
        '--phone-cord':phone.cord
      }}
      aria-hidden="true"
    >
      <div className="vintagePhoneShadow"/>
      <div className="vintageHandset">
        <span className="receiverCup receiverCupLeft"><i className="receiverGrille"/></span>
        <span className="receiverBar"><i className="receiverBarInset"/></span>
        <span className="receiverCup receiverCupRight"><i className="receiverGrille"/></span>
      </div>
      <div className="vintageCradle"><i/><i/></div>
      <div className="vintageBody">
        <div className="vintageCrest">VM</div>
        <span className="phoneRivet phoneRivetLeft"/><span className="phoneRivet phoneRivetRight"/>
        <div className="rotaryBezel">
          <div className="rotaryDial">
            {Array.from({length:10}).map((_,i)=><i key={i} style={{'--n':i}}><b>{(i+1)%10}</b></i>)}
            <span className="dialCenter"><Phone size={compact?12:17} strokeWidth={1.5}/></span>
            <span className="dialFingerStop"/>
          </div>
        </div>
        <div className="vintageNameplate">{phone.plaque || 'VOICEMENTO'}</div>
      </div>
      <div className="vintageBase"><span/><span/><span/><i className="baseScrew baseScrewLeft"/><i className="baseScrew baseScrewRight"/></div>
      <div className="phoneCord"><span className="cordCoils"/></div>
    </div>
  )
}

function Atmosphere({type,intensity,subtle}) {
  if (!type || type==='none') return null
  const count = intensity==='subtle'?10:intensity==='festive'?30:18
  return (
    <div className={'atmosphere atmosphere-'+type+(subtle?' atmosphereSubtle':'')} aria-hidden="true">
      {Array.from({length:count}).map((_,i)=>{
        const left=(i*37+11)%97
        const duration=8+(i%7)*1.15
        const delay=-((i*0.83)%duration)
        const drift=((i%5)-2)*14
        const scale=.72+(i%6)*.09
        return <i key={i} style={{
          left:left+'%',
          animationDuration:duration+'s',
          animationDelay:delay+'s',
          '--drift':drift+'px',
          '--drift-neg':(-drift*.7)+'px',
          '--drift-half':(drift*.55)+'px',
          '--drift-fire':(drift*.8)+'px',
          '--drift-fire-neg':(-drift*.3)+'px',
          '--particle-scale':scale
        }}/>
      })}
    </div>
  )
}

function AdminGate({open,onClose,pin,setPin,error,setError,onSubmit}) {
  if (!open) return null
  return (
    <div className="modalBackdrop" onMouseDown={onClose}>
      <form className={error?'pinModal shake':'pinModal'} onSubmit={onSubmit} onMouseDown={e=>e.stopPropagation()}>
        <button type="button" className="modalClose" onClick={onClose}><X size={19}/></button>
        <div className="lockSeal"><LockKeyhole size={24}/></div>
        <p className="tinyLabel">PRIVATE AREA</p>
        <h2>Admin access</h2>
        <p>Enter the event administrator code.</p>
        <input autoFocus inputMode="numeric" type="password" maxLength={8} value={pin} onChange={e=>{setPin(e.target.value.replace(/\D/g,''));setError(false)}} placeholder="••••"/>
        {error&&<span className="pinError">That code isn't correct.</span>}
        <button className="unlockBtn" type="submit">Unlock dashboard</button>
      </form>
    </div>
  )
}

function MemoryViewer({message,onClose}) {
  return (
    <div className="modalBackdrop" onMouseDown={onClose}>
      <div className="playerModal" onMouseDown={e=>e.stopPropagation()}>
        <button className="modalClose" onClick={onClose}><X size={19}/></button>
        <p className="tinyLabel">{labelFor(message)}</p>
        <h2>{message.guest}</h2>
        {message.type==='audio'&&<audio className="mediaPlayer audioPlayer" src={message.url} controls autoPlay/>}
        {message.type==='video'&&<video className="mediaPlayer" src={message.url} controls autoPlay playsInline/>}
        {message.type==='photo'&&<img className="photoViewer" src={message.photoUrl||message.url} alt="Guest memory"/>}
        {message.type==='note'&&<div className="noteViewer">“{message.note}”</div>}
        {message.photoUrl&&message.type!=='photo'&&<div className="linkedPhoto"><p>Photo attached to this message</p><img src={message.photoUrl} alt="Attached guest"/></div>}
        {message.url&&message.type!=='note'&&<a className="downloadMedia" href={message.url} download={'VoiceMento-'+message.id}><Download size={17}/> Save media</a>}
      </div>
    </div>
  )
}

function Stat({icon,label,value}) {
  return <div className="stat"><div className="statIcon">{icon}</div><div><span>{label}</span><strong>{value}</strong></div></div>
}
