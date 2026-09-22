# HISTORIAS_USUARIO.md — Historias de Usuario (MVP)

**Proyecto:** Barbers Awards

**Versión:** 1.2, alineada con `docs/USE_CASES.md` v2.2 y `docs/SCHEMA.sql` v1.3

**Formato:** Como [actor], quiero [acción], para [beneficio]. Con criterios de aceptación en formato Dado / Cuando / Entonces.

Este documento no reemplaza a `USE_CASES.md`: los casos de uso describen el sistema (flujos, pantallas, tablas). Las historias de usuario describen el mismo alcance desde la perspectiva de la persona que lo pide, en el formato que se usa para planear sprints y cargar un backlog (Jira, Trello, Linear). Cada historia referencia su caso de uso (CU-xx) y no debería leerse sin él: los criterios de aceptación dan por conocidas las reglas de negocio ya definidas allí (por ejemplo, los estados de `estado_sello` o las políticas RLS de `SCHEMA.sql`).

**Prioridad MVP piloto:** la escala MoSCoW (Must, Should, Could) no viene de `USE_CASES.md`; es la propuesta de recorte que discutimos para un primer piloto con 5 a 10 barberías, con activación manual de suscripciones. El catálogo de sellos (20) ya no depende de esa salvedad: la tabla `catalogo_sellos` es real desde `SCHEMA.sql` v1.3. Ajusta las prioridades si tu piloto es distinto.

## Resumen de historias

| ID | Historia | CU | Actor | Prioridad |
| --- | --- | --- | --- | --- |
| 1 | Ver la propuesta de valor del sello al entrar al sitio | CU-01 | Cliente Final | Must |
| 2 | Buscar y filtrar barberías en el directorio | CU-02 | Cliente Final | Must |
| 3 | Ver el perfil completo de una barbería | CU-03 | Cliente Final | Must |
| 4 | Ver el equipo de barberos y sus diplomas | CU-03B | Cliente Final | Must |
| 5 | Validar la autenticidad de un sello por su folio | CU-04 | Cliente Final | Must |
| 6 | Copiar un cupón de descuento activo | CU-05 | Cliente Final | Should |
| 7 | Reservar cita por WhatsApp con mensaje pre-redactado | CU-06 | Cliente Final | Must |
| 8 | Registrar mi barbería y crear mi cuenta | CU-07 | Dueño de Barbería | Must |
| 9 | Iniciar sesión en mi panel privado | CU-08 | Dueño de Barbería | Must |
| 10 | Editar el perfil, horarios e identidad visual de mi negocio | CU-09 | Dueño de Barbería | Must |
| 11 | Gestionar mi equipo de barberos | CU-10 | Dueño de Barbería | Must |
| 12 | Gestionar mi catálogo de servicios | CU-11 | Dueño de Barbería | Must |
| 13 | Pagar mi membresía y activar mi sello | CU-12 | Dueño de Barbería | Could |
| 14 | Crear y pausar cupones de descuento, con vigencia y tope de usos | CU-13 | Dueño de Barbería | Should |
| 15 | Redimir un cupón cuando el cliente llega al local | CU-14 | Dueño de Barbería / Barbero | Should |
| 16 | Ver las métricas de mi perfil | CU-15 | Dueño de Barbería | Should |
| 17 | Iniciar sesión en el panel administrativo | CU-16 | Administrador / Staff | Must |
| 18 | Revisar y aprobar postulaciones de nuevas barberías | CU-17 | Administrador / Staff | Must |
| 19 | Asignar o revocar certificaciones | CU-18 | Administrador / Staff | Must |
| 20 | Gestionar el catálogo de sellos | CU-19 | Administrador / Staff | Should |
| 21 | Consultar las métricas globales de la plataforma | CU-20 | Administrador / Staff | Should |

## 1. Cliente Final / Usuario Público

### 1: Ver la propuesta de valor del sello al entrar al sitio

