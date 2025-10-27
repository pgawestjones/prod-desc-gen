// api/generate.js
// Import necessary SDKs
import { createClient } from '@supabase/supabase-js';
import { Resend } from 'resend';
import { GoogleGenerativeAI } from '@google/generative-ai';

// Environment variable validation
function validateEnvironmentVariables() {
  const requiredVars = {
    'SUPABASE_URL': 'Supabase project URL',
    'SUPABASE_SERVICE_KEY': 'Supabase service key',
    'RESEND_API_KEY': 'Resend API key',
    'GEMINI_API_KEY': 'Google Gemini API key'
  };

  const missing = [];
  for (const [varName, description] of Object.entries(requiredVars)) {
    if (!process.env[varName]) {
      missing.push(`${varName} (${description})`);
    }
  }

  if (missing.length > 0) {
    throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
  }

  return true;
}

// Validate environment on startup
validateEnvironmentVariables();

// Initialize clients from Environment Variables
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);
const resend = new Resend(process.env.RESEND_API_KEY);
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: "gemini-pro" });

// Rate limiting using in-memory store (for Vercel serverless)
const rateLimitMap = new Map();
const RATE_LIMIT_WINDOW = 60 * 1000; // 1 minute
const RATE_LIMIT_MAX_REQUESTS = 5; // 5 requests per minute per IP

// Simple response cache (in-memory for serverless)
const responseCache = new Map();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes cache

// Generate cache key from input
function getCacheKey(productName, productFeatures) {
  // Create a normalized key from input parameters
  const normalizedFeatures = productFeatures.toLowerCase().trim().slice(0, 200);
  const normalizedName = productName.toLowerCase().trim();
  return `${normalizedName}:${normalizedFeatures}`;
}

// Cache management function
function cleanCache() {
  const now = Date.now();
  for (const [key, value] of responseCache.entries()) {
    if (now - value.timestamp > CACHE_TTL) {
      responseCache.delete(key);
    }
  }
}

// Get client IP from request headers
function getClientIP(req) {
  return req.headers['x-forwarded-for']?.split(',')[0] ||
         req.headers['x-real-ip'] ||
         req.connection?.remoteAddress ||
         'unknown';
}

// Input validation and sanitization
function validateAndSanitizeInput(data) {
  const { productName, productFeatures, email } = data;

  // Email validation with strict regex
  const emailRegex = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9-]+(?:\.[a-zA-Z0-9-]+)*$/;

  if (!email || !emailRegex.test(email.trim())) {
    return { valid: false, error: 'Invalid email address format' };
  }

  if (!productName || typeof productName !== 'string') {
    return { valid: false, error: 'Product name is required and must be text' };
  }

  if (!productFeatures || typeof productFeatures !== 'string') {
    return { valid: false, error: 'Product features are required and must be text' };
  }

  // Length validation
  const cleanProductName = productName.trim().slice(0, 100);
  const cleanProductFeatures = productFeatures.trim().slice(0, 2000);
  const cleanEmail = email.trim().toLowerCase();

  if (cleanProductName.length === 0) {
    return { valid: false, error: 'Product name cannot be empty' };
  }

  if (cleanProductFeatures.length === 0) {
    return { valid: false, error: 'Product features cannot be empty' };
  }

  // Content sanitization - remove potentially dangerous characters
  const sanitizeText = (text) => {
    return text
      .replace(/[\x00-\x1F\x7F]/g, '') // Remove control characters
      .replace(/[<>]/g, '') // Remove potential HTML tags
      .trim();
  };

  return {
    valid: true,
    data: {
      productName: sanitizeText(cleanProductName),
      productFeatures: sanitizeText(cleanProductFeatures),
      email: sanitizeText(cleanEmail)
    }
  };
}

