# ARCHITECTURE.md — Especificaciones Técnicas

| Campo | Detalle |
| --- | --- |
| Proyecto | Barbers Awards |
| Versión | 1.3 (MVP) |
| Documentos relacionados | `docs/USE_CASES.md` (casos de uso) y `docs/SCHEMA.sql` (base de datos) |
| Audiencia | Desarrolladores y Claude Code |

> Cómo leer este documento: los identificadores CU-xx remiten a USE_CASES.md. Lo marcado como "Recomendación" va más allá de lo especificado. Las decisiones abiertas se agrupan en la sección 7.

## 1. Visión general y stack técnico

### 1.1 Qué es Barbers Awards

Barbers Awards es un SaaS de sello de calidad para barberías con tres frentes: un directorio público para clientes finales (B2C), un panel de suscriptores para dueños de barberías (B2B) con métricas de leads y ROI, y un panel interno del staff que audita postulaciones y emite certificaciones con folio verificable.

### 1.2 Stack tecnológico

| Capa | Tecnología | Rol en el proyecto |
| --- | --- | --- |
| Frontend y backend | Next.js (App Router), TypeScript | Server Components para lectura, Server Actions para mutaciones y Route Handlers para integraciones externas |
| Estilos | Tailwind CSS | Tema Premium Dark / Gold / Purple con tokens de diseño en CSS |
| Base de datos | Supabase PostgreSQL | Esquema definido en `SCHEMA.sql`, RLS activo en todas las tablas |
| Autenticación | Supabase Auth con `@supabase/ssr` | Sesión en cookies con JWT; el rol vive en `profiles.role` |
| Archivos | Supabase Storage | Bucket público `barberias-storage` |
| Pagos | Wompi (Widget Checkout y Webhooks) | Nequi, PSE, Botón Bancolombia y tarjeta |
| Despliegue | Vercel (aplicación) + Hostinger/HostGator (dominio y DNS) | Vercel: Preview por rama, Production desde `main`, variables por entorno. Hostinger/HostGator solo administra el dominio y el DNS (ver sección 6.1); no aloja la aplicación |
| Utilidades | `zod`, `browser-image-compression` | Validación de entradas y compresión de imágenes en el navegador |

> Recomendación: usar TypeScript aunque el proyecto admita JavaScript. Los tipos generados con `supabase gen types typescript` conectan el código con el esquema y detectan errores de columnas antes de desplegar.

### 1.3 Principios de arquitectura

1. **La seguridad vive en la base de datos.** RLS decide quién lee y escribe. El middleware y la interfaz solo mejoran la experiencia.
2. **El servidor es el árbitro de lo que vale dinero.** Suscripciones, pagos y leads solo los escribe el servidor con `service_role`; el navegador nunca.
3. **Lo público se sirve rápido.** El directorio y los perfiles usan renderizado estático incremental (ISR) con revalidación bajo demanda.
4. **Cliente delgado.** El navegador solo comprime imágenes y renderiza; la validación real ocurre en servidor y en la base de datos.
5. **Todo lo importante deja rastro.** Cada pago queda en `transacciones_pago` y cada sello en `certificaciones` con folio único.

### 1.4 Diagrama de componentes

```
 Navegador ─────────────────────► Vercel · Next.js (App Router)
   ▲   │ widget.js                   │  Server Components / Server Actions
   │   ▼                             │  Route Handlers  /api/*
 Wompi ── webhook firmado ───────────┤
                                     │  sesión + anon key      service_role (solo servidor)
                                     ▼
                       Supabase: PostgreSQL + RLS · Auth · Storage
```

## 2. Guía de diseño y tema visual (UI/UX)

### 2.1 Paleta Premium

| Token | Hex | Uso |
| --- | --- | --- |
| `carbon` | `#0F0F0F` | Fondo principal (Negro Carbón) |
| `night` | `#18181B` | Tarjetas, paneles y modales (Gris Noche) |
| `gold` | `#D4AF37` | Sellos, bordes de tarjetas de barberías, títulos destacados |
| `gold-amber` | `#F59E0B` | Extremo del degradado dorado, hover, énfasis |
| `violet` | `#7C3AED` | Botones primarios, foco y fondos de acento |
| `violet-neon` | `#A855F7` | Destellos (glow), enlaces y texto de acento |
| `muted` | `#A1A1AA` | Texto secundario |

Recomendación: agregar tres tokens complementarios que el brief no define: `ink` `#FAFAFA` (texto principal), `line` `#27272A` (bordes sutiles) y `silver` `#D4D4D8` (sello Silver).

### 2.2 Contraste y accesibilidad

| Combinación | Contraste aprox. | Veredicto |
| --- | --- | --- |
| `ink` sobre `carbon` | 18:1 | Correcto |
| `gold` sobre `carbon` | 9:1 | Correcto |
| `carbon` sobre `gold` (botón dorado) | 9:1 | Correcto |
| `muted` sobre `carbon` / sobre `night` | 7.5:1 / 6.9:1 | Correcto |
| Blanco sobre `violet` (botón) | 5.7:1 | Correcto |
| `violet-neon` sobre `carbon` / sobre `night` | 4.8:1 / 4.5:1 | Correcto, en el límite sobre `night` |
| `violet` sobre `carbon` (como texto) | 3.4:1 | Insuficiente para texto de cuerpo |

Regla: el texto y los enlaces sobre fondo oscuro usan `violet-neon` (`#A855F7`). El `violet` (`#7C3AED`) se reserva para rellenos, bordes y botones con texto blanco.

### 2.3 Tokens en Tailwind (v4, configuración en CSS)

```css
/* app/globals.css */
@import "tailwindcss";

@theme {
  --color-carbon: #0F0F0F;
  --color-night: #18181B;
  --color-gold: #D4AF37;
  --color-gold-amber: #F59E0B;
  --color-violet: #7C3AED;
  --color-violet-neon: #A855F7;
  --color-muted: #A1A1AA;
  --color-ink: #FAFAFA;
  --color-line: #27272A;
  --color-silver: #D4D4D8;

  --shadow-glow-violet: 0 0 24px rgb(168 85 247 / 0.35);
  --shadow-glow-gold: 0 0 20px rgb(212 175 55 / 0.25);
}

body { background: var(--color-carbon); color: var(--color-ink); }
```

Esto genera utilidades como `bg-carbon`, `text-gold`, `border-gold/40` y `shadow-glow-violet`. Si el proyecto usa Tailwind v3, los mismos valores van en `theme.extend.colors` y `theme.extend.boxShadow` de `tailwind.config.ts`.

Recomendación tipográfica: Playfair Display para títulos (aire de prestigio) e Inter para texto, cargadas con `next/font`.

### 2.4 Componentes clave

| Componente | Descripción | CU |
| --- | --- | --- |
| `BarberiaCard` | Fondo `night`, borde dorado (`border-gold/40`). Al pasar el cursor: borde dorado pleno y destello `shadow-glow-violet`. Foto con `next/image`, nombre, ciudad/zona y `SealBadge` | CU-02 |
| `SealBadge` | Color tomado de `catalogo_sellos.color_hex` (degradado del color hacia una versión más oscura, texto `on-brand`-equivalente calculado por contraste); si `color_hex` es nulo, usa `gold` como color por defecto. En verificación (contorno `violet-neon`) e inactivo (`muted`) no dependen del catálogo. Enlaza a `/verificar/[folio]` | CU-03, CU-04 |
| `TeamCard` | Avatar, nombre, años de experiencia, insignias de especialidad y botón "Ver certificados" | CU-03B |
| `DiplomaViewerModal` | Modal accesible (elemento `dialog` o Radix Dialog): foco atrapado, cierre con Esc. Imágenes con `next/image` y PDFs con `iframe` u `object`. Navegación entre diplomas | CU-03B |
| `CouponCard` | Código en fuente monoespaciada y botón "Copiar cupón" con `navigator.clipboard.writeText`. Guarda el código en el contexto de reserva | CU-05 |
| `WhatsAppBookingSheet` | Captura nombre y teléfono, valida el cupón elegido con `cupon_ya_usado()` al escribir el teléfono, selector de servicio y barbero; botón violeta "Reservar por WhatsApp" | CU-06 |
| `MetricCard` | Cifra grande en `gold`, etiqueta en `muted`, filtro por rango (7 / 30 días) | CU-15, CU-20 |
| `ImageUploader` | Selección, compresión, previsualización y subida con progreso | CU-09, CU-10 |
| `PerfilBarberia` | Composición de la página `/barberia/[id]` a partir de la plantilla base del perfil (ver 3.7) | CU-03 |
| `LogoMark` | Logo circular con degradado del acento y un ícono del catálogo `logo_preset` (tijeras, navaja, poste, peine, bigote, brocha) | CU-03, CU-09 |
| `ServiceCard` | Ícono, nombre, descripción, precio en COP y duración; cinta "Popular" si `destacado` | CU-03 |
| `HorarioList` y `OpenNowBadge` | Horario agrupado por días y estado "Abierto ahora" calculado en el navegador | CU-03 |
| `AccentPicker` y `LogoPicker` | Selectores del color de acento y del logo en `/dashboard/perfil` | CU-09 |
| `ServiciosManager` | CRUD de servicios: formulario, reordenamiento, pausa y eliminación | CU-11 |

