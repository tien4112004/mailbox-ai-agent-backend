import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Email } from './email.entity';
import { KanbanColumn } from './kanban-column.entity';

@Entity('kanban_cards')
export class KanbanCard {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  emailId: string;

  @Column()
  columnId: string;

  @Column({ default: 0 })
  order: number;

  @Column({ nullable: true })
  notes: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @ManyToOne(() => Email, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'emailId' })
  email: Email;

  @ManyToOne(() => KanbanColumn, (column) => column.cards, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'columnId' })
  column: KanbanColumn;
}
