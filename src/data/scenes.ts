import type { Preferences, Scene, SoundSettings } from '../types';

const sound = (
  musicType: SoundSettings['musicType'],
  musicVolume: number,
  ambience: Partial<SoundSettings['ambience']>,
): SoundSettings => ({
  musicType,
  musicVolume,
  ambienceMaster: 0.68,
  ambience: {
    rain: 0,
    wind: 0,
    fire: 0,
    birds: 0,
    waves: 0,
    city: 0,
    abacus: 0,
    ...ambience,
  },
});

export const scenes: Scene[] = [
  {
    id: 'rain-study',
    name: '江南雨夜书房',
    shortName: '雨夜书房',
    description: '隔窗听雨，把纷扰留在水巷之外。',
    whisper: '雨声会替你收好杂念，先专心这一小段时间。',
    image: '/scenes/rain-study.webp',
    avif: '/scenes/rain-study.avif',
    poster: '/scenes/rain-study-poster.webp',
    posterAvif: '/scenes/rain-study-poster.avif',
    effect: 'rain',
    details: {
      steam: [{ x: 55.4, y: 76.8, scale: 0.72 }],
      glow: { x: 91.2, y: 58.5, size: 17 },
    },
    palette: {
      primary: '#163a3e',
      accent: '#d7b578',
      overlay: 'rgba(4, 20, 24, .36)',
    },
    recommended: sound('piano', 0.23, { rain: 0.68, wind: 0.17, fire: 0.08 }),
  },
  {
    id: 'bamboo-dawn',
    name: '晨雾竹院',
    shortName: '晨雾竹院',
    description: '竹影微动，清晨从一页书开始。',
    whisper: '不用一下走得很远，先把眼前这一页读完。',
    image: '/scenes/bamboo-dawn.webp',
    avif: '/scenes/bamboo-dawn.avif',
    poster: '/scenes/bamboo-dawn-poster.webp',
    posterAvif: '/scenes/bamboo-dawn-poster.avif',
    effect: 'mist',
    details: {
      steam: [{ x: 59.5, y: 76.2, scale: 0.68 }],
      glow: { x: 87.7, y: 65.5, size: 14 },
    },
    palette: {
      primary: '#395a46',
      accent: '#d8bd83',
      overlay: 'rgba(31, 48, 38, .22)',
    },
    recommended: sound('piano', 0.18, { wind: 0.35, birds: 0.38 }),
  },
  {
    id: 'city-loft',
    name: '深夜城市阁楼',
    shortName: '城市阁楼',
    description: '城市尚未入睡，你有一盏自己的灯。',
    whisper: '夜深也没关系，认真做完这一件事就好。',
    image: '/scenes/city-loft.webp',
    avif: '/scenes/city-loft.avif',
    poster: '/scenes/city-loft-poster.webp',
    posterAvif: '/scenes/city-loft-poster.avif',
    effect: 'city',
    details: {
      steam: [{ x: 82.2, y: 82.2, scale: 0.72 }],
      glow: { x: 80.1, y: 67.5, size: 14 },
    },
    palette: {
      primary: '#172d3a',
      accent: '#c89558',
      overlay: 'rgba(6, 14, 24, .4)',
    },
    recommended: sound('lofi', 0.26, { rain: 0.42, city: 0.38 }),
  },
  {
    id: 'seaside-dusk',
    name: '海边黄昏工作室',
    shortName: '海边黄昏',
    description: '把今天的最后一束光，留给重要的事。',
    whisper: '海浪不催促你，按自己的节奏慢慢完成。',
    image: '/scenes/seaside-dusk.webp',
    avif: '/scenes/seaside-dusk.avif',
    poster: '/scenes/seaside-dusk-poster.webp',
    posterAvif: '/scenes/seaside-dusk-poster.avif',
    effect: 'sea',
    details: {
      steam: [{ x: 69.5, y: 70.8, scale: 0.68 }],
      glow: {
        x: 28.4,
        y: 52.2,
        size: 20,
        color: 'rgba(255, 196, 118, .3)',
      },
    },
    palette: {
      primary: '#6e665c',
      accent: '#e2b47d',
      overlay: 'rgba(50, 40, 42, .18)',
    },
    recommended: sound('piano', 0.17, { waves: 0.64, wind: 0.18 }),
  },
  {
    id: 'snow-tea',
    name: '雪山云窗茶室',
    shortName: '雪山茶室',
    description: '云海越过雪峰，壶中茶汽替时间慢下来。',
    whisper: '看一缕茶汽升起，再把心放回眼前这一件事。',
    image: '/scenes/snow-tea.webp',
    avif: '/scenes/snow-tea.avif',
    poster: '/scenes/snow-tea-poster.webp',
    posterAvif: '/scenes/snow-tea-poster.avif',
    effect: 'snow',
    details: {
      steam: [
        { x: 72.4, y: 73.4, scale: 1.15 },
        { x: 80.8, y: 71.2, scale: 0.62 },
      ],
      glow: { x: 95.2, y: 52.2, size: 16 },
    },
    palette: {
      primary: '#294557',
      accent: '#d9b275',
      overlay: 'rgba(12, 28, 40, .2)',
    },
    recommended: sound('piano', 0.16, {
      wind: 0.2,
      fire: 0.12,
    }),
  },
  {
    id: 'temple-ginkgo',
    name: '古寺银杏书阁',
    shortName: '银杏书阁',
    description: '山雾绕过檐角，银杏替你翻动秋日。',
    whisper: '听风经过古寺，把这一页安静地读完。',
    image: '/scenes/temple-ginkgo.webp',
    avif: '/scenes/temple-ginkgo.avif',
    poster: '/scenes/temple-ginkgo-poster.webp',
    posterAvif: '/scenes/temple-ginkgo-poster.avif',
    effect: 'ginkgo',
    details: {
      steam: [{ x: 80.5, y: 65.2, scale: 1.05 }],
      glow: { x: 93.2, y: 49.5, size: 18 },
    },
    palette: {
      primary: '#59462d',
      accent: '#d5aa61',
      overlay: 'rgba(35, 27, 17, .23)',
    },
    recommended: sound('piano', 0.15, {
      wind: 0.2,
      birds: 0.13,
      abacus: 0.2,
    }),
  },
  {
    id: 'night-train',
    name: '夜行山谷书厢',
    shortName: '夜行书厢',
    description: '列车穿过雨夜，窗内只留一盏阅读灯。',
    whisper: '让沿途灯火向后退去，只陪眼前这件事向前。',
    image: '/scenes/night-train.webp',
    avif: '/scenes/night-train.avif',
    poster: '/scenes/night-train-poster.webp',
    posterAvif: '/scenes/night-train-poster.avif',
    effect: 'train',
    details: {
      steam: [{ x: 63.4, y: 71.4, scale: 0.82 }],
      glow: { x: 83.1, y: 47.5, size: 17 },
    },
    palette: {
      primary: '#213a4d',
      accent: '#d1a05b',
      overlay: 'rgba(5, 18, 31, .3)',
    },
    recommended: sound('lofi', 0.17, {
      rain: 0.46,
      city: 0.14,
      wind: 0.1,
    }),
  },
  {
    id: 'morning-classroom',
    name: '纸绘晨光课室',
    shortName: '晨光课室',
    description: '旧课桌晒着晨光，把熟悉的上课铃留在记忆里。',
    whisper: '像从前第一节课那样，先认真坐好，再慢慢开始。',
    image: '/scenes/morning-classroom.webp',
    avif: '/scenes/morning-classroom.avif',
    poster: '/scenes/morning-classroom-poster.webp',
    posterAvif: '/scenes/morning-classroom-poster.avif',
    effect: 'classroom',
    details: {
      steam: [{ x: 85.6, y: 67.4, scale: 0.76 }],
      glow: {
        x: 75.5,
        y: 39.5,
        size: 28,
        color: 'rgba(255, 210, 128, .3)',
      },
    },
    palette: {
      primary: '#65502f',
      accent: '#d7a857',
      overlay: 'rgba(56, 39, 18, .13)',
    },
    recommended: sound('piano', 0.15, {
      birds: 0.2,
      wind: 0.13,
      abacus: 0.14,
    }),
  },
];