Mapeo de estados de la base de datos a etiquetas públicas:

| Origen | Valor | Etiqueta pública |
| --- | --- | --- |
| `certificaciones.estado` | `activo` | Verificado / Activo |
| `certificaciones.estado` | `pendiente` | En proceso |
| `certificaciones.estado` | `revocado` | Inactivo |
| `certificaciones` | `activo` con `fecha_vencimiento` pasada | Vencido (recomendación) |
| `barberias.estado_sello` | `gold` / `silver` | Sello Gold / Sello Silver |
| `barberias.estado_sello` | `pendiente` | En verificación |
| `barberias.estado_sello` | `inactivo` | No se lista en el directorio |

### 2.5 Compresión de imágenes en el cliente

Toda imagen se convierte a WebP y pesa menos de 300 KB antes de subirse a Supabase Storage. Los PDF de diplomas no se comprimen (límite del bucket: 10 MB).

```ts
// lib/image-compression.ts
'use client';
import imageCompression from 'browser-image-compression';

const MAX_BYTES = 300 * 1024;

export async function compressToWebp(file: File, maxDim = 1600): Promise<File> {
  if (file.type === 'application/pdf') return file;

  let quality = 0.8;
  let out = file;
  for (let i = 0; i < 4; i++) {
    out = await imageCompression(file, {
      maxSizeMB: 0.29,
      maxWidthOrHeight: maxDim,      // 1600 fotos del local, 512 avatares
      useWebWorker: true,
      fileType: 'image/webp',
      initialQuality: quality,
    });
    if (out.size <= MAX_BYTES) break;
    quality -= 0.15;
  }
  if (out.size > MAX_BYTES) throw new Error('La imagen no se pudo reducir a menos de 300 KB');
  return out;
}
```

`maxSizeMB` es un objetivo aproximado de la librería, por eso el código verifica el tamaño final y reintenta con menor calidad.

Subida con la sesión del dueño (aplican las políticas RLS del bucket). La primera carpeta de la ruta es el id de la barbería:

```ts
const path = `${barberiaId}/fotos/${crypto.randomUUID()}.webp`;
const { error } = await supabase.storage
  .from('barberias-storage')
  .upload(path, webpFile, { contentType: 'image/webp', cacheControl: '31536000', upsert: false });
```

Convención de rutas: `{barberia_id}/fotos/`, `{barberia_id}/barberos/{barbero_id}/avatar.webp` y `{barberia_id}/barberos/{barbero_id}/diploma-N.pdf`. En la base de datos se guarda la ruta relativa y la URL pública se construye al renderizar. Para que `next/image` cargue estas imágenes hay que autorizar el dominio:

```ts
// next.config.ts
images: {
  remotePatterns: [{
    protocol: 'https',
    hostname: '<project-ref>.supabase.co',
    pathname: '/storage/v1/object/public/barberias-storage/**',
  }],
},
```

### 2.6 Tema del perfil público de barbería

El perfil `/barberia/[id]` se trata como un micrositio con identidad propia: fondo crema con secciones oscuras, tipografía Playfair Display (títulos) y Poppins (texto), y un color de acento que elige cada dueño. Es independiente del tema Dark / Gold / Purple de la plataforma (2.1) y se aísla dentro de un contenedor `.perfil` para no afectar al resto de la aplicación.

El acento se guarda en `barberias.color_acento` como una llave (`dorado`, `morado`, `verde` o `rojo`). Cada llave define cinco tokens:

| Acento | `brand` (botones, badges, bordes) | `brand-light` | `brand-dark` | `on-brand` (texto sobre botón) | `brand-text` (texto sobre fondo claro) |
| --- | --- | --- | --- | --- | --- |
| `dorado` | `#D4AF37` | `#F3D67A` | `#A3801F` | `#101012` | `#7A5F16` |
| `morado` | `#7C3AED` | `#A855F7` | `#5B21B6` | `#FFFFFF` | `#6D28D9` |
| `verde` | `#15803D` | `#4ADE80` | `#14532D` | `#FFFFFF` | `#15803D` |
| `rojo` | `#B91C1C` | `#F87171` | `#7F1D1D` | `#FFFFFF` | `#B91C1C` |

Contraste aproximado de los pares de texto (crema de referencia `#FAF6EE`):

| Par | Dorado | Morado | Verde | Rojo |
| --- | --- | --- | --- | --- |
| `on-brand` sobre `brand` | 9:1 | 5.7:1 | 5.0:1 | 6.5:1 |
| `brand-text` sobre crema | 5.6:1 | 6.6:1 | 4.6:1 | 6.0:1 |

Todos superan 4.5:1. La plantilla original usa `#A3801F` como texto pequeño sobre crema (unos 3.4:1, insuficiente), y el negro `#101012` no se lee sobre morado ni rojo; por eso existen `brand-text` y `on-brand`.

```css
/* app/(public)/barberia/perfil.css */
.perfil {
  --brand: #D4AF37;  --brand-light: #F3D67A;  --brand-dark: #A3801F;
  --on-brand: #101012;  --brand-text: #7A5F16;
}
.perfil[data-accent="morado"] {
  --brand: #7C3AED;  --brand-light: #A855F7;  --brand-dark: #5B21B6;
  --on-brand: #FFFFFF;  --brand-text: #6D28D9;
}
.perfil[data-accent="verde"] {
  --brand: #15803D;  --brand-light: #4ADE80;  --brand-dark: #14532D;
  --on-brand: #FFFFFF;  --brand-text: #15803D;
}
.perfil[data-accent="rojo"] {
  --brand: #B91C1C;  --brand-light: #F87171;  --brand-dark: #7F1D1D;
  --on-brand: #FFFFFF;  --brand-text: #B91C1C;
}

/* globals.css: expone los tokens como utilidades (bg-brand, text-brand-text, ...) */
@theme inline {
  --color-brand: var(--brand);
  --color-brand-light: var(--brand-light);
  --color-brand-dark: var(--brand-dark);
  --color-on-brand: var(--on-brand);
  --color-brand-text: var(--brand-text);
}
```

```tsx
const ACENTOS = ['dorado', 'morado', 'verde', 'rojo'] as const;
const acento = ACENTOS.includes(b.color_acento) ? b.color_acento : 'dorado';

<div className="perfil" data-accent={acento}> ... </div>
```

Reglas del sistema de acentos:

- Se guarda solo la llave, nunca un código hex libre: así se garantiza el contraste y no se admite CSS arbitrario.
- El acento se resuelve con variables CSS en el render del servidor: no requiere JavaScript, no produce parpadeo y es compatible con ISR.
- Los resplandores y fondos translúcidos usan `color-mix(in srgb, var(--brand) 18%, transparent)`.
- El acento afecta botones, badges, bordes resaltados, íconos, subrayados y el logo. No afecta el sello Gold / Silver (su color indica el nivel de certificación), el indicador verde de "Abierto ahora" ni el botón verde de WhatsApp.
- Para sumar un acento nuevo: agregar la llave al CHECK `barberias_color_acento_check` (migración) y su bloque CSS.

**Logos predefinidos.** `barberias.logo_preset` guarda una llave del catálogo `lib/logo-presets.tsx`: `tijeras`, `navaja`, `poste`, `peine`, `bigote` y `brocha`. Cada logo es un ícono SVG dibujado con `on-brand` sobre un círculo con degradado (`brand-light`, `brand`, `brand-dark`), igual que el logo de la plantilla, de modo que también cambia con el acento. En el MVP no se suben logos propios (ver decisión 12). Una llave desconocida se muestra como `tijeras`; agregar un logo nuevo es agregar una entrada al catálogo, sin migración.

## 3. Mapa de rutas y estructura de archivos (App Router)

### 3.1 Mapa de rutas

