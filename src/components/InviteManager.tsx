import {
  Ban,
  Check,
  Copy,
  RefreshCcw,
  TicketCheck,
} from 'lucide-react';
import { useEffect, useState } from 'react';
import {
  createOwnerInvite,
  createRandomInviteCode,
  listOwnerInvites,
  revokeOwnerInvite,
  type InviteSummary,
} from '../backend/supabase';

const expiryFromDays = (days: number) =>
  new Date(Date.now() + days * 86_400_000).toISOString();

export function InviteManager() {
  const [code, setCode] = useState(createRandomInviteCode);
  const [note, setNote] = useState('');
  const [maxUses, setMaxUses] = useState(1);
  const [expiryDays, setExpiryDays] = useState(14);
  const [invites, setInvites] = useState<InviteSummary[]>([]);
  const [status, setStatus] = useState('');
  const [busy, setBusy] = useState(false);

  const refresh = async () => {
    const next = await listOwnerInvites();
    setInvites(next);
  };

  useEffect(() => {
    void refresh().catch(() => {
      setStatus('邀请码列表暂时无法读取。');
    });
  }, []);

  const create = async (event: React.FormEvent) => {
    event.preventDefault();
    setBusy(true);
    setStatus('');
    try {
      await createOwnerInvite({
        code,
        maxUses,
        expiresAt: expiryDays > 0 ? expiryFromDays(expiryDays) : null,
        note,
      });
      let copied = false;
      try {
        await navigator.clipboard?.writeText(code);
        copied = Boolean(navigator.clipboard);
      } catch {
        copied = false;
      }
      setStatus(
        copied
          ? `已创建并复制：${code}。这是明文唯一展示时机，请立即发给内测用户。`
          : `已创建：${code}。系统无法访问剪贴板，请先手动复制再离开本页。`,
      );
      if (copied) setCode(createRandomInviteCode());
      setNote('');
      await refresh();
    } catch (error) {
      setStatus(error instanceof Error ? error.message : '创建邀请码失败。');
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="invite-manager" aria-labelledby="invite-manager-title">
      <div className="invite-manager-heading">
        <span><TicketCheck size={17} /></span>
        <div>
          <small>主理人工具</small>
          <h3 id="invite-manager-title">内测邀请码</h3>
        </div>
      </div>

      <form onSubmit={create}>
        <label>
          <span>本次邀请码</span>
          <div className="invite-code-row">
            <code>{code}</code>
            <button
              type="button"
              aria-label="换一个随机邀请码"
              onClick={() => setCode(createRandomInviteCode())}
            >
              <RefreshCcw size={15} />
            </button>
            <button
              type="button"
              aria-label="复制邀请码"
              onClick={() => void navigator.clipboard?.writeText(code)}
            >
              <Copy size={15} />
            </button>
          </div>
        </label>
        <div className="invite-manager-fields">
          <label>
            <span>可用次数</span>
            <input
              type="number"
              min={1}
              max={1000}
              value={maxUses}
              onChange={(event) => setMaxUses(Number(event.target.value))}
            />
          </label>
          <label>
            <span>有效天数</span>
            <input
              type="number"
              min={0}
              max={365}
              value={expiryDays}
              onChange={(event) => setExpiryDays(Number(event.target.value))}
            />
          </label>
        </div>
        <label>
          <span>备注 / 发放对象</span>
          <input
            value={note}
            maxLength={80}
            placeholder="例如：小张 · 第一批内测"
            onChange={(event) => setNote(event.target.value)}
          />
        </label>
        <button className="invite-create-button" type="submit" disabled={busy}>
          <Check size={15} />
          {busy ? '正在创建…' : '创建并复制邀请码'}
        </button>
      </form>

      {status && <p className="invite-manager-status" aria-live="polite">{status}</p>}

      <div className="invite-history">
        {invites.length === 0 ? (
          <p>还没有由管理端创建的邀请码。</p>
        ) : (
          invites.map((invite) => {
            const expired = Boolean(
              invite.expires_at &&
              new Date(invite.expires_at).getTime() <= Date.now(),
            );
            const usable =
              invite.active &&
              !expired &&
              invite.used_count < invite.max_uses;
            const stateLabel = usable
              ? '可用'
              : expired
                ? '已过期'
                : invite.used_count >= invite.max_uses
                  ? '已用完'
                  : '已停用';
            return (
              <div key={invite.id}>
                <span className={usable ? 'active' : ''} />
                <div>
                  <strong>{invite.code_prefix}••••</strong>
                  <small>
                    {invite.note || '未填写备注'} · {invite.used_count}/{invite.max_uses} 次
                  </small>
                </div>
                <em>{stateLabel}</em>
                {invite.active && (
                  <button
                    type="button"
                    aria-label={`停用 ${invite.code_prefix} 邀请码`}
                    onClick={() => {
                      void revokeOwnerInvite(invite.id)
                        .then(refresh)
                        .catch((error) => {
                          setStatus(
                            error instanceof Error ? error.message : '停用失败。',
                          );
                        });
                    }}
                  >
                    <Ban size={14} />
                  </button>
                )}
              </div>
            );
          })
        )}
      </div>
    </section>
  );
}
