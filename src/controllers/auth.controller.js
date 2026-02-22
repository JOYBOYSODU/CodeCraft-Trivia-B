const bcrypt = require('bcryptjs');
const db = require('../config/db');
const { generateToken } = require('../utils/helpers');

exports.register = async (req, res) => {
    try {
        const { name, email, password } = req.body;

        const [existing] = await db.execute('SELECT id FROM users WHERE email = ?', [email]);
        if (existing.length > 0) {
            return res.status(400).json({ success: false, message: 'Email already registered' });
        }

        const hashedPassword = await bcrypt.hash(password, 12);

        const [result] = await db.execute(
            'INSERT INTO users (name, email, password, role) VALUES (?, ?, ?, ?)',
            [name, email, hashedPassword, 'PLAYER']
        );

        const userId = result.insertId;

        await db.execute('INSERT INTO player (user_id) VALUES (?)', [userId]);

        const token = generateToken(userId);

        res.status(201).json({
            success: true,
            token,
            user: { id: userId, name, email, role: 'PLAYER' }
        });
    } catch (error) {
        console.error('Register error:', error);
        res.status(500).json({ success: false, message: 'Registration failed' });
    }
};

exports.login = async (req, res) => {
    try {
        const { email, password } = req.body;

        const [rows] = await db.execute(
            'SELECT id, name, email, password, role, status FROM users WHERE email = ?',
            [email]
        );

        if (rows.length === 0) {
            return res.status(401).json({ success: false, message: 'Invalid credentials' });
        }

        const user = rows[0];

        if (user.status === 'BANNED') {
            return res.status(403).json({ success: false, message: 'Account banned' });
        }

        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.status(401).json({ success: false, message: 'Invalid credentials' });
        }

        await db.execute('UPDATE users SET last_login = NOW() WHERE id = ?', [user.id]);

        const token = generateToken(user.id);

        res.cookie('token', token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            maxAge: 7 * 24 * 60 * 60 * 1000
        });

        res.json({
            success: true,
            token,
            user: { id: user.id, name: user.name, email: user.email, role: user.role }
        });
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ success: false, message: 'Login failed' });
    }
};

exports.registerAdmin = async (req, res) => {
    try {
        const { name, email, password } = req.body;

        const [existing] = await db.execute('SELECT id FROM users WHERE email = ?', [email]);
        if (existing.length > 0) {
            return res.status(400).json({ success: false, message: 'Email already registered' });
        }

        const hashedPassword = await bcrypt.hash(password, 12);

        const [result] = await db.execute(
            'INSERT INTO users (name, email, password, role, status) VALUES (?, ?, ?, ?, ?)',
            [name, email, hashedPassword, 'ADMIN', 'ACTIVE']
        );

        const userId = result.insertId;
        const token = generateToken(userId);

        res.status(201).json({
            success: true,
            token,
            user: { id: userId, name, email, role: 'ADMIN' }
        });
    } catch (error) {
        console.error('Admin register error:', error);
        res.status(500).json({ success: false, message: 'Admin registration failed' });
    }
};

exports.logout = (req, res) => {
    res.cookie('token', '', { maxAge: 0 });
    res.json({ success: true, message: 'Logged out' });
};

exports.getMe = async (req, res) => {
    try {
        const [users] = await db.execute(
            'SELECT id, name, email, role, profile_picture, status, created_at FROM users WHERE id = ?',
            [req.user.id]
        );

        if (users.length === 0) {
            return res.status(404).json({ success: false, message: 'User not found' });
        }

        let playerData = null;
        if (users[0].role === 'PLAYER') {
            const [players] = await db.execute('SELECT * FROM player WHERE user_id = ?', [req.user.id]);
            if (players.length > 0) {
                playerData = players[0];
            }
        }

        res.json({
            success: true,
            user: users[0],
            player: playerData
        });
    } catch (error) {
        console.error('GetMe error:', error);
        res.status(500).json({ success: false, message: 'Failed to get user' });
    }
};

exports.registerCompany = async (req, res) => {
    try {
        const {
            name,
            email,
            password,
            companyName,
            companyEmail,
            companyWebsite,
            type,
            address,
            companySize,
            contactPerson,
            contactPhone,
            company_name,
            company_email,
            company_website,
            company_size,
            contact_person,
            contact_phone
        } = req.body;

        const resolvedCompanyName = companyName || company_name || name;
        const resolvedCompanyEmail = companyEmail || company_email || email;
        const resolvedCompanyWebsite = companyWebsite || company_website || null;
        const resolvedCompanySize = companySize || company_size || null;
        const resolvedContactPerson = contactPerson || contact_person || null;
        const resolvedContactPhone = contactPhone || contact_phone || null;

        if (!name || !email || !password || !resolvedCompanyName || !resolvedCompanyEmail) {
            return res.status(400).json({
                success: false,
                message: 'Name, email, password, company name, and company email are required'
            });
        }

        const [existing] = await db.execute('SELECT id FROM users WHERE email = ?', [email]);
        if (existing.length > 0) {
            return res.status(400).json({ success: false, message: 'Email already registered' });
        }

        const [companyEmailExists] = await db.execute(
            'SELECT id FROM companies WHERE company_email = ?',
            [resolvedCompanyEmail]
        );
        if (companyEmailExists.length > 0) {
            return res.status(400).json({ success: false, message: 'Company email already registered' });
        }

        const hashedPassword = await bcrypt.hash(password, 12);

        const [result] = await db.execute(
            'INSERT INTO users (name, email, password, role, status) VALUES (?, ?, ?, ?, ?)',
            [name, email, hashedPassword, 'COMPANY', 'ACTIVE']
        );

        const userId = result.insertId;

        const [companyResult] = await db.execute(
            `INSERT INTO companies (user_id, company_name, company_email, company_website, type, address, company_size, contact_person, contact_phone, status)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'PENDING')`,
            [
                userId,
                resolvedCompanyName,
                resolvedCompanyEmail,
                resolvedCompanyWebsite,
                type || null,
                address || null,
                resolvedCompanySize,
                resolvedContactPerson,
                resolvedContactPhone
            ]
        );

        const token = generateToken(userId);

        res.status(201).json({
            success: true,
            token,
            user: { id: userId, name, email, role: 'COMPANY' },
            company: { id: companyResult.insertId, status: 'PENDING' }
        });
    } catch (error) {
        console.error('Company register error:', error);
        res.status(500).json({ success: false, message: 'Company registration failed' });
    }
};