// High performance in-memory mock store fallback for immediate plug-and-play local dev experience

const mockUsers = [
  {
    _id: 'usr_alex',
    id: 'usr_alex',
    name: 'Alex Morgan',
    email: 'alex@collabspace.io',
    role: 'Admin',
    avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150',
    bio: 'Product Designer & Team Lead',
    status: 'online'
  },
  {
    _id: 'usr_sarah',
    id: 'usr_sarah',
    name: 'Sarah Chen',
    email: 'sarah@collabspace.io',
    role: 'Manager',
    avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150',
    bio: 'Senior Full Stack Engineer',
    status: 'online'
  },
  {
    _id: 'usr_david',
    id: 'usr_david',
    name: 'David Kim',
    email: 'david@collabspace.io',
    role: 'Member',
    avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150',
    bio: 'DevOps & Backend Engineer',
    status: 'away'
  }
];

const mockWorkspaces = [
  {
    _id: 'ws_alpha',
    id: 'ws_alpha',
    name: 'Acme SaaS Corp',
    slug: 'acme-saas',
    logo: '⚡',
    owner: 'usr_alex',
    members: [
      { user: mockUsers[0], role: 'Owner', joinedAt: new Date() },
      { user: mockUsers[1], role: 'Admin', joinedAt: new Date() },
      { user: mockUsers[2], role: 'Member', joinedAt: new Date() }
    ]
  }
];

const mockProjects = [
  {
    _id: 'proj_collab',
    id: 'proj_collab',
    workspace: 'ws_alpha',
    name: 'CollabSpace v2 Launch',
    key: 'COL',
    description: 'Next-generation team productivity workspace redesign.',
    color: '#6366f1',
    status: 'Active',
    lead: mockUsers[0],
    members: mockUsers
  },
  {
    _id: 'proj_design',
    id: 'proj_design',
    workspace: 'ws_alpha',
    name: 'Design System & UI Kit',
    key: 'DS',
    description: 'Component library modernization using Tailwind CSS.',
    color: '#ec4899',
    status: 'Active',
    lead: mockUsers[1],
    members: [mockUsers[0], mockUsers[1]]
  }
];

const mockBoards = [
  {
    _id: 'board_collab_1',
    id: 'board_collab_1',
    project: 'proj_collab',
    title: 'Sprint Board',
    columns: [
      { id: 'backlog', title: 'Backlog', color: '#64748b', order: 0 },
      { id: 'todo', title: 'To Do', color: '#3b82f6', order: 1 },
      { id: 'in_progress', title: 'In Progress', color: '#f59e0b', order: 2 },
      { id: 'review', title: 'Code Review', color: '#8b5cf6', order: 3 },
      { id: 'done', title: 'Done', color: '#10b981', order: 4 }
    ]
  }
];

const mockTasks = [
  {
    _id: 'task_101',
    id: 'task_101',
    board: 'board_collab_1',
    columnId: 'in_progress',
    title: 'Implement JWT Auth & Refresh Tokens',
    description: 'Set up secure HTTP-only cookie handling and token rotation middleware on Express API.',
    priority: 'High',
    assignees: [mockUsers[0]],
    dueDate: '2026-07-28',
    tags: ['Security', 'Backend'],
    order: 0,
    subtasks: [
      { title: 'Write token generator logic', completed: true },
      { title: 'Add auth middleware', completed: true },
      { title: 'Implement refresh endpoint', completed: false }
    ],
    comments: [
      { id: 'c1', author: mockUsers[1], content: 'Token expiration set to 15m access / 7d refresh!', createdAt: new Date() }
    ]
  },
  {
    _id: 'task_102',
    id: 'task_102',
    board: 'board_collab_1',
    columnId: 'todo',
    title: 'Kanban Drag-and-Drop integration',
    description: 'Use dnd-kit with smooth animation and optimistic state updates for column reordering.',
    priority: 'Urgent',
    assignees: [mockUsers[1]],
    dueDate: '2026-07-30',
    tags: ['Frontend', 'UI/UX'],
    order: 0,
    subtasks: [],
    comments: []
  },
  {
    _id: 'task_103',
    id: 'task_103',
    board: 'board_collab_1',
    columnId: 'review',
    title: 'TipTap Rich Text Editor for Documents',
    description: 'Build collaborative document editor with formatting toolbar and real-time auto-saving.',
    priority: 'Medium',
    assignees: [mockUsers[2]],
    dueDate: '2026-07-26',
    tags: ['Feature', 'Docs'],
    order: 0,
    subtasks: [],
    comments: []
  },
  {
    _id: 'task_104',
    id: 'task_104',
    board: 'board_collab_1',
    columnId: 'done',
    title: 'Project Architecture & Monorepo Setup',
    description: 'Setup client (Next.js) and server (Express/Socket.IO) codebase.',
    priority: 'High',
    assignees: [mockUsers[0], mockUsers[1]],
    dueDate: '2026-07-22',
    tags: ['Setup', 'Core'],
    order: 0,
    subtasks: [],
    comments: []
  }
];

