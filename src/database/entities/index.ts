import { User } from './user.entity';
import { Email } from './email.entity';
import { Snooze } from './snooze.entity';
import { KanbanColumn } from './kanban-column.entity';
import { KanbanCard } from './kanban-card.entity';
import { SmtpConfig } from './smtp-config.entity';

export const entities = [User, Email, Snooze, KanbanColumn, KanbanCard, SmtpConfig];
