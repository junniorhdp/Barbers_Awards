-- =============================================================================
-- BARBERS AWARD  ·  SCHEMA.sql  (MVP v1.4)
-- Base de datos: Supabase (PostgreSQL + Auth + Storage)
--
-- Cómo aplicarlo:
--   Supabase Dashboard → SQL Editor → pegar y ejecutar todo el script
--   (o guardarlo como migración en supabase/migrations/).
--
-- Características:
--   · Idempotente: se puede volver a ejecutar sin romper lo existente.
--   · Todo corre dentro de una transacción: si algo falla, no queda nada a medias.
--
-- Contenido:
--   1. Tablas
--   2. Índices
--   3. Funciones auxiliares (roles, propiedad y validación de cupones)
--   4. Triggers (alta de perfil, protección de columnas sensibles, conteo de redenciones)
--   5. Row Level Security (RLS)
--   6. Endurecimiento de privilegios
--   7. Storage: bucket barberias-storage
--   8. Notas operativas
--
-- Cambios de la v1.3 respecto a la v1.1 (docs/USE_CASES.md sigue en v2.2; hay que
-- actualizar CU-05, CU-06, CU-13 y CU-14 para reflejar este diseño — ver el aviso
-- al final de la sección 4):
--   · certificaciones ya no tiene nivel_sello fijo a 'Gold'/'Silver': ahora referencia
--     la nueva tabla catalogo_sellos (CU-19), sembrada con Gold y Silver por defecto.
--   · leads_whatsapp se reconstruye: en vez de guardar texto libre (servicio_nombre,
--     barbero_nombre, codigo_cupon_usado), guarda teléfono y nombre del cliente y
--     referencias (servicio_id, barbero_id, cupon_id) a las tablas reales, más
--     conversion_exitosa para registrar si el cupón terminó usándose en el local.
--   · cupones_descuento gana fecha_fin (vigencia), veces_redimido y limite_usos.
--   · Un mismo teléfono no puede redimir el mismo cupón dos veces (índice único
--     parcial). Al marcar conversion_exitosa = true se descuenta un uso del cupón,
--     bloqueado por trigger si ya alcanzó su limite_usos.
--   · Nueva función pública cupon_ya_usado(telefono, cupon_id) para avisarle al
--     visitante ANTES de reservar, sin exponer la tabla de leads (que es privada
--     del dueño).
--
-- Cambios de la v1.4 respecto a la v1.3 (corrección, ver sección 9 al final del
-- archivo): eliminar un cupón con leads asociados fallaba con el error 'El dueño
-- solo puede modificar conversion_exitosa de un lead.' — leads_whatsapp.cupon_id
-- tiene on delete set null, así que borrar el cupón dispara una actualización en
-- cascada de cupon_id a NULL en cada lead que lo referencia, y esa actualización
-- caía en la misma regla que bloquea al dueño editar sus leads directamente
-- (trg_leads_guard_columns). La sección 9 corrige leads_guard_only_conversion()
-- para permitir específicamente ese caso (cupon_id -> NULL), sin abrir ninguna
-- otra columna protegida.
-- =============================================================================

begin;

-- =============================================================================
-- 1. TABLAS
-- =============================================================================

-- -----------------------------------------------------------------------------
-- profiles: extensión 1-a-1 de auth.users
-- -----------------------------------------------------------------------------
create table if not exists public.profiles (
  id          uuid primary key references auth.users (id) on delete cascade,
  email       text unique,
  role        text not null default 'client',
  created_at  timestamptz not null default now(),

  constraint profiles_role_check
    check (role in ('administrator', 'barberia_owner', 'client'))
);

comment on table public.profiles is
  'Perfil de cada usuario de Supabase Auth. El rol define los permisos de la app.';

