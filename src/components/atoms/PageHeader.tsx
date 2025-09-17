'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import Box from '@mui/material/Box';
import IconButton from '@mui/material/IconButton';
import Typography from '@mui/material/Typography';
import Stack from '@mui/material/Stack';
import Breadcrumbs from '@mui/material/Breadcrumbs';
import Link from '@mui/material/Link';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';

type BreadcrumbItem = {
  label: string;
  href?: string;
}

type PageHeaderProps = {
  title: string;
  showBackButton?: boolean;
  backPath?: string;
  actions?: React.ReactNode;
  breadcrumbs?: BreadcrumbItem[];
  mb?: number;
}

export default function PageHeader({
  title,
  showBackButton = false,
  backPath,
  actions,
  breadcrumbs,
  mb = 3,
}: PageHeaderProps) {
  const router = useRouter();

  const handleBack = () => {
    if (backPath) {
      router.push(backPath);
    } else {
      router.back();
    }
  };

  return (
    <Box sx={{ mb }}>
      <Stack direction="row" justifyContent="space-between" alignItems="flex-start" spacing={2}>
        <Box>
          {showBackButton && (
            <IconButton
              onClick={handleBack}
              sx={{ mb: 1 }}
              aria-label="戻る"
            >
              <ArrowBackIcon />
            </IconButton>
          )}

          {breadcrumbs && (
            <Breadcrumbs sx={{ mb: 1 }}>
              {breadcrumbs.map((crumb, index) => (
                crumb.href ? (
                  <Link
                    key={index}
                    color="inherit"
                    href={crumb.href}
                    onClick={(e) => {
                      e.preventDefault();
                      router.push(crumb.href!);
                    }}
                    sx={{ cursor: 'pointer' }}
                  >
                    {crumb.label}
                  </Link>
                ) : (
                  <Typography key={index} color="text.primary">
                    {crumb.label}
                  </Typography>
                )
              ))}
            </Breadcrumbs>
          )}

          <Typography variant="h4" component="h1">
            {title}
          </Typography>
        </Box>

        {actions && (
          <Box>
            {actions}
          </Box>
        )}
      </Stack>
    </Box>
  );
}