**Historia:** Como **visitante**, quiero **entender qué es el sello Barbers Awards y qué garantiza en cuanto llego al sitio**, para **decidir si vale la pena buscar una barbería certificada**.

| Campo | Detalle |
| --- | --- |
| Caso de uso relacionado | CU-01 |
| Actor | Cliente Final / Visitante |
| Prioridad MVP piloto | Must |

**Criterios de aceptación:**
- Dado que entro a la raíz del sitio (`/`), cuando la página carga, entonces veo la propuesta de valor del sello con la línea gráfica de la marca, sin necesidad de iniciar sesión.
- Dado que estoy en la landing, cuando busco cómo explorar barberías, entonces encuentro un llamado a la acción claro hacia el directorio.
- Dado que soy dueño de una barbería, cuando reviso la landing, entonces encuentro un llamado a la acción para registrar mi negocio.

### 2: Buscar y filtrar barberías en el directorio

**Historia:** Como **visitante**, quiero **buscar y filtrar barberías por ciudad, zona, servicios y estado del sello**, para **encontrar rápido una barbería certificada cerca de mí**.

| Campo | Detalle |
| --- | --- |
| Caso de uso relacionado | CU-02 |
| Actor | Cliente Final / Visitante |
| Prioridad MVP piloto | Must |

**Criterios de aceptación:**
- Dado que estoy en `/directorio`, cuando escribo un término de búsqueda, entonces la lista se filtra en tiempo real por nombre, ciudad, zona o servicios.
- Dado que aplico un filtro de estado de sello (Gold, Silver, En Verificación), cuando se actualiza la lista, entonces solo veo barberías que cumplen ese filtro.
- Dado que una barbería tiene `estado_sello = 'inactivo'`, cuando busco en el directorio, entonces esa barbería no aparece en los resultados.

### 3: Ver el perfil completo de una barbería

**Historia:** Como **visitante**, quiero **ver el perfil completo de una barbería (fotos, servicios con precio, historia, horarios, redes y su sello con folio)**, para **decidir si es la barbería que busco antes de reservar**.

| Campo | Detalle |
| --- | --- |
| Caso de uso relacionado | CU-03 |
| Actor | Cliente Final / Visitante |
| Prioridad MVP piloto | Must |

**Criterios de aceptación:**
- Dado que entro a `/barberia/[id]`, cuando la página carga, entonces veo la galería de fotos, la dirección, los horarios, las redes sociales y el catálogo de servicios activos con su precio y duración.
- Dado que la barbería tiene un sello activo, cuando veo su perfil, entonces el badge del sello muestra su nivel y enlaza a la página de verificación con el folio correspondiente.
- Dado que el dueño no cargó historia, fotos o cupones, cuando visito el perfil, entonces esas secciones simplemente no se muestran, sin espacios rotos ni textos vacíos.
- Dado que el dueño eligió un color de acento y un logo, cuando veo el perfil, entonces los botones, badges y bordes destacados usan ese color, y el sello Gold o Silver conserva su color oficial sin importar el acento.

### 4: Ver el equipo de barberos y sus diplomas

**Historia:** Como **visitante**, quiero **ver el equipo de barberos con su experiencia, especialidades y diplomas certificados**, para **elegir con quién quiero atenderme**.

| Campo | Detalle |
| --- | --- |
| Caso de uso relacionado | CU-03B |
| Actor | Cliente Final / Visitante |
| Prioridad MVP piloto | Must |

**Criterios de aceptación:**
- Dado que estoy en el perfil de una barbería, cuando navego a "Nuestro Equipo", entonces veo una tarjeta por cada barbero con su foto, nombre y años de experiencia.
- Dado que un barbero tiene insignias de especialidad, cuando veo su tarjeta, entonces esas insignias son visibles (por ejemplo Fade Master, Visajismo, Barboterapia).
- Dado que hago clic en "Ver Certificados" de un barbero, cuando se abre el visor, entonces puedo ver sus diplomas cargados en imagen o PDF sin salir de la página.

