import { createClient } from '@supabase/supabase-js';
const url = import.meta.env.VITE_SUPABASE_URL;
const key = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
export const supabase = url && key ? createClient(url, key, { auth: {persistSession:true, autoRefreshToken:true, detectSessionInUrl:false} }) : null;
export function db() { if (!supabase) throw new Error('Falta configurar Supabase.'); return supabase; }
export interface LetterContent { title:string; content:string; dedication:string; content_type:string; image_paths:string[]; music_url:string; celebration_message:string }
export interface Letter extends LetterContent { id:string; day:number; unlock_at:string; is_published:boolean; updated_at:string }
export interface Draft extends LetterContent { letter_id:string; updated_at:string }
export interface Settings { id:number; app_title:string; welcome_message:string; final_message:string; memory_message:string; accent_color:string; start_date:string; end_date:string }
export const defaultSettings:Settings = {id:1, app_title:'Diciembre contigo', welcome_message:'Este diciembre quiero regalarte algo diferente. No serán 15 regalos materiales, sino 15 pequeños recordatorios de lo mucho que te amo y de lo feliz que me hace compartir mi vida contigo.', final_message:'Estas quince sorpresas terminaron, pero nuestra historia apenas comienza.', memory_message:'Quince días de sorpresas pasaron, pero todo lo que siento por ti sigue aquí.', accent_color:'#A65D78', start_date:'2026-12-01T00:00:00-05:00', end_date:'2026-12-15T00:00:00-05:00'};
export const emptyContent:LetterContent = {title:'',content:'',dedication:'',content_type:'Carta',image_paths:[],music_url:'',celebration_message:''};
export const unlockDate = (day:number) => `2026-12-${String(day).padStart(2,'0')}T00:00:00-05:00`;
export function nextUnlock(now:number):number|null { for(let day=1;day<=15;day++){const time=Date.parse(unlockDate(day));if(time>now)return time;}return null; }
export function countdown(ms:number) {const seconds=Math.max(0,Math.floor(ms/1000));return {days:Math.floor(seconds/86400),hours:Math.floor(seconds/3600)%24,minutes:Math.floor(seconds/60)%60,seconds:seconds%60};}
export function safeMusicUrl(value:string):string { if(!value.trim())return '';try{const u=new URL(value);return u.protocol==='https:'?u.href:'';}catch{return '';} }
export function errorMessage(e:unknown) { return e instanceof Error ? e.message : (e && typeof e==='object' && 'message' in e ? String(e.message) : 'No pudimos completar la acción. Inténtalo de nuevo.'); }
export function preference(key:string,value?:string):string|null {try{if(value!==undefined)localStorage.setItem(key,value);return localStorage.getItem(key);}catch{return null;} }
export async function loadSettings():Promise<Settings> { const {data,error}=await db().from('app_settings').select('*').eq('id',1).single();if(error)throw error;return data; }
export async function privateImage(path:string) {const {data,error}=await db().storage.from('letter-photos').download(path);if(error)throw error;return URL.createObjectURL(data);}
