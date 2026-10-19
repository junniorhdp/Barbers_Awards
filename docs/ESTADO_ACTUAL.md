# ESTADO_ACTUAL.md — Dónde quedó el proyecto

Resumen de continuidad, no la fuente de verdad técnica. Para detalle real:
`CLAUDE.md` ("Decisiones tomadas"), `ARCHITECTURE.md` (sección 7, decisiones
abiertas) y el historial de versiones en la cabecera de `SCHEMA.sql`.

**Última actualización:** 2026-10-19.

**En una línea:** la app está desplegada en Vercel
(`barbers-awards.vercel.app`) con su propio proyecto de Supabase de
producción, y la prueba completa en producción pasó 8 de 8. El rediseño del
perfil público (2026-10-19) está hecho y desplegado. El dominio
`barbersawards.com` todavía no se ha adquirido (bloqueado por fuera del
equipo), y falta todo lo necesario para cobrarle a clientes reales. Los
pagos solo se han probado en Sandbox, nunca en producción.

## Completado (Fases 4 a 8, CU-15, despliegue y rediseño del perfil, todo commiteado y pusheado a `main`)

- **Fase 4** — Landing, directorio, perfil público. `docs/referencias/perfil-plantilla.html`
  convertida a React, aislada en `.perfil`. Sistema de acento/logo
  (`color_acento`, `logo_preset`). Búsqueda del directorio por nombre,
  ciudad, zona y servicio.
- **Fase 5** — WhatsApp, leads, cupones. `WhatsAppBookingSheet` +
  `ReservaContext` + `CouponCard`. `/api/leads` con reintento sin cupón.
  Límite de frecuencia **en memoria** (no Upstash). `/dashboard/cupones`
  CRUD (CU-13).
- **Fase 6** — Panel de administración. `barberias.estado_postulacion`
  (SCHEMA.sql v1.5). `/admin/postulaciones`, `/admin/certificaciones`,
  `/admin/sellos`, `/admin` (métricas globales, CU-20).
- **Entre fases** — "Certificaciones adicionales": `catalogo_sellos.categoria`
  (SCHEMA.sql v1.6) separa nivel de calidad (Gold/Silver, excluyente) de
  reconocimientos acumulables (ej. "Bioseguridad"). Bronce pospuesto.
  Contraste real WCAG y rediseño visual de `SealBadge`.
- **Fase 7** — Redimir cupón en el local (CU-14). `RedimirLeadManager` en
  `/dashboard/cupones`: busca por nombre/teléfono entre los últimos 50
  leads, marca `conversion_exitosa`, "Deshacer" con confirmación.
- **Fase 8** — Pagos con Wompi (CU-12). `lib/wompi.ts`,
  `/api/wompi/signature`, `/api/webhooks/wompi`, `/dashboard/checkout` con
  sondeo de `estado_suscripcion`. Probado de punta a punta **solo en
  Sandbox** (ver abajo).
- **CU-15** — Métricas del dueño en `/dashboard` (commit `9c7aadd`). Tres
  tarjetas calculadas desde `leads_whatsapp`, sin tablas nuevas: clics a
  WhatsApp, reservas con cupón y cupones redimidos en el local, con filtro
  de 7 días / 30 días / todo. El filtro cuenta por fecha de creación del
  lead (no existe fecha de redención). "Visitas al perfil" aparece como
  "Próximamente".
- **SCHEMA.sql v1.7** — aplicada en desarrollo y en producción. En
  producción se corrió el archivo completo sobre un proyecto nuevo y vacío:
  9 tablas con RLS, Gold y Silver sembrados, cron `expirar-suscripciones`
  activo (`0 5 * * *` UTC = medianoche en Colombia) y bucket
  `barberias-storage`. `pg_cron` activo en ambos proyectos.

## ✅ Wompi: 403 de CloudFront resuelto (2026-10-04) — probado en Sandbox, no en producción

**Causa raíz del 403:** el WAF de Wompi (CloudFront) bloquea cualquier
checkout cuyo `redirect-url` apunte a `localhost`. Se confirmó pegando la
URL del widget en una pestaña nueva y cambiando solo ese parámetro: con
`localhost` da 403; sin el parámetro, o con una URL pública HTTPS, el
widget carga.

