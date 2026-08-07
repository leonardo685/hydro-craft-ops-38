import { Language } from "@/i18n/translations";

/**
 * Tradução de conteúdo dinâmico (vindo do banco) para o laudo público.
 * Mantém números, medidas, códigos e materiais; traduz apenas palavras.
 * As entradas são aplicadas das mais longas para as mais curtas.
 */
const DICT: Array<[string, { en: string; es: string }]> = [
  // ─── Frases / serviços completos ───
  ["desmontagem e montagem", { en: "Disassembly and Assembly", es: "Desmontaje y Montaje" }],
  ["montagem completa", { en: "Complete Assembly", es: "Montaje Completo" }],
  ["limpeza do equipamento", { en: "Equipment Cleaning", es: "Limpieza del Equipo" }],
  ["pintura do equipamento", { en: "Equipment Painting", es: "Pintura del Equipo" }],
  ["teste de performance", { en: "Performance Test", es: "Prueba de Rendimiento" }],
  ["recondicionamento de roscas", { en: "Thread Reconditioning", es: "Reacondicionamiento de Roscas" }],
  ["recondicionamento", { en: "Reconditioning", es: "Reacondicionamiento" }],
  ["troca de vedações", { en: "Seal Replacement", es: "Cambio de Sellos" }],
  ["kit de vedações", { en: "Seal Kit", es: "Kit de Sellos" }],
  ["kit de vedação", { en: "Seal Kit", es: "Kit de Sellos" }],
  ["substituição de rolamentos", { en: "Bearing Replacement", es: "Sustitución de Rodamientos" }],
  ["substituição de conjunto rotativo completo", { en: "Complete Rotary Assembly Replacement", es: "Sustitución del Conjunto Rotativo Completo" }],
  ["conjunto rotativo", { en: "rotary assembly", es: "conjunto rotativo" }],
  ["projeto técnico", { en: "Technical Design", es: "Proyecto Técnico" }],
  ["desenho técnico", { en: "Technical Drawing", es: "Dibujo Técnico" }],
  ["brunimento de interno de camisa", { en: "Barrel Internal Honing", es: "Bruñido Interno de Camisa" }],
  ["brunimento interno de camisa", { en: "Barrel Internal Honing", es: "Bruñido Interno de Camisa" }],
  ["brunimento de camisa", { en: "Barrel Honing", es: "Bruñido de Camisa" }],
  ["brunir camisa", { en: "Hone Barrel", es: "Bruñir Camisa" }],
  ["brunimento", { en: "Honing", es: "Bruñido" }],
  ["cromo de haste", { en: "Rod Chrome Plating", es: "Cromado de Vástago" }],
  ["cromar haste", { en: "Chrome Plate Rod", es: "Cromar Vástago" }],
  ["cromar hastes", { en: "Chrome Plate Rods", es: "Cromar Vástagos" }],
  ["aplicação de novo cromo", { en: "New Chrome Application", es: "Aplicación de Nuevo Cromo" }],
  ["polimento de haste", { en: "Rod Polishing", es: "Pulido de Vástago" }],
  ["polimento de camisa", { en: "Barrel Polishing", es: "Pulido de Camisa" }],
  ["polir haste", { en: "Polish Rod", es: "Pulir Vástago" }],
  ["polir camisa", { en: "Polish Barrel", es: "Pulir Camisa" }],
  ["polimento", { en: "Polishing", es: "Pulido" }],
  ["metalização", { en: "Metallization", es: "Metalización" }],
  ["metalizar", { en: "Metallize", es: "Metalizar" }],
  ["rasgo de chaveta", { en: "Keyway Slot", es: "Ranura de Chaveta" }],
  ["torqueamento de porcas e tirantes", { en: "Nut and Tie Rod Torquing", es: "Torque de Tuercas y Tirantes" }],
  ["verniz protetivo", { en: "protective varnish", es: "barniz protector" }],
  ["pintura com", { en: "Painting with", es: "Pintura con" }],
  ["fabricação e solda", { en: "Manufacturing and Welding", es: "Fabricación y Soldadura" }],
  ["fabricação de", { en: "Manufacturing of", es: "Fabricación de" }],
  ["fabricação", { en: "Manufacturing", es: "Fabricación" }],
  ["fabricar", { en: "Manufacture", es: "Fabricar" }],
  ["recuperação de", { en: "Recovery of", es: "Recuperación de" }],
  ["recuperação", { en: "Recovery", es: "Recuperación" }],
  ["adaptação de", { en: "Adaptation of", es: "Adaptación de" }],
  ["adaptação", { en: "Adaptation", es: "Adaptación" }],
  ["adequação", { en: "Adjustment", es: "Adecuación" }],
  ["revisão completa", { en: "Complete Overhaul", es: "Revisión Completa" }],
  ["haste quebrada", { en: "Broken Rod", es: "Vástago Roto" }],
  ["vazamento nas vedações", { en: "Seal Leakage", es: "Fuga en los Sellos" }],
  ["reabastecimento de óleo", { en: "Oil Refill", es: "Reposición de Aceite" }],
  ["troca de óleo", { en: "Oil Change", es: "Cambio de Aceite" }],
  ["óleo hidráulico", { en: "hydraulic oil", es: "aceite hidráulico" }],
  ["cilindro hidráulico", { en: "Hydraulic Cylinder", es: "Cilindro Hidráulico" }],
  ["unidade hidráulica", { en: "Hydraulic Unit", es: "Unidad Hidráulica" }],
  ["bomba hidráulica", { en: "Hydraulic Pump", es: "Bomba Hidráulica" }],
  ["motor hidráulico", { en: "Hydraulic Motor", es: "Motor Hidráulico" }],
  ["cabeçote dianteiro", { en: "front head", es: "cabezal delantero" }],
  ["cabeçote traseiro", { en: "rear head", es: "cabezal trasero" }],
  ["tampa guia", { en: "gland", es: "tapa guía" }],
  ["bucha guia", { en: "guide bushing", es: "buje guía" }],
  ["fita guia", { en: "guide tape", es: "cinta guía" }],
  ["ferro nodular", { en: "ductile iron", es: "hierro nodular" }],
  ["aço inox", { en: "stainless steel", es: "acero inoxidable" }],
  ["olhal traseiro", { en: "rear eye", es: "ojal trasero" }],
  ["olhal dianteiro", { en: "front eye", es: "ojal delantero" }],
  ["conexão fêmea", { en: "female fitting", es: "conexión hembra" }],
  ["conexão macho", { en: "male fitting", es: "conexión macho" }],
  ["conexão traseira", { en: "rear fitting", es: "conexión trasera" }],
  ["varão com rosca", { en: "threaded rod", es: "barra con rosca" }],
  ["porca do êmbolo", { en: "piston nut", es: "tuerca del pistón" }],
  ["porca do embolo", { en: "piston nut", es: "tuerca del pistón" }],
  ["manopla recartilhada", { en: "knurled handle", es: "mando moleteado" }],
  ["gaxeta bilabial", { en: "double-lip packing", es: "empaque bilabial" }],
  ["gaxeta compacta", { en: "compact packing", es: "empaque compacto" }],
  ["calço de teflon", { en: "teflon shim", es: "calce de teflón" }],
  ["ambiente comum", { en: "standard environment", es: "ambiente común" }],
  ["ambiente agressivo", { en: "aggressive environment", es: "ambiente agresivo" }],
  ["muito agressivo", { en: "very aggressive", es: "muy agresivo" }],

  // ─── Palavras isoladas ───
  ["hidráulico", { en: "hydraulic", es: "hidráulico" }],
  ["hidráulica", { en: "hydraulic", es: "hidráulica" }],
  ["cilindro", { en: "cylinder", es: "cilindro" }],
  ["camisa", { en: "barrel", es: "camisa" }],
  ["haste", { en: "rod", es: "vástago" }],
  ["hastes", { en: "rods", es: "vástagos" }],
  ["êmbolo", { en: "piston", es: "pistón" }],
  ["embolo", { en: "piston", es: "pistón" }],
  ["pistão", { en: "piston", es: "pistón" }],
  ["vedações", { en: "seals", es: "sellos" }],
  ["vedação", { en: "seal", es: "sello" }],
  ["retentor", { en: "oil seal", es: "retén" }],
  ["raspador", { en: "wiper seal", es: "rascador" }],
  ["gaxetas", { en: "packings", es: "empaques" }],
  ["gaxeta", { en: "packing", es: "empaque" }],
  ["anel", { en: "ring", es: "anillo" }],
  ["anéis", { en: "rings", es: "anillos" }],
  ["bucha", { en: "bushing", es: "buje" }],
  ["buchas", { en: "bushings", es: "bujes" }],
  ["embuchar", { en: "Bush", es: "Embujar" }],
  ["rolamento", { en: "bearing", es: "rodamiento" }],
  ["rolamentos", { en: "bearings", es: "rodamientos" }],
  ["rótula", { en: "spherical bearing", es: "rótula" }],
  ["rotula", { en: "spherical bearing", es: "rótula" }],
  ["sanfona", { en: "bellows", es: "fuelle" }],
  ["mangueira", { en: "hose", es: "manguera" }],
  ["tubulação", { en: "piping", es: "tubería" }],
  ["tubulução", { en: "piping", es: "tubería" }],
  ["tubo", { en: "tube", es: "tubo" }],
  ["válvula", { en: "valve", es: "válvula" }],
  ["valvula", { en: "valve", es: "válvula" }],
  ["conexão", { en: "fitting", es: "conexión" }],
  ["conexao", { en: "fitting", es: "conexión" }],
  ["olhal", { en: "eye", es: "ojal" }],
  ["aleta", { en: "fin", es: "aleta" }],
  ["tampa", { en: "cover", es: "tapa" }],
  ["porca", { en: "nut", es: "tuerca" }],
  ["parafuso", { en: "bolt", es: "tornillo" }],
  ["tirante", { en: "tie rod", es: "tirante" }],
  ["tirantes", { en: "tie rods", es: "tirantes" }],
  ["rosca", { en: "thread", es: "rosca" }],
  ["roscas", { en: "threads", es: "roscas" }],
  ["chaveta", { en: "key", es: "chaveta" }],
  ["fundo", { en: "bottom", es: "fondo" }],
  ["interno", { en: "internal", es: "interno" }],
  ["externo", { en: "external", es: "externo" }],
  ["completo", { en: "complete", es: "completo" }],
  ["completa", { en: "complete", es: "completa" }],
  ["bruto", { en: "raw", es: "bruto" }],
  ["brunido", { en: "honed", es: "bruñido" }],
  ["aço", { en: "steel", es: "acero" }],
  ["ferro", { en: "iron", es: "hierro" }],
  ["bronze", { en: "bronze", es: "bronce" }],
  ["alumínio", { en: "aluminum", es: "aluminio" }],
  ["teflon", { en: "teflon", es: "teflón" }],
  ["cromo", { en: "chrome", es: "cromo" }],
  ["cromar", { en: "Chrome Plate", es: "Cromar" }],
  ["pintura", { en: "painting", es: "pintura" }],
  ["verniz", { en: "varnish", es: "barniz" }],
  ["laranja", { en: "orange", es: "naranja" }],
  ["amarelo", { en: "yellow", es: "amarillo" }],
  ["vermelho", { en: "red", es: "rojo" }],
  ["azul", { en: "blue", es: "azul" }],
  ["preto", { en: "black", es: "negro" }],
  ["branco", { en: "white", es: "blanco" }],
  ["cinza", { en: "gray", es: "gris" }],
  ["cor", { en: "color", es: "color" }],
  ["soldar", { en: "Weld", es: "Soldar" }],
  ["solda", { en: "welding", es: "soldadura" }],
  ["cortar", { en: "Cut", es: "Cortar" }],
  ["corte", { en: "cut", es: "corte" }],
  ["lixar", { en: "Sand", es: "Lijar" }],
  ["polir", { en: "Polish", es: "Pulir" }],
  ["furar", { en: "Drill", es: "Taladrar" }],
  ["furo", { en: "hole", es: "agujero" }],
  ["fura", { en: "hole", es: "agujero" }],
  ["abrir", { en: "Open", es: "Abrir" }],
  ["tampar", { en: "Seal off", es: "Tapar" }],
  ["fazer", { en: "Make", es: "Hacer" }],
  ["nova", { en: "new", es: "nueva" }],
  ["novo", { en: "new", es: "nuevo" }],
  ["repassar", { en: "Rework", es: "Repasar" }],
  ["respassar", { en: "Rework", es: "Repasar" }],
  ["regularizar", { en: "Regularize", es: "Regularizar" }],
  ["substituir", { en: "Replace", es: "Sustituir" }],
  ["substituição", { en: "Replacement", es: "Sustitución" }],
  ["destruir", { en: "Remove", es: "Retirar" }],
  ["retirar", { en: "Remove", es: "Retirar" }],
  ["montagem", { en: "assembly", es: "montaje" }],
  ["desmontagem", { en: "disassembly", es: "desmontaje" }],
  ["limpeza", { en: "cleaning", es: "limpieza" }],
  ["teste", { en: "test", es: "prueba" }],
  ["testes", { en: "tests", es: "pruebas" }],
  ["performance", { en: "performance", es: "rendimiento" }],
  ["equipamento", { en: "equipment", es: "equipo" }],
  ["equipamentos", { en: "equipment", es: "equipos" }],
  ["peça", { en: "part", es: "pieza" }],
  ["peças", { en: "parts", es: "piezas" }],
  ["serviço", { en: "service", es: "servicio" }],
  ["serviços", { en: "services", es: "servicios" }],
  ["usinagem", { en: "machining", es: "mecanizado" }],
  ["hidrostático", { en: "hydrostatic", es: "hidrostático" }],
  ["hidrostatico", { en: "hydrostatic", es: "hidrostático" }],
  ["funcional", { en: "functional", es: "funcional" }],
  ["comum", { en: "standard", es: "común" }],
  ["salino", { en: "saline", es: "salino" }],
  ["agressivo", { en: "aggressive", es: "agresivo" }],
  ["poeira", { en: "dust", es: "polvo" }],
  ["óleo", { en: "oil", es: "aceite" }],
  ["oleo", { en: "oil", es: "aceite" }],
  ["água", { en: "water", es: "agua" }],
  ["graxa", { en: "grease", es: "grasa" }],
  ["vazamento", { en: "leakage", es: "fuga" }],
  ["quebrada", { en: "broken", es: "roto" }],
  ["quebrado", { en: "broken", es: "roto" }],
  ["desgaste", { en: "wear", es: "desgaste" }],
  ["revisão", { en: "overhaul", es: "revisión" }],
  ["outros", { en: "others", es: "otros" }],
  ["traseira", { en: "rear", es: "trasera" }],
  ["traseiro", { en: "rear", es: "trasero" }],
  ["dianteira", { en: "front", es: "delantera" }],
  ["dianteiro", { en: "front", es: "delantero" }],
  ["esquerda", { en: "left", es: "izquierda" }],
  ["direita", { en: "right", es: "derecha" }],
  ["altura", { en: "height", es: "altura" }],
  ["largura", { en: "width", es: "ancho" }],
  ["comprimento", { en: "length", es: "longitud" }],
  ["espessura", { en: "thickness", es: "espesor" }],
  ["diâmetro", { en: "diameter", es: "diámetro" }],
  ["quantidade", { en: "quantity", es: "cantidad" }],
  ["unidade", { en: "unit", es: "unidad" }],
  ["após", { en: "after", es: "después" }],
  ["antes", { en: "before", es: "antes" }],
  ["processo", { en: "process", es: "proceso" }],
  ["para", { en: "for", es: "para" }],
  ["com", { en: "with", es: "con" }],
  ["sem", { en: "without", es: "sin" }],
  ["por", { en: "by", es: "por" }],
  ["de", { en: "of", es: "de" }],
  ["da", { en: "of the", es: "de la" }],
  ["do", { en: "of the", es: "del" }],
  ["na", { en: "in the", es: "en la" }],
  ["no", { en: "in the", es: "en el" }],
  ["e", { en: "and", es: "y" }],
];

