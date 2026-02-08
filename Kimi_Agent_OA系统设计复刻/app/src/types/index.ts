export interface User {
  id: string;
  name: string;
  email?: string;
  avatar: string;
  role?: string;
}

export interface Project {
  id: string;
  name: string;
  description: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  progress: number;
  assignees: User[];
  comments: number;
  links: number;
  dueDate?: string;
}

export interface Meeting {
  id: string;
  title: string;
  date: string;
  time: string;
  attendees: User[];
  comments: number;
  links: number;
}

export interface Activity {
  id: string;
  user: User;
  action: string;
  target: string;
  timestamp: string;
}

export interface MilestoneData {
  month: string;
  target: number;
  actual: number;
}

export interface Comment {
  id: string;
  user: User;
  content: string;
  timestamp: string;
  attachments?: Attachment[];
}

export interface Attachment {
  id: string;
  name: string;
  size: string;
  type: 'figma' | 'doc' | 'other';
}

export interface Task {
  id: string;
  name: string;
  assignees: User[];
  tags: string[];
  status: 'todo' | 'in-progress' | 'completed';
  dueDate: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  comments: Comment[];
  collaborators: User[];
}
