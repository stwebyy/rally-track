import * as React from 'react';
import TextField from '@mui/material/TextField';
import Stack from '@mui/material/Stack';
import Paper from '@mui/material/Paper';
import Typography from '@mui/material/Typography';

interface EventFormProps {
  eventName: string;
  eventDate: string;
  eventLocation: string;
  onEventNameChange: (name: string) => void;
  onEventDateChange: (date: string) => void;
  onEventLocationChange: (location: string) => void;
  disabled?: boolean;
  title?: string;
}

export default function EventForm({
  eventName,
  eventDate,
  eventLocation,
  onEventNameChange,
  onEventDateChange,
  onEventLocationChange,
  disabled = false,
  title = '試合情報',
}: EventFormProps) {
  // 今日の日付をYYYY-MM-DD形式で取得
  const getTodayDate = () => {
    const today = new Date();
    return today.toISOString().split('T')[0];
  };

  // クライアントサイドでのみ今日の日付を設定
  React.useEffect(() => {
    if (!eventDate && typeof window !== 'undefined') {
      onEventDateChange(getTodayDate());
    }
  }, [eventDate, onEventDateChange]);

  return (
    <Paper sx={{ p: 3, mb: 3 }}>
      <Typography variant="h6" gutterBottom>
        {title}
      </Typography>
      <Stack spacing={3}>
        <TextField
          label="試合名"
          required
          fullWidth
          value={eventName}
          onChange={(e) => onEventNameChange(e.target.value)}
          disabled={disabled}
          placeholder="例: 第1回練習試合"
        />

        <TextField
          label="試合日"
          type="date"
          required
          fullWidth
          value={eventDate}
          onChange={(e) => onEventDateChange(e.target.value)}
          disabled={disabled}
          slotProps={{
            inputLabel: {
              shrink: true,
            },
          }}
        />

        <TextField
          label="試合場所"
          fullWidth
          value={eventLocation}
          onChange={(e) => onEventLocationChange(e.target.value)}
          disabled={disabled}
          placeholder="例: 体育館A"
        />
      </Stack>
    </Paper>
  );
}
