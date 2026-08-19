import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";
import dotenv from "dotenv";
import mammoth from "mammoth";
import * as pdfParseModule from "pdf-parse";
const pdfParse: any = (pdfParseModule as any).default || pdfParseModule;

dotenv.config();

let aiClient: GoogleGenAI | null = null;
function getAi(): GoogleGenAI {
  if (!aiClient) {
    const key = process.env.GEMINI_API_KEY;
    if (!key) {
      throw new Error("GEMINI_API_KEY environment variable is not configured.");
    }
    aiClient = new GoogleGenAI({ 
      apiKey: key,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build'
        }
      }
    });
  }
  return aiClient;
}

// Utility: Call Gemini with exponential backoff retries and model fallback on 503/429
async function generateContentWithFallback(options: {
  contents: any;
  config?: any;
  preferredModel?: string;
  maxRetries?: number;
}): Promise<string> {
  const preferredModel = options.preferredModel || 'gemini-3.7-flash';
  const fallbackModel = 'gemini-flash-latest';
  const maxRetries = options.maxRetries ?? 2;
  const ai = getAi();

  const modelsToTry = [preferredModel, fallbackModel];

  let lastError: any = null;

  for (const model of modelsToTry) {
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        const response = await ai.models.generateContent({
          model,
          contents: options.contents,
          config: options.config
        });
        return response.text || "{}";
      } catch (err: any) {
        lastError = err;
        const errStr = String(err?.message || err || '');
        const isUnavailable = err?.status === 'UNAVAILABLE' || 
                              err?.code === 503 || 
                              errStr.includes('503') || 
                              errStr.includes('high demand') || 
                              errStr.includes('UNAVAILABLE') || 
                              errStr.includes('temporarily') || 
                              errStr.includes('RESOURCE_EXHAUSTED') ||
                              err?.status === 429;

        if (isUnavailable && attempt < maxRetries) {
          const delayMs = (attempt + 1) * 1000 + Math.random() * 500;
          console.warn(`[Gemini API] Modelo ${model} sob alta demanda (503/429). Retentando em ${Math.round(delayMs)}ms (tentativa ${attempt + 1}/${maxRetries})...`);
          await new Promise(resolve => setTimeout(resolve, delayMs));
          continue;
        }

        // If not a temporary 503 error, break early and try next model
        if (!isUnavailable) {
          break;
        }
      }
    }
  }

  throw lastError;
}