**Solución:**
- Túnel ngrok con dominio fijo; `NEXT_PUBLIC_APP_URL` apunta al túnel y la
  app se usa desde esa URL, no desde `localhost`.
- `next.config.ts` agrega ese host a `allowedDevOrigins`.
- `CheckoutManager.tsx` omite `redirectUrl` cuando la app corre en
  `localhost` (el widget carga, pero sin retorno automático ni webhook).
- Montaje completo en `ARCHITECTURE.md` 4.1.6.

**Además había dos errores en el panel de Wompi**, sin relación con el
código: se estaba mirando el ambiente de producción en vez del Sandbox, y a
la URL de eventos le faltaba `/api/webhooks/wompi`.

**Probado de punta a punta en Sandbox**, verificado en pantalla y en la
base de datos:
- Tarjeta aprobada (`4242 4242 4242 4242`): fila `APPROVED` en
  `transacciones_pago` con su `wompi_reference`; la suscripción se activa
  con el vencimiento correcto.
- Tarjeta rechazada (`4111 1111 1111 1111`): fila `DECLINED`, suscripción
  sin cambios.
- PSE aprobado y rechazado: mismo resultado, y el sondeo retoma bien al
  volver del banco por `redirect-url`.

**SIN probar:** Nequi, Botón Bancolombia y **todo lo de producción** (no se
ha hecho ningún pago en producción).

## ✅ Despliegue a producción (2026-10-16)

Desplegado en Vercel (`barbers-awards.vercel.app`) con un proyecto de
Supabase de producción separado del de desarrollo, sin los datos de prueba,
y tres cuentas de administrador.

- **Login de admin en producción: resuelto.** `NEXT_PUBLIC_SUPABASE_URL` en
  Vercel tenía `/rest/v1` de más al final, así que la petición de
  autenticación iba a `/rest/v1/auth/v1/token` y devolvía 404. El mensaje
  genérico de CU-08 A1 lo mostraba como "Correo o contraseña incorrectos".
- **Lección que hay que recordar:** ese mensaje genérico oculta *cualquier*
  fallo de `signInWithPassword`, no solo credenciales malas. Para
  diagnosticar, **Supabase → Logs → Auth Logs** muestra el error real. No
  asumir que "credenciales incorrectas" significa credenciales.
- `NEXT_PUBLIC_APP_URL` verificado correcto en Vercel.
- Redirect URLs de Supabase Auth configuradas para el dominio de Vercel.
- **Prueba completa en producción: pasada, 8 de 8.** Registro, correo de
  confirmación, login, perfil completo, perfil público y reserva por
  WhatsApp, panel de admin, verificación de folio y limpieza. La barbería
  de prueba se borró.

Lo que esa prueba **no** cubrió: pagos (ver la sección de Wompi) y el
dominio real, que todavía no existe (ver "Bloqueado por fuera del equipo").

## Arreglos del 2026-10-16

- **Horarios** (commit `cf6a0cf`): marcar un día como abierto sin agregarle
  franjas guardaba `{abierto: true, franjas: []}`, que `textoDia()` muestra
  como "Cerrado". Como los siete días daban el mismo texto,
  `agruparHorarios()` los colapsaba en una sola fila "Lunes – Domingo:
  Cerrado". `HorariosEditor` ahora siembra 09:00–18:00 al marcar un día, y
  `HorariosSchema` lo valida con `superRefine` nombrando el día que falla.
- **Cerrar sesión y navegación del admin** (commit `fe0cb39`): botón de
  cerrar sesión en los dos paneles y barra de navegación en `/admin`, cuyas
  secciones antes solo se alcanzaban escribiendo la URL.
- **Servicios destacados primero** (commit `8b361e1`): marcar un servicio
  como destacado pintaba la cinta "Popular" pero no lo movía. La consulta
  del perfil público ahora ordena por destacado y después por el orden
  manual del dueño (también el selector de reserva por WhatsApp, que usa la
  misma lista). `/dashboard/servicios` conserva el orden manual.

## ✅ Rediseño del perfil público (2026-10-19)

Siete commits, todos en `main` y desplegados en producción:

