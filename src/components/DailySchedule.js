import React from 'react';
import {
  Box,
  Typography,
  List,
  ListItem,
  ListItemText,
  Divider,
  Paper
} from '@mui/material';

const DailySchedule = ({ schedule = [] }) => {
  return (
    <Paper elevation={2} sx={{ p: 2, mb: 2 }}>
      <Typography variant="h6" gutterBottom>
        Расписание на день
      </Typography>
      <List>
        {schedule.map((item, index) => (
          <React.Fragment key={item.schedule_id || index}>
            <ListItem>
              <ListItemText
                primary={item.time_of_day}
                secondary={
                  <Box>
                    <Typography variant="body1" component="span">
                      {item.action}
                    </Typography>
                  </Box>
                }
              />
            </ListItem>
            {index < schedule.length - 1 && <Divider />}
          </React.Fragment>
        ))}
        {schedule.length === 0 && (
          <ListItem>
            <ListItemText
              primary="Расписание пока не добавлено"
              sx={{ textAlign: 'center', color: 'text.secondary' }}
            />
          </ListItem>
        )}
      </List>
    </Paper>
  );
};

export default DailySchedule; 