// Heuristic fallback chord parser in case AI service is experiencing high demand
function heuristicParseChords(text: string) {
  const lines = text.split('\n').map(l => l.trimEnd()).filter(Boolean);
  let title = "Novo Canto Litúrgico";
  let artist = "";
  let detectedTom = "C";
  let composer = "";

  if (lines.length > 0) {
    const firstLine = lines[0].replace(/[#\[\]*]/g, '').trim();
    if (firstLine && !firstLine.match(/^(intro|verso|refr|ponte|final|tom:|c|d|e|f|g|a|b)/i)) {
      title = firstLine;
    }
  }

  // Detect artist or composer tag
  for (const line of lines.slice(0, 5)) {
    const artMatch = line.match(/(?:artista|cantor|ministério|interprete|por):\s*([^\n\r]+)/i);
    if (artMatch) artist = artMatch[1].trim();

    const compMatch = line.match(/(?:compositor|música|letra):\s*([^\n\r]+)/i);
    if (compMatch) composer = compMatch[1].trim();

    const tomMatch = line.match(/(?:tom|key):\s*([A-G][#b]?m?)/i);
    if (tomMatch) detectedTom = tomMatch[1].trim();
  }

  // Detect chords in text if tom not found
  if (detectedTom === "C") {
    const chordMatch = text.match(/\b([A-G][#b]?(?:m|maj7|7|sus4|m7|9)?(?:\/[A-G][#b]?)?)\b/);
    if (chordMatch) {
      detectedTom = chordMatch[1].split('/')[0];
    }
  }

  return {
    nome: title,
    artista: artist,
    compositor: composer,
    tom: detectedTom,
    bpm: 80,
    compasso: "4/4",
    tipo: "Entrada",
    season: "Tempo Comum",
    ano: "Geral",
    letraFormatada: text,
    isHeuristicFallback: true
  };
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json({ limit: '20mb' }));

  // Health check
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok", time: new Date().toISOString() });
  });

  // AI Endpoint: Parse Chords and Metadata from Raw Text / ChordPro / Lyrics
  app.post("/api/ai/parse-chord", async (req, res) => {
    const { text } = req.body;
    if (!text || typeof text !== 'string') {
      return res.status(400).json({ error: "Campo 'text' é obrigatório." });
    }

    if (!process.env.GEMINI_API_KEY) {
      // Return heuristic parse when no API key configured
      return res.json(heuristicParseChords(text));
    }

    try {
      const prompt = `Você é um maestro e especialista em música litúrgica católica e cifragem musical profissional.
Analise a cifra/letra litúrgica fornecida abaixo e extraia os seguintes dados em JSON estrito:
{
  "nome": "Título provável da música (string)",
  "artista": "Artista, compositor ou ministério provável (string)",
  "tom": "Tom principal identificado (ex: C, G, D, Em, Am, F#m, Bb, etc.)",
  "bpm": 80,
  "compasso": "Fórmula de compasso provável (ex: 4/4, 3/4, 6/8, 2/4)",
  "tipo": "Momento litúrgico católico sugerido (Entrada, Ato Penitencial, Glória, Salmo, Aclamação, Ofertório, Santo, Cordeiro, Comunhão, Pós-Comunhão, Adoração, Mariana, Final)",
  "season": "Tempo litúrgico sugerido (Tempo Comum, Advento, Natal, Quaresma, Semana Santa, Páscoa, Solenidades, Nossa Senhora, Geral)",
  "ano": "Ano litúrgico sugerido ('A', 'B', 'C' ou 'Geral')",
  "letraFormatada": "Cifra estruturada e padronizada com seções como [Intro], [Verso], [Refrão], [Ponte], [Final] com os acordes alinhados corretamente ou em padrão [Acorde]Letra"
}

Texto/Cifra:
${text.substring(0, 8000)}`;

      const rawJson = await generateContentWithFallback({
        contents: prompt,
        config: {
          responseMimeType: "application/json"
        }
      });

      const parsed = JSON.parse(rawJson || "{}");
      res.json(parsed);
    } catch (err: any) {
      console.warn("Aviso na API de IA parse-chord, ativando parser heurístico estruturado:", err?.message || err);
      // Seamless graceful fallback: return clean structured heuristic parsing
      const fallbackResult = heuristicParseChords(text);
      res.json(fallbackResult);
    }
  });

  // AI Endpoint: Document & File Parser (PDF, Word DOCX/DOC, Images, TXT, ChordPro)
  app.post("/api/ai/parse-document", async (req, res) => {
    try {
      const { fileBase64, fileName = "", mimeType = "" } = req.body;
      if (!fileBase64) {
        return res.status(400).json({ error: "Arquivo é obrigatório em formato base64." });
      }

      const cleanBase64 = fileBase64.replace(/^data:[^;]+;base64,/, '');
      const buffer = Buffer.from(cleanBase64, 'base64');
      const lowerName = fileName.toLowerCase();
      const isPdf = lowerName.endsWith('.pdf') || mimeType.includes('pdf');
      const isDocx = lowerName.endsWith('.docx') || lowerName.endsWith('.doc') || mimeType.includes('word') || mimeType.includes('officedocument');
      const isImage = lowerName.endsWith('.jpg') || lowerName.endsWith('.jpeg') || lowerName.endsWith('.png') || lowerName.endsWith('.webp') || mimeType.startsWith('image/');

      let extractedText = "";

      // 1. Extract raw text from Word documents via Mammoth
      if (isDocx) {
        try {
          const docxResult = await mammoth.extractRawText({ buffer });
          extractedText = docxResult.value || "";
        } catch (mErr) {
          console.warn("Aviso na extração docx via mammoth:", mErr);
        }
      }

      // 2. Extract text from PDF via pdf-parse if needed
      if (isPdf) {
        try {
          const pdfData = await pdfParse(buffer);
          extractedText = pdfData.text || "";
        } catch (pErr) {
          console.warn("Aviso na extração de texto do PDF via pdf-parse:", pErr);
        }
      }

      // 3. Fallback for plain text files
      if (!isPdf && !isDocx && !isImage && !extractedText) {
        try {
          extractedText = buffer.toString('utf-8');
        } catch (tErr) {
          console.warn("Aviso na conversão de texto UTF-8:", tErr);
        }
      }

      const maestroSystemPrompt = `Você é um Maestro e Especialista em Música Litúrgica Católica, Harmonia Funcional, Transposição e Cifragem Profissional.
Você deve analisar o arquivo/documento (${fileName}) com a cifra/partitura litúrgica e retornar um JSON estrito:
{
  "nome": "Título provável da música (string)",
  "artista": "Artista, compositor ou ministério provável (string)",
  "compositor": "Compositor se identificado ou vazio",
  "tom": "Tom principal identificado (ex: C, G, D, Em, Am, F#m, Bb, etc.)",
  "bpm": 80,
  "compasso": "Fórmula de compasso provável (ex: 4/4, 3/4, 6/8, 2/4)",
  "tipo": "Momento litúrgico católico sugerido (Entrada, Ato Penitencial, Glória, Salmo, Aclamação, Ofertório, Santo, Cordeiro, Comunhão, Pós-Comunhão, Adoração, Mariana, Final)",
  "season": "Tempo litúrgico sugerido (Tempo Comum, Advento, Natal, Quaresma, Semana Santa, Páscoa, Solenidades, Geral)",
  "ano": "Geral",
  "letraFormatada": "Cifra completa, profissional e estruturada com seções [Intro], [Verso 1], [Refrão], [Verso 2], [Ponte], [Final] com acordes alinhados perfeitamente sobre a letra ou em formato ChordPro [C]Letra...",
  "observacoes": "Notas sobre a harmonia, cadências e sugestões de execução"
}

Diretrizes de Músico Profissional:
- Corrija acordes aglutinados e nomenclaturas fora do padrão.
- Mantenha a coerência harmônica e enarmonia (em Fá maior use Bb, não A#; preserve baixos invertidos como C/E, G/B, D/F#).
- Preserve seções com clareza (INTRO, VERSO, REFRÃO, PONTE, FINAL).
- Retorne apenas o JSON.`;

      // Check Gemini API Availability
      if (process.env.GEMINI_API_KEY) {
        try {
          if (isPdf) {
            // Native PDF parsing directly with Gemini Multimodal
            try {
              const rawJson = await generateContentWithFallback({
                contents: [
                  {
                    role: 'user',
                    parts: [
                      {
                        inlineData: {
                          data: cleanBase64,
                          mimeType: 'application/pdf'
                        }
                      },
                      { text: maestroSystemPrompt }
                    ]
                  }
                ],
                config: { responseMimeType: "application/json" }
              });

              const parsed = JSON.parse(rawJson || "{}");
              return res.json(parsed);
            } catch (pdfAiErr) {
              console.warn("Falha no inlineData PDF, tentando com texto extraído:", pdfAiErr);
            }
          }

          if (isImage) {
            // Multimodal image OCR
            const rawJson = await generateContentWithFallback({
              contents: [
                {
                  role: 'user',
                  parts: [
                    {
                      inlineData: {
                        data: cleanBase64,
                        mimeType: mimeType || 'image/jpeg'
                      }
                    },
                    { text: maestroSystemPrompt }
                  ]
                }
              ],
              config: { responseMimeType: "application/json" }
            });

            const parsed = JSON.parse(rawJson || "{}");
            return res.json(parsed);
          }

          // For Word (DOCX) or text-extracted documents
          const rawJson = await generateContentWithFallback({
            contents: `${maestroSystemPrompt}\n\nDocumento extraído (${fileName}):\n${extractedText.substring(0, 15000)}`,
            config: { responseMimeType: "application/json" }
          });

          const parsed = JSON.parse(rawJson || "{}");
          return res.json(parsed);
        } catch (aiErr) {
          console.warn("Aviso de IA no documento, ativando fallback local:", aiErr);
        }
      }

      // Offline / Resilient Fallback using local extracted text
      const cleanTitle = fileName.replace(/\.[^/.]+$/, '').replace(/[_-]/g, ' ');
      const localParsed = extractedText ? heuristicParseChords(extractedText) : null;

      res.json({
        nome: localParsed?.nome || cleanTitle,
        artista: localParsed?.artista || "",
        compositor: localParsed?.compositor || "",
        tom: localParsed?.tom || "C",
        bpm: 80,
        compasso: "4/4",
        tipo: "Entrada",
        season: "Tempo Comum",
        ano: "Geral",
        letraFormatada: extractedText || "Cifra extraída do arquivo. Ajuste os acordes se necessário.",
        observacoes: `Documento importado via ${fileName}`
      });

    } catch (err: any) {
      console.error("Erro no processamento do documento:", err);
      res.status(500).json({ error: err.message || "Falha ao processar arquivo" });
    }
  });

  // AI Endpoint: OCR / Image recognition for chord sheets
  app.post("/api/ai/ocr-chord", async (req, res) => {
    try {
      const { imageBase64, mimeType } = req.body;
      if (!imageBase64) {
        return res.status(400).json({ error: "Imagem é obrigatória." });
      }

      if (!process.env.GEMINI_API_KEY) {
        return res.status(503).json({ 
          error: "Chave de IA não configurada no servidor.",
          isMissingKey: true 
        });
      }

      const prompt = `Você é um maestro e especialista em cifragem musical litúrgica.
Analise a imagem da cifra/partitura litúrgica fornecida e transcreva em JSON estrito:
{
  "nome": "Título da música",
  "artista": "Artista / compositor se visível",
  "tom": "Tom principal",
  "bpm": 80,
  "compasso": "4/4",
  "tipo": "Momento litúrgico provável",
  "season": "Tempo litúrgico provável",
  "ano": "Ano litúrgico se aplicável ('A', 'B', 'C' ou 'Geral')",
  "letraFormatada": "Transcrição completa e fiel da cifra, com cabeçalhos de seção [Intro], [Verso], [Refrão], [Ponte], [Final] e acordes posicionados sobre a letra."
}`;

      const rawJson = await generateContentWithFallback({
        contents: [
          {
            role: 'user',
            parts: [
              {
                inlineData: {
                  data: imageBase64.replace(/^data:image\/\w+;base64,/, ''),
                  mimeType: mimeType || 'image/jpeg'
                }
              },
              { text: prompt }
            ]
          }
        ],
        config: {
          responseMimeType: "application/json"
        }
      });

      const parsed = JSON.parse(rawJson || "{}");
      res.json(parsed);
    } catch (err: any) {
      console.error("Erro na API de IA OCR:", err);
      res.status(500).json({ error: err.message || "Falha no reconhecimento da imagem" });
    }
  });

  // AI Endpoint: Music Search & Knowledge Retrieval
  app.post("/api/music/search", async (req, res) => {
    try {
      const { query: searchQuery } = req.body;
      if (!searchQuery || typeof searchQuery !== 'string') {
        return res.status(400).json({ error: "Termo de busca é obrigatório." });
      }

      if (!process.env.GEMINI_API_KEY) {
        return res.status(503).json({ 
          error: "Chave de IA não configurada no servidor. Usando catálogo integrado.",
          isMissingKey: true 
        });
      }

      const prompt = `Você é um maestro profissional e especialista em música litúrgica católica, harmonia funcional e cifragem de alto padrão.
O usuário está pesquisando uma música litúrgica ou canto católico pelo termo: "${searchQuery}".

Localize ou recupere os cantos mais relevantes que correspondam a este título, artista, compositor ou trecho.
Retorne um JSON com uma lista de até 4 resultados bem formatados e completos:
{
  "results": [
    {
      "id": "gemini_${Date.now()}_1",
      "title": "Título exato da música",
      "artist": "Artista, ministério ou compositor oficial (ex: Vida Reluz, Celina Borges, Pe. Zezinho, Frei Gilson, Eliana Ribeiro, Walmir Alencar, Shalom, etc.)",
      "composer": "Nome do compositor se conhecido",
      "key": "Tom original padrão (ex: G, D, C, Em, Am)",
      "bpm": 80,
      "compasso": "4/4",
      "suggestedMoment": "Momento litúrgico adequado (Entrada, Comunhão, Ofertório, Ato Penitencial, Glória, Salmo, Santo, Cordeiro, etc.)",
      "suggestedSeason": "Tempo litúrgico (Tempo Comum, Advento, Quaresma, Páscoa, Natal, etc.)",
      "suggestedYear": "Geral",
      "previewLyrics": "Primeiras duas frases da letra para identificação rápida",
      "chords": "Cifra completa, profissional e estruturada com seções [Intro], [Verso 1], [Refrão], [Verso 2], [Ponte], [Final] com acordes alinhados perfeitamente sobre as sílabas ou em formato ChordPro [G]Senhor...",
      "tags": ["catolico", "liturgia", "comunhao"],
      "source": "Base Musical Litúrgica IA"
    }
  ]
}

Garanta enarmonia perfeita e armadura de clave lógica (em F maior use Bb, não A#; use acordes como C#m, F#m, Bm7, D#m7(b5) com precisão jazzística e litúrgica).`;

      const rawJson = await generateContentWithFallback({
        contents: prompt,
        config: {
          responseMimeType: "application/json"
        }
      });

      const parsed = JSON.parse(rawJson || '{"results":[]}');
      res.json(parsed);
    } catch (err: any) {
      console.warn("Aviso na busca musical por IA:", err?.message || err);
      // Return empty results gracefully so provider search continues
      res.json({ results: [] });
    }
  });

  // Endpoint: Analyze Link for Legality and Permitted Import Methods
  app.post("/api/music/analyze-link", async (req, res) => {
    try {
      const { url } = req.body;
      if (!url || typeof url !== 'string') {
        return res.status(400).json({ error: "URL é obrigatória." });
      }

      const cleanUrl = url.trim().toLowerCase();
      let platformName = "Web Externa";
      let canDirectImport = false;
      let reason = "";
      let actionRecommendation: 'direct_import' | 'paste_chord_helper' | 'manual_input' = 'paste_chord_helper';
      let detectedTitle = "";
      let detectedArtist = "";

      // Smart URL inspection
      if (cleanUrl.includes("cifraclub.com.br")) {
        platformName = "Cifra Club";
        canDirectImport = false;
        reason = "O Cifra Club possui termos de uso protegidos e não disponibiliza API pública aberta para download automático direto. Para respeitar os direitos autorais e as diretrizes do portal, utilize o recurso 'Colar Cifra': copie a cifra da página e cole no Gestão Litúrgica Digital para formatação e estruturação imediata por IA.";
        actionRecommendation = "paste_chord_helper";
        
        // Try extracting artist and song slug from URL path
        try {
          const parsedUrl = new URL(url);
          const pathSegments = parsedUrl.pathname.split('/').filter(Boolean);
          if (pathSegments.length >= 2) {
            detectedArtist = pathSegments[0].replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
            detectedTitle = pathSegments[1].replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
          }
        } catch {
          // ignore parsing error
        }
      } else if (cleanUrl.includes("youtube.com") || cleanUrl.includes("youtu.be")) {
        platformName = "YouTube";
        canDirectImport = false;
        reason = "Links do YouTube são ideais para vincular o áudio/vídeo de referência ao canto. Para importar a cifra, utilize a aba 'Colar Cifra' e anexe este link do YouTube no campo de vídeo da música.";
        actionRecommendation = "paste_chord_helper";
      } else if (cleanUrl.includes("letras.mus.br")) {
        platformName = "Letras.mus.br";
        canDirectImport = false;
        reason = "O portal Letras.mus.br não oferece endpoint público para scraping de cifras. Copie a letra/cifra da página e cole na aba 'Colar Cifra'.";
        actionRecommendation = "paste_chord_helper";
      } else {
        platformName = "Portal Externo";
        canDirectImport = false;
        reason = "Para garantir a conformidade legal e proteger o ecossistema musical, recomendamos copiar a cifra da fonte e utilizar a importação rápida 'Colar Cifra' com inteligência artificial.";
        actionRecommendation = "paste_chord_helper";
      }

      res.json({
        url,
        platformName,
        canDirectImport,
        reason,
        detectedTitle,
        detectedArtist,
        actionRecommendation
      });
    } catch (err: any) {
      console.error("Erro ao analisar link:", err);
      res.status(500).json({ error: "Falha ao analisar o link fornecido." });
    }
  });

  // Providers Metadata and Status API
  app.get("/api/providers/list", (req, res) => {
    try {
      const providers = [
        {
          id: 'community_catalog',
          name: 'Acervo Litúrgico Comunitário (Integrado)',
          description: 'Catálogo canônico integrado de cantos litúrgicos tradicionais católicos com cifras verificadas.',
          integrationType: 'community_database',
          websiteUrl: '',
          capabilities: {
            supportsSearch: true,
            supportsLyricsSearch: true,
            supportsLyrics: true,
            supportsChords: true,
            supportsImport: true,
            supportsPreview: true,
            supportsExternalLink: false
          },
          status: 'online',
          requiresApiKey: false,
          isConfigured: true,
          enabled: true
        },
        {
          id: 'itunes',
          name: 'Apple iTunes Search API',
          description: 'Catálogo oficial da Apple com faixas musicais, artistas, capas e prévias sonoras.',
          integrationType: 'public_open_api',
          websiteUrl: 'https://www.apple.com/itunes/',
          apiDocsUrl: 'https://developer.apple.com/library/archive/documentation/AudioVideo/Conceptual/iTuneSearchAPI/index.html',
          capabilities: {
            supportsSearch: true,
            supportsLyricsSearch: false,
            supportsLyrics: false,
            supportsChords: false,
            supportsImport: true,
            supportsPreview: true,
            supportsExternalLink: true
          },
          status: 'online',
          requiresApiKey: false,
          isConfigured: true,
          enabled: true
        },
        {
          id: 'musicbrainz',
          name: 'MusicBrainz (Metadados Abertos)',
          description: 'Enciclopédia musical aberta e pública mundial mantida pela MetaBrainz Foundation.',
          integrationType: 'public_open_api',
          websiteUrl: 'https://musicbrainz.org',
          apiDocsUrl: 'https://musicbrainz.org/doc/MusicBrainz_API',
          capabilities: {
            supportsSearch: true,
            supportsLyricsSearch: false,
            supportsLyrics: false,
            supportsChords: false,
            supportsImport: true,
            supportsPreview: false,
            supportsExternalLink: true
          },
          status: 'online',
          requiresApiKey: false,
          isConfigured: true,
          enabled: true
        },
        {
          id: 'cifraclub_ref',
          name: 'Cifra Club (Referência Externa)',
          description: 'Portal de cifras musicais. Permite busca de referências e abertura direta no Cifra Club.',
          integrationType: 'external_reference',
          websiteUrl: 'https://www.cifraclub.com.br',
          capabilities: {
            supportsSearch: true,
            supportsLyricsSearch: false,
            supportsLyrics: false,
            supportsChords: false,
            supportsImport: false,
            supportsPreview: false,
            supportsExternalLink: true
          },
          status: 'online',
          requiresApiKey: false,
          isConfigured: true,
          enabled: true
        }
      ];

      res.json({ providers });
    } catch (err: any) {
      console.error("Erro ao listar provedores:", err);
      res.status(500).json({ error: "Falha ao listar provedores." });
    }
  });

  // AI Endpoint: Repertoire suggestions based on liturgical Sunday/Solemnity and available library
  app.post("/api/ai/suggest-repertoire", async (req, res) => {
    try {
      const { celebrationTitle, season, availableSongs } = req.body;
      if (!celebrationTitle) {
        return res.status(400).json({ error: "Título da celebração é obrigatório." });
      }

      if (!process.env.GEMINI_API_KEY) {
        return res.status(503).json({ 
          error: "Chave de IA não configurada no servidor.",
          isMissingKey: true 
        });
      }

      const ai = getAi();
      const songsList = (availableSongs || []).map((s: any) => ({
        id: s.id,
        nome: s.nome,
        artista: s.artista,
        tipo: s.tipo,
        season: s.season,
        tom: s.tom
      }));

      const prompt = `Você é o Coordenador Litúrgico e Maestro Paroquial.
O usuário está montando o repertório para a seguinte celebração litúrgica:
Celebração: "${celebrationTitle}"
Tempo Litúrgico: "${season || 'Tempo Comum'}"

Músicas disponíveis no acervo da paróquia:
${JSON.stringify(songsList, null, 2)}

Selecione a melhor ordem de cantos litúrgicos prioritariamente a partir do acervo informado para os momentos:
- Entrada
- Ato Penitencial
- Glória (se cabível para o tempo litúrgico)
- Aclamação ao Evangelho
- Ofertório
- Santo
- Cordeiro de Deus
- Comunhão
- Pós-Comunhão / Ação de Graças
- Final / Envio

Retorne em JSON estrito no formato:
{
  "justificativa": "Breve reflexão litúrgica de 2 frases sobre o tempo e a coerência teológica dos cantos escolhidos.",
  "sugestoes": [
    {
      "momento": "Entrada",
      "cantoId": "ID do canto escolhido do acervo ou null se sugerir título externo",
      "nome": "Nome do canto",
      "tomSugerido": "Tom recomendado (ex: G)",
      "motivo": "Por que este canto é litúrgica e teologicamente adequado"
    }
  ]
}`;

      const response = await ai.models.generateContent({
        model: 'gemini-3.7-flash',
        contents: prompt,
        config: {
          responseMimeType: "application/json"
        }
      });

      const parsed = JSON.parse(response.text || "{}");
      res.json(parsed);
    } catch (err: any) {
      console.error("Erro na API de IA suggest-repertoire:", err);
      res.status(500).json({ error: err.message || "Falha ao gerar sugestão de repertório" });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Gestão Litúrgica Digital server running on http://localhost:${PORT}`);
  });
}

startServer();
