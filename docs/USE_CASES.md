# USE_CASES.md — Especificación de Casos de Uso (MVP)

**Proyecto:** Barbers Awards

**Versión:** 2.2 (MVP — numeración consistente de los casos de uso B2B)

**Arquitectura:** Next.js (App Router), Supabase (PostgreSQL + Auth + Storage), Tailwind CSS (Theme Dark/Gold), Wompi.

> **Nota de esta versión.** La v2.1 mantenía Equipo y Servicios como sufijos de letra (CU-09B, CU-09C), aunque cada uno tiene su propia ruta en el dashboard (`/dashboard/equipo`, `/dashboard/servicios`) y su propia tabla en la base de datos — igual que Cupones, que sí tenía número propio (CU-11). Esta v2.2 corrige esa inconsistencia con una regla simple: **un caso de uso lleva número propio si tiene su propia ruta; lleva sufijo con letra si es una sección dentro de una página que ya tiene su propio caso de uso.** Por eso CU-03B (equipo visto desde el perfil público) sigue como sufijo — es una sección de `/barberia/[id]`, la misma página de CU-03 — mientras que Equipo, Servicios y Redimir Cupón pasan a tener número propio, y todo lo que venía después se corre. La tabla de equivalencias con la numeración anterior está en el historial de versiones, al final de este documento.

## Resumen de casos de uso

| ID | Caso de uso | Actor | Cambio v2.1 |
| --- | --- | --- | --- |
| CU-01 | Explorar Landing Page Principal | Cliente Final / Visitante | — |
| CU-02 | Buscar Barberías en Directorio | Cliente Final / Visitante | Flujo alternativo |
| CU-03 | Visualizar Perfil Público de Barbería | Cliente Final / Visitante | Flujo alternativo |
| CU-03B | Explorar Perfil del Equipo de Barberos | Cliente Final / Visitante | — |
| CU-04 | Validar Certificación Digital | Cliente Final / Visitante | Flujo alternativo |
| CU-05 | Obtener Código Promocional | Cliente Final / Visitante | Flujo alternativo |
| CU-06 | Solicitar Reserva por WhatsApp Inteligente (Lead Tracking) | Cliente Final / Visitante | Flujo alternativo |
| CU-07 | Registrar Barbería y Crear Cuenta | Dueño de Barbería (Prospecto B2B) | — |
| CU-08 | Autenticarse (Login B2B) | Dueño de Barbería | Flujo alternativo |
| CU-09 | Gestionar Perfil del Negocio (CRUD) | Dueño de Barbería | Regla de negocio |
| CU-10 | Gestionar Equipo de Barberos (CRUD) | Dueño de Barbería | Editar / Eliminar explícitos |
| CU-11 | Gestionar Catálogo de Servicios (CRUD) | Dueño de Barbería | Editar / Pausar / Eliminar explícitos |
| CU-12 | Suscripción y Checkout Wompi | Dueño de Barbería | Flujo alternativo |
| CU-13 | Crear y Administrar Códigos de Descuento | Dueño de Barbería | Editar / Pausar / Eliminar explícitos |
| CU-14 | Redimir Cupón en el Local | Dueño de Barbería / Barbero | **Nuevo** |
| CU-15 | Visualizar Dashboard de Métricas (Leads/ROI) | Dueño de Barbería | Nueva métrica: cupones redimidos |
| CU-16 | Iniciar Sesión en Panel Administrativo | Administrador / Staff | Flujo alternativo |
| CU-17 | Revisar y Aprobar Postulaciones | Administrador / Staff | Flujo alternativo |
| CU-18 | Asignar o Revocar Certificaciones | Administrador / Staff | Regla de negocio |
| CU-19 | Gestionar Catálogo de Sellos | Administrador / Staff | — |
| CU-20 | Consultar Métricas Globales de la Plataforma | Administrador / Staff | Nueva métrica: cupones redimidos |

## 1. Módulos Públicos / Cliente Final (B2C)

### CU-01: Explorar Landing Page Principal

| Campo | Detalle |
| --- | --- |
| Actor | Cliente Final / Visitante |
| Precondición | Ninguna |

