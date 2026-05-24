/**
 * Voice & Video Call Integration Service
 * WebRTC-based voice and video calls for mentoring and trading rooms
 */

export interface VoiceVideoCall {
  id: string;
  initiatorId: string;
  recipientId: string;
  type: 'voice' | 'video' | 'screen-share';
  status: 'pending' | 'active' | 'ended' | 'rejected' | 'missed';
  startTime?: number;
  endTime?: number;
  duration: number;
  quality: 'low' | 'medium' | 'high';
  participants: CallParticipant[];
  recordingUrl?: string;
  isRecorded: boolean;
}

export interface CallParticipant {
  userId: string;
  username: string;
  joinedAt: number;
  leftAt?: number;
  isMuted: boolean;
  isVideoEnabled: boolean;
  isScreenSharing: boolean;
  connectionQuality: 'excellent' | 'good' | 'fair' | 'poor';
}

export interface CallRoom {
  id: string;
  hostId: string;
  name: string;
  type: 'mentoring' | 'trading-room' | 'support' | 'group-call';
  maxParticipants: number;
  currentParticipants: number;
  createdAt: number;
  startedAt?: number;
  endedAt?: number;
  status: 'scheduled' | 'active' | 'ended';
  participants: CallParticipant[];
  recordingUrl?: string;
  isRecorded: boolean;
  isPremium: boolean;
  price?: number;
}

export interface CallMetrics {
  callId: string;
  averageLatency: number;
  packetLoss: number;
  jitter: number;
  bandwidth: number;
  audioQuality: number;
  videoQuality: number;
  connectionStability: number;
}

export interface CallAnalytics {
  callId: string;
  totalCalls: number;
  totalDuration: number;
  averageCallDuration: number;
  missedCalls: number;
  rejectedCalls: number;
  averageQuality: string;
  lastCallTime: number;
}

class VoiceVideoCallService {
  private calls: Map<string, VoiceVideoCall> = new Map();
  private callRooms: Map<string, CallRoom> = new Map();
  private callMetrics: Map<string, CallMetrics> = new Map();
  private callAnalytics: Map<string, CallAnalytics> = new Map();
  private activeConnections: Map<string, any> = new Map();