| Ruta | CU | Acceso | Renderizado |
| --- | --- | --- | --- |
| `/` | CU-01 | Público | Estático |
| `/directorio` | CU-02 | Público | Dinámico (parámetros de búsqueda en la URL) |
| `/barberia/[id]` | CU-03, 03B, 05, 06 | Público | ISR con revalidación bajo demanda |
| `/verificar/[folio]` | CU-04 | Público | Dinámico, sin caché |
| `/login` | CU-08 | Público (con sesión, redirige por rol) | Dinámico |
| `/registro` | CU-07 | Público | Dinámico |
| `/dashboard` | CU-15 | `barberia_owner` | Dinámico (métricas) |
| `/dashboard/perfil` | CU-09 | `barberia_owner` | Dinámico |
| `/dashboard/equipo` | CU-10 | `barberia_owner` | Dinámico |
| `/dashboard/servicios` | CU-11 | `barberia_owner` | Dinámico |
| `/dashboard/cupones` | CU-13, CU-14 | `barberia_owner` | Dinámico |
| `/dashboard/checkout` | CU-12 | `barberia_owner` | Dinámico (widget Wompi) |
| `/admin/login` | CU-16 | Público | Dinámico |
| `/admin` | CU-20 | `administrator` | Dinámico (métricas globales) |
| `/admin/postulaciones` | CU-17 | `administrator` | Dinámico |
| `/admin/certificaciones` | CU-18 | `administrator` | Dinámico |
| `/admin/sellos` | CU-19 | `administrator` | Dinámico |
| `/api/leads` | CU-06 | Público (con límite de frecuencia) | Route Handler |
| `/api/wompi/signature` | CU-12 | `barberia_owner` | Route Handler (complemento) |
| `/api/webhooks/wompi` | CU-12 | Wompi (firma verificada) | Route Handler |

Notas de la tabla:

- El segmento `[id]` de `/barberia/[id]` puede resolverse por `slug` (recomendado para SEO; es único en la base de datos) o por UUID. Ver decisión 11 en la sección 7.
- `/dashboard/perfil`, `/dashboard/equipo`, `/dashboard/servicios`, `/dashboard/cupones`, `/admin/postulaciones`, `/admin/certificaciones`, `/admin/sellos` y `/admin/login` provienen de las rutas de USE_CASES.md, agrupadas bajo `/dashboard` y `/admin`.
- `/api/wompi/signature` no estaba en el mapa original: la firma de integridad de Wompi debe calcularse en el servidor. Puede implementarse igualmente como Server Action.
- En Next.js 15 o superior, `params`, `searchParams` y `cookies()` son asíncronos: `const { id } = await params;`.

### 3.2 Estructura de carpetas

```
barbers-awards/
├── docs/
│   ├── USE_CASES.md
│   ├── SCHEMA.sql
│   └── ARCHITECTURE.md
├── src/
│   ├── app/
│   │   ├── layout.tsx
│   │   ├── globals.css                  # Tailwind + tokens del tema
│   │   ├── (public)/
│   │   │   ├── page.tsx                 # /
│   │   │   ├── directorio/page.tsx
│   │   │   ├── barberia/[id]/page.tsx
│   │   │   └── verificar/[folio]/page.tsx
│   │   ├── (auth)/
│   │   │   ├── actions.ts               # Server Actions login() y registrarBarberia()
│   │   │   ├── login/page.tsx
│   │   │   └── registro/page.tsx
│   │   ├── dashboard/
│   │   │   ├── layout.tsx               # verifica rol barberia_owner
│   │   │   ├── page.tsx                 # métricas de leads
│   │   │   ├── perfil/page.tsx
│   │   │   ├── equipo/page.tsx
│   │   │   ├── servicios/page.tsx
│   │   │   ├── cupones/page.tsx
│   │   │   └── checkout/page.tsx
│   │   ├── admin/
│   │   │   ├── login/page.tsx           # público: sin layout de rol por encima
│   │   │   └── (protected)/
│   │   │       ├── layout.tsx           # verifica rol administrator
│   │   │       ├── page.tsx             # métricas globales
│   │   │       ├── postulaciones/page.tsx
│   │   │       ├── certificaciones/page.tsx
│   │   │       └── sellos/page.tsx
│   │   └── api/
│   │       ├── leads/route.ts
│   │       ├── wompi/signature/route.ts
│   │       └── webhooks/wompi/route.ts
│   ├── components/                      # ui, barberias, perfil, sellos, dashboard, admin
│   ├── lib/
│   │   ├── supabase/                    # client.ts, server.ts, admin.ts, middleware.ts
│   │   ├── wompi.ts
│   │   ├── whatsapp.ts
│   │   ├── image-compression.ts
│   │   ├── accent.ts                    # llaves de acento y su validación
│   │   ├── logo-presets.tsx             # catálogo de logos e íconos de servicio
│   │   ├── horarios.ts                  # esquema zod, agrupación y "abierto ahora"
│   │   └── validators.ts                # esquemas zod
│   ├── types/database.ts                # generado con supabase gen types
│   └── proxy.ts                         # middleware.ts en Next.js < 16
├── public/
├── .env.local                           # nunca se sube a git
├── .env.example
└── next.config.ts
```

`admin/` separa `login/` (público) de `(protected)/` (grupo de rutas, no cambia
las URLs) porque un `layout.tsx` de Server Component no tiene forma de saber
"esta ruta hija es `/admin/login`, no me apliques a ella": envuelve a *todas*
las rutas del segmento donde vive. Poniendo el `layout.tsx` que verifica
`administrator` solo dentro de `(protected)/`, `/admin/login` queda fuera de
esa verificación (sigue detrás de `src/proxy.ts` y del propio formulario, pero
sin quedar atrapado en un bucle de redirección hacia sí mismo).

### 3.3 Autenticación y protección de rutas

- Supabase Auth con correo y contraseña. La sesión viaja en cookies gestionadas por `@supabase/ssr`.
- El middleware (`middleware.ts`, o `proxy.ts` en Next.js 16 o superior) refresca la sesión en cada solicitud y aplica las reglas de redirección de la tabla siguiente.
- El rol se lee de `profiles.role`; la política RLS `profiles_select_own` permite a cada usuario leer su propio perfil.
- Las páginas y Server Actions protegidas vuelven a verificar con `supabase.auth.getUser()`, nunca con `getSession()`, que no valida el token en el servidor.
- El middleware solo protege la experiencia de usuario. La seguridad real son las políticas RLS de `SCHEMA.sql`.

| Prefijo | Requiere | Si no se cumple |
| --- | --- | --- |
| `/dashboard/**` | Sesión con rol `barberia_owner` | Redirige a `/login?next=...` |
| `/admin/**` (salvo `/admin/login`) | Sesión con rol `administrator` | Redirige a `/admin/login` |
| `/login`, `/registro` | Sin sesión | Con sesión: `administrator` va a `/admin`, `barberia_owner` a `/dashboard`, `client` a `/` |

Los usuarios con rol `client` existen en el esquema, pero ningún flujo del MVP los necesita: el cliente final navega sin cuenta.

### 3.4 Acceso a datos: qué cliente de Supabase usar en cada contexto

| Contexto | Cliente | Llave | RLS |
| --- | --- | --- | --- |
| Server Components, Server Actions y Route Handlers de usuario | `createServerClient` (`@supabase/ssr`) | anon key y cookies | Sí, con la sesión del usuario |
| Componentes de cliente (subidas a Storage, interacciones) | `createBrowserClient` | anon key | Sí |
| Páginas públicas estáticas (ISR) | `createClient` de supabase-js sin sesión | anon key | Sí, rol `anon` |
| `/api/leads`, `/api/webhooks/wompi` y alta de barbería en el registro | Cliente administrador | `service_role` | No (omite RLS); solo servidor |

Las acciones del staff (aprobar, certificar, gestionar sellos) usan el cliente del servidor con la sesión del administrador: la política `*_admin_all` ya les da acceso completo, así que no necesitan `service_role`.

```ts
// lib/supabase/server.ts
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

export async function createClient() {
  const cookieStore = await cookies();
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => cookieStore.getAll(),
        setAll: (list) => {
          try {
            list.forEach(({ name, value, options }) => cookieStore.set(name, value, options));
          } catch { /* llamado desde un Server Component: el middleware refresca la sesión */ }
        },
      },
    },
  );
}
```

```ts
// lib/supabase/admin.ts
import 'server-only';                       // impide importarlo desde componentes de cliente
import { createClient } from '@supabase/supabase-js';

export const createAdminClient = () =>
  createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
```

### 3.5 Estrategia de caché

- `/`, `/directorio` y `/barberia/[id]` se leen con el cliente público sin cookies. Leer `cookies()` volvería la página dinámica y anularía el ISR.
- `/barberia/[id]` usa `revalidate` de unos 5 minutos como red de seguridad y, además, `revalidatePath` o `revalidateTag` desde las Server Actions de CU-09, CU-10, CU-11, CU-13, CU-14 y CU-18. CU-14 se agrega porque redimir un cupón cambia `veces_redimido`, y eso puede pasarlo de disponible a "Agotado" en el perfil público (sección 3.7). Así el perfil público se actualiza "en tiempo real" tras guardar cambios.
- `/verificar/[folio]` no se cachea: un sello revocado debe verse como inactivo de inmediato.
- La búsqueda del directorio sincroniza los filtros con la URL (`?q=&ciudad=&zona=&sello=`) y aplica un retraso de unos 300 ms al escribir.

