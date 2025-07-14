const express = require('express');
const { body, validationResult } = require('express-validator');
const router = express.Router();

// Initialize Stripe securely
let stripe;
if (process.env.STRIPE_SECRET_KEY) {
  stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
  console.log('✅ Stripe initialized securely');
} else {
  console.warn('⚠️ STRIPE_SECRET_KEY not found');
}

// Validation rules for checkout
const validateCheckout = [
  body('priceId')
    .isLength({ min: 1, max: 100 })
    .matches(/^price_[a-zA-Z0-9]+$/)
    .withMessage('Invalid price ID format'),
  body('successUrl')
    .isURL({ protocols: ['https'] })
    .withMessage('Success URL must be HTTPS'),
  body('cancelUrl')
    .isURL({ protocols: ['https'] })
    .withMessage('Cancel URL must be HTTPS')
];

router.post('/create-checkout-session', validateCheckout, async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        errors: errors.array()
      });
    }

    const { priceId, successUrl, cancelUrl } = req.body;
    
    if (!stripe) {
      return res.json({
        success: true,
        sessionId: 'cs_demo_' + Date.now(),
        demo: true
      });
    }
    
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [{
        price: priceId,
        quantity: 1,
      }],
      mode: 'subscription',
      success_url: successUrl,
      cancel_url: cancelUrl,
      automatic_tax: { enabled: false },
      allow_promotion_codes: false,
      billing_address_collection: 'required',
      customer_creation: 'always'
    });

    // Log successful session creation (without sensitive data)
    console.log('✅ Checkout session created:', session.id.substring(0, 10) + '...');
    
    res.json({
      success: true,
      sessionId: session.id
    });
  } catch (error) {
    console.error('❌ Stripe checkout error:', error.message);
    res.status(500).json({
      success: false,
      error: 'Payment setup failed'
    });
  }
});

// Session verification with validation
router.post('/verify-session', [
  body('sessionId')
    .isLength({ min: 1, max: 200 })
    .matches(/^cs_[a-zA-Z0-9_]+$/)
    .withMessage('Invalid session ID format')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        errors: errors.array()
      });
    }

    const { sessionId } = req.body;
    
    if (!stripe || sessionId.startsWith('cs_demo_')) {
      return res.json({
        success: true,
        customer: 'demo_customer'
      });
    }
    
    const session = await stripe.checkout.sessions.retrieve(sessionId);
    
    console.log('Session verified:', session.id.substring(0, 10) + '...');
    
    res.json({
      success: session.payment_status === 'paid',
      customer: session.customer,
      subscription: session.subscription
    });
  } catch (error) {
    console.error('❌ Session verification error:', error.message);
    res.status(500).json({
      success: false,
      error: 'Verification failed'
    });
  }
});

// Webhook endpoint for Stripe events
router.post('/webhook', express.raw({type: 'application/json'}), async (req, res) => {
  if (!stripe || !process.env.STRIPE_WEBHOOK_SECRET) {
    return res.status(400).json({ error: 'Webhooks not configured' });
  }

  const sig = req.headers['stripe-signature'];

  try {
    const event = stripe.webhooks.constructEvent(
      req.body, 
      sig, 
      process.env.STRIPE_WEBHOOK_SECRET
    );
    
    // Handle webhook events securely
    switch (event.type) {
      case 'checkout.session.completed':
        console.log('✅ Payment successful');
        break;
      case 'customer.subscription.deleted':
        console.log('⚠️ Subscription cancelled');
        break;
      default:
        console.log(`Unhandled event type: ${event.type}`);
    }
    
    res.json({ received: true });
  } catch (error) {
    console.error('❌ Webhook error:', error.message);
    res.status(400).json({ error: 'Webhook verification failed' });
  }
});

module.exports = router;