### 5: Validar la autenticidad de un sello por su folio

**Historia:** Como **visitante**, quiero **consultar el folio de un sello y ver su estado, nivel y vigencia**, para **confirmar que la certificación es auténtica y no ha sido revocada**.

| Campo | Detalle |
| --- | --- |
| Caso de uso relacionado | CU-04 |
| Actor | Cliente Final / Visitante |
| Prioridad MVP piloto | Must |

**Criterios de aceptación:**
- Dado que entro a `/verificar/[folio]` con un folio válido, cuando la página carga, entonces veo el estado (Verificado/Activo, En Proceso o Inactivo), el nivel (Gold o Silver), la entidad emisora y las fechas de emisión y vigencia.
- Dado que hago clic en el sello desde el perfil de una barbería, cuando se abre la verificación, entonces el folio ya viene pre-cargado, sin que tenga que escribirlo.
- Dado que un sello fue revocado por el staff, cuando alguien consulta su folio, entonces el estado se refleja de inmediato, sin depender de una caché desactualizada.

### 6: Copiar un cupón de descuento activo

**Historia:** Como **visitante**, quiero **copiar un cupón de descuento activo del perfil de la barbería**, para **usarlo al reservar mi cita**.

| Campo | Detalle |
| --- | --- |
| Caso de uso relacionado | CU-05 |
| Actor | Cliente Final / Visitante |
| Prioridad MVP piloto | Should |

**Criterios de aceptación:**
- Dado que una barbería tiene cupones activos y vigentes, cuando visito su perfil, entonces los veo listados con su código y descripción.
- Dado que presiono "Copiar Cupón", cuando la acción se completa, entonces el código queda en mi portapapeles y disponible para el selector de reserva por WhatsApp.
- Dado que un cupón fue pausado por el dueño (`es_activo = false`) o ya venció (`fecha_fin`), cuando visito el perfil, entonces ese cupón ya no aparece, aunque lo haya visto antes.
- Dado que un cupón llegó a su límite total de usos, cuando visito el perfil, entonces lo veo marcado como "Agotado" y no lo puedo seleccionar al reservar.

### 7: Reservar cita por WhatsApp con mensaje pre-redactado

**Historia:** Como **visitante**, quiero **reservar mi cita por WhatsApp dando mi nombre y teléfono, y eligiendo el servicio, el barbero de mi preferencia y mi cupón, con un mensaje ya redactado**, para **agendar sin tener que escribir todo manualmente**.

| Campo | Detalle |
| --- | --- |
| Caso de uso relacionado | CU-06 |
| Actor | Cliente Final / Visitante |
| Prioridad MVP piloto | Must |

**Criterios de aceptación:**
- Dado que presiono "Reservar por WhatsApp", cuando se abre el selector, entonces me pide mi nombre y mi teléfono, y puedo elegir un servicio del catálogo activo de esa barbería, un barbero de preferencia (opcional) y el cupón copiado (opcional).
- Dado que escribo mi teléfono con un cupón ya elegido, cuando ese cupón ya lo usé antes con ese mismo teléfono, entonces se me avisa ahí mismo ("Ya usaste este cupón") y se deselecciona, sin que eso me impida seguir con la reserva.
- Dado que confirmo la reserva, cuando se abre WhatsApp, entonces el mensaje ya trae el nombre de la barbería, el servicio, el barbero y el código de descuento, sin campos vacíos si algo no se eligió.
- Dado que confirmo la reserva, cuando se abre WhatsApp, entonces mi clic también quedó registrado como un lead (con mi nombre y teléfono) para las métricas del dueño, sin que yo lo note ni tenga que esperar.
- Dado que mi cupón resulta inválido justo al momento de confirmar (por ejemplo, alguien más lo agotó segundos antes), cuando reservo, entonces mi cita se registra igual, solo que sin el descuento: la reserva nunca se cae por un problema con el cupón.

## 2. Dueño de Barbería (Suscriptor B2B)