-- -----------------------------------------------------------------------------
-- barberias: información pública y de suscripción del local
-- -----------------------------------------------------------------------------
create table if not exists public.barberias (
  id                             uuid primary key default gen_random_uuid(),
  owner_id                       uuid not null references public.profiles (id) on delete cascade,
  nombre                         text not null,
  slug                           text not null unique,
  descripcion                    text,
  eslogan                        text,
  historia                       text,
  anio_fundacion                 smallint,
  direccion                      text,
  ciudad                         text not null,
  zona                           text,
  telefono_whatsapp              text,
  instagram_url                  text,
  facebook_url                   text,
  color_acento                   text not null default 'dorado',
  logo_preset                    text not null default 'tijeras',
  horarios                       jsonb not null default '{}'::jsonb,
  fotos                          text[] not null default '{}',
  estado_sello                   text not null default 'pendiente',
  estado_suscripcion             text not null default 'prueba',
  fecha_inicio_suscripcion       timestamptz,
  fecha_vencimiento_suscripcion  timestamptz,
  plan_tipo                      text,
  created_at                     timestamptz not null default now(),

  constraint barberias_slug_format_check
    check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  constraint barberias_estado_sello_check
    check (estado_sello in ('pendiente', 'gold', 'silver', 'inactivo')),
  constraint barberias_estado_suscripcion_check
    check (estado_suscripcion in ('prueba', 'activa', 'vencida', 'cancelada')),
  constraint barberias_plan_tipo_check
    check (plan_tipo is null or plan_tipo in ('mensual', 'anual')),
  constraint barberias_vigencia_check
    check (fecha_inicio_suscripcion is null or fecha_vencimiento_suscripcion is null
           or fecha_vencimiento_suscripcion >= fecha_inicio_suscripcion),
  constraint barberias_color_acento_check
    check (color_acento in ('dorado', 'morado', 'verde', 'rojo')),
  constraint barberias_logo_preset_check
    check (logo_preset ~ '^[a-z0-9-]{2,30}$'),
  constraint barberias_eslogan_check
    check (eslogan is null or char_length(eslogan) <= 80),
  constraint barberias_historia_check
    check (historia is null or char_length(historia) <= 2000),
  constraint barberias_anio_fundacion_check
    check (anio_fundacion is null or anio_fundacion between 1900 and 2100)
);

comment on column public.barberias.estado_sello is
  'pendiente/gold/silver/inactivo: nivel visible en el directorio. Independiente de catalogo_sellos, que solo aplica al detalle del folio (CU-04).';

-- -----------------------------------------------------------------------------
-- barberos: equipo de trabajo de cada barbería
-- -----------------------------------------------------------------------------
create table if not exists public.barberos (
  id                uuid primary key default gen_random_uuid(),
  barberia_id       uuid not null references public.barberias (id) on delete cascade,
  nombre            text not null,
  foto_avatar       text,
  experiencia_anos  integer not null default 0,
  especialidades    text[] not null default '{}',
  diplomas_urls     text[] not null default '{}',
  created_at        timestamptz not null default now(),

  constraint barberos_experiencia_check check (experiencia_anos >= 0)
);

-- -----------------------------------------------------------------------------
-- servicios: catálogo de servicios de cada barbería (CU-11)
-- -----------------------------------------------------------------------------
create table if not exists public.servicios (
  id            uuid primary key default gen_random_uuid(),
  barberia_id   uuid not null references public.barberias (id) on delete cascade,
  nombre        text not null,
  descripcion   text,
  precio        numeric(12, 2) not null,
  duracion_min  integer,
  icono         text not null default 'tijeras',
  destacado     boolean not null default false,
  es_activo     boolean not null default true,
  orden         integer not null default 0,
  created_at    timestamptz not null default now(),

  constraint servicios_nombre_check      check (char_length(nombre) between 2 and 80),
  constraint servicios_descripcion_check check (descripcion is null or char_length(descripcion) <= 200),
  constraint servicios_precio_check      check (precio >= 0),
  constraint servicios_duracion_check    check (duracion_min is null or duracion_min between 5 and 480),
  constraint servicios_icono_check       check (icono ~ '^[a-z0-9-]{2,30}$')
);

-- -----------------------------------------------------------------------------
-- catalogo_sellos: niveles de certificación configurables por el staff (CU-19)
-- -----------------------------------------------------------------------------
create table if not exists public.catalogo_sellos (
  id               uuid primary key default gen_random_uuid(),
  nombre_sello     text not null,
  nivel            text not null,
  requisitos       text,
  entidad_emisora  text not null default 'Barbers Awards Official',
  color_hex        text,
  created_at       timestamptz not null default now(),

  constraint catalogo_sellos_nombre_check check (char_length(nombre_sello) between 2 and 60),
  constraint catalogo_sellos_color_check  check (color_hex is null or color_hex ~ '^#[0-9a-fA-F]{6}$')
);

create unique index if not exists uq_catalogo_sellos_nombre on public.catalogo_sellos (lower(nombre_sello));

comment on table public.catalogo_sellos is
  'Niveles de sello administrables (CU-19). Sembrada con Gold y Silver por defecto (sección 8). color_hex es opcional: si es nulo, el frontend usa un color por defecto.';

