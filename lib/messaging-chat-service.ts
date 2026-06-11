/**
 * In-App Messaging & Chat System Service
 * Direct messaging, group chat, community forums
 */

export interface DirectMessage {
  id: string;
  senderId: string;
  senderUsername: string;
  recipientId: string;
  recipientUsername: string;
  content: string;
  timestamp: number;
  isRead: boolean;
  readAt?: number;
  attachments?: string[];
  editedAt?: number;
}

export interface GroupChat {
  id: string;
  name: string;
  description: string;
  creatorId: string;
  members: Set<string>;
  admins: Set<string>;
  createdAt: number;
  updatedAt: number;
  isPrivate: boolean;
  profilePicture?: string;
  maxMembers?: number;
}

export interface GroupMessage {
  id: string;
  groupId: string;
  senderId: string;
  senderUsername: string;
  content: string;
  timestamp: number;
  reactions: Map<string, Set<string>>;
  replies: GroupMessage[];
  attachments?: string[];
  editedAt?: number;
  isPinned: boolean;
}

export interface CommunityForum {
  id: string;
  name: string;
  description: string;
  category: string;
  creatorId: string;
  createdAt: number;
  updatedAt: number;
  memberCount: number;
  postCount: number;
  rules?: string;
  moderators: Set<string>;
}

export interface ForumPost {
  id: string;
  forumId: string;
  authorId: string;
  authorUsername: string;
  title: string;
  content: string;
  timestamp: number;
  upvotes: number;
  downvotes: number;
  replies: ForumReply[];
  tags: string[];
  isPinned: boolean;
  isLocked: boolean;
  editedAt?: number;
}

export interface ForumReply {
  id: string;
  postId: string;
  authorId: string;
  authorUsername: string;
  content: string;
  timestamp: number;
  upvotes: number;
  downvotes: number;
  editedAt?: number;
}

export interface ChatNotification {
  id: string;
  userId: string;
  type: 'direct_message' | 'group_message' | 'forum_reply' | 'mention';
  senderId: string;
  senderUsername: string;
  content: string;
  timestamp: number;
  isRead: boolean;
  sourceId: string;
}

class MessagingChatService {
  private directMessages: Map<string, DirectMessage> = new Map();
  private groupChats: Map<string, GroupChat> = new Map();
  private groupMessages: Map<string, GroupMessage> = new Map();
  private forums: Map<string, CommunityForum> = new Map();
  private forumPosts: Map<string, ForumPost> = new Map();
  private notifications: Map<string, ChatNotification> = new Map();
  private blockedUsers: Map<string, Set<string>> = new Map();

  /**
   * Send direct message
   */
  sendDirectMessage(
    senderId: string,
    senderUsername: string,
    recipientId: string,
    recipientUsername: string,
    content: string,
    attachments?: string[]
  ): DirectMessage | null {
    // Check if blocked
    const senderBlocked = this.blockedUsers.get(senderId) || new Set();
    const recipientBlocked = this.blockedUsers.get(recipientId) || new Set();

    if (senderBlocked.has(recipientId) || recipientBlocked.has(senderId)) {
      return null;
    }

    const messageId = `msg_${Date.now()}`;

    const message: DirectMessage = {
      id: messageId,
      senderId,
      senderUsername,
      recipientId,
      recipientUsername,
      content,
      timestamp: Date.now(),
      isRead: false,
      attachments,
    };

    this.directMessages.set(messageId, message);

    // Create notification
    this.createNotification(recipientId, 'direct_message', senderId, senderUsername, content, messageId);

    return message;
  }

  /**
   * Mark message as read
   */
  markMessageAsRead(messageId: string): boolean {
    const message = this.directMessages.get(messageId);
    if (!message) return false;

    message.isRead = true;
    message.readAt = Date.now();

    return true;
  }

