import React, { Component, type ErrorInfo, type ReactNode } from 'react';

type Props = { children: ReactNode };
type State = { hasError: boolean; message: string };

export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, message: '' };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, message: error?.message || '未知错误' };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('Game crashed:', error, info.componentStack);
  }

  private reload = () => {
    window.location.reload();
  };

  private goHome = () => {
    try {
      // 清掉可能卡死的状态后刷新回首页
      window.location.hash = '';
      window.location.reload();
    } catch {
      window.location.reload();
    }
  };

  render() {
    if (!this.state.hasError) return this.props.children;

    return (
      <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-[#0a1628] px-6 text-white">
        <div className="max-w-sm w-full rounded-3xl bg-white/10 border border-white/20 p-6 text-center backdrop-blur-md">
          <p className="text-2xl font-bold mb-2">出了点小状况</p>
          <p className="text-sm text-white/70 mb-1">这一关或界面出错了，刷新后通常就能继续。</p>
          <p className="text-xs text-white/40 mb-6 break-all">{this.state.message}</p>
          <div className="flex flex-col gap-3">
            <button
              type="button"
              onClick={this.reload}
              className="w-full py-3 rounded-full font-bold bg-gradient-to-r from-sky-500 to-teal-500"
            >
              刷新重试
            </button>
            <button
              type="button"
              onClick={this.goHome}
              className="w-full py-3 rounded-full font-bold bg-white/15 border border-white/25"
            >
              回到首页
            </button>
          </div>
        </div>
      </div>
    );
  }
}