### 8: Registrar mi barbería y crear mi cuenta

**Historia:** Como **dueño de barbería**, quiero **registrarme con los datos de mi negocio**, para **obtener acceso a mi panel privado y empezar el proceso de certificación**.

| Campo | Detalle |
| --- | --- |
| Caso de uso relacionado | CU-07 |
| Actor | Dueño de Barbería (Prospecto B2B) |
| Prioridad MVP piloto | Must |

**Criterios de aceptación:**
- Dado que lleno el formulario de `/registro` con mis datos y los de mi negocio, cuando lo envío, entonces se crea mi cuenta con el rol `barberia_owner` y mi barbería queda registrada con `estado_suscripcion = 'prueba'` y `estado_sello = 'pendiente'`.
- Dado que mi registro fue exitoso, cuando termina el proceso, entonces soy redirigido automáticamente a mi panel (`/dashboard`), sin pasos adicionales.
- Dado que el registro falla en cualquier punto, cuando reviso el error, entonces no queda una cuenta de usuario sin una barbería asociada.

### 9: Iniciar sesión en mi panel privado

**Historia:** Como **dueño de barbería**, quiero **iniciar sesión de forma segura**, para **gestionar mi negocio desde mi panel privado**.

| Campo | Detalle |
| --- | --- |
| Caso de uso relacionado | CU-08 |
| Actor | Dueño de Barbería |
| Prioridad MVP piloto | Must |

**Criterios de aceptación:**
- Dado que ingreso mi correo y contraseña correctos en `/login`, cuando se valida la sesión, entonces soy dirigido a `/dashboard`.
- Dado que ya tengo una sesión activa y entro a `/login` de nuevo, cuando la página carga, entonces se me redirige directamente a mi panel, sin pedirme credenciales otra vez.
- Dado que intento entrar a `/dashboard` sin sesión, cuando la página verifica mis permisos, entonces se me redirige a `/login`.

### 10: Editar el perfil, horarios e identidad visual de mi negocio

**Historia:** Como **dueño de barbería**, quiero **editar la información, horarios, identidad visual (color y logo) y fotos de mi negocio**, para **que mi perfil público esté siempre actualizado y refleje mi marca**.

| Campo | Detalle |
| --- | --- |
| Caso de uso relacionado | CU-09 |
| Actor | Dueño de Barbería |
| Prioridad MVP piloto | Must |

**Criterios de aceptación:**
- Dado que edito la dirección, WhatsApp, redes, eslogan, descripción, historia u horarios en `/dashboard/perfil`, cuando guardo, entonces el perfil público se actualiza sin demora.
- Dado que elijo un color de acento (Dorado, Morado, Verde o Rojo) y un logo del catálogo, cuando guardo, entonces mi perfil público refleja esa identidad visual de inmediato.
- Dado que subo una foto de mi local, cuando la selecciono, entonces se comprime en mi navegador a WebP de menos de 300 KB antes de subirse a Supabase Storage.
- Dado que intento modificar mi `estado_sello` o `estado_suscripcion` directamente, cuando envío el cambio, entonces el sistema lo rechaza: esos campos solo los cambia el staff o el proceso de pago.

### 11: Gestionar mi equipo de barberos

**Historia:** Como **dueño de barbería**, quiero **agregar a mi equipo de barberos con su experiencia, especialidades y diplomas**, para **mostrar la calidad de mi equipo en mi perfil público**.

| Campo | Detalle |
| --- | --- |
| Caso de uso relacionado | CU-10 |
| Actor | Dueño de Barbería |
| Prioridad MVP piloto | Must |

**Criterios de aceptación:**
- Dado que presiono "Agregar Barbero" en `/dashboard/equipo`, cuando lleno nombre, foto, años de experiencia e insignias, entonces el barbero queda asociado a mi barbería.
- Dado que cargo un diploma en PDF o imagen, cuando lo subo, entonces queda disponible para el visor de certificados del perfil público (4).
- Dado que intento editar barberos de otra barbería, cuando lo intento desde mi sesión, entonces el sistema me lo impide.

