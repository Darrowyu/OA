import type { User, Project, Meeting, Activity, MilestoneData, Task, Comment } from '@/types';

export const currentUser: User = {
  id: '1',
  name: '张经理',
  email: 'zhang@company.com',
  avatar: '/avatars/sarah.jpg',
};

export const users: User[] = [
  currentUser,
  {
    id: '2',
    name: '李总监',
    avatar: '/avatars/jerome.jpg',
    role: '技术总监',
  },
  {
    id: '3',
    name: '王设计师',
    avatar: '/avatars/brooklyn.jpg',
    role: 'UI设计师',
  },
  {
    id: '4',
    name: '陈经理',
    avatar: '/avatars/cameron.jpg',
    role: '项目经理',
  },
  {
    id: '5',
    name: '刘工程师',
    avatar: '/avatars/robert.jpg',
    role: '前端开发',
  },
  {
    id: '6',
    name: '赵小美',
    avatar: '/avatars/kiara.jpg',
    role: '产品经理',
  },
  {
    id: '7',
    name: '周开发',
    avatar: '/avatars/joe-tesla.jpg',
    role: '后端开发',
  },
  {
    id: '8',
    name: '孙测试',
    avatar: '/avatars/tania.jpg',
    role: '测试工程师',
  },
  {
    id: '9',
    name: '吴助理',
    avatar: '/avatars/jane.jpg',
    role: '行政助理',
  },
  {
    id: '10',
    name: '郑主管',
    avatar: '/avatars/joe-doe.jpg',
    role: '部门主管',
  },
];

export const statsData = {
  totalProjects: { value: 24, label: '进行中项目' },
  totalTasks: { value: 156, label: '待办任务' },
  inProgress: { value: 18, label: '审批中' },
  completed: { value: 89, label: '本月已完成' },
};

export const quickActions = [
  { id: '1', name: '发起审批', icon: 'FileCheck', color: 'bg-blue-100 text-blue-600' },
  { id: '2', name: '提交报销', icon: 'Receipt', color: 'bg-green-100 text-green-600' },
  { id: '3', name: '申请请假', icon: 'Calendar', color: 'bg-amber-100 text-amber-600' },
  { id: '4', name: '预约会议', icon: 'Users', color: 'bg-purple-100 text-purple-600' },
];

export const activityMapData = [
  {
    id: '1',
    name: '产品评审',
    task: '新版APP需求评审',
    progress: 80,
    startTime: '09:30',
    duration: 90,
    color: 'bg-emerald-500',
    assignees: [users[5], users[1]],
  },
  {
    id: '2',
    name: '开发冲刺',
    task: 'Sprint 24 开发',
    progress: 65,
    startTime: '10:00',
    duration: 120,
    color: 'bg-orange-500',
    assignees: [users[4], users[6]],
  },
  {
    id: '3',
    name: 'UI设计',
    task: '后台管理界面设计',
    progress: 45,
    startTime: '13:00',
    duration: 90,
    color: 'bg-purple-500',
    assignees: [users[2], users[3]],
  },
  {
    id: '4',
    name: '周例会',
    task: '技术部周会',
    progress: 0,
    startTime: '15:00',
    duration: 60,
    color: 'bg-blue-500',
    assignees: [users[1], users[2]],
  },
];

export const teamMembers = [
  users[1], // 李总监
  users[2], // 王设计师
  users[3], // 陈经理
  users[4], // 刘工程师
];

export const upcomingMeetings: Meeting[] = [
  {
    id: '1',
    title: '产品需求评审会',
    date: '今天',
    time: '14:00',
    attendees: [users[1], users[2], users[5]],
    comments: 8,
    links: 2,
  },
  {
    id: '2',
    title: '月度总结会议',
    date: '明天',
    time: '09:30',
    attendees: [users[3], users[4], users[9]],
    comments: 3,
    links: 1,
  },
];

export const todayProjects: Project[] = [
  {
    id: '1',
    name: 'OA系统功能优化',
    description: '优化审批流程，提升用户体验',
    priority: 'high',
    progress: 70,
    assignees: [users[5], users[6]],
    comments: 12,
    links: 3,
  },
  {
    id: '2',
    name: '移动端适配开发',
    description: '完成后台管理系统的移动端响应式适配',
    priority: 'urgent',
    progress: 55,
    assignees: [users[6], users[7]],
    comments: 8,
    links: 2,
  },
];

