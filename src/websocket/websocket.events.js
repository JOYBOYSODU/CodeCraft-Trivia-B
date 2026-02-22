// =============================================================================
// FILE: src/websocket/websocket.events.js
// Event Emitters and Real-Time Triggers
// =============================================================================

const {
  logActivity,
  createNotification,
  broadcastToContest,
  broadcastLeaderboardUpdate,
  broadcastLevelUp,
  broadcastRankChange,
  broadcastContestStatusChange,
  broadcastProblemSolved,
  broadcastConnectionStatus
} = require('./websocket.server');

const db = require('../config/db');

/**
 * Handle player level up event
 * Called when player gains enough XP to level up
 */
const onPlayerLevelUp = async (io, playerId, oldLevel, newLevel, tierData) => {
  try {
    console.log(`🎉 Player ${playerId} leveled up! Old: ${oldLevel}, New: ${newLevel}`);

    // Log activity
    await logActivity(playerId, 'LEVEL_UP', {
      oldValue: { level: oldLevel },
      newValue: { level: newLevel, ...tierData }
    });

    // Broadcast level-up
    await broadcastLevelUp(io, playerId, {
      playerId,
      oldLevel,
      newLevel,
      tier: tierData.tier,
      subRank: tierData.subRank
    });

    // Update last_level_up_at
    await db.query(
      'UPDATE player SET last_level_up_at = NOW() WHERE id = ?',
      [playerId]
    );
  } catch (err) {
    console.error('Error handling level up:', err);
  }
};

/**
 * Handle player rank change in contest
 * Called when leaderboard is updated
 */
const onPlayerRankChanged = async (io, playerId, contestId, oldRank, newRank) => {
  try {
    if (oldRank === newRank) return; // No change

    console.log(`📈 Player ${playerId} rank changed: ${oldRank} → ${newRank}`);

    // Log activity
    await logActivity(playerId, 'RANK_CHANGED', {
      contestId,
      oldValue: { rank: oldRank },
      newValue: { rank: newRank }
    });

    // Broadcast rank change
    await broadcastRankChange(io, playerId, contestId, oldRank, newRank);

    // Update last_rank_change_at
    await db.query(
      'UPDATE player SET last_rank_change_at = NOW() WHERE id = ?',
      [playerId]
    );
  } catch (err) {
    console.error('Error handling rank change:', err);
  }
};

/**
 * Handle problem solved event
 * Called when submission verdict is ACCEPTED
 */
const onProblemSolved = async (io, playerId, problemId, contestId, points) => {
  try {
    console.log(`✅ Player ${playerId} solved problem ${problemId} (+${points} XP)`);

    // Log activity
    await logActivity(playerId, 'PROBLEM_SOLVED', {
      problemId,
      contestId,
      newValue: { points, difficulty: 'MEDIUM' } // Fetch from DB in real implementation
    });

    // Broadcast solve
    await broadcastProblemSolved(io, playerId, problemId, contestId, points);

    // Update contest leaderboard
    if (contestId) {
      await broadcastLeaderboardUpdate(io, contestId);
    }
  } catch (err) {
    console.error('Error handling problem solved:', err);
  }
};

/**
 * Handle contest status change
 * Called when contest.status changes
 */
const onContestStatusChanged = async (io, contestId, oldStatus, newStatus) => {
  try {
    console.log(`📊 Contest ${contestId} status: ${oldStatus} → ${newStatus}`);

    // Log activity
    await logActivity(null, 'CONTEST_STATUS_CHANGE', {
      contestId,
      oldValue: { status: oldStatus },
      newValue: { status: newStatus }
    });

    // Broadcast status change
    await broadcastContestStatusChange(io, contestId, oldStatus, newStatus);

    // Get all participants
    const [participants] = await db.query(
      'SELECT player_id FROM contest_participant WHERE contest_id = ?',
      [contestId]
    );

    // Create notifications for all participants
    const title = getContestStatusTitle(newStatus);
    const message = getContestStatusMessage(oldStatus, newStatus);

    for (const p of participants) {
      await createNotification(
        p.player_id,
        'CONTEST_START',
        title,
        message,
        { contestId, oldStatus, newStatus }
      );
    }
  } catch (err) {
    console.error('Error handling contest status change:', err);
  }
};

/**
 * Handle player tier upgrade
 * Called when player crosses into new tier
 */
const onPlayerTierUpgrade = async (io, playerId, oldTier, newTier) => {
  try {
    console.log(`⭐ Player ${playerId} upgraded tier: ${oldTier} → ${newTier}`);

    // Log activity
    await logActivity(playerId, 'TIER_UPGRADED', {
      oldValue: { tier: oldTier },
      newValue: { tier: newTier }
    });

    // Create notification
    await createNotification(
      playerId,
      'ACHIEVEMENT',
      `Tier Upgraded to ${newTier}!`,
      `You've achieved ${newTier} tier! Keep pushing!`,
      { oldTier, newTier }
    );

    // Broadcast to global
    io.emit('global:player-tier-upgrade', {
      playerId,
      oldTier,
      newTier,
      timestamp: new Date()
    });
  } catch (err) {
    console.error('Error handling tier upgrade:', err);
  }
};

/**
 * Handle player joining contest
 * Called when player joins a contest
 */
