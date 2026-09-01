// Roadmap Later: vídeo gerado a partir do roteiro de Reel já existente no
// pacote. 100% client-side (Canvas + MediaRecorder) — sem serviço de vídeo
// pago, mesmo espírito da peça visual (visualPiece.js). A narração por voz é
// opcional e passa pelo backend (OpenAI TTS, POST /api/narration); quando
// não está configurada ou falha, o vídeo ainda é gerado, só sem áudio, com
// as legendas cronometradas por tamanho de texto em vez de duração da fala.

import { loadImage, drawCover } from "./visualPiece.js";
import { getNarrationAudio } from "./api.js";

const W = 1080;
const H = 1920;
const INTRO_S = 2.4;
const OUTRO_S = 2.6;
const MIN_BEAT_S = 2.2;
const CHARS_PER_SEC = 14; // fallback de leitura quando não há áudio

// O roteiro real gerado pela IA segue o padrão "Cena 1: ...", mas é texto
// livre — o parser precisa sobreviver a variações (sem numeração, outros
// rótulos como "Gancho"/"CTA") sem quebrar.
const LABEL_RE = /^(cena\s*\d+|gancho|cta|abertura|encerramento|chamada|fechamento)\s*[:\-–—]\s*/i;

export function parseReelBeats(text) {
  return (text || "")
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean)
    .map((l) => l.replace(LABEL_RE, "").trim())
    .filter(Boolean);
}

function wrapText(ctx, text, maxWidth) {
  const words = text.split(/\s+/);
  const lines = [];
  let line = "";
  for (const word of words) {
    const test = line ? `${line} ${word}` : word;
    if (line && ctx.measureText(test).width > maxWidth) {
      lines.push(line);
      line = word;
    } else {
      line = test;
    }
  }
  if (line) lines.push(line);
  return lines;
}

async function ensureFontsReady() {
  await Promise.all([
    document.fonts.load('700 34px Inter'),
    document.fonts.load('500 40px Inter'),
    document.fonts.load('italic 400 96px "Instrument Serif"'),
    document.fonts.load('italic 400 56px "Instrument Serif"'),
    document.fonts.load('italic 400 72px "Instrument Serif"'),
  ]).catch(() => {});
}

function drawGoldLine(ctx) {
  ctx.fillStyle = "#c9974a";
  ctx.fillRect(0, 0, W, 10);
}

function drawGradientOverlay(ctx, fromRatio) {
  const gradient = ctx.createLinearGradient(0, H * fromRatio, 0, H);
  gradient.addColorStop(0, "rgba(12,23,41,0)");
  gradient.addColorStop(1, "rgba(12,23,41,0.92)");
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, W, H);
}

function drawIntroText(ctx, property) {
  const pad = 72;
  let y = H - 420;
  const eyebrow = [property.operacao === "aluguel" ? "ALUGUEL" : "VENDA", property.tipo ? property.tipo.toUpperCase() : ""]
    .filter(Boolean).join("  ·  ");
  if (eyebrow) {
    ctx.fillStyle = "#e8c07f";
    ctx.font = "700 34px Inter, sans-serif";
    ctx.fillText(eyebrow, pad, y);
    y += 84;
  }
  ctx.fillStyle = "#f6f1e7";
  ctx.font = 'italic 400 96px "Instrument Serif", Georgia, serif';
  wrapText(ctx, property.titulo_interno || "Novo imóvel", W - pad * 2).slice(0, 3).forEach((line) => {
    ctx.fillText(line, pad, y);
    y += 100;
  });
  const local = [property.bairro, property.cidade].filter(Boolean).join(", ");
  if (local) {
    ctx.fillStyle = "rgba(246,241,231,0.85)";
    ctx.font = "500 40px Inter, sans-serif";
    ctx.fillText(local, pad, y + 6);
  }
}

