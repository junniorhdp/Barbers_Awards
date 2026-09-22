import { z } from "zod";

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
