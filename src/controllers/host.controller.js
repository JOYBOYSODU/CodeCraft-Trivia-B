const db = require('../config/db');

// Get all pending host approvals (Admin only)
exports.getPendingApprovals = async (req, res) => {
    try {
        const [hosts] = await db.execute(
            `SELECT h.id, h.user_id, h.company_name, h.company_email, h.company_website, 
                    h.type, h.address, h.company_size, h.contact_person, h.contact_phone, 
                    h.status, h.ai_requests_used, h.ai_requests_limit, h.total_contests,
                    h.created_at, u.name, u.email
             FROM hosts h
             JOIN users u ON h.user_id = u.id
             WHERE h.status = 'PENDING'
             ORDER BY h.created_at ASC`
        );
        res.json({ success: true, hosts });
    } catch (error) {
        console.error('Get pending approvals error:', error);
        res.status(500).json({ success: false, message: 'Failed to get pending approvals' });
    }
};

// Get all hosts with their status (Admin only)
exports.getAllHosts = async (req, res) => {
    try {
        const { status, page = 1, limit = 20 } = req.query;
        const offset = (page - 1) * limit;

        let query = `SELECT h.id, h.user_id, h.company_name, h.company_email, h.status,
                           h.ai_requests_used, h.ai_requests_limit, h.total_contests,
                           h.created_at, h.approved_at, u.name
                    FROM hosts h
                    JOIN users u ON h.user_id = u.id
                    WHERE 1=1`;
        const params = [];

        if (status) {
            query += ' AND h.status = ?';
            params.push(status);
        }

        query += ' ORDER BY h.created_at DESC LIMIT ? OFFSET ?';
        params.push(parseInt(limit), parseInt(offset));

        const [hosts] = await db.execute(query, params);
        res.json({ success: true, hosts });
    } catch (error) {
        console.error('Get all hosts error:', error);
        res.status(500).json({ success: false, message: 'Failed to get hosts' });
    }
};

// Approve a host (Admin only)
exports.approveHost = async (req, res) => {
    try {
        const { hostId } = req.params;
        const { aiRequestsLimit } = req.body;

        await db.execute(
            `UPDATE hosts 
             SET status = 'APPROVED', approved_by = ?, approved_at = NOW(),
                 ai_requests_limit = ?
             WHERE id = ?`,
            [req.user.id, aiRequestsLimit || 10, hostId]
        );

        // Update user role to HOST
        await db.execute(
            'UPDATE users SET role = ? WHERE id = (SELECT user_id FROM hosts WHERE id = ?)',
            ['HOST', hostId]
        );

        res.json({ success: true, message: 'Host approved successfully' });
    } catch (error) {
        console.error('Approve host error:', error);
        res.status(500).json({ success: false, message: 'Failed to approve host' });
    }
};

// Reject a host (Admin only)
exports.rejectHost = async (req, res) => {
    try {
        const { hostId } = req.params;
        const { rejectionReason } = req.body;

        await db.execute(
            `UPDATE hosts 
             SET status = 'REJECTED', approved_by = ?, approved_at = NOW(),
                 rejection_reason = ?
             WHERE id = ?`,
            [req.user.id, rejectionReason || 'No reason provided', hostId]
        );

        res.json({ success: true, message: 'Host rejected successfully' });
    } catch (error) {
        console.error('Reject host error:', error);
        res.status(500).json({ success: false, message: 'Failed to reject host' });
    }
};

// Suspend a host (Admin only)
exports.suspendHost = async (req, res) => {
    try {
        const { hostId } = req.params;
        const { reason } = req.body;

        await db.execute(
            `UPDATE hosts 
             SET status = 'SUSPENDED', rejection_reason = ?
             WHERE id = ?`,
            [reason || 'Suspended by admin', hostId]
        );

        res.json({ success: true, message: 'Host suspended successfully' });
    } catch (error) {
        console.error('Suspend host error:', error);
        res.status(500).json({ success: false, message: 'Failed to suspend host' });
    }
};

// Get host profile (by Host user)
exports.getHostProfile = async (req, res) => {
    try {
        const [hosts] = await db.execute(
            `SELECT h.*, u.name, u.email
             FROM hosts h
             JOIN users u ON h.user_id = u.id
             WHERE h.user_id = ?`,
            [req.user.id]
        );

        if (hosts.length === 0) {
            return res.status(404).json({ success: false, message: 'Host profile not found' });
        }

        res.json({ success: true, host: hosts[0] });
    } catch (error) {
        console.error('Get host profile error:', error);
        res.status(500).json({ success: false, message: 'Failed to get host profile' });
    }
};

// Register as Host (Player/User can register)
exports.registerAsHost = async (req, res) => {
    try {
        const { companyName, companyEmail, companyWebsite, type, address, companySize, contactPerson, contactPhone } = req.body;

        // Check if already a host
        const [existing] = await db.execute('SELECT id FROM hosts WHERE user_id = ?', [req.user.id]);
        if (existing.length > 0) {
            return res.status(400).json({ success: false, message: 'Already registered as host' });
        }

        // Check if company email already registered
        const [emailExists] = await db.execute('SELECT id FROM hosts WHERE company_email = ?', [companyEmail]);
        if (emailExists.length > 0) {
            return res.status(400).json({ success: false, message: 'Company email already registered' });
        }

        const [result] = await db.execute(
            `INSERT INTO hosts (user_id, company_name, company_email, company_website, type, address, company_size, contact_person, contact_phone, status)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'PENDING')`,
            [req.user.id, companyName, companyEmail, companyWebsite, type, address, companySize, contactPerson, contactPhone]
        );

        const hostId = result.insertId;

        res.status(201).json({
            success: true,
            message: 'Host registration submitted for approval',
            host: { id: hostId, status: 'PENDING' }
        });
    } catch (error) {
        console.error('Register as host error:', error);
        res.status(500).json({ success: false, message: 'Host registration failed' });
    }
};