function drawCaption(ctx, text) {
  const pad = 72;
  ctx.fillStyle = "#f6f1e7";
  ctx.font = 'italic 400 56px "Instrument Serif", Georgia, serif';
  const lines = wrapText(ctx, text, W - pad * 2).slice(0, 5);
  const lineHeight = 68;
  let y = H - 200 - (lines.length - 1) * lineHeight;
  for (const line of lines) {
    ctx.fillText(line, pad, y);
    y += lineHeight;
  }
}

function drawOutro(ctx, profile) {
  ctx.fillStyle = "#0c1729";
  ctx.fillRect(0, 0, W, H);
  drawGoldLine(ctx);
  const pad = 72;
  ctx.fillStyle = "#e8c07f";
  ctx.font = "700 34px Inter, sans-serif";
  ctx.fillText("CONSULTE DISPONIBILIDADE", pad, H / 2 - 60);
  ctx.fillStyle = "#f6f1e7";
  ctx.font = 'italic 400 72px "Instrument Serif", Georgia, serif';
  ctx.fillText(profile?.nome_publico || "Fale comigo", pad, H / 2 + 30);
  if (profile?.creci) {
    ctx.fillStyle = "rgba(246,241,231,0.7)";
    ctx.font = "500 32px Inter, sans-serif";
    ctx.fillText(`CRECI ${profile.creci}`, pad, H / 2 + 90);
  }
}

function pickMimeType() {
  const candidates = ["video/webm;codecs=vp9,opus", "video/webm;codecs=vp8,opus", "video/webm"];
  return candidates.find((m) => window.MediaRecorder?.isTypeSupported?.(m)) || "video/webm";
}

