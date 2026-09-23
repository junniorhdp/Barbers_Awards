import { z } from "zod";
import { ACENTOS } from "./accent";
import { LOGO_PRESETS } from "./logo-presets";
import { HorariosSchema } from "./horarios";

export const LoginSchema = z.object({
  correo: z.string().email("Ingresa un correo válido."),
  contrasena: z.string().min(6, "La contraseña debe tener al menos 6 caracteres."),
});

export const RegistroSchema = z.object({
  nombrePersonal: z.string().trim().min(2, "Ingresa tu nombre.").max(120),
  nombreBarberia: z.string().trim().min(2, "Ingresa el nombre del establecimiento.").max(120),
  correo: z.string().email("Ingresa un correo válido."),
  contrasena: z.string().min(6, "La contraseña debe tener al menos 6 caracteres."),
  telefono: z
    .string()
    .transform((v) => v.replace(/\D/g, ""))
    .refine((v) => v.length >= 10 && v.length <= 15, {
      message: "El teléfono debe tener entre 10 y 15 dígitos (con código de país).",
    }),
  ciudad: z.string().trim().min(2, "Ingresa la ciudad.").max(120),
});

// --- Fase 3: perfil, equipo y servicios --------------------------------

const opcional = (max: number) =>
  z
    .string()
    .trim()
    .max(max, `Máximo ${max} caracteres.`)
    .transform((v) => (v === "" ? null : v));

const urlOpcional = z
  .string()
  .trim()
  .transform((v) => (v === "" ? null : v))
  .refine((v) => v === null || /^https?:\/\//i.test(v), {
    message: "Debe ser una URL que empiece con http:// o https://",
  });

export const PerfilSchema = z.object({
  direccion: opcional(200),
  ciudad: z.string().trim().min(2, "Ingresa la ciudad.").max(120),
  zona: opcional(120),
  telefonoWhatsapp: z
    .string()
    .transform((v) => v.replace(/\D/g, ""))
    .refine((v) => v === "" || (v.length >= 10 && v.length <= 15), {
      message: "El teléfono debe tener entre 10 y 15 dígitos (con código de país).",
    })
    .transform((v) => (v === "" ? null : v)),
  instagramUrl: urlOpcional,
  facebookUrl: urlOpcional,
  eslogan: opcional(80),
  descripcion: opcional(500),
  historia: opcional(2000),
  anioFundacion: z
    .string()
    .trim()
    .transform((v) => (v === "" ? null : Number(v)))
    .refine((v) => v === null || (Number.isInteger(v) && v >= 1900 && v <= 2100), {
      message: "Ingresa un año entre 1900 y 2100.",
    }),
  colorAcento: z.enum(ACENTOS, "Elige un color de acento válido."),
  logoPreset: z.enum(LOGO_PRESETS, "Elige un logo válido."),
  horarios: z
    .string()
    .transform((v, ctx) => {
      try {
        return JSON.parse(v);
      } catch {
        ctx.addIssue({ code: "custom", message: "El horario no tiene un formato válido." });
        return z.NEVER;
      }
    })
    .pipe(HorariosSchema),
});

export const BarberoSchema = z.object({
  nombre: z.string().trim().min(2, "Ingresa el nombre.").max(120),
  experienciaAnos: z
    .string()
    .transform((v) => Number(v))
    .refine((v) => Number.isInteger(v) && v >= 0, "Ingresa un número de años válido (0 o más)."),
  especialidades: z.string().transform((v) =>
    v
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean),
  ),
});

// Sugerencias, no una lista cerrada: el CHECK real de SCHEMA.sql solo exige
// minúsculas/números/guiones (2 a 30 caracteres). El selector visual del
// perfil público (con lucide-react) es Fase 4. Catálogo independiente del
// logo de la barbería (ver logo-presets.tsx y ARCHITECTURE.md 3.2).
//
// Hoy ninguno se renderiza como ícono en el dashboard (el campo es texto
// plano, sin vista previa). De las 8 llaves, "tijeras", "navaja" y "peine"
// coinciden con SVG que ya existen en logo-presets.tsx (dibujados para el
// logo, no para servicios). Las otras 5 — "barba", "afeitado", "corte",
// "cejas" y "masaje" — son nombres válidos y ya aceptados por el
// formulario, pero no tienen ningún SVG en el proyecto todavía: eso se
// resuelve en la Fase 4 al construir ServiceCard con lucide-react.
export const SERVICIO_ICONOS_SUGERIDOS = [
  "tijeras",
  "navaja",
  "peine",
  "barba",
  "afeitado",
  "corte",
  "cejas",
  "masaje",
] as const;

