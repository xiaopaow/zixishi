import { Component, type ErrorInfo, type ReactNode } from 'react';

interface AppErrorBoundaryProps {
  children: ReactNode;
}

interface AppErrorBoundaryState {
  failed: boolean;
}

export class AppErrorBoundary extends Component<
  AppErrorBoundaryProps,
  AppErrorBoundaryState
> {
  state: AppErrorBoundaryState = { failed: false };

  static getDerivedStateFromError(): AppErrorBoundaryState {
    return { failed: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('栖时页面渲染失败', error, info);
  }

  render() {
    if (this.state.failed) {
      return (
        <main className="fatal-error-page">
          <span aria-hidden="true">栖</span>
          <h1>这一页暂时没有推开</h1>
          <p>本机数据仍然保留。重新载入页面后，可以从刚才的位置继续。</p>
          <button
            type="button"
            className="primary-button"
            onClick={() => window.location.reload()}
          >
            重新载入
          </button>
        </main>
      );
    }
    return this.props.children;
  }
}