  /**
   * Get direct messages between users
   */
  getDirectMessages(userId1: string, userId2: string, limit: number = 50): DirectMessage[] {
    const messages = Array.from(this.directMessages.values()).filter(
      msg =>
        (msg.senderId === userId1 && msg.recipientId === userId2) ||
        (msg.senderId === userId2 && msg.recipientId === userId1)
    );

    messages.sort((a, b) => b.timestamp - a.timestamp);

    return messages.slice(0, limit);
  }

  /**
   * Create group chat
   */
  createGroupChat(
    name: string,
    description: string,
    creatorId: string,
    members: string[],
    isPrivate: boolean = false,
    profilePicture?: string
  ): GroupChat {
    const groupId = `group_${Date.now()}`;

    const memberSet = new Set(members);
    memberSet.add(creatorId);

    const group: GroupChat = {
      id: groupId,
      name,
      description,
      creatorId,
      members: memberSet,
      admins: new Set([creatorId]),
      createdAt: Date.now(),
      updatedAt: Date.now(),
      isPrivate,
      profilePicture,
    };

    this.groupChats.set(groupId, group);

    return group;
  }

  /**
   * Send group message
   */
  sendGroupMessage(
    groupId: string,
    senderId: string,
    senderUsername: string,
    content: string,
    attachments?: string[]
  ): GroupMessage | null {
    const group = this.groupChats.get(groupId);
    if (!group || !group.members.has(senderId)) return null;

    const messageId = `gmsg_${Date.now()}`;

    const message: GroupMessage = {
      id: messageId,
      groupId,
      senderId,
      senderUsername,
      content,
      timestamp: Date.now(),
      reactions: new Map(),
      replies: [],
      attachments,
      isPinned: false,
    };

    this.groupMessages.set(messageId, message);

    // Notify all members
    group.members.forEach(memberId => {
      if (memberId !== senderId) {
        this.createNotification(memberId, 'group_message', senderId, senderUsername, content, groupId);
      }
    });

    return message;
  }

  /**
   * Add reaction to message
   */
  addReactionToMessage(messageId: string, userId: string, emoji: string): boolean {
    const message = this.groupMessages.get(messageId);
    if (!message) return false;

    const reactions = message.reactions.get(emoji) || new Set();
    reactions.add(userId);
    message.reactions.set(emoji, reactions);

    return true;
  }

  /**
   * Create community forum
   */
  createCommunityForum(
    name: string,
    description: string,
    category: string,
    creatorId: string,
    rules?: string
  ): CommunityForum {
    const forumId = `forum_${Date.now()}`;

    const forum: CommunityForum = {
      id: forumId,
      name,
      description,
      category,
      creatorId,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      memberCount: 1,
      postCount: 0,
      rules,
      moderators: new Set([creatorId]),
    };

    this.forums.set(forumId, forum);

    return forum;
  }

  /**
   * Create forum post
   */
  createForumPost(
    forumId: string,
    authorId: string,
    authorUsername: string,
    title: string,
    content: string,
    tags: string[] = []
  ): ForumPost | null {
    const forum = this.forums.get(forumId);
    if (!forum) return null;

    const postId = `post_${Date.now()}`;

    const post: ForumPost = {
      id: postId,
      forumId,
      authorId,
      authorUsername,
      title,
      content,
      timestamp: Date.now(),
      upvotes: 0,
      downvotes: 0,
      replies: [],
      tags,
      isPinned: false,
      isLocked: false,
    };

    this.forumPosts.set(postId, post);

    forum.postCount++;
    forum.updatedAt = Date.now();

    return post;
  }

  /**
   * Reply to forum post
   */
  replyToForumPost(
    postId: string,
    authorId: string,
    authorUsername: string,
    content: string
  ): ForumReply | null {
    const post = this.forumPosts.get(postId);
    if (!post) return null;

    const replyId = `reply_${Date.now()}`;

    const reply: ForumReply = {
      id: replyId,
      postId,
      authorId,
      authorUsername,
      content,
      timestamp: Date.now(),
      upvotes: 0,
      downvotes: 0,
    };

    post.replies.push(reply);

    // Notify post author
    if (post.authorId !== authorId) {
      this.createNotification(post.authorId, 'forum_reply', authorId, authorUsername, content, postId);
    }

    return reply;
  }

