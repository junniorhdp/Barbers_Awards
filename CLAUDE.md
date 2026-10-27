# Barbers Awards — Instrucciones del proyecto

Documentos de referencia (léelos cuando la tarea lo requiera):
docs/USE_CASES.md, docs/ARCHITECTURE.md, docs/SCHEMA.sql, docs/HISTORIAS_USUARIO.md,
docs/ESTADO_ACTUAL.md (dónde quedó el proyecto: completado, bloqueantes, pendientes —
léelo primero si retomas el proyecto después de una pausa),
docs/DESIGN.md (sistema visual: los dos temas —plataforma y perfil público— y
las decisiones de diseño abiertas)

## Reglas
- Stack: Next.js (App Router) + TypeScript, Tailwind, Supabase (@supabase/ssr),
  Wompi, Vercel. El dominio y DNS los administra Hostinger/HostGator
  (ARCHITECTURE.md 6.1); no afecta cómo se construye la app. Ojo: al
  2026-10-16 `barbersawards.com` todavía no se ha adquirido (ASECOP está en
  eso); hoy producción vive en `barbers-awards.vercel.app`.
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
- Certificaciones adicionales, "Bronce" pospuesto (2026-09-28): se descartó
  agregar un tercer nivel de calidad (Bronce) para el MVP. En su lugar,
  `catalogo_sellos.categoria` (SCHEMA.sql v1.6) separa "nivel de calidad"
  (Gold/Silver, sigue siendo uno solo activo a la vez) de "reconocimiento
  adicional" (ej. "Bioseguridad", se acumula sin límite, nunca toca
  `barberias.estado_sello`). No se bloquean reconocimientos duplicados a
  propósito — se corrigen revocando a mano si el staff se equivoca; no vale
  la pena una restricción nueva sin haber visto el problema ocurrir.
  `BarberiaCard` del directorio no lista reconocimientos (solo el perfil
  completo los detalla), pero sí muestra un indicador discreto ("+
  reconocimientos", sin ícono ni conteo) cuando la barbería tiene al menos
  uno activo — ajuste menor a la decisión original, pedido tras probar que
  "En Verificación" no distinguía "sin nivel de calidad, sin nada" de "sin
  nivel de calidad, con reconocimientos". Costo: una relación embebida
  (`certificaciones ( estado, categoria )`) en la consulta que ya existía en
  `directorio/page.tsx`, sin viaje extra a la base de datos.
- Mensaje de error al eliminar un sello con historial (2026-09-28): se deja
  `certificaciones.sello_id on delete restrict` tal como está (preserva que
  `/verificar/[folio]` de una certificación revocada siga resolviendo su
  sello) — no se relaja la restricción. Solo se corrigió el mensaje para no
  insinuar que todas las certificaciones que bloquean el borrado están
  vigentes: puede ser una activa o una histórica (pausada/revocada).
- Fase 8 — Wompi (2026-09-28, actualizado 2026-10-04): precios reales del
  piloto en `.env.local` — Mensual `PLAN_MENSUAL_PRECIO_COP=79000`, Anual
  `PLAN_ANUAL_PRECIO_COP=790000` (el anual equivale a 10 meses, 2 de
  descuento). Tres reglas de negocio cerradas (decisiones 6, 7 y 8 de
  ARCHITECTURE.md):
  1. El pago de Wompi **nunca otorga ni toca el sello**: solo activa o
     renueva `estado_suscripcion`. El sello Gold/Silver sigue siendo un
     acto aparte del staff en CU-18 (`/admin/certificaciones`).
  2. Una suscripción vencida (`estado_suscripcion` distinto de `activa`/
     `prueba`) deja el **perfil visible** en el directorio y la landing,
     pero el sello se muestra como "no vigente" (`SealBadge`,
     `BarberiaCard`) — opción generosa, elegida a propósito para no ser
     estrictos con los primeros clientes del piloto sin datos reales
     todavía.
  3. `transacciones_pago.wompi_reference` (SCHEMA.sql v1.7) guarda la
     referencia de Wompi también literal (no solo codificada), para poder
     auditar pagos a mano en Supabase.

  Estado al 2026-10-04: flujo probado de punta a punta en Sandbox
  (tarjeta aprobada y rechazada, PSE aprobado y rechazado), con el webhook
  activando la suscripción y el sondeo reflejándolo en pantalla. Falta
  Nequi, Botón Bancolombia y todo lo de producción; ver
  `docs/ESTADO_ACTUAL.md`.
- Wompi bloquea `redirect-url` hacia localhost (2026-10-04): el WAF de
  Wompi responde 403 de CloudFront a cualquier checkout cuyo `redirect-url`
  apunte a `localhost` (confirmado quitando o cambiando solo ese parámetro
  en la URL del widget). Para probar pagos en local se usa ngrok con
  dominio estático (no Cloudflare Tunnel: el DNS está en Hostinger/
  HostGator), con `NEXT_PUBLIC_APP_URL` apuntando al túnel y la app abierta
  desde esa URL, no desde localhost. Sin túnel, `CheckoutManager` omite
  `redirectUrl` para que el widget cargue — es una mejora de experiencia,
  no un reemplazo del túnel: el retorno, el sondeo tras redirección y el
  webhook siguen necesitándolo. Ver ARCHITECTURE.md 4.1.6.
- CU-15, métricas del dueño (2026-10-04): `/dashboard` se construyó sin
  migración, solo con `leads_whatsapp`. Tres decisiones:
  1. "Visitas al perfil" queda fuera y la tarjeta dice "Próximamente" (a
     propósito, para que se lea como decisión y no como algo roto). Medirla
     requiere una tabla nueva y decidir cómo registrar la visita en una
     página servida desde caché; se propondrá como migración aparte.
  2. La tarjeta se llama "Reservas con cupón" (leads con `cupon_id`), no
     "Cupones copiados": copiar un código sin reservar no deja registro, y
     no se promete una medición que no existe.
  3. El filtro de 7/30 días cuenta por `leads_whatsapp.creado_en`. No hay
     fecha de redención, así que un cupón redimido se suma en el periodo en
     que se reservó; la pantalla lo explica con un texto de ayuda cuando
     hay un rango activo.
- Horarios: un día abierto exige al menos una franja (2026-10-16, commit
  `cf6a0cf`). Antes se podía guardar `{abierto: true, franjas: []}`, que
  `textoDia()` muestra como "Cerrado" (y `agruparHorarios()` colapsaba los
  siete días en "Lunes – Domingo: Cerrado"). `HorariosEditor` siembra
  09:00–18:00 al marcar un día y conserva las franjas al desmarcarlo. La
  validación va en `HorariosSchema` con `superRefine` (no en
  `HorarioDiaSchema`), porque ahí se conoce la llave del día y el mensaje
  puede nombrarlo. Solo valida el formulario (`PerfilSchema`): las filas
  ya guardadas se leen sin ese esquema. `textoDia()`, `agruparHorarios()`
  y `estaAbiertoAhora()` no se tocaron: su lógica era correcta.
- El mensaje genérico de login oculta el error real (2026-10-16): CU-08 A1
  muestra "Correo o contraseña incorrectos" ante *cualquier* fallo de
  `signInWithPassword`, no solo credenciales malas. En producción ocultó
  un 404 causado por `NEXT_PUBLIC_SUPABASE_URL` con `/rest/v1` de más.
  Antes de asumir que son las credenciales, revisar **Supabase → Logs →
  Auth Logs**, que muestra el error real.
- Lenguaje de botones plano (2026-10-19, D2 de `docs/DESIGN.md`, opción
  B): esquina de 2px, relleno sólido de `--brand`, sin degradado y sin
  sombra de color; hover con desplazamiento de 2px hacia arriba y un leve
  aclarado. Regla de radios: píldora para lo que etiqueta (insignias de
  estado, sello), plano para lo que se toca (botones, campos, tarjetas).
  El degradado oscuro del hero (hoy, el velo sobre la foto) se queda: es
  ilustración, no acabado de control. `perfil.css` todavía tiene el botón píldora con
  degradado; migrarlo es una tarea aparte. Ver `docs/DESIGN.md` sección 6.
- Foto de portada separada de la galería (2026-10-19, SCHEMA.sql v1.8):
  `barberias.foto_portada`, nullable. Antes la foto principal del perfil
  era `fotos[0]` ("la primera de la galería"), una regla invisible para el
  dueño que además repetía esa foto en la galería, y toda imagen se
  comprimía a 1600px / 300 KB, lo que la dejaba blanda en grande. Ahora la
  portada se sube aparte a `<barberiaId>/portada/` y no entra en `fotos`.
  Dos techos (`lib/image-compression.ts`): portada 2000px / 600 KB; galería
  y avatares 1600px / 300 KB. La portada exige mínimo 1600 × 900 px y
  horizontal, validado sobre el archivo original antes de comprimir
  (`ImageUploader`). Si `foto_portada` es null, el perfil usa `fotos[0]`
  para no romper las barberías existentes. Ver ARCHITECTURE.md 2.5.
- Hero del perfil: foto a sangre completa, sin poste (2026-10-19, opción
  A): el hero es `foto_portada ?? fotos[0]` a todo el ancho con un velo
  oscuro y el contenido encima; el sello va en una tarjeta sobre la foto y
  se ve también en móvil. Se eliminó el poste de barbero porque estaba
  dibujado en CSS y era idéntico en todas las barberías (treinta barberías,
  treinta perfiles con el mismo poste); la foto es lo único propio de cada
  una. Alto con `min-height` (no 100vh); la foto carga con prioridad (LCP);
  sin foto queda el fondo oscuro con el acento. Ver `docs/DESIGN.md` 8.3.
- Calidad fotográfica (2026-10-19, D3 de `docs/DESIGN.md`): se exige foto
  de calidad para estar en Barbers Awards. La decisión está cerrada; la
  implementación no. Tres niveles:
  1. Medible, en el código: la portada exige mínimo 1600 × 900 px y
     horizontal, validado sobre el original antes de comprimir. **Hecho**
     (SCHEMA.sql v1.8).
  2. Subjetivo, en la auditoría de `/admin/postulaciones`. **Pendiente**:
     esa pantalla no muestra la portada, así que el staff aprueba sin ver la
     foto que debería juzgar.
  3. Contractual: escrito donde la barbería lo lea antes de pagar.
     **Pendiente**.
  No dar por hecho que la política funciona: hoy solo se cumple el mínimo
  técnico. Ver `docs/DESIGN.md` sección 10.
- Una barbería revocada sigue en el directorio (2026-10-26, opción A): no
  se la expulsa del listado; su tarjeta dice "Sin certificación". Razón:
  si revocar equivaliera a expulsar, cada revocación le costaría un
  cliente a ASECOP y el staff tendría una razón económica para no revocar;
  un auditor con incentivos para no revocar hace que el sello no
  signifique nada. Con la opción A revocar es barato y el sello se puede
  defender. Implementación: `EstadoSelloTag` (`BarberiaCard`) y el hero
  del perfil derivan la etiqueta de la certificación de calidad **actual**
  (`src/lib/certificaciones.ts`): la activa si existe, si no la más
  reciente por `fecha_emision`; nunca del historial:
  suscripción no vigente → "No vigente"; sin certificación de calidad →
  "Sin certificación"; la más reciente en `'pendiente'` → "En
  verificación"; la más reciente activa y no vencida → "Sello Gold"/"Sello
  Silver" según `estado_sello`; cualquier otro caso (revocada, o activa
  pero vencida) → "Sin certificación". El caso por defecto es el
  conservador, no el favorable.
  `estado_sello` y `cambiarEstadoCertificacion()` no cambian; solo dejan de
  ser la única fuente de la etiqueta. `certificaciones` es obligatorio en el
  tipo de la tarjeta. Sigue abierto pausada vs. nunca auditada
  (`docs/DESIGN.md` 13.1).
