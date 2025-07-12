const axios = require('axios');

class LlamaService {
  constructor() {
    this.provider = process.env.LLAMA_PROVIDER || 'together';
    this.apiKey = process.env.TOGETHER_API_KEY;
    this.baseURL = 'https://api.together.xyz/v1';
 this.model = 'meta-llama/Llama-3-8b-chat-hf';;
    
    console.log('🧠 Llama Service initialized');
    console.log(`🔧 Provider: ${this.provider}`);
    console.log(`🤖 Model: ${this.model}`);
  }

  async generatePrompt(userInput, promptType = 'image') {
    try {
      console.log(`🎨 Generating ${promptType} prompt for: "${userInput}"`);
      
      const systemPrompt = this.getSystemPrompt(promptType);
      const userPrompt = this.formatUserPrompt(userInput, promptType);

      const response = await this.callTogetherAI(systemPrompt, userPrompt);
      const cleanedResponse = this.cleanResponse(response);
      
      console.log('✅ Prompt generated successfully!');
      return cleanedResponse;
      
    } catch (error) {
      console.error('❌ Llama service error:', error.message);
      throw new Error(`Failed to generate prompt: ${error.message}`);
    }
  }

  getSystemPrompt(promptType) {
    const prompts = {
      image: `You are an expert AI image prompt engineer. Transform user ideas into detailed, optimized prompts for AI image generators like DALL-E, Midjourney, and Stable Diffusion.

RULES:
1. Create vivid, detailed descriptions
2. Include artistic style, lighting, composition details  
3. Add technical parameters (4K, highly detailed, cinematic, etc.)
4. Keep prompts between 50-150 words
5. Focus on visual elements that AI can understand
6. Make prompts inspiring and creative
7. Include specific details about colors, textures, mood, and atmosphere

Transform the user's input into a professional, detailed image generation prompt that will create stunning visuals.`,

      text: `You are an expert prompt engineer for text AI models. Transform user requests into optimized prompts that get the best results.

RULES:
1. Be specific and clear
2. Include context and constraints
3. Specify desired format/style
4. Keep prompts focused and actionable

Transform the user's input into an optimized text generation prompt.`,
    };

    return prompts[promptType] || prompts.image;
  }

  formatUserPrompt(userInput, promptType) {
    return `User request: "${userInput}"

Please create an optimized ${promptType} generation prompt based on this request. Make it detailed, specific, and designed to produce amazing results. Focus on creating a prompt that will generate high-quality, professional-looking images.`;
  }

  async callTogetherAI(systemPrompt, userPrompt) {
    if (!this.apiKey) {
      throw new Error('TOGETHER_API_KEY not found in environment variables. Please add your API key to the .env file.');
    }

    console.log('🌐 Making request to Together AI...');

    try {
      const response = await axios.post(`${this.baseURL}/chat/completions`, {
        model: this.model,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        max_tokens: 400,
        temperature: 0.7,
        top_p: 0.9,
      }, {
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json'
        },
        timeout: 30000 // 30 second timeout
      });

      console.log('📡 Received response from Together AI');
      return response.data.choices[0].message.content;

    } catch (error) {
      if (error.response) {
        console.error('❌ API Error:', error.response.status, error.response.data);
        throw new Error(`API Error: ${error.response.status} - ${error.response.data.error?.message || 'Unknown error'}`);
      } else if (error.request) {
        console.error('❌ Network Error:', error.message);
        throw new Error('Network error: Could not reach Together AI API');
      } else {
        console.error('❌ Request Error:', error.message);
        throw new Error(`Request error: ${error.message}`);
      }
    }
  }

  cleanResponse(response) {
    // Clean up the AI response
    let cleaned = response.trim();
    
    // Remove common prefixes
    cleaned = cleaned.replace(/^(Here's|Here is|Prompt:|Generated prompt:|Image prompt:)/i, '').trim();
    
    // Remove quotes if the entire response is quoted
    if (cleaned.startsWith('"') && cleaned.endsWith('"')) {
      cleaned = cleaned.slice(1, -1);
    }
    
    // Limit length
    if (cleaned.length > 600) {
      cleaned = cleaned.substring(0, 600) + '...';
    }

    return cleaned;
  }

  // Test method to check if service is working
  async healthCheck() {
    try {
      await this.generatePrompt('test sunset', 'image');
      return { status: 'healthy', message: 'Llama service is working!' };
    } catch (error) {
      return { status: 'unhealthy', error: error.message };
    }
  }
}

module.exports = new LlamaService();