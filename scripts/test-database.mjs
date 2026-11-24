// Real PostgreSQL RLS via PGlite. Auth/Storage scaffolding and the clock exist ONLY in this isolated test DB.
import { PGlite } from '@electric-sql/pglite';
import { readFile } from 'node:fs/promises';
import assert from 'node:assert/strict';
const sql = await readFile(new URL('../supabase/migrations/202611240001_initial.sql',import.meta.url),'utf8');
const pg=new PGlite();
const admin='00000000-0000-0000-0000-000000000001',recipient='00000000-0000-0000-0000-000000000002',outsider='00000000-0000-0000-0000-000000000003';
let checks=0;
function ok(condition,message){assert.ok(condition,message);checks++;console.log(`OK ${checks}: ${message}`);}
async function scalar(query){return (await pg.query(query)).rows[0];}
async function asUser(id,fn){await pg.exec(`set role authenticated; select set_config('request.jwt.claim.sub','${id}',false);`);try{return await fn();}finally{await pg.exec('reset role');}}
async function denied(fn,message){await assert.rejects(fn);checks++;console.log(`OK ${checks}: ${message}`);}
await pg.exec(`create role anon;create role authenticated;create schema auth;create table auth.users(id uuid primary key);create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;grant usage on schema auth,public to authenticated,anon;grant execute on function auth.uid() to authenticated,anon;create schema storage;create table storage.buckets(id text primary key,name text,public boolean,file_size_limit bigint,allowed_mime_types text[]);create table storage.objects(id uuid default gen_random_uuid(),bucket_id text,name text);alter table storage.objects enable row level security;grant usage on schema storage to authenticated;grant select,insert,update,delete on storage.objects to authenticated;`);
// PGlite's built-in now() cannot be overridden. Substitute only its call sites in this in-memory test copy.
// All policy expressions, grants, constraints and RPC bodies otherwise remain the actual migration.
await pg.exec(`create schema private;create function private.test_clock() returns timestamptz language sql stable as $$ select coalesce(nullif(current_setting('test.server_now',true),''),clock_timestamp()::text)::timestamptz $$;`);
await pg.exec(sql.replace(/\bnow\(\)/g,'private.test_clock()'));
await pg.exec(`insert into auth.users values('${admin}'),('${recipient}'),('${outsider}');insert into public.profiles(id,role) values('${admin}','admin'),('${recipient}','recipient');`);
const first=await scalar('select id from letters where day=1');const id=first.id;
ok((await scalar("select count(*)::int n from letters where title='' and content='' and not is_published")).n===24,'24 cartas vacías y privadas');
await asUser(admin,async()=>{
 ok((await scalar('select count(*)::int n from letters')).n===24,'administrador consulta las 24 cartas');
 await denied(()=>pg.query('select publish_letter($1,(select updated_at from letter_drafts where letter_id=$1))',[id]),'no publica contenido vacío');
 await pg.query("update letter_drafts set title='Una carta de prueba',content='Texto privado',image_paths=array[$2] where letter_id=$1",[id,`${id}/published.jpg`]);
 await pg.query("insert into storage.objects(bucket_id,name) values('letter-photos',$1),('letter-photos',$2)",[`${id}/published.jpg`,`${id}/draft.jpg`]);
 await pg.query('select publish_letter($1,(select updated_at from letter_drafts where letter_id=$1))',[id]);
});
await pg.exec("update letters set title='Prueba',content='Solo pruebas',is_published=true where day>1;");
const scenarios=[['2026-11-30T23:59:59-05:00',0],['2026-12-01T04:59:59Z',0],['2026-12-01T05:00:00Z',1],['2026-12-02T04:59:59Z',1],['2026-12-02T05:00:00Z',2],['2026-12-24T05:00:00Z',24],['2027-01-10T00:00:00Z',24],['2032-01-01T00:00:00Z',24]];
for(const [date,count] of scenarios){await pg.query("select set_config('test.server_now',$1,false)",[date]);await asUser(recipient,async()=>{const result=await scalar('select count(*)::int n from letters');ok(result.n===count,`RLS a ${date}: ${count} cartas`);const state=(await scalar('select calendar_state() state')).state;ok(state.days.filter(d=>d.available).length===count&&state.days.length===24,'metadatos seguros reflejan el desbloqueo');ok(!JSON.stringify(state).includes('Texto privado'),'calendario no filtra textos privados');});}
await pg.exec("select set_config('test.server_now','2026-11-30T23:59:59-05:00',false)");
await asUser(recipient,async()=>{
 ok((await scalar('select count(*)::int n from storage.objects')).n===0,'fotos futuras invisibles');
 await denied(()=>pg.query('select mark_letter_read($1)',[id]),'no se puede registrar una carta futura como leída');
 await pg.exec("select set_config('timezone','Pacific/Kiritimati',false)");
 ok((await scalar('select count(*)::int n from letters')).n===0,'cambiar zona del cliente no adelanta el desbloqueo');
});
await pg.exec("select set_config('test.server_now','2026-12-01T00:00:00-05:00',false)");
await asUser(recipient,async()=>{
 ok((await scalar('select count(*)::int n from letter_drafts')).n===0,'borradores invisibles para destinataria');
 ok((await scalar('select count(*)::int n from storage.objects')).n===1,'solo fotografía publicada visible');
 await denied(()=>pg.exec("update profiles set role='admin'"),'no puede elevar su rol');
 await denied(()=>pg.exec("update letters set content='alterado'"),'no puede editar cartas');
 await denied(()=>pg.query('select publish_letter($1,now())',[id]),'no puede ejecutar publicación');
 await denied(()=>pg.query('select unpublish_letter($1)',[id]),'no puede retirar publicaciones');
 await denied(()=>pg.query("insert into letter_drafts(letter_id) values($1)",[id]),'no puede crear borradores');
 const update=await pg.exec("update app_settings set app_title='Alterado'");ok(update[0].affectedRows===0,'no puede modificar configuración');
 await pg.query('select mark_letter_read($1)',[id]);await pg.query('select mark_letter_read($1)',[id]);
 ok((await scalar('select count(*)::int n from letter_reads')).n===1,'lectura idempotente y persistente');
});
await asUser(admin,async()=>{
 await pg.query("update letter_drafts set content='Nuevo borrador privado',image_paths=array[$2] where letter_id=$1",[id,`${id}/draft.jpg`]);
 await denied(()=>pg.query("select publish_letter($1,'2000-01-01'::timestamptz)",[id]),'publicación detecta versiones obsoletas');
});
await asUser(recipient,async()=>{ok((await scalar('select content from letters where day=1')).content==='Texto privado','edición pendiente no altera versión publicada');ok((await scalar("select name from storage.objects")).name===`${id}/published.jpg`,'foto de borrador no se expone');});
await asUser(admin,()=>pg.query('select publish_letter($1,(select updated_at from letter_drafts where letter_id=$1))',[id]));
await asUser(recipient,async()=>{ok((await scalar('select content from letters where day=1')).content==='Nuevo borrador privado','publicación actualiza carta sin despliegue');ok((await scalar('select name from storage.objects')).name===`${id}/draft.jpg`,'solo foto de la nueva publicación visible');ok((await scalar('select count(*)::int n from letter_reads')).n===1,'lecturas persisten en una nueva sesión');});
await asUser(admin,()=>pg.query('select unpublish_letter($1)',[id]));
await asUser(recipient,async()=>{ok((await scalar('select count(*)::int n from letters')).n===0,'retirar publicación bloquea acceso');ok((await scalar('select count(*)::int n from letter_reads')).n===1,'retirar conserva historial');ok((await scalar('select count(*)::int n from storage.objects')).n===0,'retirar también protege fotos');});
await asUser(outsider,async()=>{ok((await scalar('select count(*)::int n from letters')).n===0,'usuario sin perfil no ve cartas');await denied(()=>pg.exec('select calendar_state()'),'usuario sin perfil no accede al calendario');});
await pg.exec('set role anon');await denied(()=>pg.exec('select * from letters'),'anónimo sin acceso a cartas');await denied(()=>pg.exec('select calendar_state()'),'anónimo sin acceso a RPC');await pg.exec('reset role');
await denied(()=>pg.exec("update letters set unlock_at='2026-11-01' where day=1"),'las fechas fijas no se pueden adelantar');
await pg.close();console.log(`\n${checks} comprobaciones PostgreSQL superadas.`);