### 3.6 Flujos de servidor clave

**Registro de dueño (CU-07).** Server Action con validación `zod`:

1. Llama a `signUp({ email, password, options: { data: { role: 'barberia_owner' } } })`. El trigger `handle_new_user()` crea el perfil.
2. Genera un `slug` único a partir de nombre y ciudad; si ya existe, agrega un sufijo.
3. Inserta la fila en `barberias` con `owner_id` igual al id del usuario nuevo, usando el cliente administrador. Con confirmación de correo activa, `signUp` no devuelve sesión, y un insert con el cliente normal fallaría por RLS; el cliente administrador evita ese problema.
4. Si el paso 3 falla, elimina el usuario creado para no dejar cuentas sin barbería.
5. Redirige a `/dashboard`.

**Emisión de sello (CU-18).** Server Action del administrador: toma el `sello_id` elegido del selector (poblado desde `catalogo_sellos`, CU-19), genera el folio, inserta en `certificaciones` y actualiza `barberias.estado_sello` con el `nivel` correspondiente de ese sello. Si el folio choca con uno existente (error `23505`), reintenta.

```ts
const ALFABETO = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';   // sin I, L, O ni 0/1

export function generarFolio(anio = new Date().getFullYear()) {
  const bytes = crypto.getRandomValues(new Uint8Array(5));
  const sufijo = Array.from(bytes, (b) => ALFABETO[b % ALFABETO.length]).join('');
  return `BA-${anio}-${sufijo}`;                       // ej. BA-2026-K7M4P
}
```

La página `/verificar/[folio]` normaliza el folio a mayúsculas y lo valida con `^BA-\d{4}-[A-Z0-9]{4,8}$` antes de consultar.

**Redención de cupón (CU-14).** Server Action del dueño que marca `leads_whatsapp.conversion_exitosa = true`; el conteo del cupón y el bloqueo por `limite_usos` los resuelve el trigger de la base de datos, no esta función. Código y detalle completo en la sección 4.2.6.

**Vencimiento de suscripciones.** Un trabajo programado en Supabase (`pg_cron`, extensión que se activa en Database → Extensions) marca como vencidas las suscripciones activas cuya fecha ya pasó:

```sql
select cron.schedule(
  'expirar-suscripciones', '0 5 * * *',
  $$ update public.barberias
     set estado_suscripcion = 'vencida'
     where estado_suscripcion = 'activa'
       and fecha_vencimiento_suscripcion < now() $$
);
```

### 3.7 Perfil público dinámico (/barberia/[id])

La vista parte de una plantilla HTML de una sola página (barbería "El Rayo de Oro") que se convierte en componentes de React y se conecta a Supabase. La plantilla aporta el diseño; todos los textos, imágenes, servicios y barberos salen de la base de datos.

Una sola consulta con relaciones, con el cliente público sin cookies (ISR):

```ts
const ahoraISO = new Date().toISOString();

const { data: b } = await supabase
  .from('barberias')
  .select(`
    id, nombre, slug, eslogan, descripcion, historia, anio_fundacion,
    direccion, ciudad, zona, telefono_whatsapp, instagram_url, facebook_url,
    horarios, fotos, color_acento, logo_preset, estado_sello,
    servicios ( id, nombre, descripcion, precio, duracion_min, icono, destacado, orden ),
    barberos ( id, nombre, foto_avatar, experiencia_anos, especialidades, diplomas_urls ),
    certificaciones (
      folio_verificacion, estado, fecha_emision, fecha_vencimiento,
      catalogo_sellos ( nombre_sello, nivel, color_hex )
    ),
    cupones_descuento ( id, codigo, descripcion, tipo_descuento, valor_descuento, veces_redimido, limite_usos )
  `)
  .eq('slug', id)
  .order('orden', { referencedTable: 'servicios' })
  .or(`fecha_fin.is.null,fecha_fin.gt.${ahoraISO}`, { referencedTable: 'cupones_descuento' })
  .maybeSingle();

// Un cupón que ya llegó a su limite_usos no se descarta en la consulta (RLS
// solo filtra por es_activo y fecha_fin), pero tampoco se ofrece como
// seleccionable: se marca "agotado" con los mismos datos que ya trajo la fila.
const cuponDisponible = (c: { veces_redimido: number; limite_usos: number | null }) =>
  c.limite_usos === null || c.veces_redimido < c.limite_usos;
```

Las políticas RLS se aplican también a las relaciones: el visitante solo recibe servicios y cupones activos. El filtro `.or(...)` sobre `fecha_fin` se hace en la consulta porque la política pública de `cupones_descuento` (`SCHEMA.sql`) solo exige `es_activo = true`, no vigencia; sin este filtro, un cupón vencido pero todavía activo seguiría apareciendo. De `certificaciones` se toma la fila con estado `activo`; su nombre, nivel y color ya no están fijos en el código, sino en `catalogo_sellos` (CU-19).

| Sección de la plantilla | Fuente de datos | Notas |
| --- | --- | --- |
| Encabezado y logo | `logo_preset`, `nombre`, `anio_fundacion` | Subtítulo "Desde {año}"; sin año, usa zona y ciudad |
| Portada | `eslogan`, `descripcion`, `ciudad`, `anio_fundacion` | El título es el eslogan (si falta, el nombre); su última palabra se resalta con el acento |
| Cifras de la portada | `barberos`, `servicios` | Cantidad de barberos, años de experiencia combinada (suma de `experiencia_anos`) y servicios ofrecidos. Se eliminan los contadores inventados de la plantilla |
| Indicadores flotantes | `horarios`, `certificaciones` | "Abierto ahora" y sello con folio; reemplazan "4.9 · +300 reseñas" |
| Nosotros | `historia`, `fotos`, `barberos.especialidades` | Párrafos separados por línea en blanco; la foto principal es `fotos[0]`; la lista de puntos usa las especialidades reales del equipo |
| Servicios | tabla `servicios` | Precio en COP con `Intl.NumberFormat('es-CO')`; `destacado` muestra la cinta "Popular" |
| Equipo (CU-03B) | `barberos` | Sección que la plantilla no trae: `TeamCard` y `DiplomaViewerModal` |
| Galería | `fotos` | Texto alternativo genérico ("Foto N de {nombre}"), sin pies de foto |
| Cupones (CU-05) | `cupones_descuento` | Sección que la plantilla no trae: `CouponCard`. Los cupones donde `cuponDisponible()` es falso se muestran con una etiqueta "Agotado" y no se pueden seleccionar en `WhatsAppBookingSheet` (CU-06) |
| Sello (CU-04) | `certificaciones`, `catalogo_sellos`, `estado_sello` | `SealBadge` con enlace a `/verificar/[folio]`; color y nombre del sello vienen de `catalogo_sellos`, no del código |
| Horario | `horarios` | Los días consecutivos con igual horario se agrupan ("Lunes – Viernes") |
| Contacto y redes | `direccion`, `zona`, `ciudad`, `telefono_whatsapp`, `instagram_url`, `facebook_url` | Sin correo público |
| Botones de reserva | `WhatsAppBookingSheet` | El encabezado, el bloque de contacto y el botón flotante abren el mismo selector (4.2); no quedan enlaces `#` |
| Testimonios | — | Fuera del MVP (decisión 13) |

Estructura del campo `horarios` (JSONB), validada con `zod` al guardar:

```json
{
  "lun": { "abierto": true,  "franjas": [["09:00", "13:00"], ["14:00", "19:00"]] },
  "sab": { "abierto": true,  "franjas": [["09:00", "17:00"]] },
  "dom": { "abierto": false, "franjas": [] }
}
```

Las claves de día son `lun`, `mar`, `mie`, `jue`, `vie`, `sab` y `dom`; las horas van en formato de 24 h, zona `America/Bogota`. Un objeto vacío `{}` oculta la sección.

**Conversión de la plantilla HTML a React**

- **CSS aislado.** La plantilla define estilos globales (`*`, `body`, `header`, `footer`, `h1` a `h3`) que alterarían el resto de la aplicación. Todo se encapsula bajo `.perfil` (CSS Modules o clases de Tailwind); el bloque `<style>` no se importa tal cual.
- **Fuentes.** El `<link>` de Google Fonts se sustituye por `next/font` (Playfair Display y Poppins), autoalojadas.
- **JavaScript.** La sombra del encabezado al desplazarse, el menú móvil y el botón "subir" pasan a componentes de cliente pequeños; el resto de la página es Server Component. Los contadores animados se eliminan.
- **Animaciones de aparición.** La plantilla oculta los bloques (`opacity: 0`) hasta que un script los muestra: sin JavaScript, o para un buscador, el contenido quedaría invisible. Las animaciones se activan solo después de hidratar y se desactivan con `prefers-reduced-motion`.
- **Imágenes e íconos.** Las fotos de Unsplash se reemplazan por fotos del Storage con `next/image` y los emojis por íconos SVG (por ejemplo, lucide-react) según la llave `icono` del servicio.
- **Encabezado.** El perfil usa su propio encabezado. Recomendación: agregar una franja mínima de Barbers Awards con enlace al directorio para no perder la navegación de la plataforma.
- **Secciones opcionales.** Cada bloque se muestra solo si tiene datos, para que un perfil recién creado no se vea roto.
- **"Abierto ahora".** Como la página es ISR, el estado se calcula en el navegador con la zona `America/Bogota`; calculado en el servidor quedaría congelado en la caché.
- **SEO.** `generateMetadata` con nombre, eslogan, ciudad y primera foto (Open Graph).