### 12: Gestionar mi catálogo de servicios

**Historia:** Como **dueño de barbería**, quiero **crear y administrar mi catálogo de servicios con precio y duración**, para **que mis clientes los vean en mi perfil y los elijan al reservar por WhatsApp**.

| Campo | Detalle |
| --- | --- |
| Caso de uso relacionado | CU-11 |
| Actor | Dueño de Barbería |
| Prioridad MVP piloto | Must |

**Criterios de aceptación:**
- Dado que presiono "Agregar Servicio" en `/dashboard/servicios`, cuando lleno nombre, descripción, precio, duración e ícono, entonces el servicio queda disponible para activarlo.
- Dado que marco un servicio como "Destacado", cuando se publica, entonces aparece con la etiqueta "Popular" en mi perfil.
- Dado que pauso un servicio, cuando guardo el cambio, entonces deja de aparecer en mi perfil público y en el selector de reserva por WhatsApp, sin necesidad de eliminarlo.
- Dado que intento crear dos servicios con el mismo nombre en mi barbería, cuando guardo el segundo, entonces el sistema lo rechaza.

### 13: Pagar mi membresía y activar mi sello

**Historia:** Como **dueño de barbería**, quiero **pagar mi membresía con Nequi, PSE, tarjeta o botón bancario**, para **activar o renovar mi suscripción sin trámites manuales**.

| Campo | Detalle |
| --- | --- |
| Caso de uso relacionado | CU-12 |
| Actor | Dueño de Barbería |
| Prioridad MVP piloto | Could (en el piloto se activa manualmente desde el panel de admin; ver ARCHITECTURE.md 7) |

**Criterios de aceptación:**
- Dado que elijo un plan (Mensual o Anual) en `/dashboard/checkout`, cuando confirmo, entonces se abre el widget de pago de Wompi con el monto correcto.
- Dado que Wompi aprueba mi pago, cuando el webhook lo confirma, entonces mi `estado_suscripcion` pasa a `activa` y la fecha de vencimiento se actualiza según el plan elegido.
- Dado que mi pago es rechazado o queda pendiente, cuando reviso mi panel, entonces mi suscripción no cambia de estado hasta que haya una aprobación.
- Dado que renuevo antes de que venza mi suscripción actual, cuando se aprueba el pago, entonces los días nuevos se suman desde mi fecha de vencimiento vigente, no desde hoy.

### 14: Crear y pausar cupones de descuento

**Historia:** Como **dueño de barbería**, quiero **crear y pausar códigos de descuento, con una vigencia y un tope de usos**, para **atraer más clientes con promociones sin quedar expuesto a un abuso sin límite**.

| Campo | Detalle |
| --- | --- |
| Caso de uso relacionado | CU-13 |
| Actor | Dueño de Barbería |
| Prioridad MVP piloto | Should |

**Criterios de aceptación:**
- Dado que creo un cupón en `/dashboard/cupones` con un porcentaje o un monto fijo, cuando lo guardo, entonces queda disponible para pausarlo o activarlo cuando quiera.
- Dado que el tipo de descuento es "porcentaje", cuando intento guardar un valor mayor a 100, entonces el sistema lo rechaza.
- Dado que defino una fecha de fin, cuando esa fecha pasa, entonces el cupón deja de mostrarse en mi perfil público sin que yo tenga que pausarlo a mano.
- Dado que defino un límite total de usos, cuando ese límite se alcanza, entonces el cupón se muestra como "Agotado" y ya no se puede seleccionar, aunque siga activo.
- Dado que pauso un cupón, cuando un visitante entra a mi perfil, entonces ese cupón ya no se le muestra.

### 15: Redimir un cupón cuando el cliente llega al local

