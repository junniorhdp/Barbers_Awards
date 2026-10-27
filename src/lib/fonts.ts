import { Playfair_Display, Poppins } from "next/font/google";

// Tipografías definidas una sola vez y compartidas (DESIGN.md 1.4). next/font
// las sirve como archivos propios y sin duplicar, aunque las importen varias
// rutas o componentes.
//
// Playfair Display es tipografía de MARCA: se usa en los dos temas, pero solo
// para display (el nivel del sello, títulos de certificado), nunca para texto
// corrido. Poppins es del micrositio del perfil.
export const playfair = Playfair_Display({ subsets: ["latin"], weight: ["600", "700", "800"], variable: "--font-playfair" });
export const poppins = Poppins({ subsets: ["latin"], weight: ["300", "400", "500", "600", "700"], variable: "--font-poppins" });
