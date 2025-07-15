const express = require('express');
const router = express.Router();
const llamaService = require('../services/llamaService');

// Custom prompt request form
router.post('/request-custom-prompts', async (req, res) => {
  try {
    const {
      projectType,
      industry,
      stylePreferences,
      specificRequirements,
      referenceImages,
      complexity = 'standard',
      variationsCount = 3,
      exportFormats = ['PDF', 'TXT']
    } = req.body;

    console.log('🎨 Creator Pro custom request:', {
      projectType,
      industry,
      stylePreferences,
      complexity,
      variationsCount
    });

    // Generate custom prompts using enhanced LLaMA service
    const customPrompts = await generateCustomPromptSet({
      projectType,
      industry,
      stylePreferences,
      specificRequirements,
      variationsCount
    });

    res.json({
      success: true,
      requestId: 'cpr_' + Date.now(),
      message: `Custom prompt package created! ${variationsCount} variations generated.`,
      prompts: customPrompts,
      exportFormats,
      deliveryStatus: 'ready',
      estimatedCredits: complexity === 'complex' ? 2 : 1
    });

  } catch (error) {
    console.error('Creator Pro request error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to generate custom prompts'
    });
  }
});

async function generateCustomPromptSet(requestData) {
  const { projectType, industry, stylePreferences, specificRequirements, variationsCount } = requestData;
  
  const customSystemPrompt = `You are an elite AI prompt engineer specializing in creating custom, professional-grade prompts for Creator Pro subscribers.

CONTEXT:
- Project Type: ${projectType}
- Industry: ${industry}  
- Style Preferences: ${stylePreferences}
- Specific Requirements: ${specificRequirements}

INSTRUCTIONS:
1. Create ${variationsCount} unique, professional prompt variations
2. Each prompt should be 75-150 words
3. Include specific technical parameters (lighting, composition, quality settings)
4. Incorporate the user's style preferences and industry context
5. Make each variation distinctly different while maintaining the core concept
6. Focus on commercial-quality results

Generate ${variationsCount} numbered prompt variations that a professional creator would pay premium rates for.`;

  try {
    const response = await llamaService.callTogetherAI(
      customSystemPrompt,
      `Create ${variationsCount} custom prompt variations based on the requirements above. Each should be production-ready and professionally crafted.`
    );

    const prompts = parseCustomPrompts(response, variationsCount);
    return prompts;
  } catch (error) {
    console.error('Custom prompt generation error:', error);
    throw error;
  }
}

function parseCustomPrompts(response, expectedCount) {
  const prompts = [];
  const sections = response.split(/\d+\.|Variation \d+:|Prompt \d+:/i);
  
  for (let i = 1; i < sections.length && prompts.length < expectedCount; i++) {
    const prompt = sections[i].trim();
    if (prompt.length > 20) {
      prompts.push({
        id: `var_${i}`,
        title: `Variation ${i}`,
        prompt: prompt,
        wordCount: prompt.split(' ').length,
        createdAt: new Date().toISOString()
      });
    }
  }

  if (prompts.length === 0) {
    for (let i = 1; i <= expectedCount; i++) {
      prompts.push({
        id: `var_${i}`,
        title: `Variation ${i}`,
        prompt: response,
        wordCount: response.split(' ').length,
        createdAt: new Date().toISOString()
      });
    }
  }

  return prompts.slice(0, expectedCount);
}

router.get('/status', (req, res) => {
  res.json({
    isCreatorPro: false,
    creditsRemaining: 0,
    creditsTotal: 20,
    nextBillingDate: null,
    prioritySupport: false
  });
});

module.exports = router;