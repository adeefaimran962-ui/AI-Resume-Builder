/**
 * controllers/certificateController.js
 * Certificate Manager Controller
 */
const Certificate = require('../models/Certificate');
const fs = require('fs');
const path = require('path');

/* ───────────────────────────────────────────────────────────────────── */
/*  CERTIFICATE CRUD                                                     */
/* ───────────────────────────────────────────────────────────────────── */

// GET /certificates - List all certificates
exports.index = async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = 12;
    const skip = (page - 1) * limit;

    // Build query
    const query = { user: req.session.userId };
    
    if (req.query.search) {
      query.$or = [
        { name: { $regex: req.query.search, $options: 'i' } },
        { issuer: { $regex: req.query.search, $options: 'i' } },
      ];
    }
    
    if (req.query.issuer) {
      query.issuer = { $regex: req.query.issuer, $options: 'i' };
    }

    // Sort options
    const sortMap = {
      'newest': { issueDate: -1, createdAt: -1 },
      'oldest': { issueDate: 1, createdAt: 1 },
      'name': { name: 1 },
      'issuer': { issuer: 1 },
    };
    const sortQuery = sortMap[req.query.sort] || { issueDate: -1, createdAt: -1 };

    // Get certificates with pagination
    const [certificates, totalCount] = await Promise.all([
      Certificate.find(query)
        .sort(sortQuery)
        .skip(skip)
        .limit(limit)
        .lean(),
      Certificate.countDocuments(query),
    ]);

    const totalPages = Math.ceil(totalCount / limit);

    // Get statistics
    const allCerts = await Certificate.find({ user: req.session.userId }).lean();
    const stats = {
      total: allCerts.length,
      active: allCerts.filter(c => c.isActive).length,
      withFiles: allCerts.filter(c => c.filePath).length,
      thisYear: allCerts.filter(c => {
        const year = new Date().getFullYear();
        return c.issueDate && c.issueDate.includes(year.toString());
      }).length,
    };

    // Get unique issuers for filter dropdown
    const issuers = [...new Set(allCerts.map(c => c.issuer).filter(Boolean))].sort();

    res.render('certificates/index', {
      title: 'Certificates – ResumeAI',
      certificates,
      stats,
      issuers,
      pagination: {
        page,
        totalPages,
        hasNext: page < totalPages,
        hasPrev: page > 1,
        totalCount,
      },
      filters: {
        search: req.query.search || '',
        issuer: req.query.issuer || '',
        sort: req.query.sort || 'newest',
      },
    });
  } catch (err) {
    console.error('Certificates Index Error:', err);
    req.flash('error', 'Could not load certificates.');
    res.redirect('/dashboard');
  }
};

// GET /certificates/new - Show create form
exports.showCreateForm = (req, res) => {
  res.render('certificates/form', {
    title: 'Add Certificate – ResumeAI',
    certificate: null,
    action: '/certificates',
    method: 'POST',
  });
};

// POST /certificates - Create new certificate
exports.create = async (req, res) => {
  try {
    const certData = {
      user: req.session.userId,
      name: req.body.name,
      issuer: req.body.issuer,
      issueDate: req.body.issueDate,
      expiryDate: req.body.expiryDate || '',
      credentialId: req.body.credentialId || '',
      credentialUrl: req.body.credentialUrl || '',
      description: req.body.description || '',
      skills: req.body.skills ? req.body.skills.split(',').map(s => s.trim()).filter(Boolean) : [],
    };

    // Handle file upload if present
    if (req.file) {
      certData.filePath = '/uploads/certificates/' + req.file.filename;
      certData.fileType = path.extname(req.file.originalname).toLowerCase().replace('.', '');
    }

    const certificate = new Certificate(certData);
    await certificate.save();
    
    req.flash('success', 'Certificate added successfully!');
    res.redirect('/certificates');
  } catch (err) {
    console.error('Create Certificate Error:', err);
    
    // Clean up uploaded file if save failed
    if (req.file) {
      fs.unlink(path.join(__dirname, '../public/uploads/certificates', req.file.filename), () => {});
    }
    
    req.flash('error', 'Could not create certificate.');
    res.redirect('/certificates/new');
  }
};

// GET /certificates/:id/edit - Show edit form
exports.showEditForm = async (req, res) => {
  try {
    const certificate = await Certificate.findOne({
      _id: req.params.id,
      user: req.session.userId,
    }).lean();

    if (!certificate) {
      req.flash('error', 'Certificate not found.');
      return res.redirect('/certificates');
    }

    res.render('certificates/form', {
      title: 'Edit Certificate – ResumeAI',
      certificate,
      action: `/certificates/${certificate._id}?_method=PUT`,
      method: 'POST',
    });
  } catch (err) {
    console.error('Show Edit Certificate Error:', err);
    req.flash('error', 'Could not load certificate.');
    res.redirect('/certificates');
  }
};

