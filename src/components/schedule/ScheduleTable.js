import React from 'react';
import {
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  IconButton,
} from '@mui/material';
import {
  Edit as EditIcon,
  Delete as DeleteIcon,
} from '@mui/icons-material';
import { useAuth } from '../../contexts/AuthContext';

const ScheduleTable = ({ schedule, onEdit, onDelete }) => {
  const { user } = useAuth();
  const canEdit = user.role !== 'parent';

  return (
    <TableContainer component={Paper}>
      <Table>
        <TableHead>
          <TableRow>
            <TableCell>Время</TableCell>
            <TableCell>Действие</TableCell>
            {canEdit && <TableCell>Действия</TableCell>}
          </TableRow>
        </TableHead>
        <TableBody>
          {schedule.map((item) => (
            <TableRow key={item.schedule_id}>
              <TableCell>{item.time_of_day}</TableCell>
              <TableCell>{item.action}</TableCell>
              {canEdit && (
                <TableCell>
                  <IconButton onClick={() => onEdit(item)}>
                    <EditIcon />
                  </IconButton>
                  <IconButton onClick={() => onDelete(item.schedule_id)}>
                    <DeleteIcon />
                  </IconButton>
                </TableCell>
              )}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  );
};

export default ScheduleTable; 