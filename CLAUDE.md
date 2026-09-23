# Barbers Awards — Instrucciones del proyecto

Documentos de referencia (léelos cuando la tarea lo requiera):
docs/USE_CASES.md, docs/ARCHITECTURE.md, docs/SCHEMA.sql, docs/HISTORIAS_USUARIO.md

## Reglas
- Stack: Next.js (App Router) + TypeScript, Tailwind, Supabase (@supabase/ssr),
  Wompi, Vercel. El dominio y DNS los administra Hostinger/HostGator
  (ARCHITECTURE.md 6.1); no afecta cómo se construye la app.
- Sigue las rutas, carpetas y nombres de ARCHITECTURE.md. No inventes tablas ni
  columnas: si falta algo, propón la migración y espera mi aprobación.
- La RLS de SCHEMA.sql es la barrera de seguridad real. service_role solo en
  /api/leads, /api/webhooks/wompi y el alta de barbería en el registro.
- Las historias de HISTORIAS_USUARIO.md usan IDs numéricos (1, 2, 3...), no
  "HU-01". Los casos de uso siguen como CU-01, CU-02...
- Nunca pongas llaves ni secretos en el código ni en el chat: van en .env.local.
- Trabaja una fase a la vez. Antes de escribir código, muéstrame un plan corto
  y espera mi OK.
- Al terminar cada tarea: corre build y lint, dime cómo probarlo y sugiere el
  mensaje de commit.
- Interfaz en español (Colombia). Precios en COP.
- El perfil público parte de docs/referencias/perfil-plantilla.html
  (ARCHITECTURE.md, secciones 2.6 y 3.7).

## Decisiones tomadas
- Nombre del proyecto: es "Barbers Awards" (con "s"), no "Barbers Award". El
  dominio (`barbersawards.com`, ARCHITECTURE.md 6.1) ya usaba la forma correcta;
  el resto de documentos y el código tenían el error y se corrigieron el
  2026-09-21. Usa siempre "Barbers Awards" de aquí en adelante.
- Antiabuso de cupones: Opción 4 (teléfono + restricción única) + Opción 2
  (limite_usos). Ver SCHEMA.sql sección 4 y ARCHITECTURE.md 4.2.4.
- Redimir un cupón no lo vincula a un lead específico: es un contador de usos
  (decisión abierta 16 de ARCHITECTURE.md, sin resolver a propósito).
- Confirmación de correo: está ACTIVADA en el proyecto de Supabase (verificado
  2026-09-21 vía GET /auth/v1/settings → `mailer_autoconfirm: false`). Por eso
  `registrarBarberia()` (CU-07) no puede asumir que `signUp` deja sesión activa:
  si `signUpData.session` es null, muestra "revisa tu correo" en vez de
  redirigir a /dashboard. Si alguna vez se desactiva la confirmación en
  Supabase, ese código adaptativo sigue funcionando igual (redirige directo).
- Límite de frecuencia de `/api/leads` (Fase 5, 2026-09-22): contador en
  memoria (`lib/rate-limit.ts`), sin Upstash todavía. Es best-effort (se
  reinicia en cada arranque en frío); reemplazar por Upstash Ratelimit si el
  tráfico del piloto lo justifica. Ver ARCHITECTURE.md 4.2.5.
- Decisión abierta 5 resuelta (Fase 6, 2026-09-22): `barberias.estado_postulacion`
  (SCHEMA.sql v1.5) distingue "pendiente de revisión" de "aprobada" y
  "rechazada". Las barberías creadas ANTES de esta migración también nacen en
  `estado_postulacion = 'pendiente'` a propósito (decisión explícita del
  usuario: no se aprobaron en bloque) — hay que aprobarlas una por una desde
  `/admin/postulaciones`, igual que cualquier barbería nueva.
- Nivel de sello limitado a Gold/Silver (Fase 6, 2026-09-22): `catalogo_sellos.nivel`
  es texto libre en el esquema, pero `barberias.estado_sello_check` solo
  acepta `gold`/`silver`/`pendiente`/`inactivo`. El formulario de
  `/admin/sellos` restringe el selector de `nivel` a esos dos valores; agregar
  un nivel nuevo requiere una migración aparte que amplíe ese CHECK.
- (agrega aquí cada decisión nueva que cierres, con fecha)
