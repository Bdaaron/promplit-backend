const express = require('express');
const router = express.Router();

// Initialize Stripe only if secret key is available
let stripe;
if (process.env.STRIPE_SECRET_KEY) {
  stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
  console.log('✅ Stripe initialized');
} else {
  console.warn('⚠️ STRIPE_SECRET_KEY not found, using demo mode');
}

router.post('/create-checkout-session', async (req, res) => {
  try {
    const { priceId, successUrl, cancelUrl } = req.body;
    console.log('Creating checkout session for price:', priceId);
    
    if (!stripe) {
      console.log('Using demo mode - no real Stripe');
      return res.json({
        success: true,
        sessionId: 'cs_demo_' + Date.now(),
        demo: true
      });
    }
    
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      mode: 'subscription',
      success_url: successUrl,
      cancel_url: cancelUrl,
      automatic_tax: { enabled: false },
    });

    console.log('✅ Stripe session created:', session.id);
    res.json({
      success: true,
      sessionId: session.id
    });
  } catch (error) {
    console.error('❌ Stripe error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Payment setup failed'
    });
  }
});

router.post('/verify-session', async (req, res) => {
  try {
    const { sessionId } = req.body;
    console.log('Verifying session:', sessionId);
    
    if (!stripe || sessionId.startsWith('cs_demo_')) {
      console.log('Demo verification - auto success');
      return res.json({
        success: true,
        customer: 'demo_customer'
      });
    }
    
    const session = await stripe.checkout.sessions.retrieve(sessionId);
    console.log('Session status:', session.payment_status);
    
    res.json({
      success: session.payment_status === 'paid',
      customer: session.customer,
      subscription: session.subscription
    });
  } catch (error) {
    console.error('❌ Verification error:', error);
    res.status(500).json({
      success: false,
      error: 'Verification failed'
    });
  }
});

// Health check for Stripe
router.get('/health', (req, res) => {
  res.json({
    status: 'OK',
    stripe: !!stripe,
    timestamp: new Date().toISOString()
  });
});

module.exports = router;