**Flujo Principal:**
1. El usuario ingresa a la raíz de la plataforma (`/`).
2. Visualiza la propuesta de valor del sello de calidad Barbers Awards con la línea gráfica Premium Dark/Gold.
3. Explora la sección de barberías destacadas, la explicación de los beneficios del sello y los llamados a la acción (CTA) para buscar o registrar su barbería.

**Salida:** Vista general de la marca con navegación directa hacia el directorio.

### CU-02: Buscar Barberías en Directorio

| Campo | Detalle |
| --- | --- |
| Actor | Cliente Final / Visitante |
| Precondición | Existencia de barberías registradas en la base de datos |

**Flujo Principal:**
1. El usuario navega a `/directorio`.
2. Utiliza la barra de búsqueda en tiempo real para filtrar por nombre, ciudad, barrio/zona o servicios ofertados.
3. Aplica filtros opcionales por estado del sello (Gold, Silver, En Verificación).
4. La interfaz renderiza dinámicamente las tarjetas de barberías que coinciden con los criterios de búsqueda y filtrado.

**Flujo Alternativo:**
- **A1 — Sin resultados:** si ningún registro coincide con los criterios, el sistema muestra un estado vacío con la sugerencia de limpiar los filtros, en vez de una lista en blanco.

**Reglas de Negocio:**
- Solo se listan barberías con `estado_sello <> 'inactivo'` (aprobadas por el staff, ver CU-17).
- La búsqueda y el filtrado se ejecutan sobre la base de datos en tiempo real, con un retraso (debounce) en el campo de texto para no saturar la consulta con cada tecla.

**Salida:** Listado filtrado de barberías activas.

### CU-03: Visualizar Perfil Público de Barbería

| Campo | Detalle |
| --- | --- |
| Actor | Cliente Final / Visitante |
| Precondición | Seleccionar una barbería del directorio (`/barberia/[id]`) |

**Flujo Principal:**
1. El sistema recupera la información pública de la barbería (tablas `barberias`, `servicios`, `barberos`, `certificaciones` y `cupones_descuento`) y la presenta con la identidad visual elegida por su dueño: color de acento y logo.
2. Muestra la portada con el nombre, el eslogan, la descripción corta y datos derivados del equipo (cantidad de barberos y años de experiencia combinada).
3. Muestra la historia del negocio, la galería de fotos, la dirección y ubicación, los horarios con el indicador "Abierto ahora" y las redes sociales (Instagram y Facebook).
4. Presenta el catálogo de servicios activos con su precio en COP y su duración estimada. Los servicios destacados llevan la etiqueta "Popular".
5. Muestra la insignia del sello de certificación activo con su respectivo folio de verificación público.

**Flujo Alternativo:**
- **A1 — Secciones vacías:** las secciones sin información (por ejemplo, sin historia, sin fotos o sin cupones) no se muestran; el diseño se ajusta sin dejar espacios en blanco ni textos vacíos.

**Reglas de Negocio:**
- El color de acento personalizado (Dorado, Morado, Verde o Rojo) nunca sobrescribe los colores oficiales del sello Gold/Silver, reservados a la insignia de certificación.

**Salida:** Ficha detallada y dinámica de la barbería, con la identidad visual definida por su dueño.

### CU-03B: Explorar Perfil del Equipo de Barberos

| Campo | Detalle |
| --- | --- |
| Actor | Cliente Final / Visitante |
| Precondición | Estar en la página de perfil público de la barbería (CU-03) |

**Flujo Principal:**
1. El usuario navega a la sección "Nuestro Equipo".
2. Visualiza las tarjetas individuales de los barberos con su foto, nombre y años de experiencia.
3. Consulta las insignias de especialidad asignadas (Fade Master, Visajismo, Barboterapia, Corte Clásico).
4. Hace clic en "Ver Certificados" para abrir un visor modal con las fotos o diplomas en PDF validados.

**Reglas de Negocio:**
- Los diplomas o certificados de un barbero solo son visibles si el dueño los cargó previamente (ver CU-10).

**Salida:** Confirmación visual de la experiencia técnica del equipo.

### CU-04: Validar Certificación Digital

| Campo | Detalle |
| --- | --- |
| Actor | Cliente Final / Visitante |
| Precondición | Contar con un folio de certificación o hacer clic en el sello de un perfil público (`/verificar/[folio]`) |

