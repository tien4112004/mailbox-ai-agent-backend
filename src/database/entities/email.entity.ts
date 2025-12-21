import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { User } from './user.entity';

@Entity('emails')
@Index(['userId', 'folder', 'createdAt'])
@Index(['userId', 'folder'])
@Index(['userId', 'messageId'], { unique: true })
export class Email {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  subject: string;

  @Column('text')
  body: string;

  @Column('text')
  preview: string;

  @Column({ name: 'from_name' })
  fromName: string;

  @Column({ name: 'from_email' })
  fromEmail: string;

  @Column('simple-array', { name: 'to_email' })
  toEmail: string[];

  @Column({ default: false })
  read: boolean;

  @Column({ default: false })
  starred: boolean;

  @Column({ default: 'inbox' })
  folder: string;

  @Column({ name: 'message_id', nullable: true })
  messageId: string;

  @Column('jsonb', { nullable: true })
  attachments: Array<{
    name: string;
    size: string;
    type: string;
  }> | null;

  @Column({ name: 'user_id' })
  userId: string;

  @Column('text', { nullable: true })
  summary: string;

  @Column('timestamp', { nullable: true, name: 'summary_generated_at' })
  summaryGeneratedAt: Date;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'user_id' })
  user: User;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;
}
