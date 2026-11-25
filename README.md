# Diciembre contigo

Calendario privado de 15 cartas del **1 al 15 de diciembre de 2026**, con desbloqueo a medianoche de **America/Guayaquil**. Todas las cartas comienzan vacías y sin publicar. El texto del día 15 y su celebración también los escribes tú.

## Arranque local

Requiere Node.js 22.16 o superior compatible y npm.

```powershell
npm ci --legacy-peer-deps
Copy-Item .env.example .env
npm run dev
```

Abre la dirección que muestra Vite. Sin variables de Supabase verás una pantalla de configuración y una vista previa visual, sin cuentas ficticias ni persistencia simulada. La vista previa muestra una fecha fija de noviembre y sobres vacíos; no permite saltar restricciones de una base conectada. Para activar el calendario y /admin debes completar la configuración siguiente.

## 1. Crear Supabase y preparar la base

1. Crea un proyecto en [Supabase](https://supabase.com/dashboard). Conserva la contraseña de la base fuera del repositorio.
2. En **Authentication → Sign In / Providers**, desactiva **Allow new users to sign up** y el acceso anónimo. Mantén email/contraseña habilitado. No basta con ocultar un botón de registro: debes desactivarlo en el servicio.
3. Abre **SQL Editor** y ejecuta una sola vez, en orden, `supabase/migrations/202611240001_initial.sql` y `supabase/migrations/202611240002_backup_access.sql`. Contienen tablas, índices, restricciones, RLS, funciones, bucket privado `letter-photos` y permiso de lectura para respaldos del servidor. No ejecutes scripts de pruebas contra tu proyecto real.
4. En **Authentication → Users → Add user**, crea exactamente las dos cuentas con correo y contraseña distintos. Puedes confirmar los correos manualmente desde la creación administrativa. No envíes invitaciones automáticamente si prefieres entregar tú las contraseñas.
5. Copia los UUID reales de ambas cuentas y ejecuta este SQL reemplazando los textos de ejemplo:

```sql
-- Reemplaza ambos valores por los UUID de Authentication > Users.
insert into public.profiles(id,display_name,role) values
 ('UUID_REAL_DE_TU_CUENTA'::uuid,'Yo','admin'),
 ('UUID_REAL_DE_SU_CUENTA'::uuid,'Mi persona especial','recipient');
```

El frontend no puede crear perfiles ni cambiar roles. Una cuenta autenticada sin perfil tampoco puede consultar cartas ni calendario. No asignes roles desde `user_metadata`.

6. Copia desde **Project Settings → API / API Keys** la URL del proyecto y su clave **publishable** (o `anon` del sistema anterior). Escribe en `.env`:

```dotenv
VITE_SUPABASE_URL=https://TU_PROYECTO.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=TU_CLAVE_PUBLICABLE_REAL
VITE_PUBLIC_SITE_URL=
```

Los valores son ejemplos explícitos, no credenciales operativas. Nunca pongas `service_role`, una clave secreta o la contraseña de PostgreSQL en variables `VITE_`. La clave publicable se incluye en el navegador: la protección real son la autenticación y RLS.

7. Reinicia Vite. Entra con tu cuenta y abre `/admin`. Con su cuenta solo se muestra el calendario; `/admin` deniega el acceso y el backend impide las operaciones administrativas.

Alternativa con Supabase CLI: configura el proyecto y usa `supabase db push` para aplicar la migración. `supabase/config.toml` desactiva registros en un entorno local de la CLI; la configuración alojada se cambia separadamente en el Dashboard.

## 2. Escribir tus cartas

En **Mis cartas** selecciona un día. Puedes editar título, tipo, texto, dedicatoria, hasta 12 fotografías y una canción. El día 15 incluye un campo adicional de celebración, completamente opcional. Los saltos de línea se conservan y el contenido se representa como texto seguro, sin ejecutar HTML.

- **Guardar borrador:** persiste en Supabase; solo tú lo ves.
- **Previsualizar:** muestra el diseño de la carta sin publicarla ni registrar una lectura.
- **Publicar / Publicar cambios:** guarda y copia el borrador a la versión publicada. Necesita título y texto. No modifica la fecha de desbloqueo.
- **Retirar publicación:** la oculta, incluyendo sus fotos, sin borrar el texto ni el historial.

Una carta publicada puede seguir editándose en privado. Ella conserva la última versión publicada hasta que pulses Publicar cambios. Se detectan modificaciones concurrentes del borrador para evitar sobrescribir cambios de otro dispositivo. Si hay conflicto, copia el texto que estés editando antes de recargar.

Las fotos admiten JPG, PNG o WebP de hasta 10 MB; conviértelas desde HEIC si es necesario. Al reemplazar una foto se utiliza una ruta nueva e inmutable. Quitar una foto del borrador no borra la versión publicada. Los archivos que dejan de estar referenciados se eliminan después de guardar/publicar; si una subida se interrumpe antes del guardado puede quedar un archivo huérfano, que puedes revisar manualmente en Storage. Nunca borres archivos que todavía estén referenciados por `letters.image_paths` o `letter_drafts.image_paths`.

Los enlaces de Spotify u otras plataformas se abren con un botón. Los enlaces HTTPS terminados en `.mp3`, `.ogg`, `.wav` o `.m4a` tienen reproductor con controles, silencio y volumen. No se reproduce nada automáticamente. Los audios externos dependen de sus proveedores; conserva aparte una copia de los archivos que tengas derecho a utilizar.

En **Detalles del regalo** cambia bienvenida, nombre, color de acento y mensajes del álbum. Estos cambios se guardan inmediatamente al pulsar Guardar detalles. No alteran el contenido de ninguna carta.

Si llega un día y su carta aún no está publicada, el sobre muestra que está en preparación. No se rellenan cartas con mensajes generados. Después del 15 permanecen accesibles todas las cartas publicadas, también en enero y años posteriores.

## 3. GitHub y Vercel

1. Crea un repositorio **privado** vacío en tu cuenta de GitHub. No añadas `.env`, respaldos o fotografías al repositorio.
2. Conecta este checkout con la URL real del repositorio y publica tus commits:

```powershell
git remote add origin https://github.com/TU_USUARIO/TU_REPOSITORIO_PRIVADO.git
git push -u origin HEAD
```

3. En [Vercel](https://vercel.com/new), importa ese repositorio. Framework: **Vite**. Build: `npm run build`. Output: `dist`. Node.js: 22.x o una versión compatible superior. Instalación: `npm ci --legacy-peer-deps`.
4. Configura las dos variables de Supabase en Production. No uses credenciales del proyecto de producción en previews si habrá colaboradores no autorizados.
5. Despliega y copia la URL HTTPS definitiva. Añádela como `VITE_PUBLIC_SITE_URL`, por ejemplo `https://tu-regalo.vercel.app`, y realiza un nuevo despliegue. Esto genera el `og:image` absoluto que necesita la vista previa de WhatsApp.
6. En Supabase → Authentication → URL Configuration, establece esa URL como Site URL y permite únicamente las URLs de acceso que uses. El inicio actual usa correo/contraseña, sin enlaces de recuperación embebidos. Para restablecer una contraseña usa el Dashboard de Supabase.
7. Comprueba el acceso con ambas cuentas y comparte el enlace final por WhatsApp. La imagen pública `public/og-cover.png` es genérica y no contiene ninguna carta, nombre privado ni foto personal.

Cambiar cartas, fotos o mensajes desde /admin **no requiere redesplegar**. Cambiar código o variables de entorno sí. El proyecto está preparado para Vercel; no se ha creado una cuenta, repositorio remoto ni despliegue en tu nombre.

## Arquitectura y privacidad

- `src/App.tsx`: autenticación persistente, perfil autorizado, bienvenida y acceso a /admin.
- `src/components/Calendar.tsx`: sobres, progreso y cuenta regresiva sincronizada con el servidor. Entre consultas usa `performance.now()`, no la fecha del teléfono. Reconsulta al recuperar foco y cada 30 segundos.
- `src/components/LetterModal.tsx`: diálogo nativo accesible, foco, Escape, apertura animada y fotografías privadas descargadas mediante autenticación. Las URLs de objeto se liberan al cerrar.
- `src/components/Admin.tsx`: borradores separados, publicación, fotografías y configuración.
- `supabase/migrations/…`: RLS, fecha fija inmutable, acceso privado a Storage y funciones que verifican el rol.

`calendar_state()` entrega únicamente día, disponibilidad, lectura y hora del servidor. Los textos solo se consultan al abrir una carta permitida por RLS. No existe un parámetro de fecha de cliente en las funciones de producción. `letter_reads` conserva el primer instante de lectura de cada cuenta y es idempotente. La sesión se conserva mediante Supabase; localStorage solo contiene preferencias y los tokens de sesión gestionados por su cliente, nunca cartas ni progreso como almacenamiento principal.

No se instala service worker ni caché offline de contenido privado. Vercel envía políticas de seguridad y `no-store`; las fotografías del bucket son privadas. Si usas un dominio personalizado de Supabase, ajusta `connect-src`/`img-src` en `vercel.json`. Una persona autorizada siempre puede guardar lo que ya ha leído; retirar una carta no puede borrar copias que ella haya guardado previamente.

Fuentes tipográficas empaquetadas localmente (Cormorant Garamond, DM Sans y Caveat), sin solicitudes a Google Fonts. Las imágenes sociales se generan con `scripts/create-social-cover.py` (Python + Pillow y fuentes de Windows); el PNG ya está incluido y no hace falta regenerarlo para desplegar.

## Respaldo y recuperación

El botón **Exportar textos** descarga cartas, borradores, configuración y progreso. No descarga las fotos; para un respaldo completo usa el script local:

1. En una terminal privada configura `SUPABASE_URL` y `SUPABASE_SERVICE_ROLE_KEY` como variables de proceso. Utiliza tu gestor de secretos o una entrada oculta; no pegues claves en el chat, código, historial de comandos compartido o variables `VITE_`.
2. Ejecuta `npm run backup`. Escribe `backups/<fecha>/data.json` y `photos/<id>/<archivo>`. La carpeta está excluida de Git. El script pagina las tablas, descarga las fotos referenciadas y falla si alguna descarga no se completa.
3. Guarda una copia cifrada fuera del ordenador y otra en un lugar distinto. Respalda también el repositorio, configuración de Supabase, DNS y los audios externos autorizados. Haz una copia después de cambios importantes y comprueba periódicamente su lectura.
4. Para una copia técnica completa, usa las opciones de exportación de Supabase o `supabase db dump` para esquema/datos/roles según su documentación. Un volcado de la base **no contiene los bytes de Storage**. El respaldo de la aplicación **no contiene contraseñas ni las tablas internas de Auth**.

Restauración en un proyecto nuevo:

1. Aplica la migración una vez. Crea de nuevo las dos cuentas y anota sus nuevos UUID.
2. Con una conexión administrativa, importa `profiles` asignando los nuevos UUID. Importa `letters` con los ID originales; elimina primero los 24 registros vacíos de la nueva instalación (sus borradores vacíos se eliminan en cascada). Hazlo solo en el proyecto nuevo, nunca en el proyecto que contiene tus recuerdos.
3. Importa `letter_drafts`, `app_settings` y `letter_reads`. En `letter_reads.user_id` sustituye cada UUID antiguo por el nuevo correspondiente. Conserva los ID de las cartas para mantener las referencias a fotos y lecturas. Si tienes un respaldo completo de Auth y un proceso oficial compatible, puedes conservar UUID originales.
4. Sube los archivos con la API de Storage al bucket privado `letter-photos`, preservando exactamente sus rutas. No insertes únicamente registros en `storage.objects`: debes subir los bytes.
5. Comprueba cantidades, contenido, lecturas, fotos y políticas con las dos cuentas antes de cambiar el enlace. Actualiza las variables de Vercel y redespliega.

Para migrar solo de hosting, compila `dist` y sírvelo sobre HTTPS con reescritura SPA de `/admin` a `/index.html` y los encabezados equivalentes de `vercel.json`. Conserva el mismo Supabase y sus variables, y actualiza las URLs autorizadas. Los recuerdos no dependen del hosting del frontend. Los planes gratuitos pueden pausar proyectos o cambiar de condiciones: verifica el estado del servicio antes de diciembre y conserva tus respaldos.

## Verificación

```powershell
npm test
npm run test:db
npm run build
npm audit
```

Las pruebas de PostgreSQL ejecutan las políticas, permisos y funciones en una base PGlite aislada. Auth y Storage se representan con tablas de prueba; solo en esa copia se sustituyen llamadas de reloj por un reloj controlado. Esto comprueba los límites de medianoche y años futuros sin introducir mecanismos de salto de fecha en producción. No sustituye la validación del servicio Auth/Storage real.

Antes de entregar el enlace, con Supabase configurado:

- En una sesión de destinataria, intentar consultar `letters`, `letter_drafts` y fotografías futuras directamente por API: no deben estar disponibles.
- Intentar entrar a /admin y modificar perfiles/roles/configuración con esa cuenta.
- Guardar, publicar, retirar y volver a publicar una carta; comprobar que las ediciones pendientes no se exponen y las lecturas se conservan.
- Probar desde un segundo dispositivo y después de cerrar sesión o borrar almacenamiento local.
- Verificar móvil real: Safari/iPhone, Chrome/Android y navegador de WhatsApp; probar reducción de movimiento, fotos, sonido y teclado.
- Verificar la vista previa del enlace HTTPS y los metadatos públicos.

## Estado de entrega

Verificado localmente el 24 de noviembre de 2026: compilación de producción correcta, 12 pruebas de calendario/editor y 53 comprobaciones PostgreSQL superadas, y `npm audit` sin vulnerabilidades reportadas. Revisión visual del calendario en navegador con ancho móvil y de escritorio: 24 sobres presentes, sin desbordamiento horizontal y sin errores de consola. Se comprobó el aviso de sobres bloqueados y el flujo de bienvenida. El editor se verificó mediante pruebas de interacción con respuestas simuladas, complementadas por las pruebas SQL; aún no se ha validado contra un proyecto Supabase real ni en teléfonos físicos.

Supabase conectado el 24 de noviembre de 2026: migraciones aplicadas al proyecto real, 24 cartas y 24 borradores vacíos, cero publicaciones, RLS habilitado en las cinco tablas y bucket de fotos privado. Registro público y acceso anónimo desactivados. Se verificó mediante la API que las cinco tablas deniegan consultas sin sesión y que Auth tiene el registro cerrado. La compilación con la conexión real se completó y `.env` está excluido de Git. Las migraciones se ejecutaron desde SQL Editor; el historial de migraciones de la CLI no se ha sincronizado, por lo que no debes volver a aplicar la inicial al proyecto existente.

Pendiente: crear las dos cuentas, asignar sus perfiles y probar el acceso autenticado; después conectar el repositorio privado de GitHub y desplegar en Vercel. No se ha publicado todavía un enlace de la aplicación.

Documentación oficial consultada: [RLS](https://supabase.com/docs/guides/database/postgres/row-level-security), [Storage privado](https://supabase.com/docs/guides/storage/security/access-control), [Tailwind con Vite](https://tailwindcss.com/docs/installation/using-vite).

## Calendario reducido a 15 días

La experiencia abarca del 1 al 15 de diciembre. El sobre especial está en el día 15. Aplicar `supabase/migrations/202611250001_fifteen_days.sql` después de las migraciones anteriores. Conserva los registros, borradores, fotografías y lecturas de los días 16–24 sin mostrarlos en el calendario ni permitir su acceso a la destinataria. Los mensajes personalizados se conservan; solo se actualizan los textos originales predeterminados.