  /**
   * Upvote forum post
   */
  upvoteForumPost(postId: string): boolean {
    const post = this.forumPosts.get(postId);
    if (!post) return false;

    post.upvotes++;

    return true;
  }

  /**
   * Downvote forum post
   */
  downvoteForumPost(postId: string): boolean {
    const post = this.forumPosts.get(postId);
    if (!post) return false;

    post.downvotes++;

    return true;
  }

  /**
   * Pin forum post
   */
  pinForumPost(postId: string): boolean {
    const post = this.forumPosts.get(postId);
    if (!post) return false;

    post.isPinned = true;

    return true;
  }

  /**
   * Lock forum post
   */
  lockForumPost(postId: string): boolean {
    const post = this.forumPosts.get(postId);
    if (!post) return false;

    post.isLocked = true;

    return true;
  }

  /**
   * Get forum posts
   */
  getForumPosts(forumId: string, limit: number = 50): ForumPost[] {
    const posts = Array.from(this.forumPosts.values()).filter(post => post.forumId === forumId);

    // Sort by pinned first, then by timestamp
    posts.sort((a, b) => {
      if (a.isPinned !== b.isPinned) {
        return a.isPinned ? -1 : 1;
      }

      return b.timestamp - a.timestamp;
    });

    return posts.slice(0, limit);
  }

  /**
   * Search forum posts
   */
  searchForumPosts(query: string, forumId?: string, limit: number = 20): ForumPost[] {
    const lowerQuery = query.toLowerCase();

    let posts = Array.from(this.forumPosts.values()).filter(
      post =>
        (forumId ? post.forumId === forumId : true) &&
        (post.title.toLowerCase().includes(lowerQuery) || post.content.toLowerCase().includes(lowerQuery))
    );

    // Sort by relevance (upvotes)
    posts.sort((a, b) => b.upvotes - a.upvotes);

    return posts.slice(0, limit);
  }

  /**
   * Create notification
   */
  private createNotification(
    userId: string,
    type: ChatNotification['type'],
    senderId: string,
    senderUsername: string,
    content: string,
    sourceId: string
  ): ChatNotification {
    const notificationId = `notif_${Date.now()}`;

    const notification: ChatNotification = {
      id: notificationId,
      userId,
      type,
      senderId,
      senderUsername,
      content,
      timestamp: Date.now(),
      isRead: false,
      sourceId,
    };

    this.notifications.set(notificationId, notification);

    return notification;
  }

  /**
   * Get user notifications
   */
  getUserNotifications(userId: string, limit: number = 50): ChatNotification[] {
    const notifications = Array.from(this.notifications.values()).filter(n => n.userId === userId);

    notifications.sort((a, b) => b.timestamp - a.timestamp);

    return notifications.slice(0, limit);
  }

  /**
   * Mark notification as read
   */
  markNotificationAsRead(notificationId: string): boolean {
    const notification = this.notifications.get(notificationId);
    if (!notification) return false;

    notification.isRead = true;

    return true;
  }

  /**
   * Block user
   */
  blockUser(userId: string, blockId: string): boolean {
    const blocked = this.blockedUsers.get(userId) || new Set();
    blocked.add(blockId);
    this.blockedUsers.set(userId, blocked);

    return true;
  }

  /**
   * Unblock user
   */
  unblockUser(userId: string, blockId: string): boolean {
    const blocked = this.blockedUsers.get(userId);
    if (!blocked) return false;

    blocked.delete(blockId);

    return true;
  }

  /**
   * Get group chat
   */
  getGroupChat(groupId: string): GroupChat | undefined {
    return this.groupChats.get(groupId);
  }

  /**
   * Get group messages
   */
  getGroupMessages(groupId: string, limit: number = 50): GroupMessage[] {
    const messages = Array.from(this.groupMessages.values()).filter(msg => msg.groupId === groupId);

    messages.sort((a, b) => b.timestamp - a.timestamp);

    return messages.slice(0, limit);
  }
}

export const messagingChatService = new MessagingChatService();