**Historia:** Como **dueño de barbería o barbero**, quiero **marcar como redimido el cupón de un cliente cuando se presenta en el local**, para **llevar un conteo real de cuántos cupones se usaron de verdad, no solo cuántos se copiaron**.

| Campo | Detalle |
| --- | --- |
| Caso de uso relacionado | CU-14 |
| Actor | Dueño de Barbería / Barbero |
| Prioridad MVP piloto | Should |

**Criterios de aceptación:**
- Dado que un cliente se presenta con un cupón, cuando lo busco por su nombre o teléfono entre los leads recientes de mi barbería, entonces encuentro su reserva para confirmarla.
- Dado que confirmo la redención, cuando la guardo, entonces el contador de usos de ese cupón aumenta en uno.
- Dado que el cupón de ese cliente ya alcanzó su límite total de usos, cuando intento confirmar la redención, entonces el sistema la rechaza con un mensaje claro, en vez de fallar en silencio.
- Dado que marqué una redención por error, cuando la deshago, entonces el contador de usos vuelve a bajar, para no dejar la cifra inflada.

### 16: Ver las métricas de mi perfil

**Historia:** Como **dueño de barbería**, quiero **ver cuántos clics a WhatsApp y visitas ha generado mi perfil**, para **medir el retorno de mi inversión en el sello**.

| Campo | Detalle |
| --- | --- |
| Caso de uso relacionado | CU-15 |
| Actor | Dueño de Barbería |
| Prioridad MVP piloto | Should |

**Criterios de aceptación:**
- Dado que entro a `/dashboard`, cuando la página carga, entonces veo el total acumulado de clics a WhatsApp (leads) generados por mi perfil.
- Dado que filtro por un rango de fechas (últimos 7 o 30 días), cuando aplico el filtro, entonces las cifras se recalculan para ese periodo.
- Dado que reviso mis métricas de cupones, cuando las interpreto, entonces "cupones copiados" y "cupones redimidos" me muestran cosas distintas y reales: cuántas veces se copió el código en el perfil, y cuántas veces se confirmó de verdad en el local (15) — ya no es la misma cifra con dos nombres.

## 3. Administrador / Staff (Barbers Awards)

### 17: Iniciar sesión en el panel administrativo

**Historia:** Como **administrador de Barbers Awards**, quiero **iniciar sesión en un panel separado y protegido**, para **gestionar la plataforma sin exponer estas funciones a los dueños ni a los visitantes**.

| Campo | Detalle |
| --- | --- |
| Caso de uso relacionado | CU-16 |
| Actor | Administrador / Staff |
| Prioridad MVP piloto | Must |

**Criterios de aceptación:**
- Dado que ingreso mis credenciales en `/admin/login`, cuando el sistema valida que mi perfil tiene rol `administrator`, entonces accedo a `/admin`.
- Dado que soy un dueño de barbería o un visitante, cuando intento entrar a `/admin`, entonces el sistema me lo impide.

### 18: Revisar y aprobar postulaciones de nuevas barberías

**Historia:** Como **administrador**, quiero **revisar la información y fotos de las barberías recién registradas**, para **aprobar o rechazar su publicación en el directorio**.

| Campo | Detalle |
| --- | --- |
| Caso de uso relacionado | CU-17 |
| Actor | Administrador / Staff |
| Prioridad MVP piloto | Must |

**Criterios de aceptación:**
- Dado que entro a `/admin/postulaciones`, cuando la página carga, entonces veo el listado de barberías registradas pendientes de revisión, con su información y fotos.
- Dado que apruebo una postulación, cuando confirmo la acción, entonces la barbería queda habilitada para publicarse en el directorio.
- Dado que rechazo una postulación, cuando confirmo la acción, entonces la barbería no aparece en el directorio público.

### 19: Asignar o revocar certificaciones

**Historia:** Como **administrador**, quiero **asignar un nivel de sello a una barbería auditada y generar su folio único**, para **emitir certificaciones verificables y poder revocarlas si incumplen las normas**.