- Pausar es reversible, revocar no (2026-10-26): `reanudarCertificacion()`
  devuelve a `'activo'` una certificación pausada (`'pendiente'`), con el
  mismo folio, y restaura `barberias.estado_sello` a su nivel. Solo aplica
  a certificaciones pausadas y, si es de calidad, a la más reciente de la
  barbería; una revocada no se reanuda, se emite una nueva. En
  `/admin/certificaciones`, una calidad pausada muestra "Reanudar" (y
  "Revocar") en lugar de "Asignar sello", para no fabricar folios huérfanos
  re-emitiendo.
- Estado 'vencido' en certificaciones (2026-10-26, SCHEMA.sql v1.9):
  `certificaciones.estado` admite `'vencido'`, y el `pg_cron` diario
  `expirar-certificaciones` lo pone cuando pasa `fecha_vencimiento` (mismo
  patrón que `expirar-suscripciones`). Al renovar, la vieja pasa a
  `'vencido'`, no a `'revocado'`. **El estado es una conveniencia, no un
  reemplazo**: el cron corre una vez al día, así que durante hasta 24 horas
  una vencida sigue en `'activo'`. Toda lectura del estado sigue pasando por
  `certificacionVencida()` / `certificacionVigente()`
  (`src/lib/certificaciones.ts`), que dan "vencida" tanto con `'vencido'`
  como con `'activo'` y la fecha pasada. No eliminar esas comprobaciones.
  `barberias.estado_sello` también admite `'vencido'` (CHECK
  `barberias_estado_sello_check` ampliado) y el mismo job lo pone en las
  barberías gold/silver sin certificación de calidad activa, para que
  `?sello=gold` no traiga barberías vencidas; sigue sirviendo solo para
  filtrar, nunca para una etiqueta. La migración se corre a mano en los dos
  proyectos, ANTES del push: el código escribe `'vencido'` al renovar y el
  CHECK viejo lo rechaza.