**Flujo Principal:**
1. El sistema consulta la tabla `certificaciones` en Supabase usando el `folio_verificacion`.
2. Renderiza un badge oficial de validación indicando:
   - Estado: Verificado/Activo, En Proceso o Inactivo.
   - Nivel: Sello Barbers Awards Gold / Silver.
   - Entidad Emisora: Barbers Awards Official.
   - Fecha de Emisión y Vigencia.

**Flujo Alternativo:**
- **A1 — Folio inexistente:** si el folio ingresado no existe en la base de datos, el sistema muestra "Folio no encontrado", sin exponer más información.
- **A2 — Sello revocado o vencido:** se muestra el estado real (Inactivo o Vencido) junto con la fecha en que perdió vigencia.

**Salida:** Confirmación pública de autenticidad del sello, verificable por cualquier visitante sin necesidad de autenticarse.

### CU-05: Obtener Código Promocional

| Campo | Detalle |
| --- | --- |
| Actor | Cliente Final / Visitante |
| Precondición | Que la barbería tenga cupones activos en la tabla `cupones_descuento` |

**Flujo Principal:**
1. En el perfil de la barbería, el usuario visualiza los cupones disponibles (ej. `BA-CORTEMASTER20`).
2. Hace clic en el botón "Copiar Cupón".
3. El sistema copia el texto al portapapeles e inyecta el código en la memoria temporal para la reserva de WhatsApp (CU-06).

**Flujo Alternativo:**
- **A1 — Sin cupones:** si la barbería no tiene cupones activos, la sección de cupones no se muestra (ver CU-03, A1) y el flujo continúa directo a la reserva (CU-06).

**Salida:** Código de descuento listo para aplicar.

### CU-06: Solicitar Reserva por WhatsApp Inteligente (Lead Tracking)

| Campo | Detalle |
| --- | --- |
| Actor | Cliente Final / Visitante |
| Precondición | Estar en el perfil de una barbería (CU-03) |

**Flujo Principal:**
1. El usuario presiona el botón "Reservar por WhatsApp" (disponible en el encabezado, el bloque de contacto y el botón flotante).
2. Se despliega un selector rápido para elegir: Servicio (del catálogo activo de la barbería, CU-11) + Barbero de Preferencia (opcional) + Cupón Copiado (opcional, precargado si venía de CU-05).
3. El sistema ejecuta una llamada API interna (`/api/leads`) que inserta un registro +1 en la tabla `leads_whatsapp` para las métricas del dashboard del dueño (CU-15).
4. El sistema construye la URL dinámica `wa.me` y redirige al usuario a WhatsApp con el mensaje pre-redactado:

   > "¡Hola [Barbería]! Vengo desde Barbers Awards. Quiero agendar el servicio: [Servicio] con el barbero: [Barbero]. Mi código de descuento es: [Código]."

**Flujo Alternativo:**
- **A1 — Sin barbero elegido:** el campo "Barbero de Preferencia" es opcional; si el usuario no elige, esa frase se omite del mensaje, sin dejar espacios vacíos.

**Reglas de Negocio:**
- El Lead se registra de forma anónima; no se crea cuenta de usuario para el cliente final.
- El código de cupón queda disponible para redimirse físicamente en el local (ver CU-14). Un lead representa un clic hacia WhatsApp, no una reserva confirmada ni un descuento ya aplicado.

**Salida:** Redirección a WhatsApp con mensaje automático y registro de Lead en backend.

## 2. Módulos para Dueños de Barberías (B2B — Suscriptores)

### CU-07: Registrar Barbería y Crear Cuenta

| Campo | Detalle |
| --- | --- |
| Actor | Dueño de Barbería (Prospecto B2B) |
| Precondición | Ninguna |

**Flujo Principal:**
1. El dueño completa el formulario en `/registro` con: Nombre personal, Nombre del establecimiento, Correo, Contraseña, Teléfono y Ciudad.
2. Supabase Auth crea las credenciales de acceso con el rol `barberia_owner`.
3. El sistema inserta automáticamente una fila en la tabla `barberias` con el estado `suscripcion_estado = 'prueba'` y `sello_estado = 'pendiente'`.
4. Redirige automáticamente al usuario a su panel privado `/dashboard`.

