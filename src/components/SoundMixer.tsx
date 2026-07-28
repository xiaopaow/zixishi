import { Music2, Volume1, Volume2 } from 'lucide-react';
import { audioEngine } from '../audio/audioEngine';
import { saveSceneSound } from '../data/scenes';
import type {
  AmbienceKey,
  MusicType,
  Preferences,
  SoundSettings,
} from '../types';

const ambienceLabels: Array<{ key: AmbienceKey; label: string }> = [
  { key: 'rain', label: '雨声' },
  { key: 'wind', label: '风声' },
  { key: 'fire', label: '炉火' },
  { key: 'birds', label: '鸟鸣' },
  { key: 'waves', label: '海浪' },
  { key: 'city', label: '城市' },
  { key: 'abacus', label: '算珠' },
];

const musicLabels: Array<{ key: MusicType; label: string }> = [
  { key: 'piano', label: '极简钢琴' },
  { key: 'lofi', label: '低保真' },
  { key: 'none', label: '无音乐' },
];

interface SoundMixerProps {
  preferences: Preferences;
  onChange: (preferences: Preferences) => void;
  dense?: boolean;
  sceneId?: string;
}

export function SoundMixer({
  preferences,
  onChange,
  dense = false,
  sceneId,
}: SoundMixerProps) {
  const updateSound = (sound: SoundSettings) => {
    const next = sceneId
      ? saveSceneSound(preferences, sceneId, sound)
      : { ...preferences, sound };
    onChange(next);
    audioEngine.apply(sound);
  };

  const updateMusic = (musicType: MusicType) =>
    updateSound({ ...preferences.sound, musicType });

  const updateAmbience = (key: AmbienceKey, value: number) =>
    updateSound({
      ...preferences.sound,
      ambience: { ...preferences.sound.ambience, [key]: value },
    });

  return (
    <div className={`sound-mixer ${dense ? 'dense' : ''}`}>
      <div className="section-heading compact-heading">
        <div>
          <span className="eyebrow"><Music2 size={14} /> 声音空间</span>
          {!dense && <p>所有声音由浏览器实时合成，不使用外部音频。</p>}
        </div>
      </div>
      <div className="segmented music-segmented">
        {musicLabels.map((item) => (
          <button
            type="button"
            key={item.key}
            className={preferences.sound.musicType === item.key ? 'selected' : ''}
            aria-pressed={preferences.sound.musicType === item.key}
            onClick={() => updateMusic(item.key)}
          >
            {item.label}
          </button>
        ))}
      </div>

      <label className="slider-row">
        <span><Volume1 size={15} /> 音乐</span>
        <input
          type="range"
          min="0"
          max="1"
          step="0.01"
          value={preferences.sound.musicVolume}
          onChange={(event) =>
            updateSound({
              ...preferences.sound,
              musicVolume: Number(event.target.value),
            })
          }
        />
        <output>{Math.round(preferences.sound.musicVolume * 100)}</output>
      </label>

      <label className="slider-row">
        <span><Volume2 size={15} /> 环境</span>
        <input
          type="range"
          min="0"
          max="1"
          step="0.01"
          value={preferences.sound.ambienceMaster}
          onChange={(event) =>
            updateSound({
              ...preferences.sound,
              ambienceMaster: Number(event.target.value),
            })
          }
        />
        <output>{Math.round(preferences.sound.ambienceMaster * 100)}</output>
      </label>

      <div className="ambience-grid">
        {ambienceLabels.map(({ key, label }) => (
          <label className="mini-slider" key={key}>
            <span>{label}</span>
            <input
              type="range"
              min="0"
              max="1"
              step="0.01"
              value={preferences.sound.ambience[key]}
              onChange={(event) => updateAmbience(key, Number(event.target.value))}
            />
            <output>{Math.round(preferences.sound.ambience[key] * 100)}</output>
          </label>
        ))}
      </div>
    </div>
  );
}
