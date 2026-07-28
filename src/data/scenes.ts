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
    poster: '/scenes/rain-study-poster.webp',
    effect: 'rain',
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
    poster: '/scenes/bamboo-dawn-poster.webp',
    effect: 'mist',
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
    poster: '/scenes/city-loft-poster.webp',
    effect: 'city',
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
    poster: '/scenes/seaside-dusk-poster.webp',
    effect: 'sea',
    palette: {
      primary: '#6e665c',
      accent: '#e2b47d',
      overlay: 'rgba(50, 40, 42, .18)',
    },
    recommended: sound('piano', 0.17, { waves: 0.64, wind: 0.18 }),
  },
];

export const defaultPreferences: Preferences = {
  defaultMinutes: 45,
  timerStyle: 'compact',
  selectedSceneId: scenes[0].id,
  sound: scenes[0].recommended,
  quality: 'high',
  motionEnabled: true,
  notificationsEnabled: false,
};

export const getScene = (id: string) =>
  scenes.find((scene) => scene.id === id) ?? scenes[0];