  /**
   * Initiate call
   */
  initiateCall(
    initiatorId: string,
    recipientId: string,
    type: 'voice' | 'video' = 'video',
    quality: 'low' | 'medium' | 'high' = 'high'
  ): VoiceVideoCall {
    const callId = `call_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    const call: VoiceVideoCall = {
      id: callId,
      initiatorId,
      recipientId,
      type,
      status: 'pending',
      duration: 0,
      quality,
      participants: [
        {
          userId: initiatorId,
          username: `User_${initiatorId.slice(0, 8)}`,
          joinedAt: Date.now(),
          isMuted: false,
          isVideoEnabled: type === 'video',
          isScreenSharing: false,
          connectionQuality: 'excellent',
        },
      ],
      isRecorded: false,
    };

    this.calls.set(callId, call);

    // Initialize metrics
    this.callMetrics.set(callId, {
      callId,
      averageLatency: 0,
      packetLoss: 0,
      jitter: 0,
      bandwidth: 0,
      audioQuality: 100,
      videoQuality: 100,
      connectionStability: 100,
    });

    return call;
  }

  /**
   * Accept call
   */
  acceptCall(callId: string, recipientId: string): boolean {
    const call = this.calls.get(callId);
    if (!call || call.recipientId !== recipientId) return false;

    call.status = 'active';
    call.startTime = Date.now();

    // Add recipient as participant
    call.participants.push({
      userId: recipientId,
      username: `User_${recipientId.slice(0, 8)}`,
      joinedAt: Date.now(),
      isMuted: false,
      isVideoEnabled: call.type === 'video',
      isScreenSharing: false,
      connectionQuality: 'excellent',
    });

    return true;
  }

  /**
   * Reject call
   */
  rejectCall(callId: string, recipientId: string): boolean {
    const call = this.calls.get(callId);
    if (!call || call.recipientId !== recipientId) return false;

    call.status = 'rejected';
    call.endTime = Date.now();
    call.duration = 0;

    return true;
  }

  /**
   * End call
   */
  endCall(callId: string): boolean {
    const call = this.calls.get(callId);
    if (!call) return false;

    call.status = 'ended';
    call.endTime = Date.now();
    call.duration = call.startTime ? Date.now() - call.startTime : 0;

    // Update analytics
    this.updateCallAnalytics(call);

    return true;
  }

  /**
   * Toggle mute
   */
  toggleMute(callId: string, userId: string): boolean {
    const call = this.calls.get(callId);
    if (!call) return false;

    const participant = call.participants.find(p => p.userId === userId);
    if (!participant) return false;

    participant.isMuted = !participant.isMuted;
    return true;
  }

  /**
   * Toggle video
   */
  toggleVideo(callId: string, userId: string): boolean {
    const call = this.calls.get(callId);
    if (!call) return false;

    const participant = call.participants.find(p => p.userId === userId);
    if (!participant) return false;

    participant.isVideoEnabled = !participant.isVideoEnabled;
    return true;
  }

  /**
   * Start screen sharing
   */
  startScreenShare(callId: string, userId: string): boolean {
    const call = this.calls.get(callId);
    if (!call) return false;

    const participant = call.participants.find(p => p.userId === userId);
    if (!participant) return false;

    participant.isScreenSharing = true;
    return true;
  }

  /**
   * Stop screen sharing
   */
  stopScreenShare(callId: string, userId: string): boolean {
    const call = this.calls.get(callId);
    if (!call) return false;

    const participant = call.participants.find(p => p.userId === userId);
    if (!participant) return false;

    participant.isScreenSharing = false;
    return true;
  }

  /**
   * Create call room
   */
  createCallRoom(
    hostId: string,
    name: string,
    type: 'mentoring' | 'trading-room' | 'support' | 'group-call' = 'group-call',
    maxParticipants: number = 10,
    isPremium: boolean = false,
    price?: number
  ): CallRoom {
    const roomId = `room_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    const room: CallRoom = {
      id: roomId,
      hostId,
      name,
      type,
      maxParticipants,
      currentParticipants: 1, // Host
      createdAt: Date.now(),
      status: 'scheduled',
      participants: [
        {
          userId: hostId,
          username: `User_${hostId.slice(0, 8)}`,
          joinedAt: Date.now(),
          isMuted: false,
          isVideoEnabled: true,
          isScreenSharing: false,
          connectionQuality: 'excellent',
        },
      ],
      isRecorded: false,
      isPremium,
      price,
    };

    this.callRooms.set(roomId, room);

    return room;
  }

  /**
   * Start call room
   */
  startCallRoom(roomId: string): boolean {
    const room = this.callRooms.get(roomId);
    if (!room) return false;

    room.status = 'active';
    room.startedAt = Date.now();

    return true;
  }

  /**
   * End call room
   */
  endCallRoom(roomId: string, recordingUrl?: string): boolean {
    const room = this.callRooms.get(roomId);
    if (!room) return false;

    room.status = 'ended';
    room.endedAt = Date.now();
    room.recordingUrl = recordingUrl;
    room.isRecorded = !!recordingUrl;

    return true;
  }

  /**
   * Join call room
   */
  joinCallRoom(roomId: string, userId: string, username: string): boolean {
    const room = this.callRooms.get(roomId);
    if (!room || room.status !== 'active') return false;

    if (room.currentParticipants >= room.maxParticipants) return false;

    const participant: CallParticipant = {
      userId,
      username,
      joinedAt: Date.now(),
      isMuted: false,
      isVideoEnabled: true,
      isScreenSharing: false,
      connectionQuality: 'excellent',
    };

    room.participants.push(participant);
    room.currentParticipants += 1;

    return true;
  }

