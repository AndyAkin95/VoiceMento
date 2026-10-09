'use client'

import { createClient } from '@supabase/supabase-js'

export const EMPTY_CLOUD_CONFIG={url:'',key:'',eventId:'',guestCode:''}

export function validCloudProject(config) {
  if (!config) return false
  try {
    const url=new URL(config.url)
    return url.protocol==='https:' && /^[a-z0-9-]+\.supabase\.co$/.test(url.hostname)
      && url.pathname==='/' && /^((sb_publishable_[a-zA-Z0-9_-]+)|(eyJ[a-zA-Z0-9._-]+))$/.test(config.key||'')
  } catch { return false }
}

export function validCloudEvent(config) {
  const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
  return validCloudProject(config)&&uuid.test(config.eventId||'')&&uuid.test(config.guestCode||'')
}

export function cloudClient(config) {
  if (!validCloudProject(config)) return null
  return createClient(config.url,config.key,{
    auth:{persistSession:true,autoRefreshToken:true,
      storageKey:'voicemento-auth-'+new URL(config.url).hostname.split('.')[0]}
  })
}

function mediaExt(blob,type) {
  if(type==='photo') return 'jpg'
  const mime=(blob?.type||'').toLowerCase()
  if (mime.includes('webm')) return 'webm'
  if (mime.includes('ogg')) return 'ogg'
  if (mime.includes('mp4')) return 'mp4'
  if (mime.includes('quicktime')) return 'mov'
  return 'bin'
}

export async function uploadCloudMemory(client,config,item) {
  if(!client||!validCloudEvent(config)) throw new Error('Cloud event is not connected')
  if(!item) throw new Error('There is no saved memory to upload')
  const prefix=config.eventId+'/'+config.guestCode+'/'
  const MAX_BYTES=50*1024*1024
  async function uploadFile(blob,type) {
    if(!blob) return null
    if(blob.size>MAX_BYTES) throw new Error('This file exceeds the 50 MB cloud upload limit. Your local copy is still saved.')
    const path=prefix+crypto.randomUUID()+'.'+mediaExt(blob,type)
    const {error}=await client.storage.from('voicemento-private').upload(path,blob,{
      contentType:blob.type||'application/octet-stream',cacheControl:'3600',upsert:false
    })
    if(error) throw error
    return path
  }
  const path=item.type==='note'?null:await uploadFile(item.blob,item.type)
  const photoPath=item.photoBlob && item.type!=='photo'?await uploadFile(item.photoBlob,'photo'):null
  const {error}=await client.from('voicemento_memories').insert({
    event_id:config.eventId,
    guest_code:config.guestCode,
    guest_name:(item.guest||'Guest').slice(0,140),
    kind:item.type,
    duration_seconds:Math.max(0,Math.min(180,Number(item.duration)||0)),
    note:item.type==='note'?item.note:null,
    media_path:path,
    photo_path:photoPath,
    approved:false,
    favorite:false
  })
  if(error)throw error
  return true
}

export async function fetchCloudMemories(client,config) {
  if(!client||!validCloudEvent(config)) throw new Error('Connect to a cloud event first.')
  const {data,error}=await client.from('voicemento_memories')
    .select('id,guest_name,kind,duration_seconds,note,media_path,photo_path,created_at,approved,favorite')
    .eq('event_id',config.eventId)
    .order('created_at',{ascending:false})
    .limit(300)
  if(error)throw error
  return await Promise.all((data||[]).map(async item=>{
    async function urlFor(path){
      if(!path)return null
      const {data:link,error:linkError}=await client.storage.from('voicemento-private').createSignedUrl(path,3600)
      return linkError?null:link.signedUrl
    }
    const [url,photoUrl]=await Promise.all([urlFor(item.media_path),urlFor(item.photo_path)])
    return {...item,url,photoUrl}
  }))
}
