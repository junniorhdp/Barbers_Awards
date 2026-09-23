import { notFound } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { Playfair_Display, Poppins } from "next/font/google";
import { createClient } from "@/lib/supabase/public";
import { publicStorageUrl } from "@/lib/storage";
import { esAcentoValido } from "@/lib/accent";
import { esLogoValido } from "@/lib/logo-presets";
import { PerfilHeader } from "@/components/perfil/PerfilHeader";
import { LogoMark } from "@/components/perfil/LogoMark";
import { BackToTopButton } from "@/components/perfil/BackToTopButton";
import { RevealInitializer } from "@/components/perfil/RevealInitializer";
import { OpenNowBadge } from "@/components/perfil/OpenNowBadge";
import { HorarioList } from "@/components/perfil/HorarioList";
import { ServiceCard } from "@/components/perfil/ServiceCard";
import { TeamCard } from "@/components/perfil/TeamCard";
import { CouponCard } from "@/components/perfil/CouponCard";
import { BotonReservar } from "@/components/perfil/BotonReservar";
import { WhatsAppBookingSheet } from "@/components/perfil/WhatsAppBookingSheet";
import { ReservaProvider } from "@/components/perfil/ReservaContext";
import { SealBadge } from "@/components/sellos/SealBadge";
import "../perfil.css";

export const revalidate = 300; // ARCHITECTURE.md 3.5: red de seguridad de ~5 min

const playfair = Playfair_Display({ subsets: ["latin"], weight: ["600", "700", "800"], variable: "--font-playfair" });
const poppins = Poppins({ subsets: ["latin"], weight: ["300", "400", "500", "600", "700"], variable: "--font-poppins" });

type Servicio = {
  id: string;
  nombre: string;
  descripcion: string | null;
  precio: number;
  duracion_min: number | null;
  icono: string;
  destacado: boolean;
};

type Barbero = {
  id: string;
  nombre: string;
  foto_avatar: string | null;
  experiencia_anos: number;
  especialidades: string[];
  diplomas_urls: string[];
};

type Certificacion = {
  folio_verificacion: string;
  estado: string;
  fecha_emision: string;
  fecha_vencimiento: string | null;
  catalogo_sellos: { nombre_sello: string; nivel: string; color_hex: string | null } | null;
};

type Cupon = {
  id: string;
  codigo: string;
  descripcion: string | null;
  tipo_descuento: string;
  valor_descuento: number;
  veces_redimido: number;
  limite_usos: number | null;
};

// El eslogan/nombre se resalta en la última palabra con el color de acento
// (ARCHITECTURE.md 3.7, fila "Portada").
function resaltarUltimaPalabra(texto: string) {
  const palabras = texto.trim().split(/\s+/);
  const ultima = palabras.pop() ?? "";
  return { inicio: palabras.join(" "), ultima };
}

function subtituloEncabezado(anioFundacion: number | null, zona: string | null, ciudad: string) {
  if (anioFundacion) return `Desde ${anioFundacion}`;
  return zona ? `${zona}, ${ciudad}` : ciudad;
}

