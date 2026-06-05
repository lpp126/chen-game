interface ResolveBackgroundAssetInput {
  levelId: number;
  scene: string;
  mood?: string;
  style?: string;
  width?: number;
  height?: number;
  variant?: number;
  forceRefresh?: boolean;
}

interface ResolveBackgroundAssetOutput {
  url: string;
  source: 'pexels' | 'ai';
}

interface CachedAssetEntry {
  url: string;
  source: 'pexels' | 'ai';
  cachedAt: number;
}

const CACHE_PREFIX = 'ctx2026_asset_bg:';
const CACHE_VERSION = 'v2';
const CACHE_TTL_MS = 1000 * 60 * 60 * 24 * 3;
const PEXELS_SEARCH_ENDPOINT = 'https://api.pexels.com/v1/search';
const DEFAULT_SIZE = { width: 832, height: 1472 };

const memoryCache = new Map<string, CachedAssetEntry>();

const normalizeQuery = (value: string) => value.trim().toLowerCase().replace(/\s+/g, ' ');

const readLocalCache = (key: string): CachedAssetEntry | null => {
  try {
    const raw = localStorage.getItem(`${CACHE_PREFIX}${key}`);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as CachedAssetEntry;
    if (!parsed?.url || !parsed?.cachedAt) return null;
    if (Date.now() - parsed.cachedAt > CACHE_TTL_MS) return null;
    return parsed;
  } catch {
    return null;
  }
};

const writeLocalCache = (key: string, value: CachedAssetEntry) => {
  try {
    localStorage.setItem(`${CACHE_PREFIX}${key}`, JSON.stringify(value));
  } catch {
    // ignore quota and serialization errors
  }
};

const buildAIPrompt = (input: ResolveBackgroundAssetInput) => {
  const mood = input.mood ?? 'fresh morning, cinematic';
  const style = input.style ?? 'semi-realistic anime watercolor matte painting';
  return [
    `high quality vertical game background for level ${input.levelId}`,
    `${input.scene}`,
    `${mood}`,
    `${style}`,
    'cinematic composition, rich details, realistic light and shadow',
    'three-lane runner readability',
    'advanced environment concept art',
    'no text',
    'no logo',
    'no characters'
  ].join(', ');
};

const buildAIImageUrl = (input: ResolveBackgroundAssetInput) => {
  const width = input.width ?? DEFAULT_SIZE.width;
  const height = input.height ?? DEFAULT_SIZE.height;
  const prompt = encodeURIComponent(buildAIPrompt(input));
  const seed = Math.abs([...`${input.levelId}-${input.scene}-${input.mood ?? ''}-${input.style ?? ''}-${input.variant ?? 0}`].reduce((acc, ch) => acc * 31 + ch.charCodeAt(0), 7));
  return `https://image.pollinations.ai/prompt/${prompt}?width=${width}&height=${height}&model=flux&nologo=true&seed=${seed}`;
};

const searchPexels = async (input: ResolveBackgroundAssetInput): Promise<string | null> => {
  const apiKey = import.meta.env.VITE_PEXELS_API_KEY;
  if (!apiKey) return null;

  const keywordPacks = [
    [input.scene, 'cinematic city street morning', 'anime style concept art'],
    [input.scene, 'urban street watercolor background', 'high detail'],
    [input.scene, 'city sidewalk sunrise', input.mood ?? 'morning energy']
  ];
  const keywords = keywordPacks[(input.variant ?? 0) % keywordPacks.length].map(normalizeQuery).join(' ');
  const url = `${PEXELS_SEARCH_ENDPOINT}?query=${encodeURIComponent(keywords)}&orientation=portrait&per_page=20&page=1`;

  const response = await fetch(url, {
    headers: {
      Authorization: apiKey
    }
  });
  if (!response.ok) return null;
  const data = (await response.json()) as {
    photos?: Array<{
      width?: number;
      height?: number;
      src?: {
        large2x?: string;
        large?: string;
        original?: string;
      };
    }>;
  };
  const minWidth = input.width ?? DEFAULT_SIZE.width;
  const minHeight = input.height ?? DEFAULT_SIZE.height;
  const candidates = (data.photos ?? []).filter((p) => (p.width ?? 0) >= minWidth && (p.height ?? 0) >= minHeight);
  const pool = candidates.length > 0 ? candidates : data.photos ?? [];
  if (pool.length === 0) return null;
  const photo = pool[Math.floor(Math.random() * pool.length)];
  return photo?.src?.large2x ?? photo?.src?.large ?? photo?.src?.original ?? null;
};

export const resolveBackgroundAsset = async (input: ResolveBackgroundAssetInput): Promise<ResolveBackgroundAssetOutput> => {
  const key = normalizeQuery(
    `${CACHE_VERSION}|${input.levelId}|${input.scene}|${input.mood ?? ''}|${input.style ?? ''}|${input.width ?? ''}|${input.height ?? ''}|${input.variant ?? ''}`
  );

  if (!input.forceRefresh) {
    const memo = memoryCache.get(key);
    if (memo && Date.now() - memo.cachedAt <= CACHE_TTL_MS) {
      return { url: memo.url, source: memo.source };
    }

    const local = readLocalCache(key);
    if (local) {
      memoryCache.set(key, local);
      return { url: local.url, source: local.source };
    }
  }

  try {
    const pexelsUrl = await searchPexels(input);
    if (pexelsUrl) {
      const item: CachedAssetEntry = { url: pexelsUrl, source: 'pexels', cachedAt: Date.now() };
      memoryCache.set(key, item);
      writeLocalCache(key, item);
      return { url: item.url, source: item.source };
    }
  } catch {
    // search failure should silently fall back to AI
  }

  const aiUrl = buildAIImageUrl(input);
  const fallbackItem: CachedAssetEntry = { url: aiUrl, source: 'ai', cachedAt: Date.now() };
  memoryCache.set(key, fallbackItem);
  writeLocalCache(key, fallbackItem);
  return { url: fallbackItem.url, source: fallbackItem.source };
};

