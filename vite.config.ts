import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
export default defineConfig(({mode})=>{const env=loadEnv(mode,process.cwd());const site=env.VITE_PUBLIC_SITE_URL;if(site&&new URL(site).protocol!=='https:')throw new Error('VITE_PUBLIC_SITE_URL debe usar HTTPS.');return { plugins: [react(), tailwindcss(), {name:'social-image-url',transformIndexHtml(html){return site?html.replace('content="/og-cover.png"',`content="${new URL('/og-cover.png',site).href}"`):html;}}] };});
