import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { User } from './user.entity';

export enum SnoozeStatus {
  ACTIVE = 'active',
  SNOOZED = 'snoozed',
  CANCELLED = 'cancelled',
  RESUMED = 'resumed',
}

@Entity('snoozes')
export class Snooze {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'email_id' })
  emailId: string;

  @Column({ name: 'gmail_message_id' })
  gmailMessageId: string;

  @Column({ name: 'user_id' })
  userId: string;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Column({
    type: 'enum',
    enum: SnoozeStatus,
    default: SnoozeStatus.SNOOZED,
  })
  status: SnoozeStatus;

  @Column({ name: 'snooze_until', type: 'timestamptz' })
  snoozeUntil: Date;

  @Column({
    type: 'simple-array',
    name: 'original_labels',
    nullable: true,
  })
  originalLabels: string[];

  @Column({
    name: 'original_folder',
    nullable: true,
  })
  originalFolder: string;

  @Column({
    name: 'snooze_reason',
    nullable: true,
  })
  snoozeReason: string;

  @Column({
    name: 'is_recurring',
    default: false,
  })
  isRecurring: boolean;

  @Column({
    name: 'recurrence_pattern',
    nullable: true,
  })
  recurrencePattern: string; // e.g., 'DAILY', 'WEEKLY', 'MONTHLY'

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;

  @Column({
    name: 'resumed_at',
    type: 'timestamptz',
    nullable: true,
  })
  resumedAt: Date;

  @Column({
    name: 'cancelled_at',
    type: 'timestamptz',
    nullable: true,
  })
  cancelledAt: Date;
}
