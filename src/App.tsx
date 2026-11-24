import { useEffect, useState, type FormEvent, type CSSProperties } from 'react';
import type { Session } from '@supabase/supabase-js';
import { AnimatePresence, motion } from 'framer-motion';
import { Heart, ArrowRight, LogOut, PenLine, ArrowLeft, LockKeyhole, Sparkles } from 'lucide-react';
import { db, supabase, defaultSettings, loadSettings, errorMessage, preference, type Settings } from './lib';
import Calendar from './components/Calendar';
import Admin from './components/Admin';

export default function App() {
 const [session,setSession]=useState<Session|null>(null);
 const [loading,setLoading]=useState(!!supabase);
 const [role,setRole]=useState<string|null>(null);
 const [settings,setSettings]=useState<Settings>(defaultSettings);
 const [page,setPage]=useState(location.pathname==='/admin'?'admin':'calendar');
 const [welcome,setWelcome]=useState(false);
 const [preview,setPreview]=useState(false);
 const [error,setError]=useState('');
 useEffect(()=>{if(!supabase)return;let active=true;
  supabase.auth.getSession().then(({data,error})=>{if(!active)return;if(error){setError(error.message);setLoading(false);}else {setSession(data.session);if(!data.session)setLoading(false);}});
  const {data}=supabase.auth.onAuthStateChange((_event,next)=>{if(active){setSession(next);if(!next){setRole(null);setSettings(defaultSettings);setLoading(false);}}});
  return ()=>{active=false;data.subscription.unsubscribe();};
 },[]);
 useEffect(()=>{if(!session)return;let active=true;setLoading(true);setError('');
  Promise.all([db().from('profiles').select('role').eq('id',session.user.id).single(),loadSettings()]).then(([profile,config])=>{
   if(!active)return;if(profile.error)throw profile.error;setRole(profile.data.role);setSettings(config);setWelcome(preference(`welcome:${session.user.id}`)!=='seen');
  }).catch(e=>{if(active){setRole(null);setError('Tu acceso aún no está listo. Comprueba que tu cuenta tenga un perfil autorizado. '+errorMessage(e));}}).finally(()=>{if(active)setLoading(false);});
  return()=>{active=false;};
 },[session?.user.id]);
 useEffect(()=>{const pop=()=>setPage(location.pathname==='/admin'?'admin':'calendar');window.addEventListener('popstate',pop);return()=>window.removeEventListener('popstate',pop);},[]);
 function navigate(next:string){history.pushState({},'',next==='admin'?'/admin':'/');setPage(next);window.scrollTo(0,0);}
 async function logout(){const {error}=await db().auth.signOut();if(error)setError(error.message);else {setSession(null);setRole(null);setSettings(defaultSettings);navigate('calendar');}}
 function begin(){if(session)preference(`welcome:${session.user.id}`,'seen');setWelcome(false);window.scrollTo(0,0);}
 const authorized=!!session&&!!role;
 return <div className="app" style={{'--accent':settings.accent_color} as CSSProperties}>
  <div className="ambient" aria-hidden="true"><span>✧</span><span>♡</span><span>✦</span><span>❄</span><span>✧</span></div>
  <header className="site-header"><a className="brand" href="/" onClick={e=>{e.preventDefault();if(page==='admin'&&!confirm('Si tienes cambios sin guardar, se perderán. ¿Volver al calendario?'))return;navigate('calendar');}}><Heart size={21} strokeWidth={1.4}/><span>{settings.app_title}</span></a>
   {(authorized||preview)&&<nav aria-label="Navegación principal"><button className="icon-button" title="Ver bienvenida" aria-label="Ver bienvenida" onClick={()=>setWelcome(true)}><Heart size={19}/></button>{role==='admin'&&<button className="nav-link" onClick={()=>navigate(page==='admin'?'calendar':'admin')}>{page==='admin'?<ArrowLeft size={17}/>:<PenLine size={17}/>}<span>{page==='admin'?'Calendario':'Mis cartas'}</span></button>}{authorized?<button className="icon-button" title="Cerrar sesión" aria-label="Cerrar sesión" onClick={logout}><LogOut size={18}/></button>:<button className="nav-link" onClick={()=>{setPreview(false);setWelcome(false);}}>Salir de vista previa</button>}</nav>}
  </header>
  {error&&<div className="notice error" role="alert">{error}{session&&!role&&<button onClick={logout}>Cerrar sesión</button>}</div>}
  {loading?<main className="loading"><Heart className="pulse"/><p>Preparando un poquito de magia…</p></main>:!authorized&&!preview?<Login onPreview={()=>{setPreview(true);setWelcome(true);}}/>:welcome?<Welcome settings={settings} onBegin={begin}/>:page==='admin'&&authorized?(role==='admin'?<Admin settings={settings} onSettings={setSettings}/>:<main className="empty-state"><LockKeyhole/><h1>Este rincón es privado</h1><button className="primary" onClick={()=>navigate('calendar')}>Volver a tus sobres</button></main>):<Calendar key={session?.user.id??'preview'} settings={settings} preview={preview} />}
  <footer className="site-footer"><span className="footer-line"/><Heart size={13}/><span>Hecho con amor, para ti.</span><span className="footer-line"/></footer>
 </div>;
}

