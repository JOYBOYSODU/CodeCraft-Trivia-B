// Authentication Service
import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api';

const api = axios.create({
    baseURL: API_BASE_URL,
    withCredentials: true
});

// Add token to requests
api.interceptors.request.use((config) => {
    const token = localStorage.getItem('token');
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
});

// Auth Service
export const authService = {
    register: async (data) => {
        const response = await api.post('/auth/register', data);
        if (response.data.token) {
            localStorage.setItem('token', response.data.token);
        }
        return response.data;
    },

    login: async (data) => {
        const response = await api.post('/auth/login', data);
        if (response.data.token) {
            localStorage.setItem('token', response.data.token);
        }
        return response.data;
    },

    logout: async () => {
        await api.post('/auth/logout');
        localStorage.removeItem('token');
    },

    getMe: async () => {
        const response = await api.get('/auth/me');
        return response.data;
    }
};

// User Service
export const userService = {
    getPublicProfile: async (id) => {
        const response = await api.get(`/users/profile/${id}`);
        return response.data;
    },

    updateProfile: async (data) => {
        const response = await api.put('/users/profile', data);
        return response.data;
    }
};

// Problem Service
export const problemService = {
    getAllProblems: async () => {
        const response = await api.get('/problems');
        return response.data;
    },

    getProblem: async (id) => {
        const response = await api.get(`/problems/${id}`);
        return response.data;
    },

    createProblem: async (data) => {
        const response = await api.post('/problems', data);
        return response.data;
    },

    updateProblem: async (id, data) => {
        const response = await api.put(`/problems/${id}`, data);
        return response.data;
    },

    deleteProblem: async (id) => {
        const response = await api.delete(`/problems/${id}`);
        return response.data;
    }
};

// Contest Service
export const contestService = {
    getAllContests: async () => {
        const response = await api.get('/contests');
        return response.data;
    },

    getContest: async (id) => {
        const response = await api.get(`/contests/${id}`);
        return response.data;
    },

    getContestLeaderboard: async (id) => {
        const response = await api.get(`/contests/${id}/leaderboard`);
        return response.data;
    },

    getContestProblems: async (id) => {
        const response = await api.get(`/contests/${id}/problems`);
        return response.data;
    },

    createContest: async (data) => {
        const response = await api.post('/contests', data);
        return response.data;
    },

    updateContest: async (id, data) => {
        const response = await api.put(`/contests/${id}`, data);
        return response.data;
    },

    updateContestStatus: async (id, data) => {
        const response = await api.put(`/contests/${id}/status`, data);
        return response.data;
    },

    joinContest: async (id) => {
        const response = await api.post(`/contests/${id}/join`);
        return response.data;
    }
};

// Submission Service
export const submissionService = {
    createSubmission: async (data) => {
        const response = await api.post('/submissions', data);
        return response.data;
    },

    getMySubmissions: async () => {
        const response = await api.get('/submissions/my');
        return response.data;
    },

    getSubmission: async (id) => {
        const response = await api.get(`/submissions/${id}`);
        return response.data;
    }
};

// Player Service
export const playerService = {
    getProfile: async () => {
        const response = await api.get('/players/profile');
        return response.data;
    },

    getStats: async () => {
        const response = await api.get('/players/stats');
        return response.data;
    },

    getXpHistory: async () => {
        const response = await api.get('/players/xp-history');
        return response.data;
    },

    updatePreferredMode: async (data) => {
        const response = await api.put('/players/mode', data);
        return response.data;
    }
};

// Admin Service
export const adminService = {
    getAllUsers: async () => {
        const response = await api.get('/admin/users');
        return response.data;
    },

    updateUserStatus: async (id, data) => {
        const response = await api.put(`/admin/users/${id}/status`, data);
        return response.data;
    },

    getDashboardStats: async () => {
        const response = await api.get('/admin/stats');
        return response.data;
    },

    createAnnouncement: async (data) => {
        const response = await api.post('/admin/announcements', data);
        return response.data;
    },

    getAnnouncements: async () => {
        const response = await api.get('/admin/announcements');
        return response.data;
    }
};

// Leaderboard Service
export const leaderboardService = {
    getGlobalLeaderboard: async () => {
        const response = await api.get('/leaderboard/global');
        return response.data;
    },

    getContestLeaderboard: async (id) => {
        const response = await api.get(`/leaderboard/contest/${id}`);
        return response.data;
    }
};

export default api;