const mockChannels = [
  { _id: 'chan_general', id: 'chan_general', workspace: 'ws_alpha', name: 'general', topic: 'Company-wide announcements & general discussions', isDirect: false, members: mockUsers },
  { _id: 'chan_engineering', id: 'chan_engineering', workspace: 'ws_alpha', name: 'engineering', topic: 'Tech stack, code reviews & architecture', isDirect: false, members: mockUsers },
  { _id: 'chan_random', id: 'chan_random', workspace: 'ws_alpha', name: 'random', topic: 'Watercooler chit-chat and fun links', isDirect: false, members: mockUsers }
];

const mockMessages = [
  {
    _id: 'msg_1',
    id: 'msg_1',
    channel: 'chan_general',
    sender: mockUsers[0],
    content: 'Welcome everyone to the new CollabSpace platform! Let us know if you encounter any bugs.',
    createdAt: new Date(Date.now() - 3600000),
    reactions: [{ emoji: '🚀', users: ['usr_sarah', 'usr_david'] }]
  },
  {
    _id: 'msg_2',
    id: 'msg_2',
    channel: 'chan_general',
    sender: mockUsers[1],
    content: 'The drag-and-drop Kanban board is looking super smooth! Great work on the socket events.',
    createdAt: new Date(Date.now() - 1800000),
    reactions: [{ emoji: '🔥', users: ['usr_alex'] }]
  }
];

const mockDocuments = [
  {
    _id: 'doc_1',
    id: 'doc_1',
    workspace: 'ws_alpha',
    title: 'Product Roadmap Q3 2026',
    content: `<h2>🚀 Product Roadmap Q3 2026</h2><p>Here is our key feature focus for the upcoming quarter:</p><ul><li><strong>Real-time Kanban Drag & Drop</strong> - Sub-millisecond synchronization.</li><li><strong>Collaborative TipTap Docs</strong> - Multi-user document authoring.</li><li><strong>Integrated Video Call Rooms</strong> - Instant Jitsi/WebRTC room generation.</li></ul>`,
    author: mockUsers[0],
    collaborators: mockUsers,
    tags: ['Roadmap', 'Planning'],
    updatedAt: new Date()
  },
  {
    _id: 'doc_2',
    id: 'doc_2',
    workspace: 'ws_alpha',
    title: 'API Guidelines & Security Standards',
    content: `<h2>🔒 Security & API Specs</h2><p>All endpoints must implement standard JWT token verification, RBAC authorization, and input validation.</p>`,
    author: mockUsers[1],
    collaborators: [mockUsers[1]],
    tags: ['Security', 'Dev'],
    updatedAt: new Date(Date.now() - 86400000)
  }
];

const mockFiles = [
  {
    _id: 'file_1',
    id: 'file_1',
    workspace: 'ws_alpha',
    name: 'CollabSpace_Architecture_Diagram.png',
    size: 2450000,
    mimeType: 'image/png',
    url: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=800',
    uploadedBy: mockUsers[0],
    category: 'Image',
    createdAt: new Date()
  },
  {
    _id: 'file_2',
    id: 'file_2',
    workspace: 'ws_alpha',
    name: 'Sprint_3_Metrics_Report.pdf',
    size: 1120000,
    mimeType: 'application/pdf',
    url: '#',
    uploadedBy: mockUsers[1],
    category: 'Document',
    createdAt: new Date()
  }
];

const mockMeetings = [
  {
    _id: 'meet_1',
    id: 'meet_1',
    workspace: 'ws_alpha',
    title: 'Daily Engineering Standup',
    scheduledAt: new Date(Date.now() + 14400000),
    durationMinutes: 30,
    host: mockUsers[0],
    attendees: mockUsers,
    roomUrl: 'https://meet.jit.si/CollabSpace-Standup-2026',
    status: 'Scheduled'
  }
];

const mockActivities = [
  {
    _id: 'act_1',
    id: 'act_1',
    workspace: 'ws_alpha',
    user: mockUsers[0],
    action: 'created task',
    targetType: 'Task',
    targetTitle: 'Implement JWT Auth & Refresh Tokens',
    createdAt: new Date(Date.now() - 100000)
  },
  {
    _id: 'act_2',
    id: 'act_2',
    workspace: 'ws_alpha',
    user: mockUsers[1],
    action: 'moved task',
    targetType: 'Task',
    targetTitle: 'Kanban Drag-and-Drop integration',
    createdAt: new Date(Date.now() - 50000)
  }
];

module.exports = {
  users: mockUsers,
  workspaces: mockWorkspaces,
  projects: mockProjects,
  boards: mockBoards,
  tasks: mockTasks,
  channels: mockChannels,
  messages: mockMessages,
  documents: mockDocuments,
  files: mockFiles,
  meetings: mockMeetings,
  activities: mockActivities
};