## 4. Integración de Wompi y redirección de WhatsApp

### 4.1 Wompi: checkout y webhook

#### 4.1.1 Flujo completo

1. El dueño elige el plan (Mensual o Anual) en `/dashboard/checkout` y pulsa "Activar Sello Verificado".
2. El cliente llama a `/api/wompi/signature` con `{ plan }`. El servidor identifica al dueño por su sesión, toma el monto de su propia tabla de planes (nunca del navegador), genera la referencia y calcula la firma de integridad.
3. El cliente carga `https://checkout.wompi.co/widget.js` y abre el widget con esos datos.
4. El dueño paga con Nequi, PSE, Botón Bancolombia o tarjeta.
5. Wompi envía un `POST` firmado a `/api/webhooks/wompi`.
6. El webhook verifica la firma, registra la transacción en `transacciones_pago` y activa o renueva la suscripción.
7. Al volver de Wompi (`redirectUrl`), la interfaz no confía en los parámetros de la URL: consulta `estado_suscripcion` cada 3 segundos, hasta 60 s, y muestra la confirmación cuando el webhook ya actualizó la base de datos.

```ts
// Cliente: apertura del widget con los datos firmados por el servidor
const checkout = new (window as any).WidgetCheckout({
  currency: 'COP',
  amountInCents,
  reference,
  publicKey: process.env.NEXT_PUBLIC_WOMPI_PUBLIC_KEY,
  signature: { integrity: signature },
  redirectUrl: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/checkout`,
});
checkout.open(() => { /* solo experiencia de usuario: la verdad la fija el webhook */ });
```

#### 4.1.2 Referencia y firma de integridad

La referencia codifica la barbería y el plan, porque `transacciones_pago` (v1.0) no guarda la referencia de Wompi. Usa guion bajo como separador: los UUID contienen guiones, pero no guiones bajos.

```ts
// lib/wompi.ts
import 'server-only';
import { createHash, timingSafeEqual } from 'node:crypto';

export const PLANES = {
  mensual: { dias: 30, cents: Number(process.env.PLAN_MENSUAL_PRECIO_COP) * 100 },
  anual: { dias: 365, cents: Number(process.env.PLAN_ANUAL_PRECIO_COP) * 100 },
} as const;
export type PlanTipo = keyof typeof PLANES;

export const buildReference = (barberiaId: string, plan: PlanTipo) =>
  `BA_${barberiaId}_${plan}_${Date.now()}`;

export function parseReference(ref: string) {
  const [prefijo, barberiaId, plan] = ref.split('_');
  if (prefijo !== 'BA' || !barberiaId || (plan !== 'mensual' && plan !== 'anual')) return null;
  return { barberiaId, plan: plan as PlanTipo };
}

// SHA-256 hex de: referencia + monto en centavos + moneda + secreto de integridad
export const integritySignature = (reference: string, amountInCents: number, currency = 'COP') =>
  createHash('sha256')
    .update(`${reference}${amountInCents}${currency}${process.env.WOMPI_INTEGRITY_SECRET}`)
    .digest('hex');
```

#### 4.1.3 Contrato del webhook

| Aspecto | Especificación |
| --- | --- |
| URL | `POST https://<dominio>/api/webhooks/wompi`, configurada en el panel de Wompi (una URL para Sandbox y otra para Producción) |
| Evento procesado | `transaction.updated`; cualquier otro evento se responde 200 y se ignora |
| Verificación de firma | SHA-256 de: valores de `signature.properties` (en orden, tomados desde `data`) + `timestamp` + `WOMPI_EVENTS_SECRET`; debe coincidir con `signature.checksum` |
| Respuesta 200 | Evento procesado, repetido o ignorado |
| Respuesta 401 | Firma inválida |
| Respuesta 500 | Error transitorio (por ejemplo, base de datos caída): Wompi reintenta el envío |
| Runtime | `nodejs` y `dynamic = 'force-dynamic'` (usa `node:crypto` y no debe cachearse) |

Ejemplo de carga útil recibida (abreviada):

```json
{
  "event": "transaction.updated",
  "data": { "transaction": {
    "id": "1234-1610641025-49201", "status": "APPROVED", "amount_in_cents": 4990000,
    "currency": "COP", "reference": "BA_<uuid>_mensual_1758300000000",
    "payment_method_type": "NEQUI"
  } },
  "signature": {
    "properties": ["transaction.id", "transaction.status", "transaction.amount_in_cents"],
    "checksum": "3476DDA50F64CD7BAD..."
  },
  "timestamp": 1530291411
}
```

Verificación de la firma:

```ts
// lib/wompi.ts (continuación)
type WompiEvent = {
  event: string;
  data: { transaction: {
    id: string; status: string; amount_in_cents: number; currency: string;
    reference: string; payment_method_type: string;
  } };
  signature: { properties: string[]; checksum: string };
  timestamp: number;
};

export function verifyWompiEvent(evt: WompiEvent): boolean {
  const valores = evt.signature.properties.map((ruta) =>
    ruta.split('.').reduce<any>((obj, clave) => obj?.[clave], evt.data),
  );
  if (valores.some((v) => v === undefined || v === null)) return false;

  const esperado = createHash('sha256')
    .update(`${valores.join('')}${evt.timestamp}${process.env.WOMPI_EVENTS_SECRET}`)
    .digest('hex');
  const recibido = String(evt.signature.checksum).toLowerCase();

  const a = Buffer.from(esperado);
  const b = Buffer.from(recibido);
  return a.length === b.length && timingSafeEqual(a, b);   // comparación en tiempo constante
}
```

Handler del webhook:

```ts
// app/api/webhooks/wompi/route.ts
import { createAdminClient } from '@/lib/supabase/admin';
import { PLANES, parseReference, verifyWompiEvent, type PlanTipo } from '@/lib/wompi';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  const evt = await req.json().catch(() => null);
  if (!evt || !verifyWompiEvent(evt)) return new Response('firma inválida', { status: 401 });
  if (evt.event !== 'transaction.updated') return new Response('ignorado', { status: 200 });

  const tx = evt.data.transaction;
  const ref = parseReference(tx.reference);
  if (!ref) return new Response('referencia desconocida', { status: 200 });

  const db = createAdminClient();

  const { data: previo } = await db
    .from('transacciones_pago').select('estado')
    .eq('wompi_transaction_id', tx.id).maybeSingle();

  const { error } = await db.from('transacciones_pago').upsert({
    barberia_id: ref.barberiaId,
    wompi_transaction_id: tx.id,
    monto: tx.amount_in_cents / 100,
    moneda: tx.currency,
    metodo_pago: tx.payment_method_type,
    estado: tx.status,
  }, { onConflict: 'wompi_transaction_id' });
  if (error) return new Response('error de base de datos', { status: 500 });

  const primeraAprobacion = tx.status === 'APPROVED' && previo?.estado !== 'APPROVED';
  if (primeraAprobacion && tx.amount_in_cents === PLANES[ref.plan].cents) {
    await activarSuscripcion(db, ref.barberiaId, ref.plan);   // ver siguiente bloque
  }
  return new Response('ok', { status: 200 });
}
```

Cálculo de la nueva vigencia (renueva sumando desde el vencimiento actual si sigue vigente):

```ts
async function activarSuscripcion(db: ReturnType<typeof createAdminClient>, id: string, plan: PlanTipo) {
  const { data: b } = await db.from('barberias')
    .select('estado_suscripcion, fecha_vencimiento_suscripcion').eq('id', id).single();

  const ahora = new Date();
  const vence = b?.fecha_vencimiento_suscripcion ? new Date(b.fecha_vencimiento_suscripcion) : null;
  const vigente = b?.estado_suscripcion === 'activa' && vence !== null && vence > ahora;
  const base = vigente ? vence! : ahora;
  const nuevoVencimiento = new Date(base.getTime() + PLANES[plan].dias * 86_400_000);

  const { error } = await db.from('barberias').update({
    estado_suscripcion: 'activa',
    plan_tipo: plan,
    fecha_inicio_suscripcion: vigente ? undefined : ahora.toISOString(),
    fecha_vencimiento_suscripcion: nuevoVencimiento.toISOString(),
  }).eq('id', id);
  if (error) throw error;      // devuelve 500 y Wompi reintenta
}
```