-- -----------------------------------------------------------------------------
-- certificaciones: sellos oficiales otorgados a las barberías (CU-18)
-- -----------------------------------------------------------------------------
create table if not exists public.certificaciones (
  id                  uuid primary key default gen_random_uuid(),
  barberia_id         uuid not null references public.barberias (id) on delete cascade,
  sello_id            uuid not null references public.catalogo_sellos (id) on delete restrict,
  folio_verificacion  text not null unique,
  estado              text not null default 'pendiente',
  fecha_emision       timestamptz not null default now(),
  fecha_vencimiento   timestamptz,
  created_at          timestamptz not null default now(),

  constraint certificaciones_estado_check
    check (estado in ('activo', 'pendiente', 'revocado')),
  constraint certificaciones_vigencia_check
    check (fecha_vencimiento is null or fecha_vencimiento > fecha_emision)
);

comment on column public.certificaciones.sello_id is
  'ON DELETE RESTRICT a propósito: no se puede borrar un sello del catálogo mientras alguna barbería lo tenga otorgado.';

-- -----------------------------------------------------------------------------
-- cupones_descuento: promociones de cada barbería (CU-13)
-- -----------------------------------------------------------------------------
create table if not exists public.cupones_descuento (
  id               uuid primary key default gen_random_uuid(),
  barberia_id      uuid not null references public.barberias (id) on delete cascade,
  codigo           text not null,
  descripcion      text,
  tipo_descuento   text not null,
  valor_descuento  numeric(12, 2) not null,
  fecha_fin        timestamptz,
  veces_redimido   integer not null default 0,
  limite_usos      integer,
  es_activo        boolean not null default true,
  creado_en        timestamptz not null default now(),

  constraint cupones_tipo_check       check (tipo_descuento in ('porcentaje', 'monto_fijo')),
  constraint cupones_valor_check      check (valor_descuento > 0),
  constraint cupones_porcentaje_check check (tipo_descuento <> 'porcentaje' or valor_descuento <= 100),
  constraint cupones_vigencia_check   check (fecha_fin is null or fecha_fin > creado_en),
  constraint cupones_veces_redimido_check check (veces_redimido >= 0),
  constraint cupones_limite_usos_check    check (limite_usos is null or limite_usos > 0),
  constraint cupones_limite_alcanzable_check
    check (limite_usos is null or veces_redimido <= limite_usos)
);

comment on column public.cupones_descuento.veces_redimido is
  'Se actualiza solo por trigger (trg_leads_sync_cupon_usage), nunca directo desde la aplicación: ver sección 4.';
comment on column public.cupones_descuento.limite_usos is
  'Tope total de redenciones del cupón en toda la plataforma (Opción 2, defensa complementaria a la unicidad por teléfono). NULL = sin tope.';

-- -----------------------------------------------------------------------------
-- leads_whatsapp: historial de reservas por WhatsApp y cierre de conversión (CU-06, CU-14)
-- -----------------------------------------------------------------------------
create table if not exists public.leads_whatsapp (
  id                  uuid primary key default gen_random_uuid(),
  barberia_id         uuid not null references public.barberias (id) on delete cascade,
  nombre_cliente      text not null,
  telefono_cliente    text not null,
  servicio_id         uuid references public.servicios (id) on delete set null,
  barbero_id          uuid references public.barberos (id) on delete set null,
  cupon_id            uuid references public.cupones_descuento (id) on delete set null,
  conversion_exitosa  boolean not null default false,
  creado_en           timestamptz not null default now(),

  constraint leads_nombre_check   check (char_length(nombre_cliente) between 1 and 120),
  constraint leads_telefono_check check (telefono_cliente ~ '^[0-9]{10,15}$')
);

comment on column public.leads_whatsapp.telefono_cliente is
  'Solo dígitos, con código de país (igual normalización que barberias.telefono_whatsapp, ver ARCHITECTURE.md 4.2.3). Dato declarado por el cliente, sin verificación: ver la nota de la función cupon_ya_usado más abajo.';
comment on column public.leads_whatsapp.conversion_exitosa is
  'Se marca en /dashboard/cupones cuando el cliente presenta su cupón en el local (CU-14). Si cupon_id no es nulo, el trigger trg_leads_sync_cupon_usage ajusta cupones_descuento.veces_redimido.';

-- -----------------------------------------------------------------------------
-- transacciones_pago: auditoría de pagos Wompi
-- -----------------------------------------------------------------------------
create table if not exists public.transacciones_pago (
  id                     uuid primary key default gen_random_uuid(),
  barberia_id            uuid references public.barberias (id) on delete set null,
  wompi_transaction_id   text not null unique,
  monto                  numeric(14, 2) not null,
  moneda                 text not null default 'COP',
  metodo_pago            text,
  estado                 text not null,
  creado_en              timestamptz not null default now(),

  constraint transacciones_monto_check check (monto >= 0),
  constraint transacciones_estado_check
    check (estado in ('APPROVED', 'DECLINED', 'VOIDED', 'PENDING', 'ERROR'))
);


