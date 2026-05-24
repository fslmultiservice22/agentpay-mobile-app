/**
 * Live Streaming & Video Trading Rooms Service
 * Video streaming, webinars, trading rooms with chat
 */

export interface LiveStream {
  id: string;
  userId: string;
  title: string;
  description: string;
  asset?: string;
  streamUrl: string;
  thumbnail: string;
  status: 'scheduled' | 'live' | 'ended';
  startTime: number;
  endTime?: number;
  viewers: number;
  maxViewers: number;
  likes: number;
  comments: number;
  isPremium: boolean;
  price?: number;
  recordingUrl?: string;
  isRecorded: boolean;
}

export interface TradingRoom {
  id: string;
  hostId: string;
  name: string;
  description: string;
  topic: string;
  maxParticipants: number;
  currentParticipants: number;
  streamUrl: string;
  chatEnabled: boolean;
  screenShareEnabled: boolean;
  recordingEnabled: boolean;
  createdAt: number;
  startedAt?: number;
  endedAt?: number;
  status: 'scheduled' | 'active' | 'ended';
  isPremium: boolean;
  price?: number;
}

export interface StreamChat {
  id: string;
  streamId: string;
  userId: string;
  username: string;
  message: string;
  timestamp: number;
  likes: number;
  isPinned: boolean;
  isModeratorMessage: boolean;
}

export interface StreamViewer {
  userId: string;
  username: string;
  joinedAt: number;
  duration: number;
  isActive: boolean;
  isPremium: boolean;
}

export interface StreamMetrics {
  streamId: string;
  totalViewers: number;
  peakViewers: number;
  averageWatchTime: number;
  totalWatchTime: number;
  engagementRate: number;
  likes: number;
  comments: number;
  shares: number;
}

class LiveStreamingService {
  private liveStreams: Map<string, LiveStream> = new Map();
  private tradingRooms: Map<string, TradingRoom> = new Map();
  private streamChats: Map<string, StreamChat[]> = new Map();
  private streamViewers: Map<string, StreamViewer[]> = new Map();
  private streamMetrics: Map<string, StreamMetrics> = new Map();

  /**
   * Create live stream
   */
  createLiveStream(
    userId: string,
    title: string,
    description: string,
    asset?: string,
    isPremium: boolean = false,
    price?: number
  ): LiveStream {
    const streamId = `stream_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    const stream: LiveStream = {
      id: streamId,
      userId,
      title,
      description,
      asset,
      streamUrl: `https://stream.agentpay.io/${streamId}`,
      thumbnail: `https://api.placeholder.com/320x180?text=${encodeURIComponent(title)}`,
      status: 'scheduled',
      startTime: Date.now() + 60 * 60 * 1000, // 1 hour from now
      viewers: 0,
      maxViewers: 1000,
      likes: 0,
      comments: 0,
      isPremium,
      price,
      isRecorded: false,
    };

    this.liveStreams.set(streamId, stream);
    this.streamChats.set(streamId, []);
    this.streamViewers.set(streamId, []);
    this.streamMetrics.set(streamId, {
      streamId,
      totalViewers: 0,
      peakViewers: 0,
      averageWatchTime: 0,
      totalWatchTime: 0,
      engagementRate: 0,
      likes: 0,
      comments: 0,
      shares: 0,
    });