#### 4.1.4 Reglas de negocio del webhook

| Estado de Wompi | Acción |
| --- | --- |
| `APPROVED` (primera vez) | Registra la transacción, valida que el monto coincida con el precio del plan y activa o renueva la suscripción |
| `APPROVED` (repetido) | Responde 200 sin cambios: idempotencia garantizada por `wompi_transaction_id UNIQUE` y por la comparación con el estado previo |
| `DECLINED` / `ERROR` | Registra la transacción; no cambia la suscripción |
| `PENDING` | Registra la transacción; no cambia la suscripción |
| `VOIDED` | Registra la transacción; si antes estaba `APPROVED`, queda para revisión manual del staff (no se revoca automáticamente) |

Reglas de vigencia: Mensual suma 30 días y Anual 365. Una renovación anticipada suma desde el vencimiento vigente y no desde hoy. `fecha_inicio_suscripcion` solo cambia cuando la suscripción arranca de nuevo. Los precios salen de variables de entorno del servidor.

Endurecimiento opcional: si dos webhooks del mismo pago llegaran exactamente a la vez, ambos podrían leer el estado previo antes de que el otro escriba. Para eliminar esa ventana, mueve el bloque "registrar y activar" a una función SQL (RPC) que haga todo en una sola transacción.

#### 4.1.5 Lista de verificación de seguridad

- `WOMPI_EVENTS_SECRET`, `WOMPI_INTEGRITY_SECRET` y `SUPABASE_SERVICE_ROLE_KEY` son solo de servidor y no llevan prefijo `NEXT_PUBLIC_`.
- El monto y la referencia se calculan en el servidor; el navegador solo recibe el resultado firmado.
- La firma del webhook se compara en tiempo constante (`timingSafeEqual`).
- La página de retorno nunca activa nada: solo lee el estado que dejó el webhook.
- Los registros de log no incluyen datos personales ni secretos.
- Sandbox y Producción usan llaves, secretos y URL de eventos distintos.

#### 4.1.6 Pruebas

Usa el ambiente Sandbox de Wompi con sus llaves de prueba (`pub_test_...`) y sus datos de prueba oficiales para simular pagos aprobados y rechazados. Para recibir webhooks en local, expón `localhost` con un túnel (por ejemplo ngrok o Cloudflare Tunnel) y registra esa URL como URL de eventos del Sandbox. También puedes probar directamente en un despliegue Preview de Vercel.

### 4.2 WhatsApp Inteligente (CU-05 y CU-06)

> **Cambio de diseño (SCHEMA.sql v1.3).** Hasta la v1.1, el botón de WhatsApp no pedía ningún dato del cliente: copiar el cupón y reservar eran dos pasos independientes y de cero fricción. Desde que `leads_whatsapp` guarda `nombre_cliente` y `telefono_cliente` (`NOT NULL`) para poder evitar que un mismo teléfono redima el mismo cupón dos veces (ver la sección de antiabuso de cupones más abajo), reservar por WhatsApp ya no es de un solo clic: el selector pide nombre y teléfono antes de construir el mensaje. Es una fricción nueva, asumida a propósito, no un efecto secundario oculto.

#### 4.2.1 Flujo

1. El visitante ve los cupones activos de la barbería (CU-05). Los que ya alcanzaron su `limite_usos` se muestran con la etiqueta "Agotado" y no se pueden elegir (`cuponDisponible()`, sección 3.7); los demás se pueden copiar con "Copiar Cupón", que guarda el código en un contexto de React respaldado por `sessionStorage`.
2. Pulsa "Reservar por WhatsApp" (encabezado, bloque de contacto o botón flotante) y se abre `WhatsAppBookingSheet`, que pide: **nombre**, **teléfono**, servicio (del catálogo activo de `servicios`), barbero de preferencia (opcional) y el cupón copiado (opcional, ya viene seleccionado si venía del paso 1).
3. Al escribir el teléfono con un cupón elegido, el componente normaliza el número (`normalizeWhatsappNumber`, sección 4.2.3) y llama a `cupon_ya_usado(telefono, cupon_id)` (`SCHEMA.sql`, sección 3). Si devuelve `true`, ese cupón se marca como "Ya lo usaste" y se deselecciona, pero el resto del flujo continúa sin bloquear la reserva.
4. Al confirmar, en el mismo evento de clic, el cliente dispara `POST /api/leads` sin esperar respuesta y abre WhatsApp con la URL ya construida.

Los pasos 1 a 3 sirven para no sorprender al cliente en el último paso: la reserva (lo importante) nunca debe caerse por un cupón repetido, así que la validación pesada ocurre antes del clic final, no durante. Registrar el lead sin bloquear la redirección sigue siendo una decisión deliberada: abrir la ventana después de un `await` puede ser bloqueado por Safari en iOS y por otros navegadores móviles. Por eso `window.open` va de forma síncrona dentro del clic, y `fetch` con `keepalive: true` garantiza que la petición termine aunque el navegador cambie de página.

```tsx
function onReservar() {
  const url = buildWhatsappUrl({ telefono, barberia: nombre, servicio, barbero, cupon });
  if (!url) return;                                     // número inválido: mostrar aviso

  fetch('/api/leads', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      barberia_id: barberiaId,
      nombre_cliente: nombreCliente,
      telefono_cliente: telefonoNormalizado,             // ya validado en el paso 3
      servicio_id: servicioId,
      barbero_id: barberoId ?? null,
      cupon_id: cuponYaUsado ? null : (cuponId ?? null),  // por si el aviso del paso 3 se ignoró
    }),
    keepalive: true,
  }).catch(() => {});                                   // un fallo de métrica no frena la reserva

  window.open(url, '_blank', 'noopener');
}
```

#### 4.2.2 Número de WhatsApp

`barberias.telefono_whatsapp` (el número de la barbería, al que llega el mensaje) y `leads_whatsapp.telefono_cliente` (el número de quien reserva, usado para la Opción 4 de antiabuso) se guardan con la misma normalización: solo dígitos y código de país (ejemplo: `573001234567`). `leads_whatsapp` además exige ese formato con un `CHECK` (`^[0-9]{10,15}$`), así que la normalización debe ocurrir en el cliente antes de enviarlo.

#### 4.2.3 Construcción de la URL `wa.me`

```ts
// lib/whatsapp.ts
const CC = process.env.NEXT_PUBLIC_WHATSAPP_COUNTRY_CODE ?? '57';

export function normalizeWhatsappNumber(raw: string): string | null {
  const d = raw.replace(/\D/g, '');
  if (d.length === 10) return `${CC}${d}`;                              // celular local
  if (d.startsWith(CC) && d.length === CC.length + 10) return d;        // ya trae el código
  return d.length >= 11 && d.length <= 15 ? d : null;                   // otro país
}

type Reserva = {
  telefono: string; barberia: string; servicio: string; barbero?: string | null; cupon?: string | null;
};

export function buildWhatsappUrl({ telefono, barberia, servicio, barbero, cupon }: Reserva) {
  const numero = normalizeWhatsappNumber(telefono);
  if (!numero) return null;

  const mensaje =
    `¡Hola ${barberia}! Vengo desde Barbers Awards. Quiero agendar el servicio: ${servicio}` +
    (barbero ? ` con el barbero: ${barbero}` : '') + '.' +
    (cupon ? ` Mi código de descuento es: ${cupon}.` : '');

  return `https://wa.me/${numero}?text=${encodeURIComponent(mensaje)}`;
}
```

`telefono` aquí es el número **de la barbería** (destinatario del mensaje), no confundir con `telefono_cliente` del lead: son dos números distintos que ambos pasan por `normalizeWhatsappNumber`. Con todos los datos, el mensaje coincide con la plantilla de CU-06. Si el cliente no elige barbero o cupón, esas frases se omiten para que el texto no quede con espacios vacíos.

#### 4.2.4 Antiabuso de cupones (Opción 4 + Opción 2)

Dos mecanismos independientes y complementarios, ambos en `SCHEMA.sql` v1.3:

| Mecanismo | Qué evita | Dónde actúa | Cuándo |
| --- | --- | --- | --- |
| Opción 4 — índice único parcial `uq_leads_telefono_cupon_activo` sobre `(telefono_cliente, cupon_id)` | El mismo teléfono redime el mismo cupón dos veces | Al crear el lead (`INSERT`) | CU-06, paso 4 |
| Opción 2 — `cupones_descuento.limite_usos` + trigger `trg_leads_sync_cupon_usage` | Que un cupón se use sin tope, sin importar quién lo use | Al confirmar la redención en el local (`UPDATE ... conversion_exitosa = true`) | CU-14 |

Ambas son barreras blandas en el sentido de que `telefono_cliente` lo declara el cliente sin verificación por SMS; reducen la reutilización casual, no la impiden para alguien decidido a escribir un número distinto cada vez. El control humano en el local (el barbero reconociendo clientes) sigue siendo la última línea de defensa.

#### 4.2.5 Route Handler `/api/leads`

| Aspecto | Especificación |
| --- | --- |
| Método y acceso | `POST`, público (lo usan visitantes sin cuenta) |
| Cuerpo | `barberia_id` (UUID), `nombre_cliente`, `telefono_cliente` (ya normalizado), `servicio_id`, `barbero_id` y `cupon_id` (estos tres últimos opcionales, UUID) |
| Validación | `zod`; además confirma que la barbería exista y no esté en estado `inactivo` |
| Escritura | Cliente administrador (`service_role`); `leads_whatsapp` no tiene política de INSERT pública |
| Respuestas | 201 creado, 400 cuerpo inválido, 404 barbería no encontrada, 429 demasiadas solicitudes |
| Protección | Límite de frecuencia por IP y barbería (por ejemplo, 10 por minuto) con Upstash Ratelimit o reglas del Firewall de Vercel |
| Defensa en profundidad | El cliente ya validó `cupon_ya_usado()` y el `limite_usos` (4.2.1, 4.2.4), pero el servidor nunca confía solo en eso: si el `INSERT` con `cupon_id` falla por `23505` (mismo teléfono, mismo cupón — alguien pudo saltarse la validación del navegador) o porque el cupón alcanzó su tope entre la validación y el envío, se reintenta el mismo insert con `cupon_id: null`. La reserva nunca se cae; solo se cae el descuento |

```ts
// app/api/leads/route.ts
import { z } from 'zod';
import { createAdminClient } from '@/lib/supabase/admin';

