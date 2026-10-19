# DESIGN.md — Sistema visual de Barbers Awards

Cómo se ve y se comporta la interfaz. Para la arquitectura y las rutas, ver
`ARCHITECTURE.md`; para el estado del proyecto, `ESTADO_ACTUAL.md`.

**Creado:** 2026-10-19.

Este documento manda sobre decisiones visuales. Si el código y este archivo
no coinciden, uno de los dos está mal y hay que arreglarlo a propósito, no
dejar que convivan.

---

## 1. Dos temas, una frontera

La aplicación tiene **dos identidades visuales distintas**, y eso es
deliberado (`ARCHITECTURE.md` 2.6 y 3.7).

### 1.1 La plataforma — Dark / Gold / Purple

Landing, directorio, registro, panel del dueño y panel de administración.
Es Barbers Awards hablando como marca: oscuro, con dorado para el sello y
violeta para la acción.

Los tokens viven en `src/app/globals.css` dentro de `@theme`, y se usan
como clases de Tailwind (`bg-night`, `text-gold`, `border-line`):

| Token | Valor | Uso |
|---|---|---|
| `carbon` | `#0F0F0F` | Fondo de la página |
| `night` | `#18181B` | Superficies elevadas, tarjetas |
| `line` | `#27272A` | Bordes y separadores |
| `ink` | `#FAFAFA` | Texto principal |
| `muted` | `#A1A1AA` | Texto secundario |
| `gold` | `#D4AF37` | El sello, siempre |
| `gold-amber` | `#F59E0B` | Acento cálido secundario |
| `violet` | `#7C3AED` | Acción principal |
| `violet-neon` | `#A855F7` | Énfasis, estado "En verificación" |
| `silver` | `#D4D4D8` | Nivel Silver del sello |

### 1.2 El perfil público — micrositio crema

`/barberia/[id]` **no** usa el tema de la plataforma. Es el micrositio de la
barbería: fondo crema, tipografía editorial, y un color de acento que elige
cada barbería.

Todo vive bajo la clase `.perfil` en
`src/app/(public)/barberia/perfil.css`, importado solo en esa ruta. **Esa
frontera no se rompe nunca**: ningún estilo del perfil se filtra al resto de
la app, y ningún token de la plataforma entra al perfil.

| Token | Valor | Uso |
|---|---|---|
| `--cream` | `#faf6ee` | Fondo |
| `--cream-2` | `#f1e9d8` | Secciones alternas |
| `--black` | `#101012` | Texto y secciones oscuras |
| `--charcoal` | `#1b1b1f` | Superficies oscuras |
| `--text-dark` | `#2a2a2a` | Texto sobre crema |
| `--text-light` | `#f5f0e6` | Texto sobre oscuro |

### 1.3 La franja de pertenencia

El perfil lleva una franja superior que lo identifica como parte de Barbers
Awards (`perfil.css`, "franja de la plataforma"). Es el único punto donde
los dos mundos se tocan, y debe seguir siéndolo.

---

## 2. Lo que nunca cambia

Estas reglas están por encima de cualquier rediseño. Si una propuesta las
rompe, la propuesta está mal.

1. **El color del sello no se tiñe.** El acento de la barbería nunca pinta el
   `SealBadge`. El color sale de `catalogo_sellos.color_hex`, o del dorado
   `#D4AF37` por defecto. Está escrito en el código como regla de negocio de
   CU-03.
2. **El verde de "Abierto ahora" no se tiñe.** Es información de estado, no
   identidad de marca.
3. **El verde de WhatsApp no se tiñe.** `#128C7E`. La gente lo reconoce; si
   lo cambias, deja de parecer WhatsApp.
4. **`prefers-reduced-motion` se respeta siempre.** Ya está implementado en
   `.perfil .reveal`. Toda animación nueva lo honra.
5. **No se inventan datos.** Nada de contadores, calificaciones, conteos de
   reseñas ni testimonios que no tengan una tabla detrás. Esto eliminó la
   decisión 13 a propósito y no se revierte por razones estéticas.
6. **El CSS del perfil queda aislado bajo `.perfil`.**

---