function Login({onPreview}:{onPreview:()=>void}) {
 const [email,setEmail]=useState('');const [password,setPassword]=useState('');const [error,setError]=useState('');const [busy,setBusy]=useState(false);
 async function login(e:FormEvent){e.preventDefault();setBusy(true);setError('');try{const {error}=await db().auth.signInWithPassword({email:email.trim(),password});if(error)throw error;}catch{setError('No pudimos entrar. Revisa tu correo y contraseña e inténtalo de nuevo.');}finally{setBusy(false);}}
 return <main className="login-layout"><section className="login-story"><span className="eyebrow">UNA NAVIDAD, SOLO NUESTRA</span><div className="hero-envelope" aria-hidden="true"><div className="hero-flap"/><span className="wax-seal"><Heart fill="currentColor" size={26}/></span><span className="envelope-note">para ti, con amor</span></div><h1>Hay cosas bonitas<br/>que merecen <em>esperarse.</em></h1><p>24 días, 24 pedacitos de mi corazón.<br/>Un diciembre para guardar siempre.</p><div className="tiny-stars" aria-hidden="true">✧ ─── ♡ ─── ✧</div></section>
 <section className="login-card"><span className="handwritten">Nuestro pequeño rincón</span><h2>Tu regalo empieza aquí</h2><p>Un lugar para nosotros y para todo lo bonito que aún está por llegar.</p>{supabase?<form onSubmit={login}><label>Tu correo<input type="email" autoComplete="username" required value={email} onChange={e=>setEmail(e.target.value)} placeholder="tucorreo@ejemplo.com"/></label><label>Tu contraseña<input type="password" autoComplete="current-password" required value={password} onChange={e=>setPassword(e.target.value)}/></label>{error&&<p className="error" role="alert">{error}</p>}<button className="primary" disabled={busy}>{busy?'Abriendo nuestro rincón…':'Entrar a nuestro diciembre'}<ArrowRight size={18}/></button><small className="privacy-note"><LockKeyhole size={13}/>Solo tú y yo tenemos la llave.</small></form>:<div className="setup-note"><p><strong>El regalo está tomando forma.</strong></p><p>Falta conectar tu proyecto de Supabase para activar las cuentas y guardar tus cartas. Sigue el README del proyecto.</p><button className="primary" onClick={onPreview}>Ver el diseño <ArrowRight size={17}/></button><small>Vista previa sin cuentas ni contenido personal.</small></div>}</section></main>;
}
function Welcome({settings,onBegin}:{settings:Settings;onBegin:()=>void}) {return <AnimatePresence><motion.main className="welcome" initial={{opacity:0,y:20}} animate={{opacity:1,y:0}}><span className="eyebrow">DICIEMBRE 2026 · PARA GUARDAR SIEMPRE</span><div className="hero-envelope" aria-hidden="true"><div className="hero-flap"/><span className="wax-seal"><Heart fill="currentColor" size={26}/></span><span className="envelope-note">veinticuatro pequeños secretos</span></div><h1>{settings.app_title}</h1><span className="handwritten">24 días, 24 pedacitos de mi corazón.</span><p className="welcome-message">{settings.welcome_message}</p><button className="primary" onClick={onBegin}>Comenzar nuestra Navidad <Heart size={17}/></button><small><Sparkles size={13}/> Una sorpresa cada día, un recuerdo para siempre.</small></motion.main></AnimatePresence>;}
