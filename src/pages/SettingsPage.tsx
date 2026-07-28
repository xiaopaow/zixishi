import {
  ArrowRight,
  Bell,
  Check,
  Crown,
  Database,
  Download,
  Eye,
  HardDrive,
  Info,
  MonitorDown,
  RotateCcw,
  ShieldCheck,
  SlidersHorizontal,
  Upload,
  UserRound,
} from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { audioEngine } from '../audio/audioEngine';
import { Modal } from '../components/Modal';
import { SoundMixer } from '../components/SoundMixer';
import { useApp } from '../context/AppContext';
import { clearData, exportData, importData } from '../db';

interface InstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export function SettingsPage() {
  const {
    preferences,
    updatePreferences,
    refresh,
    resetState,
  } = useApp();
  const [clearOpen, setClearOpen] = useState(false);
  const [status, setStatus] = useState('');
  const [installPrompt, setInstallPrompt] = useState<InstallPromptEvent | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const handler = (event: Event) => {
      event.preventDefault();
      setInstallPrompt(event as InstallPromptEvent);
    };
    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const downloadBackup = async () => {
    const payload = await exportData();
    const blob = new Blob([JSON.stringify(payload, null, 2)], {
      type: 'application/json',
    });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `栖时备份-${new Date().toISOString().slice(0, 10)}.json`;
    anchor.click();
    URL.revokeObjectURL(url);
    setStatus('备份已导出');
  };

  const readBackup = async (file: File) => {
    try {
      const payload = JSON.parse(await file.text()) as unknown;
      await importData(payload);
      await refresh();
      setStatus('数据已从备份恢复');
    } catch (error) {
      setStatus(error instanceof Error ? error.message : '导入失败');
    } finally {
      if (fileInput.current) fileInput.current.value = '';
    }
  };

  const toggleNotifications = async () => {
    if (preferences.notificationsEnabled) {
      await updatePreferences({
        ...preferences,
        notificationsEnabled: false,
      });
      setStatus('专注完成提醒已关闭');
      return;
    }
    if (!('Notification' in window)) {
      setStatus('当前浏览器不支持系统通知');
      return;
    }
    try {
      const permission = await Notification.requestPermission();
      const enabled = permission === 'granted';
      await updatePreferences({ ...preferences, notificationsEnabled: enabled });
      setStatus(enabled ? '专注完成提醒已开启' : '没有获得通知权限');
    } catch {
      setStatus('通知权限请求失败，计时功能不受影响');
    }
  };

  const install = async () => {
    if (!installPrompt) {
      setStatus('可从浏览器菜单选择“安装应用”或“添加到主屏幕”');
      return;
    }
    await installPrompt.prompt();
    const choice = await installPrompt.userChoice;
    setStatus(choice.outcome === 'accepted' ? '栖时已安装' : '已取消安装');
    setInstallPrompt(null);
  };

  const doClear = async () => {
    await audioEngine.fadeOut();
    await clearData();
    resetState();
    setClearOpen(false);
    setStatus('本机数据已清空');
  };