export const runtime = 'nodejs';

const Body = z.object({
  barberia_id: z.string().uuid(),
  nombre_cliente: z.string().min(1).max(120),
  telefono_cliente: z.string().regex(/^[0-9]{10,15}$/),
  servicio_id: z.string().uuid().nullish(),
  barbero_id: z.string().uuid().nullish(),
  cupon_id: z.string().uuid().nullish(),
});

export async function POST(req: Request) {
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: 'datos inválidos' }, { status: 400 });

  // (aquí va el límite de frecuencia; responde 429 si se excede)

  const db = createAdminClient();
  const { data: barberia } = await db.from('barberias').select('id')
    .eq('id', parsed.data.barberia_id).neq('estado_sello', 'inactivo').maybeSingle();
  if (!barberia) return Response.json({ error: 'no encontrada' }, { status: 404 });

  const { error } = await db.from('leads_whatsapp').insert(parsed.data);

  if (error?.code === '23505' && parsed.data.cupon_id) {
    // Ese teléfono ya redimió ese cupón: se registra el lead igual, sin el descuento.
    const { cupon_id, ...sinCupon } = parsed.data;
    const reintento = await db.from('leads_whatsapp').insert(sinCupon);
    if (reintento.error) return Response.json({ error: 'no se pudo registrar' }, { status: 500 });
    return Response.json({ cuponRechazado: true }, { status: 201 });
  }
  if (error) return Response.json({ error: 'no se pudo registrar' }, { status: 500 });
  return new Response(null, { status: 201 });
}
```

#### 4.2.6 Redimir un cupón en el local (CU-14)

A diferencia de las versiones anteriores de este documento, redimir un cupón ya no es "buscar un código y sumar un contador suelto": es marcar como convertido el lead específico de ese cliente. El dueño o barbero, desde `/dashboard/cupones`, busca entre los leads recientes de su barbería por nombre o teléfono y confirma la redención con una Server Action:

```ts
'use server';

export async function redimirLead(leadId: string) {
  const supabase = await createClient();                 // sesión del dueño; RLS aplica
  const { error } = await supabase
    .from('leads_whatsapp')
    .update({ conversion_exitosa: true })
    .eq('id', leadId);

  if (error) {
    // El trigger trg_leads_sync_cupon_usage puede rechazar la redención si el
    // cupón ya alcanzó su limite_usos (mensaje: 'Este cupón alcanzó su límite
    // de N usos.'). Se muestra tal cual al dueño; no es un error genérico.
    return { error: error.message };
  }

  revalidatePath(`/barberia/${slugDeLaBarberia}`);        // el cupón puede pasar a "Agotado"
  return { error: null };
}
```

Este diseño deja una pregunta de producto abierta, listada en la sección 7 (decisión 16): si varias personas copiaron el mismo código público, ¿cómo encuentra el dueño el lead exacto del cliente que tiene enfrente? Hoy la única pista disponible es el nombre o el teléfono que el cliente dio al reservar, y el dueño depende de que coincida con lo que la persona le diga en el local.

Un lead representa un clic hacia WhatsApp, no una reserva confirmada. El dashboard debe llamarlo "clics a WhatsApp (leads)" para no prometer más de lo que se mide.

## 5. Variables de entorno (.env.local)

| Variable | Ámbito | Obligatoria | Descripción |
| --- | --- | --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | Público | Sí | URL del proyecto (Settings → API) |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Público | Sí | Llave anónima (o publishable). Es segura solo porque RLS protege las tablas |
| `SUPABASE_SERVICE_ROLE_KEY` | Servidor | Sí | Omite RLS. Nunca con prefijo `NEXT_PUBLIC_` ni en código de cliente |
| `NEXT_PUBLIC_WOMPI_PUBLIC_KEY` | Público | Sí | Llave pública del comercio (`pub_test_...` o `pub_prod_...`) |
| `WOMPI_INTEGRITY_SECRET` | Servidor | Sí | Secreto de integridad para firmar el checkout (`test_integrity_...` o `prod_integrity_...`) |
| `WOMPI_EVENTS_SECRET` | Servidor | Sí | Secreto de eventos para verificar el webhook (`test_events_...` o `prod_events_...`) |
| `WOMPI_PRIVATE_KEY` | Servidor | Opcional | Llave privada (`prv_...`); solo si se consulta la API de Wompi para verificar transacciones |
| `WOMPI_API_URL` | Servidor | Opcional | `https://sandbox.wompi.co/v1` o `https://production.wompi.co/v1` |
| `NEXT_PUBLIC_APP_URL` | Público | Sí | URL base del sitio (`redirectUrl` de Wompi, canonical y Open Graph) |
| `PLAN_MENSUAL_PRECIO_COP` | Servidor | Sí | Precio del plan Mensual en pesos (por definir) |
| `PLAN_ANUAL_PRECIO_COP` | Servidor | Sí | Precio del plan Anual en pesos (por definir) |
| `NEXT_PUBLIC_WHATSAPP_COUNTRY_CODE` | Público | No | Código de país por defecto; valor `57` |
| `UPSTASH_REDIS_REST_URL` y `UPSTASH_REDIS_REST_TOKEN` | Servidor | Opcional | Solo si el límite de frecuencia de `/api/leads` usa Upstash |

Plantilla `.env.example` (esta sí se sube a git, sin valores reales):

```
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://<project-ref>.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=

# Wompi
NEXT_PUBLIC_WOMPI_PUBLIC_KEY=pub_test_
WOMPI_INTEGRITY_SECRET=test_integrity_
WOMPI_EVENTS_SECRET=test_events_
WOMPI_PRIVATE_KEY=
WOMPI_API_URL=https://sandbox.wompi.co/v1

# App
NEXT_PUBLIC_APP_URL=http://localhost:3000
NEXT_PUBLIC_WHATSAPP_COUNTRY_CODE=57
PLAN_MENSUAL_PRECIO_COP=
PLAN_ANUAL_PRECIO_COP=
```

Reglas:

- Solo las variables con prefijo `NEXT_PUBLIC_` llegan al navegador. Todo lo demás permanece en el servidor.
- `.env.local` está en `.gitignore`; solo `.env.example` se versiona.
- Las variables `NEXT_PUBLIC_*` se incrustan en el build: si cambian en Vercel hay que volver a desplegar.
- Si una llave privada se filtra (por ejemplo, un commit accidental), se rota de inmediato en Supabase o Wompi.

## 6. Despliegue e Infraestructura

### 6.1 Dominio y DNS: Hostinger/HostGator → Vercel

El dominio oficial (`barbersawards.com`) se compra y se administra en el proveedor de hosting contratado (Hostinger o HostGator). Eso es lo único que hace ese proveedor: **no aloja la aplicación**. Next.js, los Server Components, los Route Handlers y las funciones Serverless corren únicamente en Vercel.

El tráfico llega a Vercel mediante registros DNS configurados en el panel de Hostinger/HostGator:

| Registro | Tipo | Apunta a | Para qué |
| --- | --- | --- | --- |
| `barbersawards.com` (raíz) | A | La IP que indique Vercel (Project Settings → Domains) | Que el dominio raíz resuelva a Vercel |
| `www.barbersawards.com` | CNAME | `cname.vercel-dns.com` | Que `www` resuelva a Vercel |