-- =============================================================================
-- 2. ÍNDICES
-- =============================================================================

create index if not exists idx_barberias_owner_id       on public.barberias (owner_id);
create index if not exists idx_barberias_ciudad         on public.barberias (ciudad);
create index if not exists idx_barberias_zona           on public.barberias (zona);
create index if not exists idx_barberias_estado_sello   on public.barberias (estado_sello);

create index if not exists idx_barberos_barberia_id     on public.barberos (barberia_id);

create index if not exists idx_servicios_barberia_orden on public.servicios (barberia_id, orden);
create unique index if not exists uq_servicios_nombre_por_barberia
  on public.servicios (barberia_id, lower(nombre));

create index if not exists idx_certificaciones_barberia on public.certificaciones (barberia_id);
create index if not exists idx_certificaciones_sello    on public.certificaciones (sello_id);
create unique index if not exists uq_certificaciones_activa_por_barberia
  on public.certificaciones (barberia_id) where estado = 'activo';

create index if not exists idx_cupones_barberia_id      on public.cupones_descuento (barberia_id);
create unique index if not exists uq_cupones_codigo_por_barberia
  on public.cupones_descuento (barberia_id, upper(codigo));

create index if not exists idx_leads_barberia_fecha     on public.leads_whatsapp (barberia_id, creado_en desc);
create index if not exists idx_leads_cupon              on public.leads_whatsapp (cupon_id) where cupon_id is not null;

-- Opción 4: un mismo teléfono no puede redimir el mismo cupón dos veces.
-- Parcial (where cupon_id is not null) porque la regla es solo sobre cupones;
-- la mayoría de los leads no llevan uno y no tiene sentido indexarlos aquí.
create unique index if not exists uq_leads_telefono_cupon_activo
  on public.leads_whatsapp (telefono_cliente, cupon_id)
  where cupon_id is not null;

create index if not exists idx_transacciones_barberia   on public.transacciones_pago (barberia_id, creado_en desc);


-- =============================================================================
-- 3. FUNCIONES AUXILIARES
--    SECURITY DEFINER + search_path vacío: leen tablas propias sin disparar RLS
--    recursivo dentro de las políticas ni exponer más de lo necesario.
-- =============================================================================

create or replace function public.is_admin()
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.profiles p
    where p.id = (select auth.uid()) and p.role = 'administrator'
  );
$$;

create or replace function public.is_barberia_owner()
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.profiles p
    where p.id = (select auth.uid()) and p.role = 'barberia_owner'
  );
$$;

create or replace function public.owns_barberia(p_barberia_id uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.barberias b
    where b.id = p_barberia_id and b.owner_id = (select auth.uid())
  );
$$;

-- -----------------------------------------------------------------------------
-- cupon_ya_usado: para avisarle al visitante ANTES de reservar (CU-06) que ese
-- cupón ya lo usó con su teléfono, sin exponer leads_whatsapp (tabla privada del
-- dueño). Es una barrera BLANDA: el teléfono lo declara el cliente sin verificar,
-- así que esto reduce la reutilización casual, no la impide para alguien decidido
-- a escribir un número distinto cada vez (ver ARCHITECTURE.md, nota de diseño).
-- -----------------------------------------------------------------------------
create or replace function public.cupon_ya_usado(p_telefono text, p_cupon_id uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.leads_whatsapp
    where telefono_cliente = p_telefono and cupon_id = p_cupon_id
  );
$$;

revoke all on function public.is_admin()                      from public, anon;
revoke all on function public.is_barberia_owner()              from public, anon;
revoke all on function public.owns_barberia(uuid)              from public, anon;
revoke all on function public.cupon_ya_usado(text, uuid)       from public;
grant execute on function public.is_admin()                    to authenticated, service_role;
grant execute on function public.is_barberia_owner()            to authenticated, service_role;
grant execute on function public.owns_barberia(uuid)            to authenticated, service_role;
-- cupon_ya_usado sí la necesita el visitante anónimo, antes de tener sesión.
grant execute on function public.cupon_ya_usado(text, uuid)     to anon, authenticated, service_role;


-- =============================================================================
-- 4. TRIGGERS
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 4.1 handle_new_user(): crea el perfil al registrarse en Supabase Auth.
-- El rol se toma de raw_user_meta_data->>'role', pero solo se aceptan roles sin
-- privilegios: 'administrator' JAMÁS se asigna desde aquí (ver sección 8.1).
-- -----------------------------------------------------------------------------
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  v_role text;
begin
  v_role := case
    when new.raw_user_meta_data ->> 'role' = 'barberia_owner' then 'barberia_owner'
    else 'client'
  end;
  insert into public.profiles (id, email, role)
  values (new.id, new.email, v_role)
  on conflict (id) do nothing;
  return new;