## 3. Tipografía

| | Familia | Dónde |
|---|---|---|
| Display | **Playfair Display** | `h1`, `h2`, `h3`, `.logo-text` del perfil; cifras destacadas |
| Cuerpo | **Poppins** | Todo lo demás en el perfil |
| Plataforma | La de Tailwind por defecto | Paneles, directorio, landing |

El contraste entre serif de display y sans de cuerpo es lo que da el aire
editorial. No lo diluyas poniendo Playfair en texto corrido ni Poppins en
títulos grandes.

Escala de títulos del perfil: `clamp(28px, 4vw, 42px)` para
`.section-title`. El `h1` del hero puede ir más grande; es el único.

**Decisión abierta (D1):** evaluar reemplazar Poppins por una sans con más
carácter. Poppins es correcta pero genérica, y parte de la sensación de
"plantilla" viene de ahí. Pendiente de decisión.

---

## 4. El sistema de acento

Cada barbería elige **uno de cuatro** acentos (`src/lib/accent.ts`,
`barberias.color_acento`). Nunca un hex libre: así se garantiza el contraste
y no se admite CSS arbitrario.

| Llave | `--brand` | `--brand-text` | `--on-brand` |
|---|---|---|---|
| `dorado` | `#d4af37` | `#7a5f16` | `#101012` |
| `morado` | `#7c3aed` | `#6d28d9` | `#ffffff` |
| `verde` | `#15803d` | `#15803d` | `#ffffff` |
| `rojo` | `#b91c1c` | `#b91c1c` | `#ffffff` |

La distinción importa:

- **`--brand`** es para superficies: fondos de botón, reglas, rellenos.
- **`--brand-text`** es para **texto sobre crema**. El dorado `#d4af37` no
  alcanza 4.5:1 sobre `#faf6ee`; por eso existe la variante oscura.
- **`--on-brand`** es el texto que va encima de `--brand`.

Nunca uses `--brand` para texto pequeño sobre fondo claro. Ese es el error
que el sistema está diseñado para prevenir.

---

## 5. Layout y espacio

- Contenedor: `max-width: 1180px`, `padding: 0 24px`.
- Las secciones respiran: 80–104px de separación vertical en escritorio.
- Alterna fondos (crema → crema-2 → oscuro) para dar ritmo. Una página toda
  del mismo color se lee como un formulario largo.
- Móvil primero en la práctica: la reserva ocurre por WhatsApp, desde el
  teléfono. Si algo se ve bien en escritorio y mal en móvil, está roto.

---

## 6. Componentes

### 6.1 Botones

El lenguaje del sistema es el **botón plano** (D2, resuelta el 2026-10-19):

- Esquina de **2px**.
- Relleno sólido de `--brand`, **sin degradado** y **sin sombra de color**.
- Hover: desplazamiento de **2px hacia arriba** y un leve aclarado del
  relleno. No una sombra que crece.

El botón-píldora con degradado y sombra de color es el acabado más
reconocible de las plantillas genéricas, y es justo lo que se quiere dejar
atrás. El plano con una sola esquina pequeña envejece mejor y deja que la
tipografía lleve el peso.

**Pendiente:** `perfil.css` todavía tiene el estilo viejo (`.btn` con
`border-radius: 50px` y `.btn-gold` con degradado de tres paradas más
sombra de color). Migrarlo es una tarea aparte, sin hacer.

Jerarquía:

| Nivel | Uso |
|---|---|
| Primario | Relleno `--brand`, texto `--on-brand`. Uno por pantalla. |
| Secundario | Contorno, sin relleno. |
| WhatsApp | Verde `#128C7E` fijo. Es una categoría aparte, no un nivel. |

Área mínima de toque: 44px.

### 6.2 Encabezado de sección

El patrón ya existe y se mantiene: una etiqueta pequeña en mayúsculas con
`letter-spacing` amplio en `--brand-text`, luego el título en Playfair.
Opcionalmente una bajada de máximo 620px.

### 6.3 Ficha de servicio

Debe mostrar siempre: nombre, descripción corta, **duración**, **precio** y
una acción de reserva. Los destacados llevan cinta "Popular" y aparecen
primero (commit `8b361e1`).