    return stream;
  }

  /**
   * Start live stream
   */
  startLiveStream(streamId: string): boolean {
    const stream = this.liveStreams.get(streamId);
    if (!stream) return false;

    stream.status = 'live';
    stream.startTime = Date.now();

    return true;
  }

  /**
   * End live stream
   */
  endLiveStream(streamId: string, recordingUrl?: string): boolean {
    const stream = this.liveStreams.get(streamId);
    if (!stream) return false;

    stream.status = 'ended';
    stream.endTime = Date.now();
    stream.recordingUrl = recordingUrl;
    stream.isRecorded = !!recordingUrl;

    return true;
  }

  /**
   * Get live streams
   */
  getLiveStreams(status?: 'scheduled' | 'live' | 'ended', limit: number = 20): LiveStream[] {
    let streams = Array.from(this.liveStreams.values());

    if (status) {
      streams = streams.filter(s => s.status === status);
    }

    return streams
      .sort((a, b) => {
        if (a.status === 'live' && b.status !== 'live') return -1;
        if (a.status !== 'live' && b.status === 'live') return 1;
        return b.startTime - a.startTime;
      })
      .slice(0, limit);
  }

  /**
   * Add chat message
   */
  addChatMessage(streamId: string, userId: string, username: string, message: string): StreamChat {
    const chat: StreamChat = {
      id: `chat_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      streamId,
      userId,
      username,
      message,
      timestamp: Date.now(),
      likes: 0,
      isPinned: false,
      isModeratorMessage: false,
    };

    if (!this.streamChats.has(streamId)) {
      this.streamChats.set(streamId, []);
    }

    this.streamChats.get(streamId)!.push(chat);

    // Update stream comments
    const stream = this.liveStreams.get(streamId);
    if (stream) {
      stream.comments += 1;
    }

    return chat;
  }

  /**
   * Get chat messages
   */
  getChatMessages(streamId: string, limit: number = 50): StreamChat[] {
    const chats = this.streamChats.get(streamId) || [];
    return chats.slice(-limit);
  }

  /**
   * Join stream
   */
  joinStream(streamId: string, userId: string, username: string): boolean {
    const stream = this.liveStreams.get(streamId);
    if (!stream || stream.status !== 'live') return false;

    if (stream.viewers >= stream.maxViewers) return false;

    const viewer: StreamViewer = {
      userId,
      username,
      joinedAt: Date.now(),
      duration: 0,
      isActive: true,
      isPremium: false,
    };

    if (!this.streamViewers.has(streamId)) {
      this.streamViewers.set(streamId, []);
    }

    this.streamViewers.get(streamId)!.push(viewer);
    stream.viewers += 1;

    // Update metrics
    const metrics = this.streamMetrics.get(streamId);
    if (metrics) {
      metrics.totalViewers += 1;
      metrics.peakViewers = Math.max(metrics.peakViewers, stream.viewers);
    }

    return true;
  }

  /**
   * Leave stream
   */
  leaveStream(streamId: string, userId: string): boolean {
    const viewers = this.streamViewers.get(streamId);
    if (!viewers) return false;

    const viewerIndex = viewers.findIndex(v => v.userId === userId);
    if (viewerIndex === -1) return false;

    const viewer = viewers[viewerIndex];
    viewer.isActive = false;
    viewer.duration = Date.now() - viewer.joinedAt;

    const stream = this.liveStreams.get(streamId);
    if (stream) {
      stream.viewers = Math.max(0, stream.viewers - 1);
    }

    return true;
  }

  /**
   * Create trading room
   */
  createTradingRoom(
    hostId: string,
    name: string,
    description: string,
    topic: string,
    maxParticipants: number = 50,
    isPremium: boolean = false,
    price?: number
  ): TradingRoom {
    const roomId = `room_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    const room: TradingRoom = {
      id: roomId,
      hostId,
      name,
      description,
      topic,
      maxParticipants,
      currentParticipants: 1, // Host
      streamUrl: `https://stream.agentpay.io/room/${roomId}`,
      chatEnabled: true,
      screenShareEnabled: true,
      recordingEnabled: true,
      createdAt: Date.now(),
      status: 'scheduled',
      isPremium,
      price,
    };

    this.tradingRooms.set(roomId, room);
    this.streamChats.set(roomId, []);
    this.streamViewers.set(roomId, []);

    return room;
  }

  /**
   * Start trading room
   */
  startTradingRoom(roomId: string): boolean {
    const room = this.tradingRooms.get(roomId);
    if (!room) return false;

    room.status = 'active';
    room.startedAt = Date.now();

    return true;
  }

  /**
   * End trading room
   */
  endTradingRoom(roomId: string): boolean {
    const room = this.tradingRooms.get(roomId);
    if (!room) return false;

    room.status = 'ended';
    room.endedAt = Date.now();

    return true;
  }

  /**
   * Join trading room
   */
  joinTradingRoom(roomId: string, userId: string, username: string): boolean {
    const room = this.tradingRooms.get(roomId);
    if (!room || room.status !== 'active') return false;

    if (room.currentParticipants >= room.maxParticipants) return false;

    room.currentParticipants += 1;

    const viewer: StreamViewer = {
      userId,
      username,
      joinedAt: Date.now(),
      duration: 0,
      isActive: true,
      isPremium: false,
    };

    if (!this.streamViewers.has(roomId)) {
      this.streamViewers.set(roomId, []);
    }

    this.streamViewers.get(roomId)!.push(viewer);

    return true;
  }

  /**
   * Get trading rooms
   */
  getTradingRooms(status?: 'scheduled' | 'active' | 'ended', limit: number = 20): TradingRoom[] {
    let rooms = Array.from(this.tradingRooms.values());

    if (status) {
      rooms = rooms.filter(r => r.status === status);
    }

    return rooms
      .sort((a, b) => {
        if (a.status === 'active' && b.status !== 'active') return -1;
        if (a.status !== 'active' && b.status === 'active') return 1;
        return (b.startedAt || b.createdAt) - (a.startedAt || a.createdAt);
      })
      .slice(0, limit);
  }

  /**
   * Like stream
   */
  likeStream(streamId: string): boolean {
    const stream = this.liveStreams.get(streamId);
    if (!stream) return false;

    stream.likes += 1;

    const metrics = this.streamMetrics.get(streamId);
    if (metrics) {
      metrics.likes += 1;
    }

    return true;
  }

  /**
   * Get stream metrics
   */
  getStreamMetrics(streamId: string): StreamMetrics | undefined {
    return this.streamMetrics.get(streamId);
  }

  /**
   * Get featured streams
   */
  getFeaturedStreams(limit: number = 5): LiveStream[] {
    return this.getLiveStreams('live', limit);
  }

  /**
   * Get stream viewers
   */
  getStreamViewers(streamId: string): StreamViewer[] {
    return this.streamViewers.get(streamId) || [];
  }

  /**
   * Pin chat message
   */
  pinChatMessage(streamId: string, chatId: string): boolean {
    const chats = this.streamChats.get(streamId);
    if (!chats) return false;

    const chat = chats.find(c => c.id === chatId);
    if (!chat) return false;

    chat.isPinned = true;
    return true;
  }

  /**
   * Get stream statistics
   */
  getStreamStatistics(userId: string): {
    totalStreams: number;
    liveStreams: number;
    totalViewers: number;
    totalWatchTime: number;
    averageViewers: number;
  } {
    const userStreams = Array.from(this.liveStreams.values()).filter(s => s.userId === userId);

    let totalViewers = 0;
    let totalWatchTime = 0;

    for (const stream of userStreams) {
      const metrics = this.streamMetrics.get(stream.id);
      if (metrics) {
        totalViewers += metrics.totalViewers;
        totalWatchTime += metrics.totalWatchTime;
      }
    }

    const liveStreams = userStreams.filter(s => s.status === 'live').length;

    return {
      totalStreams: userStreams.length,
      liveStreams,
      totalViewers,
      totalWatchTime,
      averageViewers: userStreams.length > 0 ? totalViewers / userStreams.length : 0,
    };
  }
}

export const liveStreamingService = new LiveStreamingService();