const onPlayerJoinedContest = async (io, playerId, contestId) => {
  try {
    console.log(`🎮 Player ${playerId} joined contest ${contestId}`);

    // Log activity
    await logActivity(playerId, 'CONTEST_JOINED', {
      contestId,
      newValue: { timestamp: new Date() }
    });

    // Update leaderboard
    await broadcastLeaderboardUpdate(io, contestId);

    // Notify all participants
    io.to(`contest:${contestId}`).emit('contest:player-joined', {
      playerId,
      contestId,
      timestamp: new Date()
    });
  } catch (err) {
    console.error('Error handling player joined:', err);
  }
};

/**
 * Handle contest finished event
 * Called when a contest reaches end_time
 */
const onContestFinished = async (io, contestId) => {
  try {
    console.log(`🏁 Contest ${contestId} finished`);

    // Get all participants
    const [participants] = await db.query(
      'SELECT player_id FROM contest_participant WHERE contest_id = ?',
      [contestId]
    );

    // Create notifications for all participants
    for (const p of participants) {
      await createNotification(
        p.player_id,
        'CONTEST_START',
        'Contest Ended!',
        'The contest has ended. Check your final rank!',
        { contestId }
      );
    }

    // Broadcast to contest room
    io.to(`contest:${contestId}`).emit('contest:finished', {
      contestId,
      message: 'Contest has ended',
      timestamp: new Date()
    });
  } catch (err) {
    console.error('Error handling contest finished:', err);
  }
};

/**
 * Handle global leaderboard update
 * Called periodically or on significant changes
 */
const onGlobalLeaderboardUpdate = async (io, limit = 10) => {
  try {
    const [leaderboard] = await db.query(`
      SELECT 
        p.id,
        u.name,
        u.profile_picture,
        p.level,
        p.tier,
        p.xp,
        p.global_rank,
        p.total_contests,
        p.total_wins
      FROM player p
      JOIN users u ON p.user_id = u.id
      ORDER BY p.xp DESC
      LIMIT ?
    `, [limit]);

    io.emit('global:leaderboard-update', {
      leaderboard,
      limit,
      timestamp: new Date()
    });
  } catch (err) {
    console.error('Error fetching global leaderboard:', err);
  }
};

/**
 * Handle achievement earned
 * Called when player achieves milestone
 */
const onAchievementEarned = async (io, playerId, achievementData) => {
  try {
    console.log(`🏆 Player ${playerId} earned achievement: ${achievementData.name}`);

    // Create notification
    await createNotification(
      playerId,
      'ACHIEVEMENT',
      `Achievement Unlocked! 🏆`,
      achievementData.description,
      achievementData
    );

    // Broadcast to player
    io.to(`player:${playerId}`).emit('player:achievement-earned', {
      playerId,
      achievement: achievementData,
      timestamp: new Date()
    });

    // Broadcast to global
    io.emit('global:achievement-earned', {
      playerId,
      achievement: achievementData,
      timestamp: new Date()
    });
  } catch (err) {
    console.error('Error handling achievement:', err);
  }
};

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/**
 * Get title for contest status message
 */
const getContestStatusTitle = (status) => {
  const titles = {
    'UPCOMING': '📅 Contest Starting Soon',
    'LIVE': '🚀 Contest is Live!',
    'ENDED': '🏁 Contest Ended',
    'CANCELLED': '❌ Contest Cancelled'
  };
  return titles[status] || 'Contest Update';
};

/**
 * Get description for contest status change
 */
const getContestStatusMessage = (oldStatus, newStatus) => {
  if (newStatus === 'LIVE') {
    return 'The contest is now live! Good luck to all participants.';
  } else if (newStatus === 'ENDED') {
    return 'The contest has ended. Check your final standings!';
  } else if (newStatus === 'CANCELLED') {
    return 'Unfortunately, this contest has been cancelled.';
  }
  return `Contest status changed to ${newStatus}`;
};

/**
 * Simulate real-time activity for testing
 */
const simulateActivity = async (io, type) => {
  const activities = {
    'level-up': async () => {
      await onPlayerLevelUp(io, 1, 10, 11, {
        tier: 'SILVER',
        subRank: 'Silver III'
      });
    },
    'problem-solved': async () => {
      await onProblemSolved(io, 1, 5, 1, 100);
    },
    'rank-change': async () => {
      await onPlayerRankChanged(io, 1, 1, 25, 20);
    },
    'contest-status': async () => {
      await onContestStatusChanged(io, 1, 'DRAFT', 'LIVE');
    },
    'achievement': async () => {
      await onAchievementEarned(io, 1, {
        name: 'Speed Demon',
        description: 'Solved 3 problems in 5 minutes',
        badge_url: '/assets/badges/speed-demon.png'
      });
    }
  };

  if (activities[type]) {
    await activities[type]();
    console.log(`📢 Simulated: ${type}`);
  }
};

// =============================================================================
// EXPORTS
// =============================================================================

module.exports = {
  // Event handlers
  onPlayerLevelUp,
  onPlayerRankChanged,
  onProblemSolved,
  onContestStatusChanged,
  onPlayerTierUpgrade,
  onPlayerJoinedContest,
  onContestFinished,
  onGlobalLeaderboardUpdate,
  onAchievementEarned,
  
  // Utilities
  simulateActivity,
  getContestStatusTitle,
  getContestStatusMessage
};
