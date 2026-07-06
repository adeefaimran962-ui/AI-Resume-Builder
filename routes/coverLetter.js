/**
 * routes/coverLetter.js
 */
'use strict';

const express = require('express');
const router  = express.Router();
const cc      = require('../controllers/coverLetterController');
const { ensureAuthenticated } = require('../middleware/auth');

router.use(ensureAuthenticated);

router.post('/ai/generate', cc.aiGenerate);

router.get('/new',  cc.showCreateForm);
router.post('/',    cc.create);
router.get('/by-resume/:resumeId', cc.getByResume);

router.get('/:id/preview',  cc.preview);
router.get('/:id/download', cc.downloadPDF);
router.get('/:id/edit',     cc.showEditForm);
router.put('/:id',          cc.update);
router.delete('/:id',       cc.destroy);

module.exports = router;