const escapeRegex = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/** Remove acentos para casar variações de digitação */
const deaccent = (s: string) => s.normalize("NFD").replace(/[\u0300-\u036f]/g, "");

/** Aplica o padrão de caixa do original ao texto traduzido */
const applyCase = (original: string, translated: string) => {
  if (original === original.toUpperCase() && /[A-ZÀ-Ú]/.test(original)) return translated.toUpperCase();
  if (original[0] === original[0]?.toUpperCase()) {
    return translated.charAt(0).toUpperCase() + translated.slice(1);
  }
  return translated;
};

// Ordena por comprimento (frases antes de palavras) e pré-compila os regex
const COMPILED = [...DICT]
  .sort((a, b) => b[0].length - a[0].length)
  .map(([term, tr]) => ({
    term,
    tr,
    regex: new RegExp(`(?<![\\p{L}\\p{M}])${escapeRegex(deaccent(term))}(?![\\p{L}\\p{M}])`, "giu"),
  }));

/**
 * Traduz um texto técnico livre (serviço, peça, usinagem, observação) preservando
 * números, medidas, códigos e marcas. Retorna o original quando o idioma é pt-BR.
 */
export function translateTerm(text: string | null | undefined, language: Language): string {
  if (!text) return text ?? "";
  if (language === "pt-BR") return text;

  const target: "en" | "es" = language === "es" ? "es" : "en";
  let result = text;

  for (const { tr, regex } of COMPILED) {
    // deaccent preserva o tamanho, então os índices casam com o texto original
    const plain = deaccent(result);
    const re = new RegExp(regex.source, regex.flags);
    let out = "";
    let last = 0;
    let m: RegExpExecArray | null;
    while ((m = re.exec(plain)) !== null) {
      if (m[0].length === 0) break;
      const original = result.slice(m.index, m.index + m[0].length);
      out += result.slice(last, m.index) + applyCase(original, tr[target]);
      last = m.index + m[0].length;
    }
    result = out + result.slice(last);
  }

  return result;
}
