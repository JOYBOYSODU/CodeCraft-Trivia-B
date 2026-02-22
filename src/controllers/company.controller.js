const db = require('../config/db');

// Get all pending company approvals (Admin only)
exports.getPendingApprovals = async (req, res) => {
    try {
        const [companies] = await db.execute(
            `SELECT c.id, c.user_id, c.company_name, c.company_email, c.company_website, 
                    c.type, c.address, c.company_size, c.contact_person, c.contact_phone, 
                    c.status, c.ai_requests_used, c.ai_requests_limit, c.total_contests,
                    c.created_at, u.name, u.email
             FROM companies c
             JOIN users u ON c.user_id = u.id
             WHERE c.status = 'PENDING'
             ORDER BY c.created_at ASC`
        );
        res.json({ success: true, companies });
    } catch (error) {
        console.error('Get pending approvals error:', error);
        res.status(500).json({ success: false, message: 'Failed to get pending approvals' });
    }
};

// Get all companies with their status (Admin only)
exports.getAllCompanies = async (req, res) => {
    try {
        const { status, page = 1, limit = 20 } = req.query;
        const offset = (page - 1) * limit;

        let query = `SELECT c.id, c.user_id, c.company_name, c.company_email, c.status,
                           c.ai_requests_used, c.ai_requests_limit, c.total_contests,
                           c.created_at, c.approved_at, u.name
                    FROM companies c
                    JOIN users u ON c.user_id = u.id
                    WHERE 1=1`;
        const params = [];

        if (status) {
            query += ' AND c.status = ?';
            params.push(status);
        }

        query += ' ORDER BY c.created_at DESC LIMIT ? OFFSET ?';
        params.push(parseInt(limit), parseInt(offset));

        const [companies] = await db.execute(query, params);
        res.json({ success: true, companies });
    } catch (error) {
        console.error('Get all companies error:', error);
        res.status(500).json({ success: false, message: 'Failed to get companies' });
    }
};

// Approve a company (Admin only)
exports.approveCompany = async (req, res) => {
    try {
        const { companyId } = req.params;
        const { aiRequestsLimit } = req.body;

        await db.execute(
            `UPDATE companies 
             SET status = 'APPROVED', approved_by = ?, approved_at = NOW(),
                 ai_requests_limit = ?
             WHERE id = ?`,
            [req.user.id, aiRequestsLimit || 10, companyId]
        );

        // Update user role to COMPANY
        await db.execute(
            'UPDATE users SET role = ? WHERE id = (SELECT user_id FROM companies WHERE id = ?)',
            ['COMPANY', companyId]
        );

        res.json({ success: true, message: 'Company approved successfully' });
    } catch (error) {
        console.error('Approve company error:', error);
        res.status(500).json({ success: false, message: 'Failed to approve company' });
    }
};

// Reject a company (Admin only)
exports.rejectCompany = async (req, res) => {
    try {
        const { companyId } = req.params;
        const { rejectionReason } = req.body;

        await db.execute(
            `UPDATE companies 
             SET status = 'REJECTED', approved_by = ?, approved_at = NOW(),
                 rejection_reason = ?
             WHERE id = ?`,
            [req.user.id, rejectionReason || 'No reason provided', companyId]
        );

        res.json({ success: true, message: 'Company rejected successfully' });
    } catch (error) {
        console.error('Reject company error:', error);
        res.status(500).json({ success: false, message: 'Failed to reject company' });
    }
};

// Suspend a company (Admin only)
exports.suspendCompany = async (req, res) => {
    try {
        const { companyId } = req.params;
        const { reason } = req.body;

        await db.execute(
            `UPDATE companies 
             SET status = 'SUSPENDED', rejection_reason = ?
             WHERE id = ?`,
            [reason || 'Suspended by admin', companyId]
        );

        res.json({ success: true, message: 'Company suspended successfully' });
    } catch (error) {
        console.error('Suspend company error:', error);
        res.status(500).json({ success: false, message: 'Failed to suspend company' });
    }
};

// Get company profile (by Company user)
exports.getCompanyProfile = async (req, res) => {
    try {
        const [companies] = await db.execute(
            `SELECT c.*, u.name, u.email
             FROM companies c
             JOIN users u ON c.user_id = u.id
             WHERE c.user_id = ?`,
            [req.user.id]
        );

        if (companies.length === 0) {
            return res.status(404).json({ success: false, message: 'Company profile not found' });
        }

        res.json({ success: true, company: companies[0] });
    } catch (error) {
        console.error('Get company profile error:', error);
        res.status(500).json({ success: false, message: 'Failed to get company profile' });
    }
};

// Register as Company (Player/User can register)
exports.registerAsCompany = async (req, res) => {
    try {
        const { companyName, companyEmail, companyWebsite, type, address, companySize, contactPerson, contactPhone } = req.body;

        // Check if already a company
        const [existing] = await db.execute('SELECT id FROM companies WHERE user_id = ?', [req.user.id]);
        if (existing.length > 0) {
            return res.status(400).json({ success: false, message: 'Already registered as company' });
        }

        // Check if company email already registered
        const [emailExists] = await db.execute('SELECT id FROM companies WHERE company_email = ?', [companyEmail]);
        if (emailExists.length > 0) {
            return res.status(400).json({ success: false, message: 'Company email already registered' });
        }

        const [result] = await db.execute(
            `INSERT INTO companies (user_id, company_name, company_email, company_website, type, address, company_size, contact_person, contact_phone, status)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'PENDING')`,
            [req.user.id, companyName, companyEmail, companyWebsite, type, address, companySize, contactPerson, contactPhone]
        );

        const companyId = result.insertId;

        res.status(201).json({
            success: true,
            message: 'Company registration submitted for approval',
            company: { id: companyId, status: 'PENDING' }
        });
    } catch (error) {
        console.error('Register as company error:', error);
        res.status(500).json({ success: false, message: 'Company registration failed' });
    }
};