end;
$$;

revoke all on function public.handle_new_user() from public, anon, authenticated;
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- -----------------------------------------------------------------------------
-- 4.2 Protección de columnas sensibles de barberias (igual que en versiones
-- anteriores): sin esto, un dueño podría ponerse estado_sello = 'gold' o
-- estado_suscripcion = 'activa' sin pagar ni auditoría.
-- -----------------------------------------------------------------------------
create or replace function public.barberias_guard_privileged_columns()
returns trigger language plpgsql set search_path = '' as $$
begin
  if auth.uid() is null or public.is_admin() then
    return new;
  end if;

  if tg_op = 'INSERT' then
    new.estado_sello                     := 'pendiente';
    new.estado_suscripcion               := 'prueba';
    new.fecha_inicio_suscripcion         := null;
    new.fecha_vencimiento_suscripcion    := null;
    new.plan_tipo                        := null;
    return new;
  end if;

  if new.owner_id is distinct from old.owner_id
     or new.estado_sello is distinct from old.estado_sello
     or new.estado_suscripcion is distinct from old.estado_suscripcion
     or new.fecha_inicio_suscripcion is distinct from old.fecha_inicio_suscripcion
     or new.fecha_vencimiento_suscripcion is distinct from old.fecha_vencimiento_suscripcion
     or new.plan_tipo is distinct from old.plan_tipo
  then
    raise exception 'No tienes permiso para modificar owner, sello, suscripción o plan.'
      using errcode = '42501';
  end if;

  return new;
end;
$$;

drop trigger if exists trg_barberias_guard on public.barberias;
create trigger trg_barberias_guard
  before insert or update on public.barberias
  for each row execute function public.barberias_guard_privileged_columns();

-- -----------------------------------------------------------------------------
-- 4.3 Protección de columnas en leads_whatsapp: el dueño (política
-- leads_update_owner, sección 5) solo debería poder marcar conversion_exitosa al
-- redimir un cupón (CU-14) — sin este trigger, RLS por sí sola le permitiría
-- modificar cualquier otra columna del lead, incluido el teléfono o la fecha, y
-- maquillar sus propias métricas frente al staff (ver ARCHITECTURE.md, decisión).
-- -----------------------------------------------------------------------------
create or replace function public.leads_guard_only_conversion()
returns trigger language plpgsql set search_path = '' as $$
begin
  if auth.uid() is null or public.is_admin() then
    return new;
  end if;

  if new.barberia_id is distinct from old.barberia_id
     or new.nombre_cliente is distinct from old.nombre_cliente
     or new.telefono_cliente is distinct from old.telefono_cliente
     or new.servicio_id is distinct from old.servicio_id
     or new.barbero_id is distinct from old.barbero_id
     or new.cupon_id is distinct from old.cupon_id
     or new.creado_en is distinct from old.creado_en
  then
    raise exception 'El dueño solo puede modificar conversion_exitosa de un lead.'
      using errcode = '42501';
  end if;

  return new;
end;
$$;

drop trigger if exists trg_leads_guard_columns on public.leads_whatsapp;
create trigger trg_leads_guard_columns
  before update on public.leads_whatsapp
  for each row execute function public.leads_guard_only_conversion();

-- -----------------------------------------------------------------------------
-- 4.4 Opción 2 — tope total de usos por cupón: al marcar (o desmarcar, para
-- corregir un error del staff) conversion_exitosa en un lead con cupón, se ajusta
-- cupones_descuento.veces_redimido. Si el cupón ya alcanzó su limite_usos, la
-- redención se bloquea con una excepción clara en vez de fallar en silencio.
-- SECURITY DEFINER: el dueño tiene permiso para marcar la conversión (política de
-- leads) pero no necesita permiso directo de UPDATE sobre cupones_descuento; el
-- trigger hace ese único cambio de forma controlada y auditable.
-- -----------------------------------------------------------------------------
create or replace function public.leads_sync_cupon_usage()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  v_limite integer;
  v_usados integer;
begin
  -- Se activa solo cuando conversion_exitosa cambia y el lead tiene cupón.
  if new.conversion_exitosa is not distinct from old.conversion_exitosa
     or new.cupon_id is null
  then
    return new;
  end if;

  if new.conversion_exitosa then
    select limite_usos, veces_redimido into v_limite, v_usados
    from public.cupones_descuento
    where id = new.cupon_id
    for update;

    if v_limite is not null and v_usados >= v_limite then
      raise exception 'Este cupón alcanzó su límite de % usos.', v_limite
        using errcode = '23514';
    end if;

    update public.cupones_descuento
    set veces_redimido = veces_redimido + 1
    where id = new.cupon_id;
  else
    -- Reversa: el staff desmarcó una conversión que había marcado por error.
    update public.cupones_descuento
    set veces_redimido = greatest(veces_redimido - 1, 0)
    where id = new.cupon_id;
  end if;

  return new;
