// Run locally; these credentials must NEVER use a VITE_ prefix or enter the browser build.
import { createClient } from '@supabase/supabase-js';
import { mkdir, writeFile } from 'node:fs/promises';
import { resolve, sep } from 'node:path';
const url=process.env.SUPABASE_URL, key=process.env.SUPABASE_SERVICE_ROLE_KEY;
if(!url||!key)throw new Error('Configura SUPABASE_URL y SUPABASE_SERVICE_ROLE_KEY solo en esta terminal local. Consulta README.md.');
const client=createClient(url,key,{auth:{persistSession:false,autoRefreshToken:false}});
const destination=resolve('backups',new Date().toISOString().replaceAll(':','-'));
await mkdir(destination,{recursive:true});
const exportData={schema_version:1,exported_at:new Date().toISOString(),tables:{},photos:[]};
for(const table of ['profiles','letters','letter_drafts','letter_reads','app_settings']) {
 const rows=[];for(let offset=0;;offset+=500){const order=table==='letter_drafts'?'letter_id':'id';const {data,error}=await client.from(table).select('*').order(order).range(offset,offset+499);if(error)throw error;rows.push(...data);if(data.length<500)break;}exportData.tables[table]=rows;
}
const photos=new Set([...exportData.tables.letters,...exportData.tables.letter_drafts].flatMap(row=>row.image_paths??[]));
for(const path of photos){const file=resolve(destination,'photos',path);const base=resolve(destination,'photos')+sep;if(!file.startsWith(base))throw new Error('Ruta de fotografía inválida.');const {data,error}=await client.storage.from('letter-photos').download(path);if(error)throw error;await mkdir(resolve(file,'..'),{recursive:true});await writeFile(file,Buffer.from(await data.arrayBuffer()));exportData.photos.push(path);}
await writeFile(resolve(destination,'data.json'),JSON.stringify(exportData,null,2),'utf8');
console.log(`Respaldo completo: ${destination}. Incluye textos, perfiles, progreso y ${photos.size} fotografías referenciadas. No incluye contraseñas ni audios externos.`);