export default async function PerfilBarberiaPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id: slug } = await params;
  const supabase = createClient();
  const ahoraISO = new Date().toISOString();

  const { data: b } = await supabase
    .from("barberias")
    .select(
      `
      id, nombre, slug, eslogan, descripcion, historia, anio_fundacion,
      direccion, ciudad, zona, telefono_whatsapp, instagram_url, facebook_url,
      horarios, fotos, color_acento, logo_preset,
      servicios ( id, nombre, descripcion, precio, duracion_min, icono, destacado, orden ),
      barberos ( id, nombre, foto_avatar, experiencia_anos, especialidades, diplomas_urls ),
      certificaciones ( folio_verificacion, estado, fecha_emision, fecha_vencimiento, catalogo_sellos ( nombre_sello, nivel, color_hex ) ),
      cupones_descuento ( id, codigo, descripcion, tipo_descuento, valor_descuento, veces_redimido, limite_usos )
    `,
    )
    .eq("slug", slug)
    .order("orden", { referencedTable: "servicios", ascending: true })
    .or(`fecha_fin.is.null,fecha_fin.gt.${ahoraISO}`, { referencedTable: "cupones_descuento" })
    .maybeSingle();

  if (!b) notFound();

  const acento = esAcentoValido(b.color_acento) ? b.color_acento : "dorado";
  const logoPreset = esLogoValido(b.logo_preset) ? b.logo_preset : "tijeras";
  const horarios = b.horarios && Object.keys(b.horarios).length === 7 ? b.horarios : null;
  const fotos: string[] = b.fotos ?? [];
  const servicios = (b.servicios ?? []) as unknown as Servicio[];
  const barberos = (b.barberos ?? []) as unknown as Barbero[];
  const certificaciones = (b.certificaciones ?? []) as unknown as Certificacion[];
  const cupones = (b.cupones_descuento ?? []) as unknown as Cupon[];
  const puedeReservar = Boolean(b.telefono_whatsapp);

  const certificacionActiva = certificaciones.find((c) => c.estado === "activo") ?? null;
  const vencida = Boolean(
    certificacionActiva?.fecha_vencimiento && new Date(certificacionActiva.fecha_vencimiento) < new Date(),
  );

  const experienciaTotal = barberos.reduce((total, barbero) => total + barbero.experiencia_anos, 0);
  const especialidadesUnicas = Array.from(new Set(barberos.flatMap((barbero) => barbero.especialidades)));

  const tituloPortada = b.eslogan || b.nombre;
  const { inicio: tituloInicio, ultima: tituloUltima } = resaltarUltimaPalabra(tituloPortada);
  const subtitulo = subtituloEncabezado(b.anio_fundacion, b.zona, b.ciudad);

  const hayNosotros = Boolean(b.historia) || fotos.length > 0 || especialidadesUnicas.length > 0;

  return (
    <div className={`perfil ${playfair.variable} ${poppins.variable}`} data-accent={acento}>
      <ReservaProvider>
      <div className="perfil-franja">
        Parte del directorio{" "}
        <Link href="/directorio">Barbers Awards</Link>
      </div>

      <PerfilHeader nombre={b.nombre} logoPreset={logoPreset} subtitulo={subtitulo} puedeReservar={puedeReservar} />

      {/* ===================== HERO ===================== */}
      <section className="hero" id="inicio">
        <div className="container hero-grid">
          <div>
            <div className="hero-eyebrow">Barbería · {subtitulo}</div>
            <h1>
              {tituloInicio} <em>{tituloUltima}</em>
            </h1>
            {b.descripcion ? <p>{b.descripcion}</p> : null}
            <div className="hero-btns">
              {servicios.length > 0 ? (
                <a href="#servicios" className="btn btn-gold">
                  Ver Servicios
                </a>
              ) : null}
              <a href="#contacto" className="btn btn-outline">
                Contáctanos
              </a>
            </div>
            <div className="hero-stats">
              {barberos.length > 0 ? (
                <div>
                  <strong>{barberos.length}</strong>
                  <span>{barberos.length === 1 ? "Barbero" : "Barberos"}</span>
                </div>
              ) : null}
              {experienciaTotal > 0 ? (
                <div>
                  <strong>{experienciaTotal}+</strong>
                  <span>Años de experiencia combinada</span>
                </div>
              ) : null}
              {servicios.length > 0 ? (
                <div>
                  <strong>{servicios.length}</strong>
                  <span>{servicios.length === 1 ? "Servicio" : "Servicios"}</span>
                </div>
              ) : null}
            </div>
          </div>

          <div className="hero-visual">
            {horarios ? <OpenNowBadge horarios={horarios} /> : null}
            {certificacionActiva ? (
              <div className="float-badge b2">
                <SealBadge
                  estado="sello"
                  nombreSello={certificacionActiva.catalogo_sellos?.nombre_sello ?? "Certificado"}
                  folio={certificacionActiva.folio_verificacion}
                  colorHex={certificacionActiva.catalogo_sellos?.color_hex ?? null}
                  vencido={vencida}
                />
              </div>
            ) : null}
            <div className="pole-frame">
              <div className="pole-cap top" />
              <div className="pole">
                <div className="pole-stripes" />
              </div>
              <div className="pole-cap bottom" />
            </div>
          </div>
        </div>
        <div className="scroll-cue">
          <span>Desliza</span>
          <span className="line" />
        </div>
      </section>

      {/* ===================== NOSOTROS ===================== */}
      {hayNosotros ? (
        <section className="about" id="nosotros">
          <div className="container about-grid">
            <div className="about-visual reveal">
              {fotos[0] ? (
                <Image
                  src={publicStorageUrl(fotos[0])}
                  alt={`Foto principal de ${b.nombre}`}
                  fill
                  sizes="(max-width: 980px) 100vw, 45vw"
                  style={{ objectFit: "cover" }}
                />
              ) : null}
            </div>
            <div className="about-text reveal">
              <span className="section-label">Nuestra Historia</span>
              <h2 className="section-title">Bienvenido a {b.nombre}</h2>
              {b.historia
                ? b.historia
                    .split(/\n\s*\n/)
                    .map((parrafo: string, i: number) => <p key={i}>{parrafo}</p>)
                : null}
              {especialidadesUnicas.length > 0 ? (
                <ul className="checklist">
                  {especialidadesUnicas.map((especialidad) => (
                    <li key={especialidad}>
                      <span className="check">✓</span> {especialidad}
                    </li>
                  ))}
                </ul>
              ) : null}
            </div>
          </div>
        </section>
      ) : null}

      {/* ===================== SERVICIOS ===================== */}
      {servicios.length > 0 ? (
        <section className="services" id="servicios">
          <div className="container center">
            <span className="section-label">Lo que ofrecemos</span>
            <h2 className="section-title">Nuestros Servicios</h2>
          </div>
          <div className="container service-grid">
            {servicios.map((servicio) => (
              <ServiceCard key={servicio.id} servicio={servicio} />
            ))}
          </div>
        </section>
      ) : null}

      {/* ===================== CUPONES (CU-05) ===================== */}
      {cupones.length > 0 ? (
        <section className="coupons" id="cupones">
          <div className="container center">
            <span className="section-label">Promociones</span>
            <h2 className="section-title">Cupones de descuento</h2>
          </div>
          <div className="container coupon-grid">
            {cupones.map((cupon) => (
              <CouponCard key={cupon.id} cupon={cupon} />
            ))}
          </div>
        </section>
      ) : null}

      {/* ===================== EQUIPO (CU-03B) ===================== */}
      {barberos.length > 0 ? (
        <section className="team" id="equipo">
          <div className="container center">
            <span className="section-label">Nuestro Equipo</span>
            <h2 className="section-title">Barberos certificados</h2>
          </div>
          <div className="container team-grid">
            {barberos.map((barbero) => (
              <TeamCard key={barbero.id} barbero={barbero} />
            ))}
          </div>
        </section>
      ) : null}

      {/* ===================== GALERIA ===================== */}
      {fotos.length > 0 ? (
        <section className="gallery" id="galeria">
          <div className="container center">
            <span className="section-label">Nuestro Trabajo</span>
            <h2 className="section-title">Galería</h2>
          </div>
          <div className="container gallery-grid">
            {fotos.map((foto, i) => (
              <div key={foto} className="gallery-item reveal">
                <Image
                  src={publicStorageUrl(foto)}
                  alt={`Foto ${i + 1} de ${b.nombre}`}
                  fill
                  sizes="(max-width: 480px) 50vw, (max-width: 980px) 33vw, 25vw"
                  style={{ objectFit: "cover" }}
                />
              </div>
            ))}
          </div>
        </section>
      ) : null}

      {/* ===================== HORARIO + CONTACTO ===================== */}
      <section className="info" id="contacto">
        <div className="container">
          <div className="center" style={{ marginBottom: 50 }}>
            <span className="section-label">Visítanos</span>
            <h2 className="section-title" style={{ color: "var(--text-light)" }}>
              Horario y Contacto
            </h2>
          </div>
          <div className="info-grid">
            {horarios ? (
              <div className="info-card reveal">
                <h3>🕒 Horario de Atención</h3>
                <HorarioList horarios={horarios} />
              </div>
            ) : null}
            <div className="info-card reveal">
              <h3>📍 Contáctanos</h3>
              {b.direccion ? (
                <div className="contact-row">
                  <div className="ic">📍</div>
                  <div>
                    {b.direccion}
                    {b.zona ? <br /> : null}
                    {b.zona}
                    {b.zona ? ", " : ""}
                    {b.ciudad}
                  </div>
                </div>
              ) : null}
              {b.telefono_whatsapp ? (
                <div className="contact-row">
                  <div className="ic">📞</div>
                  <div>{b.telefono_whatsapp}</div>
                </div>
              ) : null}
              {puedeReservar ? (
                <BotonReservar className="btn btn-gold" style={{ marginTop: 10 }}>
                  Reservar por WhatsApp
                </BotonReservar>
              ) : (
                <button type="button" className="btn btn-gold" disabled aria-disabled style={{ marginTop: 10 }}>
                  Reservas por WhatsApp — no disponible
                </button>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* ===================== FOOTER ===================== */}
      <footer>
        <div className="container footer-grid">
          <div>
            <div className="logo">
              <LogoMark preset={logoPreset} tamano={44} />
              <div className="logo-text">
                {b.nombre}
                <span>{subtitulo}</span>
              </div>
            </div>
            {b.descripcion ? <p>{b.descripcion}</p> : null}
            {b.instagram_url || b.facebook_url ? (
              <div className="social-row">
                {b.instagram_url ? (
                  <a href={b.instagram_url} target="_blank" rel="noreferrer" aria-label="Instagram">
                    📷
                  </a>
                ) : null}
                {b.facebook_url ? (
                  <a href={b.facebook_url} target="_blank" rel="noreferrer" aria-label="Facebook">
                    📘
                  </a>
                ) : null}
              </div>
            ) : null}
          </div>
          <div>
            <h4>Navegación</h4>
            <ul>
              <li><a href="#inicio">Inicio</a></li>
              <li><a href="#nosotros">Nosotros</a></li>
              <li><a href="#servicios">Servicios</a></li>
              <li><a href="#equipo">Equipo</a></li>
            </ul>
          </div>
          <div>
            <h4>Contacto</h4>
            <ul>
              {b.direccion ? <li>{b.direccion}</li> : null}
              {b.telefono_whatsapp ? <li>{b.telefono_whatsapp}</li> : null}
            </ul>
          </div>
        </div>
        <div className="container bottom-bar">
          <span>© {new Date().getFullYear()} {b.nombre}. Todos los derechos reservados.</span>
          <span>
            Certificado por{" "}
            <Link href="/directorio" style={{ textDecoration: "underline" }}>
              Barbers Awards
            </Link>
          </span>
        </div>
      </footer>

      <div className="float-actions">
        <BackToTopButton />
        {puedeReservar ? (
          <BotonReservar className="fab fab-whats" title="Reservar por WhatsApp">
            💬
          </BotonReservar>
        ) : (
          <button type="button" className="fab fab-whats" disabled title="Sin WhatsApp configurado" style={{ background: "var(--muted, #a1a1aa)" }}>
            💬
          </button>
        )}
      </div>

      {puedeReservar ? (
        <WhatsAppBookingSheet
          barberiaId={b.id}
          nombreBarberia={b.nombre}
          telefonoBarberia={b.telefono_whatsapp!}
          servicios={servicios.map((s) => ({ id: s.id, nombre: s.nombre }))}
          barberos={barberos.map((barbero) => ({ id: barbero.id, nombre: barbero.nombre }))}
        />
      ) : null}

      <RevealInitializer />
      </ReservaProvider>
    </div>
  );
}
