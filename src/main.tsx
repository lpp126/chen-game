import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import { ErrorBoundary } from './components/ErrorBoundary';
import { prefetchHomeCover } from './utils/homeCoverCache';
import './index.css';

// 入口立刻优先拉首页封面，抢在 Phaser / 菜单 BGM 之前
void prefetchHomeCover();

createRoot(document.getElementById('root')!).render(
  <ErrorBoundary>
    <App />
  </ErrorBoundary>
);
