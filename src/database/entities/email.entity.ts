import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { User } from './user.entity';

@Entity('emails')
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

  @Column('simple-array')
  to: string[];

  @Column({ default: false })
  read: boolean;

  @Column({ default: false })
  starred: boolean;

  @Column({ default: 'inbox' })
  folder: string;

  @Column('jsonb', { nullable: true })
  attachments: Array<{
    name: string;
    size: string;
    type: string;
  }> | null;

  @Column({ name: 'user_id' })
  userId: string;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'user_id' })
  user: User;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;
}