export const milestoneData: MilestoneData[] = [
  { month: '1月', target: 35, actual: 32 },
  { month: '2月', target: 42, actual: 38 },
  { month: '3月', target: 48, actual: 45 },
  { month: '4月', target: 55, actual: 52 },
  { month: '5月', target: 62, actual: 58 },
  { month: '6月', target: 70, actual: 65 },
];

export const activities: Activity[] = [
  {
    id: '1',
    user: users[9], // 郑主管
    action: '审批通过了',
    target: '李总监的出差申请',
    timestamp: '10分钟前',
  },
  {
    id: '2',
    user: users[8], // 吴助理
    action: '发布了公告',
    target: '关于春节放假安排的通知',
    timestamp: '30分钟前',
  },
  {
    id: '3',
    user: users[4], // 刘工程师
    action: '完成了任务',
    target: '用户登录模块开发',
    timestamp: '1小时前',
  },
];

export const taskComments: Comment[] = [
  {
    id: '1',
    user: users[5], // 赵小美
    content: '这个需求需要再确认一下，@李总监 麻烦看一下',
    timestamp: '2小时前',
    attachments: [
      { id: '1', name: '需求文档v2.0.docx', size: '2.5 MB', type: 'doc' },
    ],
  },
  {
    id: '2',
    user: users[1], // 李总监
    content: '已确认，可以按这个方案进行开发',
    timestamp: '1小时前',
  },
];

export const sampleTask: Task = {
  id: '1',
  name: 'OA系统功能优化',
  assignees: [users[5], users[6], users[7]], // 赵小美、周开发、孙测试
  tags: ['OA系统', '功能优化'],
  status: 'in-progress',
  dueDate: '2024年2月15日',
  priority: 'high',
  comments: taskComments,
  collaborators: [users[5], users[6], users[7]],
};

export const sidebarNavigation = {
  main: [
    { id: 'dashboard', name: '工作台', icon: 'LayoutDashboard', href: '#', active: true },
    { id: 'approval', name: '审批中心', icon: 'FileCheck', href: '#', badge: 8 },
    { id: 'attendance', name: '考勤管理', icon: 'Clock', href: '#' },
    { id: 'schedule', name: '日程管理', icon: 'Calendar', href: '#' },
    { id: 'documents', name: '文档中心', icon: 'FolderOpen', href: '#' },
    { id: 'contacts', name: '通讯录', icon: 'Users', href: '#' },
    { id: 'notice', name: '公告通知', icon: 'Bell', href: '#' },
  ],
  favourites: [
    { id: 'fav1', name: '我的审批', icon: 'FileCheck', href: '#' },
    { id: 'fav2', name: '报销申请', icon: 'Receipt', href: '#' },
    { id: 'fav3', name: '请假申请', icon: 'Calendar', href: '#' },
  ],
};

// 审批数据
export const approvalData = {
  pending: [
    { id: '1', title: '出差申请', applicant: '李总监', date: '2024-02-05', status: 'pending' },
    { id: '2', title: '费用报销', applicant: '王设计师', date: '2024-02-04', status: 'pending' },
    { id: '3', title: '请假申请', applicant: '刘工程师', date: '2024-02-04', status: 'pending' },
  ],
  approved: [
    { id: '4', title: '采购申请', applicant: '陈经理', date: '2024-02-03', status: 'approved' },
    { id: '5', title: '加班申请', applicant: '周开发', date: '2024-02-02', status: 'approved' },
  ],
};

// 考勤数据
export const attendanceData = {
  today: {
    checkIn: '08:55',
    checkOut: '--:--',
    status: 'normal',
  },
  monthly: {
    normal: 18,
    late: 1,
    early: 0,
    absent: 0,
    leave: 2,
  },
};

// 公告数据
export const notices = [
  {
    id: '1',
    title: '关于春节放假安排的通知',
    author: '行政部',
    date: '2024-02-01',
    priority: 'high',
  },
  {
    id: '2',
    title: '新员工入职培训通知',
    author: '人力资源部',
    date: '2024-02-03',
    priority: 'normal',
  },
  {
    id: '3',
    title: '办公系统升级维护公告',
    author: 'IT部门',
    date: '2024-02-04',
    priority: 'normal',
  },
];