end;
$$;

drop trigger if exists trg_leads_sync_cupon_usage on public.leads_whatsapp;
create trigger trg_leads_sync_cupon_usage
  before update on public.leads_whatsapp
  for each row execute function public.leads_sync_cupon_usage();

-- -----------------------------------------------------------------------------
-- AVISO PARA docs/USE_CASES.md (v2.2): esta versión del esquema cambia cómo
-- funciona la redención (CU-14). Ya no es "buscar un código y sumar un contador
-- suelto": ahora es "marcar como convertido el lead específico de ese cliente"
-- (conversion_exitosa = true), y el contador de cupones_descuento se deriva de
-- eso por trigger. CU-06 también cambia: el selector de reserva ahora pide
-- nombre y teléfono antes de abrir WhatsApp, y debe llamar a cupon_ya_usado()
-- para avisar si el cupón elegido ya se usó con ese teléfono. Pendiente
-- actualizar USE_CASES.md, ARCHITECTURE.md e HISTORIAS_USUARIO.md.
-- -----------------------------------------------------------------------------


-- =============================================================================
-- 5. ROW LEVEL SECURITY (RLS)
-- =============================================================================

alter table public.profiles           enable row level security;
alter table public.barberias          enable row level security;
alter table public.barberos           enable row level security;
alter table public.servicios          enable row level security;
alter table public.catalogo_sellos    enable row level security;
alter table public.certificaciones    enable row level security;
alter table public.cupones_descuento  enable row level security;
alter table public.leads_whatsapp     enable row level security;
alter table public.transacciones_pago enable row level security;

-- Limpieza previa para que el script sea re-ejecutable.
do $$
declare
  pol record;
begin
  for pol in
    select policyname, tablename
    from pg_policies
    where schemaname = 'public'
      and tablename in (
        'profiles', 'barberias', 'barberos', 'servicios', 'catalogo_sellos',
        'certificaciones', 'cupones_descuento', 'leads_whatsapp', 'transacciones_pago'
      )
  loop
    execute format('drop policy if exists %I on public.%I', pol.policyname, pol.tablename);
  end loop;
end
$$;

-- PROFILES
create policy profiles_select_own on public.profiles
  for select to authenticated using (id = (select auth.uid()));
create policy profiles_admin_all on public.profiles
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

-- BARBERIAS
create policy barberias_select_public on public.barberias
  for select to anon, authenticated using (estado_sello <> 'inactivo');
create policy barberias_select_owner on public.barberias
  for select to authenticated using (owner_id = (select auth.uid()));
create policy barberias_insert_owner on public.barberias
  for insert to authenticated
  with check (owner_id = (select auth.uid()) and public.is_barberia_owner());
create policy barberias_update_owner on public.barberias
  for update to authenticated
  using (owner_id = (select auth.uid())) with check (owner_id = (select auth.uid()));
create policy barberias_admin_all on public.barberias
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

-- BARBEROS
create policy barberos_select_public on public.barberos
  for select to anon, authenticated
  using (exists (select 1 from public.barberias b where b.id = barberos.barberia_id));
create policy barberos_owner_all on public.barberos
  for all to authenticated
  using (public.owns_barberia(barberia_id)) with check (public.owns_barberia(barberia_id));
create policy barberos_admin_all on public.barberos
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

-- SERVICIOS
create policy servicios_select_public on public.servicios
  for select to anon, authenticated
  using (es_activo = true
         and exists (select 1 from public.barberias b where b.id = servicios.barberia_id));
create policy servicios_owner_all on public.servicios
  for all to authenticated
  using (public.owns_barberia(barberia_id)) with check (public.owns_barberia(barberia_id));
create policy servicios_admin_all on public.servicios
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

-- CATALOGO_SELLOS (CU-19: solo el staff lo administra; lectura pública para
-- poder mostrar nombre/requisitos del sello en el perfil y en /verificar).
create policy catalogo_select_public on public.catalogo_sellos
  for select to anon, authenticated using (true);
create policy catalogo_admin_all on public.catalogo_sellos
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

-- CERTIFICACIONES (CU-04 público, CU-18 solo staff)
create policy certificaciones_select_public on public.certificaciones
  for select to anon, authenticated using (true);
create policy certificaciones_admin_all on public.certificaciones
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

-- CUPONES (CU-05 público solo activos, CU-13 dueño)
create policy cupones_select_public on public.cupones_descuento
  for select to anon, authenticated
  using (es_activo = true
         and exists (select 1 from public.barberias b where b.id = cupones_descuento.barberia_id));