  return (
    <div className="page settings-page">
      <section className="page-title-row">
        <div>
          <span className="eyebrow"><SlidersHorizontal size={14} /> 设置</span>
          <h1>把栖时调成你的节奏</h1>
          <p>这些偏好只保存在当前设备，不会上传到任何服务器。</p>
        </div>
        {status && <div className="status-toast"><Check size={15} /> {status}</div>}
      </section>

      <section className="settings-layout">
        <div className="settings-column">
          <article className="glass-card settings-card membership-settings-card">
            <div className="settings-card-title">
              <span><Crown size={18} /></span>
              <div>
                <h2>栖时账号与会员</h2>
                <p>账号体系预览 · Plus 权益即将开放</p>
              </div>
            </div>
            <div className="membership-settings-copy">
              <div>
                <UserRound size={18} />
                <span>
                  <strong>当前使用本机模式</strong>
                  <small>任务与轨迹不会自动上传，未来可自愿开启同步。</small>
                </span>
              </div>
              <Link to="/account">
                查看登录注册界面 <ArrowRight size={16} />
              </Link>
            </div>
          </article>

          <article className="glass-card settings-card">
            <div className="settings-card-title">
              <span><Eye size={18} /></span>
              <div><h2>专注显示</h2><p>计时器、画质和动态效果</p></div>
            </div>
            <div className="setting-row">
              <div><strong>默认专注时长</strong><small>进入专注室时自动选中</small></div>
              <label className="number-control">
                <input
                  type="number"
                  min="1"
                  max="180"
                  value={preferences.defaultMinutes}
                  onChange={(event) =>
                    void updatePreferences({
                      ...preferences,
                      defaultMinutes: Math.min(180, Math.max(1, Number(event.target.value))),
                    })
                  }
                />
                <span>分钟</span>
              </label>
            </div>
            <div className="setting-row">
              <div><strong>计时器样式</strong><small>专注中仍可随时切换</small></div>
              <div className="segmented small">
                <button
                  className={preferences.timerStyle === 'compact' ? 'selected' : ''}
                  onClick={() => void updatePreferences({ ...preferences, timerStyle: 'compact' })}
                >透明小卡</button>
                <button
                  className={preferences.timerStyle === 'large' ? 'selected' : ''}
                  onClick={() => void updatePreferences({ ...preferences, timerStyle: 'large' })}
                >大数字</button>
              </div>
            </div>
            <div className="setting-row">
              <div><strong>场景画质</strong><small>低画质更节省流量和内存</small></div>
              <div className="segmented small">
                <button
                  className={preferences.quality === 'high' ? 'selected' : ''}
                  onClick={() => void updatePreferences({ ...preferences, quality: 'high' })}
                >高清</button>
                <button
                  className={preferences.quality === 'low' ? 'selected' : ''}
                  onClick={() => void updatePreferences({ ...preferences, quality: 'low' })}
                >省流</button>
              </div>
            </div>
            <label className="setting-row toggle-row">
              <div><strong>场景微动效</strong><small>雨、雾、光点和轻微视差</small></div>
              <input
                type="checkbox"
                checked={preferences.motionEnabled}
                onChange={(event) =>
                  void updatePreferences({ ...preferences, motionEnabled: event.target.checked })
                }
              />
              <span className="toggle" />
            </label>
          </article>

          <article className="glass-card settings-card">
            <div className="settings-card-title">
              <span><Bell size={18} /></span>
              <div><h2>完成提醒</h2><p>计时结束时给你一个轻提示</p></div>
            </div>
            <div className="setting-row">
              <div>
                <strong>系统通知</strong>
                <small>{preferences.notificationsEnabled ? '已开启' : '尚未开启'}</small>
              </div>
              <button type="button" className="secondary-button small-button" onClick={() => void toggleNotifications()}>
                {preferences.notificationsEnabled ? '关闭提醒' : '开启提醒'}
              </button>
            </div>
          </article>
        </div>

        <div className="settings-column">
          <article className="glass-card settings-card">
            <div className="settings-card-title">
              <span><SlidersHorizontal size={18} /></span>
              <div><h2>默认声音</h2><p>新专注会沿用这套声音</p></div>
            </div>
            <SoundMixer
              preferences={preferences}
              onChange={(next) => void updatePreferences(next)}
              sceneId={preferences.selectedSceneId}
            />
          </article>

          <article className="glass-card settings-card">
            <div className="settings-card-title">
              <span><Database size={18} /></span>
              <div><h2>本机数据</h2><p>导出备份，或从备份恢复</p></div>
            </div>
            <div className="data-actions">
              <button type="button" onClick={() => void downloadBackup()}>
                <Download size={17} /><span><strong>导出备份</strong><small>下载 JSON 文件</small></span>
              </button>
              <button type="button" onClick={() => fileInput.current?.click()}>
                <Upload size={17} /><span><strong>导入备份</strong><small>覆盖当前本机数据</small></span>
              </button>
              <input
                ref={fileInput}
                type="file"
                accept="application/json,.json"
                hidden
                onChange={(event) => {
                  const file = event.target.files?.[0];
                  if (file) void readBackup(file);
                }}
              />
              <button type="button" onClick={() => void install()}>
                <MonitorDown size={17} /><span><strong>安装应用</strong><small>添加到桌面或主屏幕</small></span>
              </button>
              <button type="button" className="danger" onClick={() => setClearOpen(true)}>
                <RotateCcw size={17} /><span><strong>清空数据</strong><small>任务、记录与偏好</small></span>
              </button>
            </div>
          </article>

          <article className="privacy-note">
            <ShieldCheck size={19} />
            <div>
              <strong>隐私说明</strong>
              <p>当前版本无需账号，登录、邀请码与会员页面也尚未连接服务器；目标、记录和声音偏好仍只保存在本机。清理浏览器数据会同时移除本机记录，请定期导出备份。</p>
            </div>
            <Info size={15} />
          </article>
        </div>
      </section>

      <Modal open={clearOpen} title="清空全部本机数据？" onClose={() => setClearOpen(false)}>
        <div className="modal-body">
          <HardDrive size={34} strokeWidth={1.4} />
          <p>这会删除所有任务、专注记录和偏好设置。操作无法撤销，建议先导出备份。</p>
          <div className="modal-actions">
            <button type="button" className="secondary-button" onClick={() => setClearOpen(false)}>取消</button>
            <button type="button" className="danger-button" onClick={() => void doClear()}>确认清空</button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
