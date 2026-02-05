
# Plano: Adicionar Botão de Download DXF para Gravação a Laser

## Objetivo

Adicionar um botão que gera e baixa a etiqueta em formato DXF (Drawing Exchange Format), compatível com máquinas de corte/gravação a laser e softwares CAD como AutoCAD.

---

## Biblioteca Selecionada

**`@tarikjabiri/dxf`** - Biblioteca TypeScript moderna e bem mantida para geração de arquivos DXF.

```bash
npm install @tarikjabiri/dxf
```

---

## Estrutura da Etiqueta em DXF

A etiqueta será convertida para elementos vetoriais:

```text
┌─────────────────────────────────────────┐
│                                         │
│  ┌───┐                      ╔═══════╗   │
│  │ ⚙ │  MEC HYDRO           ║ QR    ║   │
│  └───┘  MH-001-26           ║ Code  ║   │
│                             ╚═══════╝   │
│                                         │
└─────────────────────────────────────────┘

Dimensões: 302 x 113 pixels → 80 x 30 mm (escala para laser)
```

### Elementos Vetoriais

| Elemento | Tipo DXF | Descrição |
|----------|----------|-----------|
| Borda externa | LWPOLYLINE (retângulo) | Contorno da etiqueta |
| "MEC HYDRO" | TEXT | Texto vetorial para gravação |
| Número da ordem | TEXT | Ex: "MH-001-26" |
| QR Code | Múltiplas LWPOLYLINE | Cada módulo preto do QR como retângulo |
| Logo engrenagem | Simplificado ou omitido | Logos bitmap são complexos em DXF |

---

## Mudanças a Realizar

### 1. Instalar Dependência

```json
// package.json
"@tarikjabiri/dxf": "^2.1.0"
```

### 2. Arquivo: `src/components/EquipmentLabel.tsx`

**Adicionar importação:**

```tsx
import { Writer, point } from "@tarikjabiri/dxf";
```

**Adicionar função `handleDownloadDXF`:**

```tsx
const handleDownloadDXF = async () => {
  const writer = new Writer();
  const modelSpace = writer.document.modelSpace;
  
  // Dimensões em mm (padrão para laser)
  const width = 80;  // 80mm
  const height = 30; // 30mm
  
  // 1. Borda externa (retângulo)
  modelSpace.addLine({ start: point(0, 0), end: point(width, 0) });
  modelSpace.addLine({ start: point(width, 0), end: point(width, height) });
  modelSpace.addLine({ start: point(width, height), end: point(0, height) });
  modelSpace.addLine({ start: point(0, height), end: point(0, 0) });
  
  // 2. Texto "MEC HYDRO" 
  modelSpace.addText({
    firstAlignmentPoint: point(5, 20),
    height: 4,
    value: "MEC HYDRO",
  });
  
  // 3. Número da ordem
  modelSpace.addText({
    firstAlignmentPoint: point(5, 10),
    height: 6,
    value: equipment.numeroOrdem,
  });
  
  // 4. QR Code vetorial (converter matriz de pixels para retângulos)
  await addQRCodeToDXF(modelSpace, width - 22, 3, 20);
  
  // Gerar e baixar
  const dxfContent = writer.stringify();
  const blob = new Blob([dxfContent], { type: 'application/dxf' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = `etiqueta-${equipment.numeroOrdem}.dxf`;
  link.click();
  URL.revokeObjectURL(link.href);
};
```

**Adicionar função para converter QR Code em vetores:**

```tsx
const addQRCodeToDXF = async (
  modelSpace: any, 
  startX: number, 
  startY: number, 
  size: number
) => {
  // Usar qrcode para gerar matriz de módulos
  const QRCodeLib = await import('qrcode');
  const baseUrl = window.location.origin;
  const qrData = `${baseUrl}/ordem/${equipment.numeroOrdem}`;
  
  // Gerar QR como matriz
  const qr = QRCodeLib.default.create(qrData);
  const modules = qr.modules.data;
  const moduleCount = qr.modules.size;
  const moduleSize = size / moduleCount;
  
  // Desenhar cada módulo preto como um retângulo
  for (let row = 0; row < moduleCount; row++) {
    for (let col = 0; col < moduleCount; col++) {
      const index = row * moduleCount + col;
      if (modules[index]) { // Se o módulo é preto
        const x = startX + col * moduleSize;
        const y = startY + (moduleCount - row - 1) * moduleSize;
        
        // Adicionar retângulo para cada módulo
        modelSpace.addLine({ start: point(x, y), end: point(x + moduleSize, y) });
        modelSpace.addLine({ start: point(x + moduleSize, y), end: point(x + moduleSize, y + moduleSize) });
        modelSpace.addLine({ start: point(x + moduleSize, y + moduleSize), end: point(x, y + moduleSize) });
        modelSpace.addLine({ start: point(x, y + moduleSize), end: point(x, y) });
      }
    }
  }
};
```

**Adicionar novo botão no JSX:**

```tsx
{/* Botões de ação */}
<div className="flex gap-2 pt-4">
  <Button onClick={handlePrint} className="flex-1">
    <Printer className="h-4 w-4 mr-2" />
    Imprimir
  </Button>
  <Button onClick={handleDownload} variant="outline" className="flex-1">
    <Download className="h-4 w-4 mr-2" />
    PNG
  </Button>
  <Button onClick={handleDownloadDXF} variant="outline" className="flex-1">
    <FileCode className="h-4 w-4 mr-2" />
    DXF
  </Button>
</div>
```

**Adicionar importação do ícone:**

```tsx
import { Printer, Download, FileCode } from "lucide-react";
```

---

## Arquivos Afetados

| Arquivo | Ação |
|---------|------|
| `package.json` | Adicionar dependência `@tarikjabiri/dxf` |
| `src/components/EquipmentLabel.tsx` | Adicionar função de geração DXF e botão |

---

## Resultado Final

O usuário terá 3 opções de download:

| Botão | Formato | Uso |
|-------|---------|-----|
| **Imprimir** | HTML → Impressora | Etiquetas em papel |
| **PNG** | Imagem raster | Visualização/compartilhamento |
| **DXF** | Vetorial CAD | Gravação a laser |

O arquivo DXF gerado será compatível com:
- AutoCAD
- LaserCAD
- LightBurn
- RDWorks
- CorelDRAW
- Inkscape (com plugin DXF)

---

## Observações Técnicas

1. **Unidades**: O DXF será gerado em milímetros (80x30mm) - padrão para máquinas laser
2. **Logo**: O logo da engrenagem (imagem bitmap) não será incluído no DXF pois não é vetorial. Se necessário, posso adicionar uma versão simplificada usando círculos e linhas
3. **QR Code**: Cada "quadrado" preto do QR será um retângulo vetorial, garantindo precisão na gravação
4. **Escala**: O arquivo pode ser facilmente escalado no software da máquina laser