### 6.4 Tarjeta de barbero

Foto, nombre, especialidad, nota breve y reserva directa con esa persona.

### 6.5 El sello

No es un adorno: es el argumento de venta. Merece tratamiento propio —
espacio, jerarquía y una explicación de qué significa. Ver sección 8.

### 6.6 Escala de radios

**Píldora para lo que etiqueta, plano para lo que se toca.**

| Categoría | Radio |
|---|---|
| Botones, campos, tarjetas, paneles, imágenes | 2px |
| Insignias de estado (Abierto ahora, reconocimientos, sello) | píldora completa |
| Avatares, puntos, íconos sociales | círculo |

El degradado oscuro del hero (hoy, el velo sobre la foto de portada) **no se
elimina**: es ilustración, no acabado de control. Lo que se
elimina es el degradado y la sombra de color de los botones.

---

## 7. Movimiento

Ya existe `.perfil .reveal` / `.reveal.in` con `prefers-reduced-motion`
respetado. Ese es el mecanismo; úsalo en vez de inventar otro.

Principios:

- La animación acompaña, no anuncia. Entradas suaves hacia arriba, no
  rebotes ni giros.
- Duraciones entre 0.4s y 0.9s. Curva de desaceleración, no lineal.
- El hover confirma que algo es interactivo: un desplazamiento mínimo, un
  cambio de fondo, un zoom lento en una foto.
- Nada se mueve solo de forma indefinida salvo una franja de texto en
  marquesina, si se adopta.

---

## 8. El perfil público: estructura

Orden de secciones:

1. Franja de la plataforma
2. Encabezado con logo, navegación y acción de reserva
3. **Hero** — foto de portada a sangre completa con el contenido encima (ver 8.3)
4. **Qué significa el sello** — ver abajo
5. Nosotros
6. Servicios
7. Cupones
8. Equipo
9. Galería
10. **Preguntas frecuentes** — sección nueva, ver 8.2
11. Horarios y contacto
12. Pie con enlace a verificar la certificación

### 8.1 La regla de la confianza

Este es el razonamiento central del diseño, y conviene no perderlo.

Se estudió barberialords.com como referencia de patrones. Su densidad visual
viene de dos fuentes: **fotografía profesional** y **elementos de
confianza** — calificación de 4.9, conteo de reseñas, testimonios con
nombre, contadores de clientes, carrusel de famosos, sello de garantía
repetido.

Barbers Awards **no puede usar casi nada de eso**: no hay tabla que lo
respalde, e inventarlo es justo lo que prohíbe la regla 5 de la sección 2.

Pero tiene algo que Lords no tiene: **una auditoría real, con folio
verificable en público.**

De ahí la regla: **el sello carga el peso que allá cargan las reseñas.** Por
eso existe la sección "Qué significa que esta barbería sea Gold", con sus
tres garantías (auditada en sitio, verificable en público, con fecha de
vigencia). No es relleno: es el sustituto estructural de la prueba social
que no tenemos.

### 8.2 Lo que se toma de Lords, y lo que no

**Se toma** (son patrones de interacción, no diseño ajeno):

- **Reserva por dos puertas**: por servicio o por barbero. Las dos llevan al
  mismo mensaje de WhatsApp.
- Ficha de servicio con duración, precio y botón.
- Preguntas frecuentes como lista abierta, sin acordeón.
- Acceso a reservar siempre visible.

**No se toma:** calificaciones, conteo de reseñas, testimonios, contadores
animados, carrusel de famosos, menú desplegable grande, sedes, membresía,
blog ni tienda.

**Nunca se copia** su logotipo, sus fotos, sus textos ni su diseño visual.
La referencia es de estructura, no de apariencia.

---

### 8.3 El hero

Decidido el 2026-10-19 (opción A): el hero es la **foto de portada a sangre
completa** y el poste de barbero desaparece. El poste estaba dibujado en CSS
y era idéntico en todas las barberías: con treinta barberías, treinta
perfiles con el mismo poste arriba. La foto es lo único verdaderamente
propio de cada una.

Capas, de abajo arriba:

1. **Fondo:** `foto_portada ?? fotos[0]`, `object-fit: cover`. Es el
   elemento LCP: se carga con prioridad, nunca en diferido.
2. **Velo:** degradado oscuro — oscuro arriba (el encabezado fijo), más
   claro poco después y bien oscuro donde vive el texto
   (`rgba(16,16,18,.72)` → `.35` → `.7` → `.92`). Los tramos se
   calculan contra una foto **clara**, no contra una oscura.
3. **Contenido**, en este orden:
   - Fila superior: "Abierto ahora" (píldora) + zona y ciudad.
   - `h1` con el nombre, con la última palabra en `<em>`.
     `clamp(44px, 7vw, 96px)`: es el único título que puede ser tan grande.
     Sobre foto, el `<em>` va en crema con un subrayado del acento: el
     color `--brand-light` de morado, rojo y verde no llega a 3:1 sobre una
     foto clara en esa zona. Sin foto, el `<em>` sí va en el acento.
   - Regla corta en `--brand`.
   - El eslogan y la descripción, si existen.
   - Los dos botones (Ver Servicios / Contáctanos).
   - Las cifras reales: barberos, experiencia, servicios.
   - **El sello** (`SealBadge` + reconocimientos) en una tarjeta sobre la
     foto. Se ve en escritorio **y en móvil**: es el argumento de venta.
4. **Indicador de desplazamiento** ("Desliza"): con un hero que llena la
   vista, señalar que hay más abajo importa más, no menos.

Alto: unos 700px en escritorio y 560px en móvil, con `min-height` — **nunca
100vh**, para que en un teléfono se vea que hay servicios debajo.

**Sin ninguna foto** el hero no puede verse roto: queda el fondo oscuro con
el acento de la barbería y el mismo contenido, sin alto vacío ni ícono de
imagen rota. Le pasa a toda barbería recién registrada.

---

## 9. Accesibilidad

- Texto normal 4.5:1; texto grande (24px o más) 3:1. Por eso existe
  `--brand-text`.
- Elementos reales: `<button>`, `<a href>`, `<input>` con su `<label>`.
  Nunca un `div` con `onClick`.
- `aria-label` en botones que solo tienen ícono.
- SVG decorativo con `aria-hidden="true"`; el que comunica algo, con `role`
  y etiqueta.
- El color nunca es el único canal: lo que se distingue por color también se
  distingue por forma o texto.
- `prefers-reduced-motion` respetado.

---

## 10. Fotografía

El diseño solo puede llegar hasta donde llegue la foto. La diferencia de
calidad percibida entre este perfil y uno de gama alta está más en las
imágenes que en el CSS.

**Decisión abierta (D3):** cómo se garantiza la calidad fotográfica. Dos
caminos planteados, sin decidir: que un mínimo fotográfico sea parte de la
auditoría del sello, o incluir una sesión de fotos en el plan anual. Es
decisión de negocio, no de diseño, pero condiciona el resultado visual más
que cualquier otra cosa de este documento.

Mientras tanto, el diseño debe **degradar con dignidad**: una barbería con
tres fotos regulares no puede verse rota, solo más sobria.

---

## 11. La plataforma: pendiente

El estilo de la landing, el directorio y los paneles está **sin definir**.
La intención registrada es tomar una referencia de Refero Styles, pero esa
referencia todavía no se ha elegido.

Hasta que se elija, la plataforma se queda con el tema Dark/Gold/Purple de
`globals.css` tal como está. **No empezar a rediseñarla sin esa referencia**:
sin un destino claro, el resultado es una mezcla.

---

## 12. Decisiones abiertas

| | Decisión | Estado |
|---|---|---|
| D1 | Reemplazar Poppins por una sans con más carácter | Sin decidir |
| D2 | Botón píldora con degradado vs. botón plano | Resuelta el 2026-10-19: opción B, botón plano (ver 6.1 y 6.6) |
| D3 | Cómo se garantiza la calidad fotográfica | Decisión de negocio |
| D4 | Referencia de Refero Styles para la plataforma | Sin elegir |

D1, D3 y D4 siguen abiertas.