// Rate limiting function
function checkRateLimit(ip) {
  const now = Date.now();
  const requests = rateLimitMap.get(ip) || [];

  // Filter out expired requests
  const validRequests = requests.filter(timestamp => now - timestamp < RATE_LIMIT_WINDOW);

  if (validRequests.length >= RATE_LIMIT_MAX_REQUESTS) {
    return false;
  }

  // Add current request
  validRequests.push(now);
  rateLimitMap.set(ip, validRequests);

  // Clean up old entries periodically
  if (Math.random() < 0.01) { // 1% chance to clean up
    for (const [key, timestamps] of rateLimitMap.entries()) {
      const valid = timestamps.filter(t => now - t < RATE_LIMIT_WINDOW);
      if (valid.length === 0) {
        rateLimitMap.delete(key);
      } else {
        rateLimitMap.set(key, valid);
      }
    }
  }

  return true;
}

// Structured logging function
function logEvent(level, message, data = {}) {
  const logData = {
    timestamp: new Date().toISOString(),
    level,
    service: 'product-description-generator',
    message,
    ...data,
    environment: process.env.NODE_ENV || 'development'
  };
  console.log(JSON.stringify(logData));
}

// --- Asset: LLM Prompt Template ---
const getLLMPrompt = (productName, productFeatures) => {
  return `
You are a world-class e-commerce copywriter specializing in direct-to-consumer sales. Your tone is persuasive, high-end, and benefits-driven.

Generate a compelling, 100-word product description for the following product.

**Product Name:** ${productName}
**Key Features:** ${productFeatures}

Focus on benefits, not just features. Use emotional language to paint a picture of how the product will improve the customer's life. Start with a strong hook and end with a soft call-to-action. Do not use markdown.
`;
};

// --- Asset: Email Templates ---
const emailTemplates = {
  immediate: (description, email) => ({
    subject: "Here's your free AI-generated description!",
    html: `<p>Hi there,</p>
           <p>Thanks for trying our AI product description generator. Here is the description you generated:</p>
           <div style="background-color: #f4f4f4; border-radius: 8px; padding: 20px; margin: 20px 0;">
             <p>${description.replace(/\n/g, '<br>')}</p>
           </div>
           <p>It's pretty good, right? But now, imagine this level of quality for <strong>all</strong> your products. Keep an eye out for another email from us in a couple of hours with an idea for you.</p>
           <p>Best,<br>The Team</p>
           <hr style="border: none; border-top: 1px solid #e0e0e0; margin: 20px 0;">
           <p style="font-size: 12px; color: #666;">
             You're receiving this email because you requested a product description from our service.
             <br>
             <a href="${process.env.BASE_URL || 'https://your-domain.com'}/api/unsubscribe?email=${encodeURIComponent(email)}" style="color: #666;">Unsubscribe</a> |
             <a href="${process.env.BASE_URL || 'https://your-domain.com'}/privacy" style="color: #666;">Privacy Policy</a>
           </p>`
  }),
  twoHour: (email) => ({
    subject: "Are your other product descriptions costing you sales?",
    html: `<p>Hi again,</p>
           <p>That one description we sent you is already better than 90% of descriptions online. But what about the rest of your store?</p>
           <p>Most e-commerce stores have descriptions that are:
           <ul>
             <li>Copied from the manufacturer</li>
             <li>Too short or full of jargon</li>
             <li>Focused on features, not <strong>benefits</strong></li>
           </ul>
           <p>This is actively costing you sales. Customers are bored, confused, or uninspired. They click away and buy from your competitor.</p>
           <p>We have a solution for this. I'll send you one final email in a few hours with a special one-time offer to fix this permanently.</p>
           <p>Best,<br>The Team</p>
           <hr style="border: none; border-top: 1px solid #e0e0e0; margin: 20px 0;">
           <p style="font-size: 12px; color: #666;">
             <a href="${process.env.BASE_URL || 'https://your-domain.com'}/api/unsubscribe?email=${encodeURIComponent(email)}" style="color: #666;">Unsubscribe</a> |
             <a href="${process.env.BASE_URL || 'https://your-domain.com'}/privacy" style="color: #666;">Privacy Policy</a>
           </p>`
  }),
  sixHour: (stripeLink, email) => ({
    subject: "One-Time Offer: We'll Rewrite Your Entire Catalog for $500",
    html: `<p>Hi,</p>
           <p>This is the offer we mentioned. Let's be direct.</p>
           <p>You're losing money with your current product descriptions. We want to fix that, overnight.</p>
           <p>For <strong>$500</strong>, our team of AI-assisted expert copywriters will rewrite your entire product catalog (up to 200 products). We will deliver a simple CSV file with persuasive, SEO-optimized, and benefits-driven descriptions for every product you sell.</p>
           <p>This is a one-time offer to prove our value. No contracts, no subscriptions. Just a one-time flat fee to transform your store.</p>
           <p><strong><a href="${stripeLink}">Click Here to Get Your $500 Catalog Rewrite</a></strong></p>
           <p>After you pay, simply reply to the confirmation email with a link to your store or a CSV of your products, and we'll have the new descriptions back to you within 24 hours.</p>
           <p>This offer is only for new users of our free tool. Don't miss it.</p>
           <p>Best,<br>The Team</p>
           <hr style="border: none; border-top: 1px solid #e0e0e0; margin: 20px 0;">
           <p style="font-size: 12px; color: #666;">
             <a href="${process.env.BASE_URL || 'https://your-domain.com'}/api/unsubscribe?email=${encodeURIComponent(email)}" style="color: #666;">Unsubscribe</a> |
             <a href="${process.env.BASE_URL || 'https://your-domain.com'}/privacy" style="color: #666;">Privacy Policy</a>
           </p>`
  })
};
// --- End Assets ---

