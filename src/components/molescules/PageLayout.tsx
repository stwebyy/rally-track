'use client';

import * as React from 'react';
import Box from '@mui/material/Box';
import Toolbar from '@mui/material/Toolbar';
import { useAuth, useSidebar } from '@/hooks';
import CustomAppBar from '@/components/atoms/CustomAppBar';
import Sidebar, { DRAWER_WIDTH, MINI_DRAWER_WIDTH } from '@/components/atoms/Sidebar';
import LoadingSpinner from '@/components/atoms/LoadingSpinner';

interface PageLayoutProps {
  children: React.ReactNode;
  title?: string;
  showLoading?: boolean;
}

export default function PageLayout({
  children,
  title = 'Rally Track',
  showLoading = true
}: PageLayoutProps) {
  const { user, loading } = useAuth();
  const {
    isDesktop,
    isDesktopSidebarExpanded,
    isMobileSidebarOpen,
    handleToggleDesktopSidebar,
    handleToggleMobileSidebar,
    handleCloseMobileSidebar,
  } = useSidebar();

  // 認証ローディング中の場合のみローディングスピナーを表示
  if (loading && showLoading) {
    return <LoadingSpinner />;
  }

  // 認証されていない場合は何も表示しない
  if (!user && showLoading) {
    return null;
  }

  return (
    <Box sx={{ display: 'flex' }}>
      <CustomAppBar
        isExpanded={isDesktopSidebarExpanded}
        isMobile={!isDesktop}
        onToggleSidebar={handleToggleDesktopSidebar}
        onToggleMobileSidebar={handleToggleMobileSidebar}
        title={title}
      />

      <Sidebar
        isOpen={isMobileSidebarOpen}
        isExpanded={isDesktopSidebarExpanded}
        isMobile={!isDesktop}
        onClose={handleCloseMobileSidebar}
        user={user}
      />

      <Box
        component="main"
        sx={{
          flexGrow: 1,
          p: 3,
          width: {
            xs: '100%',
            md: `calc(100% - ${isDesktopSidebarExpanded ? DRAWER_WIDTH : MINI_DRAWER_WIDTH}px)`
          },
          transition: (theme) => theme.transitions.create('width', {
            easing: theme.transitions.easing.sharp,
            duration: theme.transitions.duration.enteringScreen,
          }),
          backgroundColor: 'background.default',
        }}
      >
        <Toolbar />
        {children}
      </Box>
    </Box>
  );
}