create policy cupones_owner_all on public.cupones_descuento
  for all to authenticated
  using (public.owns_barberia(barberia_id)) with check (public.owns_barberia(barberia_id));
create policy cupones_admin_all on public.cupones_descuento
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

-- LEADS (el dueño lee sus leads y solo puede tocar conversion_exitosa —
-- ver trigger trg_leads_guard_columns arriba; el INSERT lo hace /api/leads con
-- service_role, por eso no hay política de insert para anon/authenticated).
create policy leads_select_owner on public.leads_whatsapp
  for select to authenticated using (public.owns_barberia(barberia_id));
create policy leads_update_owner on public.leads_whatsapp
  for update to authenticated
  using (public.owns_barberia(barberia_id)) with check (public.owns_barberia(barberia_id));
create policy leads_admin_all on public.leads_whatsapp
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

-- TRANSACCIONES (el dueño solo lee; escribe el webhook con service_role)
create policy transacciones_select_owner on public.transacciones_pago
  for select to authenticated using (public.owns_barberia(barberia_id));
create policy transacciones_admin_all on public.transacciones_pago
  for all to authenticated using (public.is_admin()) with check (public.is_admin());


-- =============================================================================
-- 6. ENDURECIMIENTO DE PRIVILEGIOS (defensa en profundidad, además de RLS)
-- =============================================================================

revoke all on table public.profiles, public.leads_whatsapp, public.transacciones_pago
  from anon;
revoke insert, update, delete on table
  public.barberias, public.barberos, public.servicios,
  public.catalogo_sellos, public.certificaciones, public.cupones_descuento
  from anon;
revoke truncate, references, trigger on all tables in schema public
  from anon, authenticated;


-- =============================================================================
-- 7. STORAGE: bucket barberias-storage
-- =============================================================================

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'barberias-storage', 'barberias-storage', true, 10485760,
  array['image/jpeg', 'image/png', 'image/webp', 'application/pdf']
)
on conflict (id) do update
  set public = excluded.public,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists barberias_storage_owner_select on storage.objects;
drop policy if exists barberias_storage_owner_insert on storage.objects;
drop policy if exists barberias_storage_owner_update on storage.objects;
drop policy if exists barberias_storage_owner_delete on storage.objects;
drop policy if exists barberias_storage_admin_all    on storage.objects;

create policy barberias_storage_owner_select on storage.objects
  for select to authenticated
  using (bucket_id = 'barberias-storage'
         and (storage.foldername(name))[1] in (
           select b.id::text from public.barberias b where b.owner_id = (select auth.uid())
         ));
create policy barberias_storage_owner_insert on storage.objects
  for insert to authenticated
  with check (bucket_id = 'barberias-storage'
              and (storage.foldername(name))[1] in (
                select b.id::text from public.barberias b where b.owner_id = (select auth.uid())
              ));
create policy barberias_storage_owner_update on storage.objects
  for update to authenticated
  using (bucket_id = 'barberias-storage'
         and (storage.foldername(name))[1] in (
           select b.id::text from public.barberias b where b.owner_id = (select auth.uid())
         ))
  with check (bucket_id = 'barberias-storage'
              and (storage.foldername(name))[1] in (
                select b.id::text from public.barberias b where b.owner_id = (select auth.uid())
              ));
create policy barberias_storage_owner_delete on storage.objects
  for delete to authenticated
  using (bucket_id = 'barberias-storage'
         and (storage.foldername(name))[1] in (
           select b.id::text from public.barberias b where b.owner_id = (select auth.uid())
         ));
create policy barberias_storage_admin_all on storage.objects
  for all to authenticated
  using (bucket_id = 'barberias-storage' and public.is_admin())
  with check (bucket_id = 'barberias-storage' and public.is_admin());


commit;


-- =============================================================================
-- 8. NOTAS OPERATIVAS Y SEMILLA (no forman parte de la transacción anterior)
-- =============================================================================

-- 8.1 Semilla del catálogo de sellos (idempotente): sin esto, el staff no podría
--     certificar a nadie hasta configurar manualmente el catálogo en CU-19.
insert into public.catalogo_sellos (nombre_sello, nivel, entidad_emisora, color_hex)
values
  ('Gold', 'Gold', 'Barbers Awards Official', '#D4AF37'),
  ('Silver', 'Silver', 'Barbers Awards Official', '#C0C0C0')
on conflict (lower(nombre_sello)) do nothing;

-- 8.2 Crear el primer administrador
--     1) Crea el usuario en Authentication → Users (o regístralo normalmente).
--     2) Promuévelo desde el SQL Editor:
--
--        update public.profiles
--        set role = 'administrator'
--        where email = 'admin@barbersaward.com';

