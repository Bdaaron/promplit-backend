const express = require('express');
const router = express.Router();
const llamaService = require('../services/llamaService');
const rateLimit = require('express-rate-limit');

// Simple rate limiting
const promptLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 30,
  message: { error: 'Too many requests' }
});

router.use(promptLimit);

// Generate prompt
router.post('/generate', async (req, res) => {
  try {
    const { prompt, type = 'image' } = req.body;

    if (!prompt || prompt.trim().length === 0) {
      return res.status(400).json({
        error: 'Invalid input',
        message: 'Prompt is required'
      });
    }

    console.log(`📝 Generating prompt: "${prompt.substring(0, 50)}..."`);

    const generatedPrompt = await llamaService.generatePrompt(prompt, type);

    res.json({
      success: true,
      originalPrompt: prompt,
      generatedPrompt,
      type,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('❌ Error:', error.message);
    res.status(500).json({
      error: 'Generation failed',
      message: 'Failed to generate prompt. Please try again.'
    });
  }
});

// Health check
router.get('/health', async (req, res) => {
  try {
    await llamaService.generatePrompt('test', 'image');
    res.json({
      status: 'healthy',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(503).json({
      status: 'unhealthy',
      error: error.message
    });
  }
});

module.exports = router;