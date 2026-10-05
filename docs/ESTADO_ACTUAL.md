# ESTADO_ACTUAL.md — Dónde quedó el proyecto

Resumen de continuidad, no la fuente de verdad técnica. Para detalle real:
`CLAUDE.md` ("Decisiones tomadas"), `ARCHITECTURE.md` (sección 7, decisiones
abiertas) y el historial de versiones en la cabecera de `SCHEMA.sql`.

**Última actualización:** 2026-10-04.

## Completado (Fases 4 a 8, todo commiteado y pusheado a `main`)

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
  sondeo de `estado_suscripcion`. SCHEMA.sql v1.7:
  `transacciones_pago.wompi_reference` + `pg_cron` de vencimiento. Precios
  reales: Mensual $79.000, Anual $790.000. **Probado de punta a punta en
  Sandbox el 2026-10-04** (ver abajo).

## ✅ Wompi: 403 de CloudFront resuelto y flujo de pago probado en Sandbox

**Causa raíz del 403:** el WAF de Wompi (CloudFront) bloquea cualquier
checkout cuyo `redirect-url` apunte a `localhost`. `CheckoutManager.tsx`
enviaba `${NEXT_PUBLIC_APP_URL}/dashboard/checkout`, que en local era
`http://localhost:3000/...`. Se confirmó pegando la URL del widget en una
pestaña nueva y cambiando solo ese parámetro: con `localhost` da 403; sin
el parámetro, o con una URL pública HTTPS, el widget carga.

**Solución:** túnel ngrok con dominio estático + `allowedDevOrigins`.
- `NEXT_PUBLIC_APP_URL` apunta al túnel en `.env.local`, y la app se usa
  desde esa URL (no desde `localhost`).
- `next.config.ts` agrega ese host a `allowedDevOrigins`.
- La URL de eventos del Sandbox en comercios.wompi.co apunta a
  `<túnel>/api/webhooks/wompi`.
- Sin túnel, `CheckoutManager.tsx` omite `redirectUrl` para que el widget
  al menos cargue (sin retorno automático ni webhook).
- Montaje completo en `ARCHITECTURE.md` 4.1.6.

**Probado de punta a punta en Sandbox (2026-10-04), verificado en pantalla
y en `transacciones_pago` / `barberias`:**
- Tarjeta aprobada: fila `APPROVED`, `estado_suscripcion` pasa a `activa`.
- Tarjeta rechazada: fila `DECLINED`, suscripción sin cambios.
- PSE aprobado y rechazado: mismo resultado, y el sondeo retoma bien al
  volver del banco por `redirect-url`.

**No probado todavía:** Nequi y Botón Bancolombia, y nada en producción.
Para salir a producción faltan las llaves y secretos `prod_` en Vercel,
`NEXT_PUBLIC_APP_URL` con el dominio real, y registrar la URL de eventos
de producción en Wompi (es distinta de la de Sandbox).

## Pendiente de confirmar

- **`pg_cron` de vencimiento de suscripciones (SCHEMA.sql v1.7)**: la
  columna `transacciones_pago.wompi_reference` de esa migración ya está
  aplicada (confirmado 2026-10-04), pero no se verificó aparte que el
  trabajo de `pg_cron` esté programado y corriendo.
- **Formato de las llaves de Supabase en `.env.local`**: en algún punto
  cambiaron de el formato nuevo (`sb_publishable_...` / `sb_secret_...`) al
  formato JWT legacy (`eyJhbGci...`, con `role: anon` / `role: service_role`
  en el payload). El `ref` de ambos JWT coincide con el proyecto correcto y
  el código funciona igual con cualquiera de los dos formatos, pero nunca
  se confirmó si el cambio fue intencional (¿se rotaron las llaves en el
  dashboard de Supabase?) o un descuido.

## Pendiente de construir

- **CU-15** (dashboard de métricas del dueño — leads, visitas, cupones
  redimidos): `/dashboard/page.tsx` sigue siendo el placeholder de la
  Fase 1. (CU-19 y CU-20, las métricas y el catálogo de sellos del lado
  **admin**, ya están construidos desde la Fase 6 — no confundir con esta.)

## Decisiones abiertas conocidas (sin resolver a propósito)

- **Decisión 16** de `ARCHITECTURE.md`: como el código de un cupón es
  público y compartido, el dueño depende de que el nombre/teléfono que el
  cliente da en el local coincida con el que dio al reservar. El buscador
  de `/dashboard/cupones` (Fase 7) solo mira los últimos 50 leads, sin
  paginación ni filtro por fecha.
- **Límite de frecuencia de `/api/leads`**: en memoria (`lib/rate-limit.ts`),
  best-effort, se reinicia en cada arranque en frío. Reemplazar por Upstash
  Ratelimit si el tráfico real del piloto lo justifica.
- **Bronce** (tercer nivel de calidad): descartado para el MVP a propósito;
  si hiciera falta, es una migración aparte sobre `catalogo_sellos`/
  `barberias.estado_sello_check`.
