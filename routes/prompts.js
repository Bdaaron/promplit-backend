const express = require('express');
const { body, validationResult } = require('express-validator');
const router = express.Router();

// Input validation rules
const validatePrompt = [
  body('prompt')
    .isLength({ min: 1, max: 500 })
    .withMessage('Prompt must be between 1 and 500 characters')
    .matches(/^[a-zA-Z0-9\s\.,!?'"()-]+$/)
    .withMessage('Prompt contains invalid characters')
    .escape(), // HTML escape
  body('type')
    .isIn(['image', 'text'])
    .withMessage('Invalid type specified')
];

// Prompt generation endpoint
router.post('/generate', validatePrompt, async (req, res) => {
  try {
    // Check validation results
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Invalid input data',
        errors: errors.array()
      });
    }

    const { prompt, type } = req.body;
    
    // Additional security checks
    if (!prompt || typeof prompt !== 'string') {
      return res.status(400).json({
        success: false,
        message: 'Invalid prompt provided'
      });
    }

    // Simulate AI prompt generation (replace with your actual AI logic)
    const enhancedPrompt = `Professional ${type} generation: ${prompt}, ultra-detailed, high quality, masterpiece`;
    
    // Log for monitoring (without sensitive data)
    console.log(`Prompt generated for type: ${type}, length: ${prompt.length}`);
    
    res.json({
      success: true,
      generatedPrompt: enhancedPrompt
    });

  } catch (error) {
    console.error('Prompt generation error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to generate prompt'
    });
  }
});

module.exports = router;