export const ServicioSchema = z.object({
  nombre: z.string().trim().min(2, "Ingresa el nombre.").max(80),
  descripcion: opcional(200),
  precio: z
    .string()
    .transform((v) => Number(v))
    .refine((v) => Number.isFinite(v) && v >= 0, "Ingresa un precio válido."),
  duracionMin: z
    .string()
    .trim()
    .transform((v) => (v === "" ? null : Number(v)))
    .refine((v) => v === null || (Number.isInteger(v) && v >= 5 && v <= 480), {
      message: "La duración debe estar entre 5 y 480 minutos.",
    }),
  icono: z
    .string()
    .trim()
    .toLowerCase()
    .regex(/^[a-z0-9-]{2,30}$/, "Usa minúsculas, números y guiones (2 a 30 caracteres)."),
  destacado: z.boolean(),
});

// --- Fase 5: cupones (CU-13) --------------------------------------------

export const CuponSchema = z
  .object({
    codigo: z
      .string()
      .trim()
      .toUpperCase()
      .min(3, "El código debe tener al menos 3 caracteres.")
      .max(40, "Máximo 40 caracteres."),
    descripcion: opcional(200),
    tipoDescuento: z.enum(["porcentaje", "monto_fijo"], "Elige un tipo de descuento válido."),
    valorDescuento: z
      .string()
      .transform((v) => Number(v))
      .refine((v) => Number.isFinite(v) && v > 0, "Ingresa un valor mayor a cero."),
    fechaFin: z
      .string()
      .trim()
      .transform((v) => (v === "" ? null : new Date(v).toISOString())),
    limiteUsos: z
      .string()
      .trim()
      .transform((v) => (v === "" ? null : Number(v)))
      .refine((v) => v === null || (Number.isInteger(v) && v > 0), {
        message: "El límite de usos debe ser un número entero mayor a cero.",
      }),
  })
  .refine((v) => v.tipoDescuento !== "porcentaje" || v.valorDescuento <= 100, {
    message: "Un descuento por porcentaje no puede superar 100.",
    path: ["valorDescuento"],
  });

// --- Fase 6: panel de administración (CU-17, CU-18, CU-19) --------------

export const RechazoSchema = z.object({
  motivoRechazo: opcional(300),
});

// CU-19: nivel limitado a Gold/Silver por ahora — es el único rango que
// barberias.estado_sello_check acepta (ver la respuesta donde se aprobó esta
// restricción); agregar más niveles necesita una migración aparte.
export const NIVELES_SELLO = ["Gold", "Silver"] as const;

export const SelloSchema = z.object({
  nombreSello: z.string().trim().min(2, "Ingresa el nombre del sello.").max(60),
  nivel: z.enum(NIVELES_SELLO, "Elige Gold o Silver."),
  requisitos: opcional(2000),
  entidadEmisora: z.string().trim().min(2, "Ingresa la entidad emisora.").max(120),
  colorHex: z
    .string()
    .trim()
    .transform((v) => (v === "" ? null : v))
    .refine((v) => v === null || /^#[0-9a-fA-F]{6}$/.test(v), {
      message: "El color debe ser un hex de 6 dígitos, ej. #D4AF37.",
    }),
});

export const CertificacionSchema = z.object({
  barberiaId: z.string().uuid("Elige una barbería válida."),
  selloId: z.string().uuid("Elige un sello válido."),
  fechaVencimiento: z
    .string()
    .trim()
    .transform((v) => (v === "" ? null : new Date(v).toISOString())),
});