  /**
   * Leave call room
   */
  leaveCallRoom(roomId: string, userId: string): boolean {
    const room = this.callRooms.get(roomId);
    if (!room) return false;

    const index = room.participants.findIndex(p => p.userId === userId);
    if (index === -1) return false;

    const participant = room.participants[index];
    participant.leftAt = Date.now();

    room.currentParticipants = Math.max(0, room.currentParticipants - 1);

    return true;
  }

  /**
   * Get call
   */
  getCall(callId: string): VoiceVideoCall | undefined {
    return this.calls.get(callId);
  }

  /**
   * Get call room
   */
  getCallRoom(roomId: string): CallRoom | undefined {
    return this.callRooms.get(roomId);
  }

  /**
   * Get active calls
   */
  getActiveCalls(userId: string): VoiceVideoCall[] {
    return Array.from(this.calls.values()).filter(
      call =>
        (call.initiatorId === userId || call.recipientId === userId) &&
        call.status === 'active'
    );
  }

  /**
   * Get active call rooms
   */
  getActiveCallRooms(limit: number = 20): CallRoom[] {
    return Array.from(this.callRooms.values())
      .filter(room => room.status === 'active')
      .sort((a, b) => (b.startedAt || b.createdAt) - (a.startedAt || a.createdAt))
      .slice(0, limit);
  }

  /**
   * Update call metrics
   */
  updateCallMetrics(callId: string, metrics: Partial<CallMetrics>): boolean {
    const callMetrics = this.callMetrics.get(callId);
    if (!callMetrics) return false;

    Object.assign(callMetrics, metrics);
    return true;
  }

  /**
   * Get call metrics
   */
  getCallMetrics(callId: string): CallMetrics | undefined {
    return this.callMetrics.get(callId);
  }

  /**
   * Update call analytics
   */
  private updateCallAnalytics(call: VoiceVideoCall): void {
    const initiatorId = call.initiatorId;
    const recipientId = call.recipientId;

    for (const userId of [initiatorId, recipientId]) {
      if (!this.callAnalytics.has(userId)) {
        this.callAnalytics.set(userId, {
          callId: call.id,
          totalCalls: 0,
          totalDuration: 0,
          averageCallDuration: 0,
          missedCalls: 0,
          rejectedCalls: 0,
          averageQuality: 'good',
          lastCallTime: Date.now(),
        });
      }

      const analytics = this.callAnalytics.get(userId)!;
      analytics.totalCalls += 1;
      analytics.totalDuration += call.duration;
      analytics.averageCallDuration = analytics.totalDuration / analytics.totalCalls;

      if (call.status === 'missed') {
        analytics.missedCalls += 1;
      } else if (call.status === 'rejected') {
        analytics.rejectedCalls += 1;
      }

      analytics.lastCallTime = Date.now();
    }
  }

  /**
   * Get call analytics
   */
  getCallAnalytics(userId: string): CallAnalytics | undefined {
    return this.callAnalytics.get(userId);
  }

  /**
   * Record call
   */
  recordCall(callId: string, recordingUrl: string): boolean {
    const call = this.calls.get(callId);
    if (!call) return false;

    call.recordingUrl = recordingUrl;
    call.isRecorded = true;

    return true;
  }

  /**
   * Get call history
   */
  getCallHistory(userId: string, limit: number = 20): VoiceVideoCall[] {
    return Array.from(this.calls.values())
      .filter(call => call.initiatorId === userId || call.recipientId === userId)
      .sort((a, b) => (b.startTime || b.endTime || 0) - (a.startTime || a.endTime || 0))
      .slice(0, limit);
  }

  /**
   * Get connection quality
   */
  getConnectionQuality(callId: string): string {
    const metrics = this.callMetrics.get(callId);
    if (!metrics) return 'unknown';

    if (metrics.connectionStability > 95) return 'excellent';
    if (metrics.connectionStability > 80) return 'good';
    if (metrics.connectionStability > 60) return 'fair';
    return 'poor';
  }

  /**
   * Get featured call rooms
   */
  getFeaturedCallRooms(limit: number = 5): CallRoom[] {
    return this.getActiveCallRooms(limit);
  }
}

export const voiceVideoCallService = new VoiceVideoCallService();
