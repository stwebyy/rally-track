'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import Box from '@mui/material/Box';
import Drawer from '@mui/material/Drawer';
import List from '@mui/material/List';
import ListItem from '@mui/material/ListItem';
import ListItemButton from '@mui/material/ListItemButton';
import ListItemIcon from '@mui/material/ListItemIcon';
import ListItemText from '@mui/material/ListItemText';
import Divider from '@mui/material/Divider';
import SportsIcon from '@mui/icons-material/Sports';
import EmailIcon from '@mui/icons-material/Email';
import LockIcon from '@mui/icons-material/Lock';
import LogoutIcon from '@mui/icons-material/Logout';
import { createClient } from '@/utils/supabase/client';
import type { User } from '@supabase/supabase-js';

const DRAWER_WIDTH = 240;
const MINI_DRAWER_WIDTH = 64;

interface SidebarProps {
  isOpen: boolean;
  isExpanded: boolean;
  isMobile: boolean;
  onClose: () => void;
  user: User | null;
}

export default function Sidebar({
  isOpen,
  isExpanded,
  isMobile,
  onClose,
  user, // eslint-disable-line @typescript-eslint/no-unused-vars
}: SidebarProps) {
  const router = useRouter();
  const supabase = createClient();

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    router.push('/signin');
  };

  const handleNavigation = (path: string) => {
    router.push(path);
    // モバイルではナビゲーション後にサイドバーを閉じる
    if (isMobile) {
      onClose();
    }
  };

  const menuItems = [
    {
      text: '試合結果',
      icon: <SportsIcon />,
      onClick: () => handleNavigation('/events'),
    },
    {
      text: 'メールアドレス変更',
      icon: <EmailIcon />,
      onClick: () => handleNavigation('/auth/change-email'),
    },
    {
      text: 'パスワード更新',
      icon: <LockIcon />,
      onClick: () => handleNavigation('/auth/update-password'),
    },
  ];

  const drawerContent = (
    <Box>
      <Box
        sx={{
          p: 2,
          minHeight: 64,
          display: 'flex',
          alignItems: 'center',
          justifyContent: (isMobile || isExpanded) ? 'flex-start' : 'center',
        }}
      >
        <SportsIcon sx={{ mr: (isMobile || isExpanded) ? 2 : 0 }} />
        {(isMobile || isExpanded) && (
          <Box sx={{ color: 'text.primary', fontWeight: 'bold' }}>
            Rally Track
          </Box>
        )}
      </Box>
      <Divider />
      <List>
        {menuItems.map((item) => (
          <ListItem key={item.text} disablePadding>
            <ListItemButton
              onClick={item.onClick}
              sx={{
                minHeight: 48,
                justifyContent: (isMobile || isExpanded) ? 'initial' : 'center',
                px: 2.5,
              }}
            >
              <ListItemIcon
                sx={{
                  minWidth: 0,
                  mr: (isMobile || isExpanded) ? 3 : 'auto',
                  justifyContent: 'center',
                }}
              >
                {item.icon}
              </ListItemIcon>
              {(isMobile || isExpanded) && <ListItemText primary={item.text} />}
            </ListItemButton>
          </ListItem>
        ))}
      </List>
      <Box sx={{ flexGrow: 1 }} />
      <Divider />
      <List>
        <ListItem disablePadding>
          <ListItemButton
            onClick={handleSignOut}
            sx={{
              minHeight: 48,
              justifyContent: (isMobile || isExpanded) ? 'initial' : 'center',
              px: 2.5,
            }}
          >
            <ListItemIcon
              sx={{
                minWidth: 0,
                mr: (isMobile || isExpanded) ? 3 : 'auto',
                justifyContent: 'center',
              }}
            >
              <LogoutIcon />
            </ListItemIcon>
            {(isMobile || isExpanded) && <ListItemText primary="ログアウト" />}
          </ListItemButton>
        </ListItem>
      </List>
    </Box>
  );

  return (
    <Drawer
      variant={isMobile ? 'temporary' : 'permanent'}
      open={isMobile ? isOpen : true}
      onClose={onClose}
      ModalProps={{
        keepMounted: true, // Better open performance on mobile.
      }}
      sx={{
        width: isMobile
          ? DRAWER_WIDTH
          : (isExpanded ? DRAWER_WIDTH : MINI_DRAWER_WIDTH),
        flexShrink: 0,
        '& .MuiDrawer-paper': {
          width: isMobile
            ? DRAWER_WIDTH
            : (isExpanded ? DRAWER_WIDTH : MINI_DRAWER_WIDTH),
          boxSizing: 'border-box',
          backgroundColor: '#f5f6fa',
          transition: (theme) => theme.transitions.create('width', {
            easing: theme.transitions.easing.sharp,
            duration: theme.transitions.duration.enteringScreen,
          }),
          // モバイルでのオーバーレイ時のz-indexを確保
          ...(isMobile && {
            position: 'fixed',
            height: '100%',
            zIndex: theme => theme.zIndex.drawer,
          }),
        },
      }}
    >
      {drawerContent}
    </Drawer>
  );
}

export { DRAWER_WIDTH, MINI_DRAWER_WIDTH };
