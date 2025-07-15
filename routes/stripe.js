const express = require('express');
const router = express.Router();

// Initialize Stripe
let stripe;
if (process.env.STRIPE_SECRET_KEY) {
  stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
  console.log('✅ Stripe initialized');
} else {
  console.warn('⚠️ STRIPE_SECRET_KEY not found');
}

router.post('/create-checkout-session', async (req, res) => {
  try {
    const { priceId, successUrl, cancelUrl } = req.body;
    
    if (!stripe) {
      return res.json({
        success: true,
        sessionId: 'cs_demo_' + Date.now()
      });
    }
    
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [{ price: priceId, quantity: 1 }],
      mode: 'subscription',
      success_url: successUrl,
      cancel_url: cancelUrl,
      automatic_tax: { enabled: false }
    });

    res.json({
      success: true,
      sessionId: session.id
    });

  } catch (error) {
    console.error('Stripe error:', error);
    res.status(500).json({
      success: false,
      error: 'Payment setup failed'
    });
  }
});

router.post('/verify-session', async (req, res) => {
  try {
    const { sessionId } = req.body;
    
    if (!stripe || sessionId.startsWith('cs_demo_')) {
      return res.json({
        success: true,
        customer: 'demo_customer'
      });
    }
    
    const session = await stripe.checkout.sessions.retrieve(sessionId);
    
    res.json({
      success: session.payment_status === 'paid',
      customer: session.customer,
      subscription: session.subscription
    });

  } catch (error) {
    console.error('Verification error:', error);
    res.status(500).json({
      success: false,
      error: 'Verification failed'
    });
  }
});

module.exports = router;