export default async function handler(req, res) {
  // Set security headers
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');

  // Add request ID for tracing
  const requestId = req.headers['x-request-id'] || `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  res.setHeader('X-Request-ID', requestId);

  const startTime = Date.now();
  logEvent('INFO', 'Request received', {
    requestId,
    method: req.method,
    ip: getClientIP(req)
  });

  // Only allow POST method
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  // Rate limiting
  const clientIP = getClientIP(req);
  if (!checkRateLimit(clientIP)) {
    return res.status(429).json({
      error: 'Too many requests. Please try again later.'
    });
  }

  try {
    // Input validation and sanitization
    const validation = validateAndSanitizeInput(req.body);
    if (!validation.valid) {
      return res.status(400).json({ error: validation.error });
    }

    const { productName, productFeatures, email } = validation.data;

    // Check cache first (only for description generation part)
    const cacheKey = getCacheKey(productName, productFeatures);
    cleanCache(); // Clean expired entries

    const cachedItem = responseCache.get(cacheKey);
    if (cachedItem && (Date.now() - cachedItem.timestamp < CACHE_TTL)) {
      logEvent('INFO', 'Cache hit for description', { requestId, cacheKey });

      // Still save to database and send emails for new requests
      try {
        const { data: dbData, error: dbError } = await supabase
          .from('leads')
          .upsert({
            email: email,
            product_name: productName,
            created_at: new Date().toISOString()
          }, {
            onConflict: 'email',
            ignoreDuplicates: false
          });

        if (!dbError) {
          logEvent('INFO', 'Data saved to database (cache hit)', { requestId });
        }

        // Send emails with cached description
        const email1 = emailTemplates.immediate(cachedItem.description, email);
        await resend.emails.send({
          from: process.env.FROM_EMAIL || 'Your Name <sales@your-verified-domain.com>',
          to: email,
          subject: email1.subject,
          html: email1.html,
        });

      } catch (cacheError) {
        logEvent('WARN', 'Cache hit processing failed', {
          requestId,
          error: {
            message: cacheError.message,
            name: cacheError.name,
            stack: cacheError.stack
          }
        });
      }

      const duration = Date.now() - startTime;
      logEvent('INFO', 'Request completed successfully (cache hit)', {
        requestId,
        duration: `${duration}ms`,
        cacheHit: true
      });

      return res.status(200).json({ description: cachedItem.description.trim() });
    }

    logEvent('INFO', 'Cache miss', { requestId, cacheKey });

    // === STEP 1: Save to Database ===
    // We use upsert to handle unique email constraint gracefully.
    // If the email exists, we'll just update the product_name.
    const { data: dbData, error: dbError } = await supabase
      .from('leads')
      .upsert({
        email: email,
        product_name: productName,
        created_at: new Date().toISOString()
      }, {
        onConflict: 'email',
        ignoreDuplicates: false
      });

    if (dbError) {
      logEvent('WARN', 'Database error occurred', {
        requestId,
        error: {
          message: dbError.message,
          code: dbError.code,
          details: dbError.details
        }
      });
    } else {
      logEvent('INFO', 'Data saved to database', { requestId });
    }

    // === STEP 2: Call LLM API ===
    const prompt = getLLMPrompt(productName, productFeatures);

    // Add timeout to prevent hanging
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error('Request timeout')), 30000);
    });

    const llmPromise = model.generateContent(prompt);
    const result = await Promise.race([llmPromise, timeoutPromise]);
    const response = await result.response;
    const description = response.text();

    if (!description || description.trim().length === 0) {
      throw new Error('LLM failed to generate a valid description.');
    }

    logEvent('INFO', 'LLM description generated successfully', {
      requestId,
      descriptionLength: description.length
    });

    // Store in cache
    responseCache.set(cacheKey, {
      description: description.trim(),
      timestamp: Date.now()
    });

    // === STEP 3: Trigger Email Sequence (All 3) ===
    const stripeLink = process.env.STRIPE_CHECKOUT_LINK;
    const fromEmail = process.env.FROM_EMAIL || 'Your Name <sales@your-verified-domain.com>';

    let emailsSentSuccessfully = false;
    try {
      // 1. Immediate Email
      const email1 = emailTemplates.immediate(description, email);
      await resend.emails.send({
        from: fromEmail,
        to: email,
        subject: email1.subject,
        html: email1.html,
      });

      // 2. Scheduled 2-Hour Email
      const email2 = emailTemplates.twoHour(email);
      await resend.emails.send({
        from: fromEmail,
        to: email,
        subject: email2.subject,
        html: email2.html,
        scheduled_at: new Date(Date.now() + 2 * 60 * 60 * 1000), // 2 hours
      });

      // 3. Scheduled 6-Hour Email (only if stripe link is configured)
      if (stripeLink) {
        const email3 = emailTemplates.sixHour(stripeLink, email);
        await resend.emails.send({
          from: fromEmail,
          to: email,
          subject: email3.subject,
          html: email3.html,
          scheduled_at: new Date(Date.now() + 6 * 60 * 60 * 1000), // 6 hours
        });
      }
      emailsSentSuccessfully = true;
    } catch (emailError) {
      logEvent('ERROR', 'Email sending failed', {
        requestId,
        error: {
          message: emailError.message,
          name: emailError.name,
          stack: emailError.stack
        },
        email: email
      });
      // Don't fail the request for email issues, but log for monitoring
    }

    if (emailsSentSuccessfully) {
      logEvent('INFO', 'All emails sent successfully', {
        requestId,
        email: email,
        stripeLinkConfigured: !!stripeLink
      });
    }

    // === STEP 4: Respond to Frontend ===
    const duration = Date.now() - startTime;
    logEvent('INFO', 'Request completed successfully', {
      requestId,
      duration: `${duration}ms`,
      email: email,
      cacheHit: false
    });

    return res.status(200).json({ description: description.trim() });

  } catch (error) {
    const duration = Date.now() - startTime;
    logEvent('ERROR', 'Request failed', {
      requestId,
      duration: `${duration}ms`,
      error: {
        message: error.message,
        stack: error.stack,
        name: error.name
      },
      request: {
        method: req.method,
        ip: getClientIP(req)
      }
    });

    // Don't expose internal error details to client
    const errorMessage = process.env.NODE_ENV === 'development'
      ? error.message
      : 'An error occurred while generating your description.';

    return res.status(500).json({
      error: errorMessage,
      requestId
    });
  }
}