**Salida:** Cuenta B2B creada y perfil inicial generado automáticamente.

### CU-08: Autenticarse (Login B2B)

| Campo | Detalle |
| --- | --- |
| Actor | Dueño de Barbería |
| Precondición | Contar con registro previo |

**Flujo Principal:**
1. El usuario ingresa a `/login` con correo y contraseña.
2. Supabase Auth valida las credenciales y emite el token JWT.
3. El middleware verifica el rol e ingresa al usuario al dashboard privado (`/dashboard`).

**Flujo Alternativo:**
- **A1 — Credenciales inválidas:** el sistema muestra un mensaje de error genérico, sin indicar si el correo o la contraseña fueron los incorrectos.

**Salida:** Sesión activa con permisos RLS sobre su propio negocio.

### CU-09: Gestionar Perfil del Negocio (CRUD)

| Campo | Detalle |
| --- | --- |
| Actor | Dueño de Barbería |
| Precondición | Sesión B2B activa |

**Flujo Principal:**
1. El usuario ingresa a la pestaña "Mi Perfil" en `/dashboard/perfil`.
2. Actualiza la información general: dirección, ciudad y zona, número de WhatsApp, redes sociales (Instagram y Facebook), eslogan, descripción corta, historia del negocio y año de fundación.
3. Define los horarios de atención por día, con una o más franjas horarias, o marca el día como cerrado.
4. Personaliza la identidad visual del perfil: elige el color de acento (Dorado, Morado, Verde o Rojo) y el logo entre el catálogo de logos predefinidos.
5. Sube fotos del local al bucket `barberias-storage` de Supabase Storage. (Las imágenes son comprimidas en el navegador a WebP de menos de 300 KB antes de enviarse).
6. Guarda los cambios.

**Reglas de Negocio:**
- El dueño no puede modificar `estado_sello`, `estado_suscripcion` ni las fechas de vigencia de su propia barbería: esos campos solo los cambian el staff (CU-18) o el proceso de pago (CU-12).

**Salida:** Perfil público actualizado en tiempo real, con la nueva información y la identidad visual elegida.

### CU-10: Gestionar Equipo de Barberos (CRUD)

| Campo | Detalle |
| --- | --- |
| Actor | Dueño de Barbería |
| Precondición | Sesión B2B activa |

**Flujo Principal:**
1. En `/dashboard/equipo`, el usuario presiona "Agregar Barbero".
2. Completa los datos: Nombre, foto de perfil, años de experiencia e insignias de especialidad.
3. Carga los diplomas/certificados en PDF o imagen para respaldo.
4. La información se guarda asociando el `barberia_id` correspondiente.
5. Para editar, el usuario selecciona un barbero existente, modifica cualquiera de sus datos o reemplaza/agrega diplomas, y guarda los cambios; el perfil público se actualiza de inmediato.
6. Para eliminar, el usuario selecciona un barbero y presiona "Eliminar"; el sistema pide confirmación explícita antes de borrar el registro y sus documentos del bucket de Storage.

**Reglas de Negocio:**
- La eliminación de un barbero es permanente; no existe un estado "archivado" en el MVP. Al no haber ninguna otra tabla que referencie `barberos.id` (los leads y las certificaciones no dependen de un barbero específico), borrarlo no afecta otros registros.

**Salida:** Ficha de equipo pública actualizada con sus documentos.

### CU-11: Gestionar Catálogo de Servicios (CRUD)

| Campo | Detalle |
| --- | --- |
| Actor | Dueño de Barbería |
| Precondición | Sesión B2B activa |

**Flujo Principal:**
1. En `/dashboard/servicios`, el usuario presiona "Agregar Servicio".
2. Completa los datos: nombre, descripción corta, precio en COP, duración estimada, ícono (catálogo predefinido) y las opciones "Destacado (Popular)" y "Activo".
3. Puede editar, reordenar (arrastrar y soltar), pausar (desactivar) o eliminar los servicios existentes.
4. Los servicios activos aparecen en el perfil público (CU-03) y en el selector de reserva por WhatsApp (CU-06).