- **`8f7e592`** — `docs/DESIGN.md` creado y referenciado; D2 cerrada con la
  opción B (botón plano).
- **`622ed56`** — `perfil.css` migrado al lenguaje plano: botones con
  esquina de 2px, relleno sólido, sin degradado ni sombra de color. Escala
  de radios nueva: píldora para lo que etiqueta, plano para lo que se toca.
- **`906a533`** — `prefers-reduced-motion` ahora cubre los hovers.
  **Lección:** el bloque está al **final** de `perfil.css` a propósito.
  Puesto al principio perdía por especificidad contra los hovers definidos
  más abajo, y parecía funcionar sin hacer nada.
- **`6c7a35e`** — el botón del encabezado se cortaba en móvil
  (`white-space: nowrap` con el texto completo); ahora tiene una etiqueta
  corta por debajo de 760px.
- **`8d7cf5e`** — SCHEMA.sql v1.8: `barberias.foto_portada`. **Aplicada en
  desarrollo y en producción, verificada en ambos.** La portada tiene
  exigencia propia (mínimo 1600 × 900, horizontal, validado sobre el
  original antes de comprimir) y techo propio (2000px / 600 KB, contra
  1600px / 300 KB de la galería). Sin portada, el perfil usa `fotos[0]`.
  `BarberiaCard` del directorio y de la landing también la usan.
- **`b39a7d0`** — los avatares del equipo se comprimían a 1600px para
  mostrarse a 88px; ahora a 512px.
- **`97a8230`** — el hero pasa a foto de portada a sangre completa con velo
  oscuro. Se eliminó el poste de barbero y su CSS. El sello va en una
  tarjeta sobre la foto y ahora se ve también en móvil. "Nosotros" muestra
  una foto de galería distinta a la del hero. Incluye el truncado del nombre
  en la barra para que la hamburguesa no se salga a 360px.

**Probado en el navegador:** portada clara, sin ninguna foto, los cuatro
acentos, 360px y 320px, y nombre largo.

**Decisiones de producto cerradas hoy:**
- **D3 (calidad fotográfica):** se exige foto de calidad para estar en
  Barbers Awards. El mecanismo tiene tres niveles: lo medible en el código
  (medidas y orientación), lo subjetivo en la auditoría de
  `/admin/postulaciones` y lo contractual. **Ojo: el nivel de la auditoría
  NO está implementado** (ver "Mejoras detectadas, sin hacer").
- **Poste de barbero eliminado:** era idéntico en todas las barberías; la
  foto es lo único propio de cada una.

## Bloqueado por fuera del equipo

- **`barbersawards.com` todavía NO se ha adquirido.** El dueño del proyecto
  (ASECOP) está en eso. Hasta que exista el dominio no hay nada que hacer en
  Hostinger/HostGator ni en Vercel: producción se queda en
  `barbers-awards.vercel.app` y está bien así.
- **Cuando el dominio exista, la secuencia es:**
  1. Agregarlo en Vercel.
  2. Crear los registros A y CNAME en Hostinger/HostGator **sin tocar los
     MX** del correo (`ARCHITECTURE.md` 6.1).
  3. Esperar la propagación.
  4. Después, y solo después: cambiar `NEXT_PUBLIC_APP_URL` al dominio real
     (requiere volver a desplegar) y agregar el dominio a las Redirect URLs
     de Supabase Auth.
- **No hacerlo a medias:** dejar `NEXT_PUBLIC_APP_URL` apuntando a un
  dominio que todavía no resuelve rompe los correos de confirmación.

**Ojo con la documentación:** `CLAUDE.md` y `ARCHITECTURE.md` 6.1 hablan
de `barbersawards.com` como si ya existiera. Es una suposición de la
planeación, no un hecho: al 2026-10-16 el dominio no está comprado. Lo
único real hoy es `barbers-awards.vercel.app`.

## Antes de cobrarle a clientes reales

- **Vercel Pro:** el plan gratuito no permite uso comercial.
- **SMTP propio** para los correos de Supabase Auth.
- **Precios reales:** hoy están los de prueba ($79.000 mensual y $790.000
  anual); lo acordado es $1.500.000 al año.
- **Llaves de Wompi de producción**, con la URL de eventos en el dominio
  real.
