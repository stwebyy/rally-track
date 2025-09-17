'use client';

import * as React from 'react';
import { useTheme } from '@mui/material/styles';
import useMediaQuery from '@mui/material/useMediaQuery';

interface UseSidebarReturn {
  isDesktop: boolean;
  isDesktopSidebarExpanded: boolean;
  isMobileSidebarOpen: boolean;
  isHydrated: boolean;
  handleToggleDesktopSidebar: () => void;
  handleToggleMobileSidebar: () => void;
  handleOpenMobileSidebar: () => void;
  handleCloseMobileSidebar: () => void;
}

export const useSidebar = (): UseSidebarReturn => {
  const theme = useTheme();
  const [isHydrated, setIsHydrated] = React.useState(false);

  // SSR時はデフォルトでモバイルとしてレンダリング、Hydration後に正しい値を設定
  const isDesktop = useMediaQuery(theme.breakpoints.up('md'), {
    defaultMatches: false, // SSRではfalseから開始
    noSsr: true // SSRを無効にしてクライアントサイドでのみ動作
  });

  const [isDesktopSidebarExpanded, setIsDesktopSidebarExpanded] = React.useState(false);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = React.useState(false);

  // モバイル/デスクトップ切り替え時にモバイルサイドバーを閉じる
  React.useEffect(() => {
    if (isDesktop) {
      setIsMobileSidebarOpen(false);
    }
  }, [isDesktop]);

  // クライアントサイドでのみローカルストレージから状態を復元
  React.useEffect(() => {
    if (typeof window !== 'undefined') {
      setIsHydrated(true);
      try {
        const saved = localStorage.getItem('rally-track-sidebar-expanded');
        if (saved !== null) {
          setIsDesktopSidebarExpanded(JSON.parse(saved));
        }
      } catch (error) {
        console.warn('Failed to load sidebar state from localStorage:', error);
        // エラーが発生した場合はデフォルト値を使用
      }
    }
  }, []);

  // サイドバーの状態をローカルストレージに保存（クライアントサイドのみ）
  React.useEffect(() => {
    if (isHydrated && typeof window !== 'undefined') {
      try {
        localStorage.setItem('rally-track-sidebar-expanded', JSON.stringify(isDesktopSidebarExpanded));
      } catch (error) {
        console.warn('Failed to save sidebar state to localStorage:', error);
        // ローカルストレージに保存できない場合は無視
      }
    }
  }, [isDesktopSidebarExpanded, isHydrated]);

  const handleToggleDesktopSidebar = React.useCallback(() => {
    setIsDesktopSidebarExpanded(prev => !prev);
  }, []);

  const handleToggleMobileSidebar = React.useCallback(() => {
    setIsMobileSidebarOpen(prev => !prev);
  }, []);

  const handleOpenMobileSidebar = React.useCallback(() => {
    setIsMobileSidebarOpen(true);
  }, []);

  const handleCloseMobileSidebar = React.useCallback(() => {
    setIsMobileSidebarOpen(false);
  }, []);

  return {
    isDesktop,
    isDesktopSidebarExpanded,
    isMobileSidebarOpen,
    isHydrated,
    handleToggleDesktopSidebar,
    handleToggleMobileSidebar,
    handleOpenMobileSidebar,
    handleCloseMobileSidebar,
  };
}