export const defaultPreferences: Preferences = {
  defaultMinutes: 45,
  timerStyle: 'compact',
  selectedSceneId: scenes[0].id,
  sound: structuredClone(scenes[0].recommended),
  sceneSounds: Object.fromEntries(
    scenes.map((scene) => [scene.id, structuredClone(scene.recommended)]),
  ),
  quality: 'high',
  motionEnabled: true,
  notificationsEnabled: false,
};

export const getScene = (id: string) =>
  scenes.find((scene) => scene.id === id) ?? scenes[0];

const validNumber = (value: unknown, fallback: number) =>
  typeof value === 'number' && Number.isFinite(value)
    ? Math.min(1, Math.max(0, value))
    : fallback;

export const normalizeSound = (
  value: Partial<SoundSettings> | undefined,
  fallback: SoundSettings,
): SoundSettings => ({
  musicType:
    value?.musicType === 'piano' ||
    value?.musicType === 'lofi' ||
    value?.musicType === 'none'
      ? value.musicType
      : fallback.musicType,
  musicVolume: validNumber(value?.musicVolume, fallback.musicVolume),
  ambienceMaster: validNumber(value?.ambienceMaster, fallback.ambienceMaster),
  ambience: {
    rain: validNumber(value?.ambience?.rain, fallback.ambience.rain),
    wind: validNumber(value?.ambience?.wind, fallback.ambience.wind),
    fire: validNumber(value?.ambience?.fire, fallback.ambience.fire),
    birds: validNumber(value?.ambience?.birds, fallback.ambience.birds),
    waves: validNumber(value?.ambience?.waves, fallback.ambience.waves),
    city: validNumber(value?.ambience?.city, fallback.ambience.city),
    abacus: validNumber(value?.ambience?.abacus, fallback.ambience.abacus),
  },
});