- **Términos de uso y política de tratamiento de datos** publicados.

## Mejoras detectadas, sin hacer

- **`/admin/postulaciones` NO muestra la foto de portada.** El staff aprueba
  sin ver la foto que se supone que debe auditar. Esto rompe el mecanismo de
  D3.
- **Al reemplazar una portada, el archivo anterior queda huérfano en
  Storage.** Ocurre en **cada** reemplazo, que es una acción normal, no un
  fallo.
- Los íconos de contacto son emojis (📍 📞) y el botón de WhatsApp usa un
  ícono genérico, no el glifo oficial.
- Las fotos y certificados de un barbero solo se pueden agregar editándolo
  después de crearlo, no al crearlo.
- El correo de confirmación usa la plantilla por defecto de Supabase.
- `/verificar/[folio]` funciona, pero está visualmente pobre.
- **Propuesta sin hacer:** separar la foto de "Nosotros" en su propia
  columna (`foto_nosotros`, v1.9). Hoy toma una de la galería por una regla
  que el dueño no controla.

## Frontend

- Hay una maqueta visual del perfil en un canvas de Claude Design, con
  cuatro tableros: escritorio, móvil, flujo de reserva y sistema de acento
  y sello. Toma de Barbería Lords los patrones de reserva por servicio y por
  profesional, la ficha de servicio con duración y precio, y las preguntas
  frecuentes.
- `docs/DESIGN.md` existe y está aplicado al perfil. D2 resuelta (botón
  plano). Siguen abiertas: **D1** (reemplazar Poppins), **D3** (cerrada como
  política, falta el mecanismo de auditoría) y **D4** (referencia de Refero
  para la plataforma, sin elegir).
- **Hallazgo:** la densidad visual de Barbería Lords viene sobre todo de
  fotografía profesional y de elementos de confianza (calificación, conteo
  de reseñas, testimonios, contadores) que este proyecto no puede replicar
  sin inventar datos — justo lo que la decisión 13 de `ARCHITECTURE.md`
  eliminó a propósito. La propuesta es que el sello cargue ese peso. Lo de
  la calidad fotográfica se cerró el 2026-10-19 como D3 (ver arriba).

## Pendiente de confirmar

- **Formato de las llaves de Supabase en `.env.local`**: en algún punto
  cambiaron del formato nuevo (`sb_publishable_...` / `sb_secret_...`) al
  formato JWT legacy (`eyJhbGci...`, con `role: anon` / `role: service_role`
  en el payload). El `ref` de ambos JWT coincide con el proyecto correcto y
  el código funciona igual con cualquiera de los dos formatos, pero nunca
  se confirmó si el cambio fue intencional (¿se rotaron las llaves en el
  dashboard de Supabase?) o un descuido.

## Decisiones de producto pendientes

- Quitar la regla que muestra el sello como "no vigente" por falta de pago
  (hoy vigente: decisión 8 de `ARCHITECTURE.md`).
- **Visitas al perfil** (decisión abierta 2): necesita una tabla nueva de
  eventos de visita y decidir cómo se registra en una página servida desde
  caché; requiere una migración aprobada aparte.
- **Decisión abierta 16 (cupones):** la prueba en producción confirmó que es
  fácil usar un código ajeno, porque el código es público y el buscador de
  `/dashboard/cupones` solo mira los últimos 50 leads, sin paginación ni
  filtro por fecha. Sigue sin resolver, ahora con evidencia real.
- **Stripe** "cuando corresponda", según el contrato.
- **Nueva, sin decidir:** si los certificados de los barberos deben poder
  descargarse desde el perfil público.

## Lo que NO cambió (decisiones abiertas que siguen igual)

- **Límite de frecuencia de `/api/leads`**: en memoria (`lib/rate-limit.ts`),
  best-effort, se reinicia en cada arranque en frío. Reemplazar por Upstash
  Ratelimit si el tráfico real del piloto lo justifica.
- **Bronce** (tercer nivel de calidad): descartado para el MVP a propósito;
  si hiciera falta, es una migración aparte sobre `catalogo_sellos`/
  `barberias.estado_sello_check`.
- **Dossier del dueño** (votaciones, nominaciones, Top 10, Barber Pass):
  solo si los clientes lo piden.