// PUT /certificates/:id - Update certificate
exports.update = async (req, res) => {
  try {
    const certificate = await Certificate.findOne({
      _id: req.params.id,
      user: req.session.userId,
    });

    if (!certificate) {
      req.flash('error', 'Certificate not found.');
      return res.redirect('/certificates');
    }

    // Update basic fields
    certificate.name = req.body.name;
    certificate.issuer = req.body.issuer;
    certificate.issueDate = req.body.issueDate;
    certificate.expiryDate = req.body.expiryDate || '';
    certificate.credentialId = req.body.credentialId || '';
    certificate.credentialUrl = req.body.credentialUrl || '';
    certificate.description = req.body.description || '';
    certificate.skills = req.body.skills ? req.body.skills.split(',').map(s => s.trim()).filter(Boolean) : [];

    // Handle new file upload
    if (req.file) {
      // Delete old file if it exists
      if (certificate.filePath) {
        const oldFilePath = path.join(__dirname, '../public', certificate.filePath);
        fs.unlink(oldFilePath, () => {});
      }
      
      certificate.filePath = '/uploads/certificates/' + req.file.filename;
      certificate.fileType = path.extname(req.file.originalname).toLowerCase().replace('.', '');
    }

    await certificate.save();
    
    req.flash('success', 'Certificate updated successfully!');
    res.redirect('/certificates');
  } catch (err) {
    console.error('Update Certificate Error:', err);
    
    // Clean up uploaded file if save failed
    if (req.file) {
      fs.unlink(path.join(__dirname, '../public/uploads/certificates', req.file.filename), () => {});
    }
    
    req.flash('error', 'Could not update certificate.');
    res.redirect(`/certificates/${req.params.id}/edit`);
  }
};

// DELETE /certificates/:id - Delete certificate
exports.destroy = async (req, res) => {
  try {
    const certificate = await Certificate.findOneAndDelete({
      _id: req.params.id,
      user: req.session.userId,
    });

    if (!certificate) {
      req.flash('error', 'Certificate not found.');
      return res.redirect('/certificates');
    }

    // Delete associated file if it exists
    if (certificate.filePath) {
      const filePath = path.join(__dirname, '../public', certificate.filePath);
      fs.unlink(filePath, () => {});
    }

    req.flash('success', 'Certificate deleted successfully!');
    res.redirect('/certificates');
  } catch (err) {
    console.error('Delete Certificate Error:', err);
    req.flash('error', 'Could not delete certificate.');
    res.redirect('/certificates');
  }
};

// GET /certificates/:id - View single certificate
exports.show = async (req, res) => {
  try {
    const certificate = await Certificate.findOne({
      _id: req.params.id,
      user: req.session.userId,
    }).lean();

    if (!certificate) {
      req.flash('error', 'Certificate not found.');
      return res.redirect('/certificates');
    }

    res.render('certificates/show', {
      title: `${certificate.name} – ResumeAI`,
      certificate,
    });
  } catch (err) {
    console.error('Show Certificate Error:', err);
    req.flash('error', 'Could not load certificate.');
    res.redirect('/certificates');
  }
};

// GET /certificates/:id/download - Download certificate file
exports.download = async (req, res) => {
  try {
    const certificate = await Certificate.findOne({
      _id: req.params.id,
      user: req.session.userId,
    }).lean();

    if (!certificate || !certificate.filePath) {
      req.flash('error', 'Certificate file not found.');
      return res.redirect('/certificates');
    }

    const filePath = path.join(__dirname, '../public', certificate.filePath);
    
    if (!fs.existsSync(filePath)) {
      req.flash('error', 'Certificate file does not exist.');
      return res.redirect('/certificates');
    }

    const fileName = `${certificate.name.replace(/[^a-zA-Z0-9]/g, '_')}_certificate.${certificate.fileType}`;
    
    res.download(filePath, fileName, (err) => {
      if (err) {
        console.error('Download Error:', err);
        req.flash('error', 'Could not download certificate.');
        res.redirect('/certificates');
      }
    });
  } catch (err) {
    console.error('Certificate Download Error:', err);
    req.flash('error', 'Could not download certificate.');
    res.redirect('/certificates');
  }
};