**Reglas de Negocio:**
- Un servicio **pausado** deja de mostrarse en el perfil público y en el selector de reserva, pero conserva su historial. Un servicio **eliminado** se borra de forma permanente del catálogo.

**Salida:** Catálogo de servicios público actualizado.

### CU-12: Suscripción y Checkout Wompi

| Campo | Detalle |
| --- | --- |
| Actor | Dueño de Barbería |
| Precondición | Sesión B2B activa |

**Flujo Principal:**
1. En el panel, el dueño selecciona el plan de membresía (Mensual / Anual) y presiona "Activar Sello Verificado".
2. Se inicializa el Widget de Checkout de Wompi con la clave pública `NEXT_PUBLIC_WOMPI_PUBLIC_KEY`.
3. El dueño realiza el pago con Nequi, PSE, Botón Bancolombia o Tarjeta de Crédito.
4. Wompi procesa la transacción y envía un evento POST al Webhook `/api/webhooks/wompi`.
5. El webhook valida la firma del evento, registra la transacción en `transacciones_pago` y actualiza `suscripcion_estado = 'activa'`, sumando los días correspondientes a `fecha_vencimiento`.

**Flujo Alternativo:**
- **A1 — Pago rechazado o pendiente:** el webhook registra la transacción en `transacciones_pago` con su estado real, sin modificar `suscripcion_estado`. El dashboard le indica al dueño que puede reintentar el pago.

**Salida:** Membresía cobrada automáticamente y sello activado.

### CU-13: Crear y Administrar Códigos de Descuento

| Campo | Detalle |
| --- | --- |
| Actor | Dueño de Barbería |
| Precondición | Sesión B2B activa |

**Flujo Principal:**
1. En `/dashboard/cupones`, el dueño presiona "Crear Cupón".
2. Define el código (ej. `CORTE10`), tipo de descuento (porcentaje o monto fijo) y valor del descuento.
3. Puede editar el tipo o el valor del descuento en cualquier momento.
4. Puede activar, pausar o eliminar cupones existentes cuando quiera.

**Reglas de Negocio:**
- Un cupón **pausado** deja de mostrarse en el perfil público (CU-05) pero conserva su historial de uso. Un cupón **eliminado** se borra de forma permanente.

**Salida:** Promociones disponibles en el perfil público.

### CU-14: Redimir Cupón en el Local *(nuevo desde la v2.1)*

| Campo | Detalle |
| --- | --- |
| Actor | Dueño de Barbería / Barbero en el local |
| Precondición | El cliente presenta un código de cupón (obtenido en CU-05) al momento de pagar |

**Flujo Principal:**
1. En `/dashboard/cupones`, el dueño o barbero busca el código que el cliente presenta.
2. El sistema valida que el código exista y esté activo.
3. El dueño o barbero confirma la redención.
4. El sistema incrementa en 1 el contador de usos del cupón (`veces_redimido`) y registra la fecha de la redención.

**Flujo Alternativo:**
- **A1 — Código inexistente o inactivo:** el sistema indica que el código no se puede redimir y por qué (no encontrado o pausado).

**Reglas de Negocio (decisión de diseño de esta versión):**
- El código de un cupón es **público y compartido**: cualquier visitante que vea el perfil puede copiarlo. Por eso "redimir" **no marca el cupón entero como agotado ni lo desactiva para los demás clientes**: solo suma una unidad a su contador de usos. Un cupón sigue disponible para nuevos clientes hasta que el dueño lo pause manualmente.
- Por el mismo motivo, la redención **no se vincula automáticamente a un Lead de WhatsApp específico**: como el código es compartido, no hay manera confiable de saber cuál de los clientes que lo copiaron es el que se presentó en el local. Se cuenta como una redención de la barbería, no de un cliente en particular.
- Esta regla reemplaza al intento inicial de "asociar la redención al Lead correspondiente cuando sea posible", que no es implementable mientras el cupón sea un código público compartido. Si en el futuro se necesita saber exactamente qué Lead se convirtió, la alternativa es generar códigos de un solo uso por Lead, lo cual es un cambio de diseño mayor fuera de este MVP.
- Esta funcionalidad requiere agregar a `cupones_descuento` las columnas `veces_redimido` (entero, por defecto 0) y, opcionalmente, `limite_usos` (entero, nulo = sin límite). No están incluidas todavía en `SCHEMA.sql` v1.1; se agregan en una migración v1.2 antes de construir este caso de uso.

