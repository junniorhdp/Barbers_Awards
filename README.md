# Barbers Awards

SaaS de sello de calidad para barberías. Ver `CLAUDE.md` y `docs/ARCHITECTURE.md` para las reglas y el diseño técnico completo.

## Requisitos

- Node.js 20+
- Una cuenta y un proyecto de [Supabase](https://supabase.com)

## Puesta en marcha

```bash
npm install
cp .env.example .env.local   # y completa los valores (ver más abajo)
npm run dev
```

Abre [http://localhost:3000](http://localhost:3000).

## Variables de entorno

Copia `.env.example` a `.env.local` y completa los valores. El detalle de cada variable está en `docs/ARCHITECTURE.md`, sección 5. `.env.local` nunca se sube a git (ya está en `.gitignore`).

## Base de datos: aplicar `docs/SCHEMA.sql` en Supabase

1. Crea un proyecto en [supabase.com](https://supabase.com) (uno para desarrollo y, más adelante, otro para producción — ver `ARCHITECTURE.md` 6.2).
2. En el panel del proyecto, ve a **Settings → API** y copia:
   - **Project URL** → `NEXT_PUBLIC_SUPABASE_URL` (solo la URL base, por ejemplo `https://xxxxx.supabase.co`, **sin** rutas adicionales como `/rest/v1/`).
   - **anon / publishable key** → `NEXT_PUBLIC_SUPABASE_ANON_KEY`.
   - **service_role / secret key** → `SUPABASE_SERVICE_ROLE_KEY` (nunca la expongas en código de cliente ni la subas a git).
3. Ve a **SQL Editor**, crea una consulta nueva, pega **todo** el contenido de `docs/SCHEMA.sql` y ejecútalo. El script:
   - corre dentro de una transacción (si algo falla, no queda nada a medias);
   - es idempotente (se puede volver a ejecutar sin romper lo existente);
   - crea las 9 tablas, sus índices, funciones auxiliares, triggers, políticas RLS y el bucket de Storage `barberias-storage`;
   - siembra el catálogo de sellos (`Gold` y `Silver`) al final, fuera de la transacción principal.
4. Verifica en **Authentication → Policies** (o **Database → Tables**) que las 9 tablas tengan RLS activo.
5. Activa la extensión `pg_cron` en **Database → Extensions** si vas a programar el vencimiento de suscripciones (`ARCHITECTURE.md` 3.6).
6. Para crear el primer administrador:
   1. Regístrate normalmente desde la app (o créate el usuario en **Authentication → Users**).
   2. En el SQL Editor, ejecuta:
      ```sql
      update public.profiles
      set role = 'administrator'
      where email = 'tu-correo@ejemplo.com';
      ```
   (Ver la sección 8 al final de `docs/SCHEMA.sql` para más notas operativas: registro de dueños, activación de suscripción, registro de leads y redención de cupones.)

## Estructura del proyecto

La estructura de carpetas sigue `docs/ARCHITECTURE.md`, sección 3.2. Por ahora, la mayoría de páginas y rutas de API son marcadores de posición: la lógica de cada caso de uso se construye fase por fase.

## Scripts

- `npm run dev` — servidor de desarrollo
- `npm run build` — build de producción
- `npm run lint` — ESLint