export async function generateReelVideo(canvas, { property, profile, scriptText, onStatus, onProgress } = {}) {
  if (!canvas.captureStream || !window.MediaRecorder) {
    throw new Error("Seu navegador não suporta gravação de vídeo. Tente no Chrome ou Edge.");
  }
  const beats = parseReelBeats(scriptText);
  if (!beats.length) throw new Error("Roteiro de Reel vazio — escreva o roteiro antes de gerar o vídeo.");

  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d");

  onStatus?.("Preparando narração...");
  let audioBlob = null;
  try {
    audioBlob = await getNarrationAudio(beats.join(". "));
  } catch (err) {
    // Narração é opcional — segue sem áudio (legendas por tempo fixo).
    console.warn("[reel-video] narração indisponível:", err.message);
  }

  onStatus?.("Carregando fotos...");
  await ensureFontsReady();
  const photoUrls = (property.media || []).map((m) => m.url).filter(Boolean);
  const coverCache = new Map();
  for (const url of photoUrls) {
    try {
      const img = await loadImage(url);
      const off = document.createElement("canvas");
      off.width = W;
      off.height = H;
      drawCover(off.getContext("2d"), img, W, H);
      coverCache.set(url, off);
    } catch {
      // foto individual pode falhar (ex: link quebrado) — segue sem ela
    }
  }

  let audioEl = null;
  let audioDuration = 0;
  if (audioBlob) {
    audioEl = new Audio(URL.createObjectURL(audioBlob));
    audioDuration = await new Promise((resolve) => {
      audioEl.addEventListener("loadedmetadata", () => resolve(audioEl.duration || 0), { once: true });
      audioEl.addEventListener("error", () => resolve(0), { once: true });
    });
    if (!audioDuration || !isFinite(audioDuration)) {
      audioEl = null;
      audioDuration = 0;
    }
  }

  const beatDurations = audioDuration
    ? (() => {
        const weights = beats.map((b) => Math.max(b.length, 10));
        const total = weights.reduce((a, b) => a + b, 0);
        return weights.map((w) => (w / total) * audioDuration);
      })()
    : beats.map((b) => Math.max(MIN_BEAT_S, b.length / CHARS_PER_SEC));

  const scenes = [
    { type: "intro", duration: INTRO_S, photoUrl: photoUrls[0] || null },
    ...beats.map((caption, i) => ({
      type: "beat",
      duration: beatDurations[i],
      caption,
      photoUrl: photoUrls.length ? photoUrls[i % photoUrls.length] : null,
    })),
    { type: "outro", duration: OUTRO_S, photoUrl: null },
  ];
  const totalDuration = scenes.reduce((a, s) => a + s.duration, 0);
  const sceneStarts = [];
  let acc = 0;
  for (const s of scenes) { sceneStarts.push(acc); acc += s.duration; }

  function drawFrame(scene, elapsedInScene) {
    ctx.clearRect(0, 0, W, H);
    const cover = scene.photoUrl ? coverCache.get(scene.photoUrl) : null;
    const t = scene.duration > 0 ? Math.min(1, elapsedInScene / scene.duration) : 0;
    if (scene.type === "outro") {
      drawOutro(ctx, profile);
      return;
    }
    if (cover) {
      // Ken Burns: leve zoom contínuo ao longo da cena, sem recortar de novo
      // (o "cover" já foi pré-renderizado uma vez por foto, aqui só escala).
      const scale = 1 + 0.08 * t;
      const w = W * scale, h = H * scale;
      ctx.drawImage(cover, (W - w) / 2, (H - h) / 2, w, h);
    } else {
      ctx.fillStyle = "#0c1729";
      ctx.fillRect(0, 0, W, H);
    }
    drawGoldLine(ctx);
    if (scene.type === "intro") {
      drawGradientOverlay(ctx, 0.4);
      drawIntroText(ctx, property);
    } else {
      drawGradientOverlay(ctx, 0.55);
      drawCaption(ctx, scene.caption);
    }
  }

  onStatus?.("Gravando vídeo...");
  const videoStream = canvas.captureStream(30);
  let combinedStream = videoStream;
  let audioCtx = null;
  if (audioEl) {
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    const source = audioCtx.createMediaElementSource(audioEl);
    const dest = audioCtx.createMediaStreamDestination();
    source.connect(dest);
    source.connect(audioCtx.destination);
    combinedStream = new MediaStream([...videoStream.getVideoTracks(), ...dest.stream.getAudioTracks()]);
  }

  const mimeType = pickMimeType();
  const recorder = new MediaRecorder(combinedStream, { mimeType, videoBitsPerSecond: 5_000_000 });
  const chunks = [];
  recorder.ondataavailable = (e) => { if (e.data.size) chunks.push(e.data); };
  const stopped = new Promise((resolve) => { recorder.onstop = resolve; });

  recorder.start();
  const startTime = performance.now();
  let audioStarted = false;

  function sceneAt(elapsedS) {
    for (let i = scenes.length - 1; i >= 0; i--) {
      if (elapsedS >= sceneStarts[i]) return { scene: scenes[i], elapsedInScene: elapsedS - sceneStarts[i] };
    }
    return { scene: scenes[0], elapsedInScene: 0 };
  }

  await new Promise((resolve) => {
    function frame() {
      const elapsedS = (performance.now() - startTime) / 1000;
      if (elapsedS >= totalDuration) {
        drawFrame(scenes[scenes.length - 1], scenes[scenes.length - 1].duration);
        onProgress?.(1);
        resolve();
        return;
      }
      if (audioEl && !audioStarted && elapsedS >= INTRO_S) {
        audioStarted = true;
        audioEl.play().catch(() => {});
      }
      const { scene, elapsedInScene } = sceneAt(elapsedS);
      drawFrame(scene, elapsedInScene);
      onProgress?.(elapsedS / totalDuration);
      requestAnimationFrame(frame);
    }
    frame();
  });

  recorder.stop();
  if (audioEl) audioEl.pause();
  await stopped;
  if (audioCtx) await audioCtx.close().catch(() => {});

  return { blob: new Blob(chunks, { type: mimeType }), hasAudio: !!audioEl, duration: totalDuration };
}

export function downloadVideoBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  // Sem revoke aqui de propósito — o blob ainda pode estar em uso na prévia
  // <video> da tela; o navegador libera a URL sozinho ao sair da página.
}
