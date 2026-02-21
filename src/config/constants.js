module.exports = {
    POINTS: {
        EASY: 100,
        MEDIUM: 200,
        HARD: 400
    },
    XP: {
        CONTEST_JOIN: 50,
        SOLVE_EASY: 75,
        SOLVE_MEDIUM: 150,
        SOLVE_HARD: 300,
        SPEED_BONUS: 50,
        RANK_BONUS: [500, 400, 300, 200, 100] // top 5
    },
    MODE_WEIGHTS: {
        PRECISION: { accuracy: 0.60, raw: 0.25, xp: 0.15 },
        GRINDER: { accuracy: 0.20, raw: 0.60, xp: 0.20 },
        LEGEND: { accuracy: 0.20, raw: 0.20, xp: 0.60 }
    },
    MODE_MULTIPLIERS: {
        PRECISION: 1.0,
        GRINDER: 1.1,
        LEGEND: 1.5
    },
    PENALTY_PER_WRONG: 10 // minutes
};