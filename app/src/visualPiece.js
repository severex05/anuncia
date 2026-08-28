// Roadmap Next: peça visual gerada automaticamente (foto + preço + specs),
// formato feed do Instagram (1080x1350). 100% client-side via Canvas — sem
// serviço de imagem novo, sem custo de IA.

const CANVAS_W = 1080;
const CANVAS_H = 1350;

function loadImage(url) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("Não foi possível carregar a foto de capa"));
    img.src = url;
  });
}

function drawCover(ctx, img, w, h) {
  const imgRatio = img.width / img.height;
  const targetRatio = w / h;
  let sx, sy, sw, sh;
  if (imgRatio > targetRatio) {
    sh = img.height;
    sw = sh * targetRatio;
    sx = (img.width - sw) / 2;
    sy = 0;
  } else {
    sw = img.width;
    sh = sw / targetRatio;
    sx = 0;
    sy = (img.height - sh) / 2;
  }
  ctx.drawImage(img, sx, sy, sw, sh, 0, 0, w, h);
}

async function ensureFontsReady() {
  await Promise.all([
    document.fonts.load('700 30px Inter'),
    document.fonts.load('600 32px Inter'),
    document.fonts.load('italic 400 84px "Instrument Serif"'),
  ]).catch(() => {});
}

export async function renderVisualPiece(canvas, { property, profile }) {
  canvas.width = CANVAS_W;
  canvas.height = CANVAS_H;
  const ctx = canvas.getContext("2d");

  const photoUrl = property.media?.[0]?.url;
  if (photoUrl) {
    const img = await loadImage(photoUrl);
    drawCover(ctx, img, CANVAS_W, CANVAS_H);
  } else {
    ctx.fillStyle = "#0c1729";
    ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);
  }

  await ensureFontsReady();

  const gradient = ctx.createLinearGradient(0, CANVAS_H * 0.42, 0, CANVAS_H);
  gradient.addColorStop(0, "rgba(12,23,41,0)");
  gradient.addColorStop(1, "rgba(12,23,41,0.94)");
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);

  ctx.fillStyle = "#c9974a";
  ctx.fillRect(0, 0, CANVAS_W, 10);

  const pad = 64;
  let y = CANVAS_H - 320;
  ctx.textBaseline = "alphabetic";

  const eyebrow = [property.operacao === "aluguel" ? "ALUGUEL" : "VENDA", property.tipo ? property.tipo.toUpperCase() : ""]
    .filter(Boolean).join("  ·  ");
  if (eyebrow) {
    ctx.fillStyle = "#e8c07f";
    ctx.font = "700 28px Inter, sans-serif";
    ctx.fillText(eyebrow, pad, y);
    y += 62;
  }

  if (property.preco) {
    ctx.fillStyle = "#f6f1e7";
    ctx.font = 'italic 400 80px "Instrument Serif", Georgia, serif';
    ctx.fillText(`R$ ${Number(property.preco).toLocaleString("pt-BR")}`, pad, y);
    y += 66;
  }

  const local = [property.bairro, property.cidade].filter(Boolean).join(", ");
  if (local) {
    ctx.fillStyle = "rgba(246,241,231,0.85)";
    ctx.font = "500 32px Inter, sans-serif";
    ctx.fillText(local, pad, y);
    y += 54;
  }

  const specs = [];
  if (property.dormitorios) specs.push(`${property.dormitorios} dorm`);
  if (property.suites) specs.push(`${property.suites} suítes`);
  if (property.vagas) specs.push(`${property.vagas} vagas`);
  if (property.area_privativa) specs.push(`${property.area_privativa}m²`);
  if (specs.length) {
    ctx.fillStyle = "rgba(246,241,231,0.95)";
    ctx.font = "600 30px Inter, sans-serif";
    ctx.fillText(specs.join("   ·   "), pad, y);
  }

  if (profile?.nome_publico) {
    ctx.fillStyle = "rgba(246,241,231,0.6)";
    ctx.font = "600 24px Inter, sans-serif";
    const footer = [profile.nome_publico, profile.creci ? `CRECI ${profile.creci}` : ""].filter(Boolean).join("  ·  ");
    ctx.fillText(footer, pad, CANVAS_H - 40);
  }
}

export function downloadCanvas(canvas, filename) {
  canvas.toBlob((blob) => {
    if (!blob) return;
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }, "image/png");
}
