const DEFAULT_SCOUTING_API_BASE_URL =
  import.meta.env.VITE_SCOUTING_API_URL || 'https://shaggy-lions-jump.loca.lt';

const PLAYER_ANALYSIS_STORAGE_KEY = 'playerAnalysisByKey';

const normaliseBaseUrl = (url) => (url || '').trim().replace(/\/+$/, '');

export const getScoutingApiBaseUrl = () => {
  const storedUrl =
    typeof window !== 'undefined'
      ? window.localStorage.getItem('scoutTalentScoutingApiUrl')
      : '';

  return normaliseBaseUrl(storedUrl) || normaliseBaseUrl(DEFAULT_SCOUTING_API_BASE_URL);
};

const createFallbackGeneratedStats = (reportText) => ({
  goals: 0,
  assists: 0,
  touches: 0,
  tackles: 0,
  totalPoints: 0,
  sprintSpeed: 0,
  passAccuracy: 0,
  stamina: 0,
  summary: reportText || 'Video analysis completed.',
  strengths: [],
  weaknesses: [],
});

export const getPlayerStorageKey = (player) => player?._id || player?.username || player?.name || '';

export const loadStoredPlayerAnalysis = () => {
  if (typeof window === 'undefined') return {};

  try {
    return JSON.parse(window.localStorage.getItem(PLAYER_ANALYSIS_STORAGE_KEY) || '{}');
  } catch (error) {
    console.error('Failed to read saved player analysis', error);
    return {};
  }
};

export const savePlayerAnalysis = (playerKey, analysis) => {
  if (!playerKey || typeof window === 'undefined') return;

  const current = loadStoredPlayerAnalysis();
  current[playerKey] = analysis;
  window.localStorage.setItem(PLAYER_ANALYSIS_STORAGE_KEY, JSON.stringify(current));
};

export const getSavedPlayerAnalysis = (player) => {
  const playerKey = getPlayerStorageKey(player);
  if (!playerKey) return null;

  const stored = loadStoredPlayerAnalysis();
  return stored[playerKey] || null;
};

export const mergePlayerAnalysis = (player, analysis) => {
  if (!analysis || !player) return player;

  return {
    ...player,
    generatedStats: analysis.generatedStats,
    scoutingReport: analysis.reportText,
    processedVideoUrl: analysis.processedVideoUrl || player?.processedVideoUrl,
    videoAnalysis: {
      ...(player?.videoAnalysis || {}),
      analytics: analysis.analytics,
    },
  };
};

export const uploadPlayerVideoForAnalysis = async (player, file) => {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('video', file);
  formData.append('player_name', player?.username || player?.name || '');
  formData.append('team_name', player?.teamname || player?.team_name || '');
  formData.append('position', player?.position || '');
  formData.append('jersey', player?.jersey || '');

  const baseUrl = getScoutingApiBaseUrl();
  const endpointCandidates = ['/analyze', '/analyze-scouting'];
  let lastError = null;

  for (const endpoint of endpointCandidates) {
    try {
      const response = await fetch(`${baseUrl}${endpoint}`, {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        let detail = '';
        try {
          const errorPayload = await response.json();
          detail = errorPayload.detail || errorPayload.error || '';
        } catch (_error) {
          detail = await response.text();
        }

        throw new Error(detail || `Upload failed with status ${response.status}.`);
      }

      const payload = await response.json();
      const reportPayload = payload?.report;
      const analytics =
        reportPayload && typeof reportPayload === 'object'
          ? reportPayload
          : payload?.analytics && typeof payload.analytics === 'object'
            ? payload.analytics
            : null;

      const reportText =
        typeof reportPayload === 'string'
          ? reportPayload
          : payload?.reportText ||
            payload?.report_text ||
            analytics?.generated_stats?.summary ||
            payload?.message ||
            'Video analysis completed.';

      return {
        analytics,
        reportText,
        generatedStats: analytics?.generated_stats || createFallbackGeneratedStats(reportText),
        processedVideoUrl: payload?.processed_video_url || payload?.processedVideoUrl || '',
        raw: payload,
      };
    } catch (error) {
      lastError = error;
    }
  }

  throw new Error(
    lastError?.message ||
      'Could not reach the scouting analysis server. Please check that your Localtunnel URL is running.'
  );
};