**Salida:** El contador de redenciones del cupón aumenta y queda disponible para el dashboard de métricas (CU-15).

### CU-15: Visualizar Dashboard de Métricas (Leads/ROI)

| Campo | Detalle |
| --- | --- |
| Actor | Dueño de Barbería |
| Precondición | Sesión B2B activa |

**Flujo Principal:**
1. En la vista principal de `/dashboard`, el dueño consulta las tarjetas de analíticas:
   - Total Clics a WhatsApp (Leads) acumulados.
   - Total Visitas al perfil público.
   - Cupones copiados.
   - Cupones redimidos en el local (CU-14).
2. Filtra el historial de conversiones por rango de fechas (últimos 7 días, 30 días, etc.).

**Reglas de Negocio:**
- "Cupones copiados" y "Cupones redimidos" son métricas distintas y no deben confundirse: la primera mide clics de copiar en el perfil público; la segunda mide redenciones confirmadas en el local (CU-14). Ningún lead de WhatsApp implica automáticamente una redención.

**Salida:** Demostración del retorno de inversión (ROI) del sello.

## 3. Módulos de Administración Interna (Staff Barbers Awards)

### CU-16: Iniciar Sesión en Panel Administrativo

| Campo | Detalle |
| --- | --- |
| Actor | Administrador / Staff Barbers Awards |
| Precondición | Usuario con rol `administrator` en Supabase Auth |

**Flujo Principal:**
1. El administrador ingresa a `/admin/login`.
2. Se validan las credenciales y el RLS verifica que el perfil cuente con privilegios globales.
3. Concede acceso a `/admin`.

**Flujo Alternativo:**
- **A1 — Rol insuficiente:** si el usuario autenticado no tiene el rol `administrator`, el acceso a `/admin` se deniega aunque sus credenciales sean válidas.

**Salida:** Acceso al panel de control global.

### CU-17: Revisar y Aprobar Postulaciones

| Campo | Detalle |
| --- | --- |
| Actor | Administrador / Staff |
| Precondición | Sesión Admin activa |

**Flujo Principal:**
1. En `/admin/postulaciones`, el staff visualiza el listado de barberías recién registradas en estado pendiente.
2. Revisa la información del local, dirección y fotos cargadas.
3. Hace clic en "Aprobar" o "Rechazar".

**Flujo Alternativo:**
- **A1 — Rechazo:** al rechazar, el sistema pide opcionalmente un motivo, que puede comunicarse al dueño.

**Salida:** Cambio de estado del negocio para permitir su publicación oficial en el directorio. Aprobar una postulación no emite un sello: eso es un acto aparte, a cargo del staff en CU-18.

### CU-18: Asignar o Revocar Certificaciones

| Campo | Detalle |
| --- | --- |
| Actor | Administrador / Staff |
| Precondición | Sesión Admin activa y barbería en estado aprobado |

**Flujo Principal:**
1. El staff selecciona una barbería auditada.
2. Asigna el nivel de sello (Sello Gold, Sello Silver).
3. El sistema genera un `folio_verificacion` único (ej. `BA-2026-X892`) y registra la fecha de emisión y vigencia en la tabla `certificaciones`.
4. Opción de revocar o pausar el sello si el local incumple las normativas.

**Reglas de Negocio:**
- Una barbería solo puede tener un sello **activo** a la vez. Para asignar uno nuevo, el existente debe revocarse o pausarse primero.

**Salida:** Certificado digital emitido con folio único comprobable.

### CU-19: Gestionar Catálogo de Sellos

| Campo | Detalle |
| --- | --- |
| Actor | Administrador / Staff |
| Precondición | Sesión Admin activa |

**Flujo Principal:**
1. En `/admin/sellos`, el staff administra las categorías de certificación disponibles.
2. Permite editar nombres, requisitos del estándar y definir la entidad emisora por defecto (Barbers Awards Official).

**Salida:** Catálogo de sellos actualizado y flexible para futuras alianzas.

### CU-20: Consultar Métricas Globales de la Plataforma