| Campo | Detalle |
| --- | --- |
| Caso de uso relacionado | CU-18 |
| Actor | Administrador / Staff |
| Prioridad MVP piloto | Must |

**Criterios de aceptación:**
- Dado que selecciono una barbería aprobada, cuando le asigno el sello Gold o Silver, entonces se genera un folio único de verificación y queda visible en `/verificar/[folio]`.
- Dado que una barbería ya tiene un sello activo, cuando intento asignarle otro, entonces el sistema me exige revocar o pausar el existente primero, para que solo tenga un sello activo a la vez.
- Dado que reviso que una barbería incumple las normas, cuando revoco su sello, entonces su estado cambia de inmediato y deja de mostrarse como certificada en su perfil.

### 20: Gestionar el catálogo de sellos

**Historia:** Como **administrador**, quiero **definir los niveles de certificación y sus requisitos**, para **mantener el estándar de calidad de Barbers Awards actualizado y flexible a futuras alianzas**.

| Campo | Detalle |
| --- | --- |
| Caso de uso relacionado | CU-19 |
| Actor | Administrador / Staff |
| Prioridad MVP piloto | Should (la tabla `catalogo_sellos` ya existe y viene sembrada con Gold y Silver desde SCHEMA.sql; falta construir esta pantalla de administración, no el modelo de datos) |

**Criterios de aceptación:**
- Dado que entro a `/admin/sellos`, cuando reviso las categorías de certificación, entonces puedo editar sus nombres y requisitos.
- Dado que edito la entidad emisora por defecto, cuando guardo el cambio, entonces las nuevas certificaciones la usan automáticamente.
- Dado que le asigno un color a un sello, cuando lo guardo, entonces el badge de esa certificación en el perfil público y en `/verificar/[folio]` usa ese color, sin que quede cableado en el código.

### 21: Consultar las métricas globales de la plataforma

**Historia:** Como **administrador**, quiero **ver el total de barberías activas, los leads generados y los ingresos por Wompi en toda la plataforma**, para **evaluar el desempeño general del negocio**.

| Campo | Detalle |
| --- | --- |
| Caso de uso relacionado | CU-20 |
| Actor | Administrador / Staff |
| Prioridad MVP piloto | Should |

**Criterios de aceptación:**
- Dado que entro a `/admin/dashboard`, cuando la página carga, entonces veo el total de barberías activas frente a las pendientes.
- Dado que reviso las métricas globales, cuando consulto los leads, entonces veo el flujo total generado hacia WhatsApp en toda la plataforma.
- Dado que reviso el log de pagos, cuando lo consulto, entonces veo los ingresos procesados a través de Wompi.

## Historial de versiones

| Versión | Cambios |
| --- | --- |
| 1.0 | Primera versión: 20 historias de usuario, una por cada caso de uso de USE_CASES.md v1.1, con prioridad MoSCoW sugerida para el piloto |
| 1.1 | Renumeración de CU-09B/CU-09C/CU-10/CU-11/CU-11B/CU-12 a CU-17 según USE_CASES.md v2.2. La historia 7 (reserva por WhatsApp) reescrita: ahora pide nombre y teléfono, y avisa si el cupón elegido ya se usó, sin que la reserva se caiga por eso. La historia 14 gana vigencia y tope de usos. Nueva historia 15: redimir un cupón en el local, con su propio tope y reversa si el staff se equivoca. La historia 16 ya distingue de verdad "cupones copiados" de "cupones redimidos" (antes era la misma cifra con dos nombres). La historia 20 sube de Could a Should: el catálogo de sellos ya es una tabla real desde SCHEMA.sql v1.3, no queda pendiente de un futuro hardcodeo. |
| 1.2 | Los identificadores pasan de "HU-01" a números simples (1, 2, 3...). El ítem que antes era "HU-14B" (insertado entre HU-14 y HU-15) pasa a ser la historia 15, y todo lo que venía después se corre en uno (HU-15 a HU-20 → 16 a 21). |
