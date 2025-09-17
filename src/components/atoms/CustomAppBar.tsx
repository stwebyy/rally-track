'use client';

import * as React from 'react';
import AppBar from '@mui/material/AppBar';
import Toolbar from '@mui/material/Toolbar';
import IconButton from '@mui/material/IconButton';
import Typography from '@mui/material/Typography';
import MenuIcon from '@mui/icons-material/Menu';
import MenuOpenIcon from '@mui/icons-material/MenuOpen';
import { DRAWER_WIDTH, MINI_DRAWER_WIDTH } from '@/components/atoms/Sidebar';

type CustomAppBarProps = {
  isExpanded: boolean;
  isMobile: boolean;
  onToggleSidebar: () => void;
  onToggleMobileSidebar: () => void;
  title?: string;
  children?: React.ReactNode;
}

export default function CustomAppBar({
  isExpanded,
  isMobile,
  onToggleSidebar,
  onToggleMobileSidebar,
  title = 'Rally Track',
  children,
}: CustomAppBarProps) {
  return (
    <AppBar
      position="fixed"
      color="default"
      elevation={0}
      sx={{
        width: {
          xs: '100%',
          md: `calc(100% - ${isExpanded ? DRAWER_WIDTH : MINI_DRAWER_WIDTH}px)`
        },
        ml: {
          xs: 0,
          md: `${isExpanded ? DRAWER_WIDTH : MINI_DRAWER_WIDTH}px`
        },
        transition: (theme) => theme.transitions.create(['width', 'margin'], {
          easing: theme.transitions.easing.sharp,
          duration: theme.transitions.duration.enteringScreen,
        }),
        zIndex: (theme) => theme.zIndex.drawer + 1,
        borderBottom: '1px solid',
        borderColor: 'divider',
        backgroundColor: '#f5f6fa',
      }}
    >
      <Toolbar>
        <IconButton
          color="inherit"
          aria-label={isMobile ? "toggle mobile drawer" : "toggle drawer"}
          edge="start"
          onClick={isMobile ? onToggleMobileSidebar : onToggleSidebar}
          sx={{ mr: 2 }}
        >
          {isMobile ? (
            <MenuIcon />
          ) : (
            isExpanded ? <MenuOpenIcon /> : <MenuIcon />
          )}
        </IconButton>
        <Typography variant="h6" noWrap component="div" sx={{ flexGrow: 1 }}>
          {title}
        </Typography>
        {children}
      </Toolbar>
    </AppBar>
  );
}