| Campo | Detalle |
| --- | --- |
| Actor | Administrador / Staff |
| Precondición | Sesión Admin activa |

**Flujo Principal:**
1. En `/admin/dashboard`, el staff visualiza las métricas generales del ecosistema:
   - Total de barberías registradas (Activas vs Pendientes).
   - Flujo total de leads generados a WhatsApp en toda la plataforma.
   - Total de cupones redimidos a nivel plataforma (CU-14).
   - Log de pagos e ingresos procesados a través de Wompi.

**Salida:** Vista ejecutiva del rendimiento global del SaaS.

## Historial de versiones

| Versión | Cambio |
| --- | --- |
| 1.0 | Versión inicial del MVP: 19 casos de uso. |
| 1.1 | Perfil público dinámico (CU-03): portada, historia, servicios, galería, horarios, redes y sello, con secciones opcionales. |
| 1.1 | Identidad visual por barbería: color de acento (Dorado, Morado, Verde o Rojo) y logo predefinido (CU-09). |
| 1.1 | Nuevo CU-09C (hoy CU-11, ver v2.2): catálogo de servicios con precio en COP, duración e ícono. |
| 2.0 (borrador, no adoptado tal cual) | Un compañero del equipo fusionó varios casos de uso y renumeró todo de CU-01 a CU-15 (numeración propia de ese borrador, independiente de la de este documento). Esta v2.1 conserva la numeración original por el costo de sincronizar SCHEMA.sql, ARCHITECTURE.md e HISTORIAS_USUARIO.md; ver la nota al inicio del documento. |
| 2.1 | Se incorporan del borrador v2.0 los flujos alternativos y las reglas de negocio en CU-02, 03, 04, 06, 08, 09, 10, 13 y 14. |
| 2.1 | CU-10 y CU-11 ganan los flujos explícitos de editar, pausar y eliminar (antes solo decían "CRUD" sin detallar). |
| 2.1 | Se corrige el error del borrador v2.0 (su CU-16.1 mezclaba el flujo de aprobar una postulación con la salida de emitir un certificado). CU-17 deja explícito que aprobar una postulación no emite un sello. |
| 2.1 | Nuevo CU-14: Redimir Cupón en el Local. Resuelve la decisión abierta sobre "cupones copiados" vs. "cupones redimidos" (ver ARCHITECTURE.md, decisión 2) con un diseño basado en contador de usos, en vez de intentar vincular cada redención a un Lead de WhatsApp específico, algo no confiable mientras el código del cupón sea público y compartido. Requiere una migración menor en SCHEMA.sql (columnas `veces_redimido` y `limite_usos` en `cupones_descuento`), pendiente de aplicar. |
| 2.1 | CU-15 y CU-20 agregan la métrica de cupones redimidos, distinta de cupones copiados. |
| 2.2 | Se corrige una inconsistencia de numeración señalada por un compañero del equipo: Equipo y Servicios (antes CU-09B y CU-09C) tenían sufijo de letra a pesar de tener ruta propia en el dashboard, mientras que Cupones (antes CU-11) sí tenía número propio pese a ser un caso del mismo tipo. Se aplica la regla "número propio si tiene ruta propia, sufijo si es una sección de una página que ya tiene su caso de uso" de forma consistente. CU-03B se mantiene como sufijo bajo esa misma regla, porque es una sección de `/barberia/[id]`, no una ruta propia. |
| 2.2 | Tabla de equivalencias con la numeración anterior (v2.1 → v2.2): CU-09B (Equipo) → CU-10, CU-09C (Servicios) → CU-11, CU-10 (Wompi) → CU-12, CU-11 (Cupones) → CU-13, CU-11B (Redimir Cupón) → CU-14, CU-12 (Métricas dueño) → CU-15, CU-13 (Login admin) → CU-16, CU-14 (Postulaciones) → CU-17, CU-15 (Certificaciones) → CU-18, CU-16 (Catálogo de sellos) → CU-19, CU-17 (Métricas globales) → CU-20. Pendiente: actualizar estas referencias en `docs/SCHEMA.sql`, `docs/ARCHITECTURE.md` y `docs/HISTORIAS_USUARIO.md`, que todavía citan la numeración v2.1. |