export const normalizePreferences = (
  value: Partial<Preferences> | undefined,
): Preferences => {
  const selectedScene = getScene(value?.selectedSceneId ?? scenes[0].id);
  const legacySound = normalizeSound(value?.sound, selectedScene.recommended);
  const savedSceneSounds = value?.sceneSounds ?? {};
  const sceneSounds = Object.fromEntries(
    scenes.map((scene) => {
      const fallback =
        scene.id === selectedScene.id ? legacySound : scene.recommended;
      return [
        scene.id,
        normalizeSound(savedSceneSounds[scene.id], fallback),
      ];
    }),
  );

  return {
    defaultMinutes:
      typeof value?.defaultMinutes === 'number' &&
      Number.isFinite(value.defaultMinutes)
        ? Math.min(180, Math.max(1, Math.round(value.defaultMinutes)))
        : defaultPreferences.defaultMinutes,
    timerStyle:
      value?.timerStyle === 'large' || value?.timerStyle === 'compact'
        ? value.timerStyle
        : defaultPreferences.timerStyle,
    selectedSceneId: selectedScene.id,
    sound: sceneSounds[selectedScene.id],
    sceneSounds,
    quality:
      value?.quality === 'high' || value?.quality === 'low'
        ? value.quality
        : defaultPreferences.quality,
    motionEnabled:
      typeof value?.motionEnabled === 'boolean'
        ? value.motionEnabled
        : defaultPreferences.motionEnabled,
    notificationsEnabled:
      typeof value?.notificationsEnabled === 'boolean'
        ? value.notificationsEnabled
        : defaultPreferences.notificationsEnabled,
  };
};

export const soundForScene = (preferences: Preferences, sceneId: string) =>
  normalizeSound(
    preferences.sceneSounds?.[sceneId],
    getScene(sceneId).recommended,
  );

export const saveSceneSound = (
  preferences: Preferences,
  sceneId: string,
  nextSound: SoundSettings,
): Preferences => {
  const sound = normalizeSound(nextSound, getScene(sceneId).recommended);
  return {
    ...preferences,
    selectedSceneId: sceneId,
    sound,
    sceneSounds: {
      ...preferences.sceneSounds,
      [sceneId]: sound,
    },
  };
};