-- 8.3 Registro de dueños (CU-07)
--     Desde el cliente:
--
--        supabase.auth.signUp({
--          email, password,
--          options: { data: { role: 'barberia_owner' } }
--        })
--
--     El trigger handle_new_user() crea el perfil con ese rol. Luego el cliente
--     inserta la fila en public.barberias con owner_id = auth.uid(); el trigger
--     de protección fija estado_sello = 'pendiente' y estado_suscripcion = 'prueba'.

-- 8.4 Activación de suscripción (CU-12)
--     Solo el webhook (service_role) debe ejecutar algo como:
--
--        update public.barberias
--        set estado_suscripcion = 'activa',
--            plan_tipo = 'mensual',
--            fecha_inicio_suscripcion = now(),
--            fecha_vencimiento_suscripcion = now() + interval '30 days'
--        where id = :barberia_id;

-- 8.5 Registrar un lead (CU-06, /api/leads con service_role)
--
--        insert into public.leads_whatsapp
--          (barberia_id, nombre_cliente, telefono_cliente, servicio_id, barbero_id, cupon_id)
--        values (:barberia_id, :nombre, :telefono_normalizado, :servicio_id, :barbero_id, :cupon_id);
--
--     Si el cupón ya fue usado por ese teléfono, esta inserción falla con el
--     error 23505 (unique_violation) por uq_leads_telefono_cupon_activo. La
--     aplicación debe reintentar el mismo insert con cupon_id = null para no
--     perder la reserva (ver la respuesta donde se explicó esta Opción 4).

-- 8.6 Redimir un cupón en el local (CU-14, con la sesión del dueño)
--
--        update public.leads_whatsapp
--        set conversion_exitosa = true
--        where id = :lead_id and barberia_id = :barberia_id;
--
--     Si el cupón de ese lead ya alcanzó su limite_usos, esta sentencia falla
--     con el mensaje del trigger trg_leads_sync_cupon_usage ('Este cupón
--     alcanzó su límite de N usos.'), sin modificar nada.


-- =============================================================================
-- 9. MIGRACIÓN v1.4 — CORRECCIÓN DE leads_guard_only_conversion()
--    (aplicar sobre una base ya inicializada con v1.1–v1.3; en una base nueva,
--    ejecutar el archivo completo de una sola vez ya deja esta versión activa,
--    porque este create or replace corre después de la definición original de
--    la sección 4.3).
--
--    Bug reportado en la Fase 5: al eliminar un cupón de cupones_descuento que
--    ya tenía leads asociados, el DELETE fallaba con el error 'El dueño solo
--    puede modificar conversion_exitosa de un lead.' — un error de la base de
--    datos, no de la aplicación. Causa: leads_whatsapp.cupon_id se declaró
--    'on delete set null' (sección 1), así que borrar el cupón obliga a
--    Postgres a actualizar cupon_id = NULL en cada lead que lo referencia.
--    Esa actualización en cascada disparaba trg_leads_guard_columns, el mismo
--    trigger pensado para impedir que el dueño edite un lead más allá de
--    conversion_exitosa (sección 4.3) — sin distinguir entre una edición
--    directa del dueño y una consecuencia legítima del ON DELETE SET NULL.
--
--    Corrección: la única columna que ahora se exceptúa es cupon_id, y solo
--    cuando el valor nuevo es NULL. El resto de columnas protegidas
--    (barberia_id, nombre_cliente, telefono_cliente, servicio_id, barbero_id,
--    creado_en) siguen bloqueadas exactamente igual que en la v1.3; tampoco se
--    permite cambiar cupon_id a otro cupón distinto de NULL. No se modifica la
--    definición original de la sección 4.3: esta es la versión que queda
--    activa al final, por el create or replace function.
-- =============================================================================

begin;

create or replace function public.leads_guard_only_conversion()
returns trigger language plpgsql set search_path = '' as $$
begin
  if auth.uid() is null or public.is_admin() then
    return new;
  end if;

  if new.barberia_id is distinct from old.barberia_id
     or new.nombre_cliente is distinct from old.nombre_cliente
     or new.telefono_cliente is distinct from old.telefono_cliente
     or new.servicio_id is distinct from old.servicio_id
     or new.barbero_id is distinct from old.barbero_id
     or (new.cupon_id is distinct from old.cupon_id and new.cupon_id is not null)
     or new.creado_en is distinct from old.creado_en
  then
    raise exception 'El dueño solo puede modificar conversion_exitosa de un lead.'
      using errcode = '42501';
  end if;

  return new;
end;
$$;

commit;