- Playfair Display es tipografía de marca (2026-10-26, decisión A): se
  usa en los dos temas, pero solo para display (el nivel del sello, títulos
  de certificado), nunca para texto corrido. Se define una sola vez en
  `src/lib/fonts.ts` y la importan el perfil y `SealBadge`; no va en el
  layout raíz, para no descargarla en páginas que no la usan. Es una
  excepción explícita a la frontera entre temas: la frontera es el color y
  el sistema, no la tipografía de marca. Ver `docs/DESIGN.md` 1.3.
- Los reconocimientos viven dentro de la tarjeta del sello (2026-10-26):
  en el hero, el bloque del sello es el encabezado y debajo van los
  reconocimientos vigentes, cada uno con su marca de 22px en el color de su
  propio sello y enlazado a su folio; sin nivel de calidad, la tarjeta se
  titula "Reconocimientos". Se eliminaron el chip "+N más" y su modal
  (`ReconocimientosBadge`): esconderlos contradecía `docs/DESIGN.md` 8.1.
  La jerarquía frente al nivel se logra con tamaño y peso, nunca bajando el
  contraste. Sin tope de cantidad por ahora (con cinco nombres cortos la
  tarjeta mide ~180px).
- El reinicio de `perfil.css` va en `@layer base` (2026-10-26): un CSS sin
  capa le gana a TODA utilidad de Tailwind v4, sin importar la
  especificidad. Suelto, `.perfil a { color: inherit }` pisaba `text-ink`
  (los nombres de los reconocimientos salían a 1,3:1) y `.perfil * {
  padding: 0 }` anulaba `px-4 py-3`. Cualquier regla genérica nueva de
  `perfil.css` que pueda chocar con una utilidad usada dentro del perfil va
  en esa capa. Si una utilidad de Tailwind "no funciona" dentro de
  `.perfil`, mirar primero esto.
- (agrega aquí cada decisión nueva que cierres, con fecha)