Vercel verifica esos registros y emite el certificado SSL automáticamente; no hace falta gestionar certificados en Hostinger/HostGator. Este esquema evita que el tráfico pase por un servidor de hosting compartido: el DNS solo redirige, y quien realmente responde cada solicitud HTTP es la infraestructura Serverless de Vercel.

**Cuidado con el correo.** Si el dominio también se usa para correo corporativo (por ejemplo, `contacto@barbersawards.com`) a través de Hostinger/HostGator, esos son registros **MX**, independientes de los registros A/CNAME de arriba. Configurar el dominio para Vercel no debería tocar los MX, pero conviene revisarlo al momento de hacer el cambio: es un error común pisar por accidente la configuración de correo al tocar el DNS de un dominio.

### 6.2 Entornos

- Production (rama `main`): proyecto de Supabase de producción y llaves `prod` de Wompi.
- Preview (demás ramas) y desarrollo local: proyecto de Supabase de desarrollo y llaves Sandbox de Wompi. Las variables se configuran por entorno en Vercel (Settings → Environment Variables).

**Lista de verificación previa a producción**

- Confirmar en Hostinger/HostGator que los registros A y CNAME del dominio apuntan a Vercel (sección 6.1) y que el certificado SSL de Vercel quedó emitido y activo.
- Ejecutar `SCHEMA.sql` en el proyecto de Supabase y verificar que las 9 tablas tengan RLS activo.
- Supabase Auth → URL Configuration: definir Site URL y Redirect URLs (incluye el dominio de producción y, si se usan, los previews de Vercel).
- Decidir si el correo requiere confirmación (afecta el flujo de registro, ver 3.6).
- Crear el primer administrador con el `UPDATE` documentado al final de `SCHEMA.sql`.
- Activar `pg_cron` y programar el vencimiento de suscripciones (ver 3.6).
- Configurar en Wompi la URL de eventos de cada ambiente: `https://<dominio>/api/webhooks/wompi`.
- Cargar todas las variables de la sección 5 y confirmar que ningún secreto tiene prefijo `NEXT_PUBLIC_`.
- Autorizar el dominio de Supabase en `next.config.ts` para `next/image`.
- Generar los tipos (`supabase gen types typescript`) y ejecutar el build sin errores de TypeScript.
- Probar un pago completo en Sandbox y verificar el cambio de `estado_suscripcion` en la base de datos.
- Revisar que el bucket `barberias-storage` rechace subidas de un usuario a la carpeta de otra barbería.

## 7. Decisiones abiertas y pendientes

Puntos donde los casos de uso o el esquema aún no definen todo lo que la aplicación necesita. Las filas 1, 3 y 4 quedaron resueltas y se conservan por trazabilidad; la 2 quedó resuelta solo en parte.

| # | Tema | Situación actual | Propuesta |
| --- | --- | --- | --- |
| 1 | Catálogo de servicios (CU-03, 06, 11) | **Resuelto en v1.1.** | Tabla `servicios` con RLS y CU-11 incorporados |
| 2 | Visitas y cupones copiados (CU-15) | **Parcialmente resuelto en v1.3.** El registro real del lead y la ambigüedad "copiado" vs. "redimido" quedan resueltas: `leads_whatsapp` ya guarda cada reserva con nombre y teléfono, y `conversion_exitosa` distingue con precisión un cupón efectivamente redimido en el local (CU-14) de uno solo copiado. Lo que sigue sin resolver es la mitad de "Visitas": no existe ninguna tabla que registre vistas de página, solo leads con intención de reserva | Si se necesita medir tráfico puro (no solo intención de reserva), agregar una tabla de eventos de visita, separada de `leads_whatsapp` |
| 3 | Vigencia de cupones (CU-13) | **Resuelto en v1.3.** `cupones_descuento.fecha_fin` ya existe. La política pública de RLS solo filtra por `es_activo`, así que la consulta del perfil (3.7) agrega el filtro de vigencia con `.or('fecha_fin.is.null,fecha_fin.gt.<ahora>')` | — |
| 4 | Catálogo de sellos (CU-19) | **Resuelto en v1.3.** Tabla `catalogo_sellos`, referenciada desde `certificaciones.sello_id`, sembrada con Gold y Silver por defecto | — |
| 5 | Aprobación de postulaciones (CU-17) | No se distingue "pendiente de revisión", "aprobada sin sello" y "rechazada" (solo existe `inactivo`) | Columna `estado_postulacion` |
| 6 | Referencia de Wompi | No se guarda; hoy va codificada en la referencia | Columna `wompi_reference` en `transacciones_pago` |
| 7 | Efecto del pago sobre el sello (CU-12 y CU-18) | CU-12 dice "sello activado", CU-18 dice que el staff lo asigna | Recomendado: el pago activa la membresía; el sello depende de la auditoría del staff |
| 8 | Suscripción vencida | No está definido qué ve el público | Sugerido: mantener el perfil y ocultar o marcar como no vigente el sello |
| 9 | Confirmación de correo en el registro | Determina si el insert de la barbería puede hacerse con la sesión del usuario | Recomendado: Server Action con cliente administrador (ver 3.6) |
| 10 | Precios y reglas de la prueba | Precios de los planes y alcance del periodo `prueba` sin definir | Definir antes de configurar `PLAN_*_PRECIO_COP` |
| 11 | Identificador en la URL del perfil | USE_CASES usa `/barberia/[id]`; el esquema tiene `slug` único | Resolver `[id]` por `slug` (mejor SEO) o por UUID |
| 12 | Logo propio | El MVP ofrece solo logos predefinidos; no se suben archivos | Confirmar. Permitir logo propio exigiría moderar imágenes para que no imiten el sello de Barbers Awards |
| 13 | Reseñas y testimonios | Fuera del MVP: no existe tabla y no se muestran cifras sin fuente (como "+300 reseñas") | Fase 2, con una tabla de reseñas verificadas |
| 14 | Zona horaria de "Abierto ahora" | Se usa `America/Bogota` | Confirmar; si habrá barberías fuera de Colombia, agregar la columna `zona_horaria` |
| 15 | Tema del perfil público | Tema crema y oscuro de la plantilla, distinto del Dark / Gold / Purple de la plataforma | Confirmar que se mantiene como micrositio con identidad propia |
| 16 | Cómo el dueño encuentra el lead correcto al redimir (CU-14) | Como el código del cupón es público y compartido, varias personas pueden copiarlo; redimir ahora es marcar el lead específico de un cliente (4.2.6), y hoy la única forma de encontrarlo es buscar por el nombre o teléfono que esa persona dio al reservar, sin garantía de que coincidan con lo que dice en el local | Sin resolver. Si esto genera fricción real en el piloto, evaluar pedirle al cliente un código corto de confirmación (los últimos dígitos de su teléfono, por ejemplo) al mostrar el mensaje de WhatsApp |

## Historial de versiones

| Versión | Cambios |
| --- | --- |
| 1.0 | Versión inicial del MVP |
| 1.1 | Perfil dinámico basado en la plantilla (secciones 2.6 y 3.7), color de acento y logos predefinidos, tabla `servicios` y ruta `/dashboard/servicios` (CU-11), decisiones 12 a 15 y decisión 1 resuelta |
| 1.2 | Sincronización con `SCHEMA.sql` v1.3 y `USE_CASES.md` v2.2. Renumeración de CU-09B/CU-09C/CU-10/CU-11/CU-11B/CU-12 a CU-17 en toda la sección 3 y en 2.4, siguiendo la regla "número propio si tiene ruta propia" acordada con el equipo. `SealBadge` y la consulta del perfil (3.7) usan `catalogo_sellos` en vez de un nivel de sello fijo en el código. Cupones con vigencia (`fecha_fin`) filtrada también en la consulta pública, no solo en RLS. Sección 4.2 reescrita: el selector de WhatsApp ahora captura nombre y teléfono, valida con `cupon_ya_usado()` y respeta `limite_usos` antes de crear el lead (Opción 4 + Opción 2 de antiabuso); nueva sección 4.2.6 sobre cómo se redime un cupón (CU-14) marcando el lead como convertido. Decisiones 2 (parcial), 3 y 4 marcadas resueltas; nueva decisión 16 sobre cómo el dueño ubica el lead correcto al redimir. |
| 1.3 | Sección 6 renombrada a "Despliegue e Infraestructura": nueva 6.1 documentando que el dominio (`barbersawards.com`) se administra en Hostinger/HostGator solo para DNS (registros A y CNAME hacia Vercel), mientras la aplicación corre íntegramente en Vercel. Corrección menor: la lista de verificación decía "8 tablas", ya eran 9 desde la v1.2 (se agregó `catalogo_sellos`). |
