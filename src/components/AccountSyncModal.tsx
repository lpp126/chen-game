import React, { useEffect, useState } from 'react';
import { useGameStore } from '../store/gameStore';
import { FRESH, failBtnPrimary, failBtnSecondary } from '../utils/levelTheme';

type Props = {
  open: boolean;
  onClose: () => void;
  /** 进入游戏前的强制登录：不可跳过 */
  required?: boolean;
  /** 选关页：仅展示当前账号 / 退出 / 关闭 */
  detailsOnly?: boolean;
};

export const AccountSyncModal: React.FC<Props> = ({ open, onClose, required = false, detailsOnly = false }) => {
  const { accountNickname, loginWithNickname, logoutNickname } = useGameStore();
  const [nickname, setNickname] = useState('');
  const [pin, setPin] = useState('');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    if (!open) return;
    setNickname(accountNickname ?? '');
    setPin('');
    setMessage('');
  }, [open, accountNickname]);

  if (!open) return null;

  const submit = async () => {
    setBusy(true);
    setMessage('');
    const result = await loginWithNickname(nickname, pin);
    setBusy(false);
    setMessage(result.message);
    if (result.ok) {
      setPin('');
      window.setTimeout(() => onClose(), 500);
    }
  };

  if (detailsOnly) {
    return (
      <div className="absolute inset-0 z-[80] bg-black/45 flex items-center justify-center px-8">
        <div className="bg-white rounded-3xl shadow-xl p-5 w-full max-w-[22rem] border border-white/80">
          <h3 className="text-lg font-bold text-center mb-4" style={{ color: FRESH.text }}>
            账号详情
          </h3>
          <div
            className="w-full py-3 px-3 mb-3 rounded-2xl text-center font-semibold break-all"
            style={{ color: FRESH.text, fontSize: 25, background: FRESH.accentSoft }}
          >
            当前：{accountNickname ?? '未登录'}
          </div>
          <div className="flex flex-col gap-2">
            <button
              type="button"
              onClick={() => {
                logoutNickname();
                onClose();
              }}
              className={`w-full py-2.5 rounded-full text-sm font-bold ${failBtnSecondary}`}
            >
              退出登录
            </button>
            <button type="button" onClick={onClose} className={`w-full py-2.5 rounded-full text-sm font-bold ${failBtnSecondary}`}>
              关闭
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="absolute inset-0 z-[80] bg-black/45 flex items-center justify-center px-8">
      <div className="bg-white rounded-3xl shadow-xl p-5 w-full max-w-[22rem] border border-white/80">
        <h3 className="text-lg font-bold text-center mb-1" style={{ color: FRESH.text }}>
          登录后开始
        </h3>
        <p className="text-xs text-center mb-4 leading-relaxed" style={{ color: FRESH.textMuted }}>
          请输入昵称和密码，用于保存游戏进度。
        </p>

        <input
          value={nickname}
          onChange={(e) => setNickname(e.target.value)}
          placeholder="昵称（1～12 字，可含符号/emoji）"
          className="w-full rounded-xl px-3 py-2.5 mb-2 text-sm border"
          style={{ borderColor: `${FRESH.mist}88` }}
          autoComplete="username"
        />
        <input
          type="password"
          value={pin}
          onChange={(e) => setPin(e.target.value)}
          placeholder="密码（4～8 位字母/数字）"
          className="w-full rounded-xl px-3 py-2.5 mb-2 text-sm border"
          style={{ borderColor: `${FRESH.mist}88` }}
          maxLength={8}
          autoComplete="current-password"
        />

        {message && (
          <p className="text-xs mb-3 text-center" style={{ color: message.includes('成功') ? FRESH.sage : '#c45c5c' }}>
            {message}
          </p>
        )}

        <div className="flex flex-col gap-2">
          <button
            type="button"
            disabled={busy}
            onClick={() => void submit()}
            className={`w-full py-2.5 rounded-full text-sm font-bold ${failBtnPrimary} disabled:opacity-60`}
          >
            {busy ? '处理中…' : '进入选关'}
          </button>
          <button type="button" onClick={onClose} className={`w-full py-2.5 rounded-full text-sm font-bold ${failBtnSecondary}`}>
            返回首页
          </button>
        </div>
      </div>
    </div>
  );
};
