// Unsubscribe endpoint for email compliance
export default async function handler(req, res) {
  // Set security headers
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');

  // Handle GET requests for unsubscribe links from emails
  if (req.method === 'GET') {
    const { email } = req.query;

    if (!email) {
      return res.status(400).send(`
        <!DOCTYPE html>
        <html>
        <head>
          <title>Unsubscribe Error</title>
          <style>
            body { font-family: Arial, sans-serif; text-align: center; padding: 50px; }
            .container { max-width: 600px; margin: 0 auto; }
            .error { color: #dc3545; }
          </style>
        </head>
        <body>
          <div class="container">
            <h1 class="error">Unsubscribe Error</h1>
            <p>Invalid unsubscribe link. Please contact support for assistance.</p>
            <a href="/">Return to Homepage</a>
          </div>
        </body>
        </html>
      `);
    }

    try {
      // Validate email format
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        throw new Error('Invalid email format');
      }

      // Mark email as unsubscribed in database
      const { createClient } = await import('@supabase/supabase-js');
      const supabase = createClient(
        process.env.SUPABASE_URL,
        process.env.SUPABASE_SERVICE_KEY
      );

      const { error } = await supabase
        .from('leads')
        .update({
          unsubscribed: true,
          unsubscribed_at: new Date().toISOString()
        })
        .eq('email', email.toLowerCase());

      if (error) {
        console.error('Unsubscribe database error:', error);
        // Don't expose database errors to user
      }

      // Return success page
      return res.status(200).send(`
        <!DOCTYPE html>
        <html>
        <head>
          <title>Successfully Unsubscribed</title>
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <style>
            body {
              font-family: Arial, sans-serif;
              text-align: center;
              padding: 50px 20px;
              background: linear-gradient(-45deg, #f8fafc, #e2e8f0, #f1f5f9, #e0e7ff, #faf5ff, #f0f9ff);
              background-size: 400% 400%;
              animation: gradient-shift 15s ease infinite;
              min-height: 100vh;
              margin: 0;
            }
            @keyframes gradient-shift {
              0% { background-position: 0% 0%; }
              50% { background-position: 100% 100%; }
              100% { background-position: 0% 0%; }
            }
            .container {
              max-width: 600px;
              margin: 0 auto;
              background: white;
              padding: 40px;
              border-radius: 10px;
              box-shadow: 0 4px 6px rgba(0,0,0,0.1);
            }
            .success { color: #28a745; }
            .email {
              background: #f8f9fa;
              padding: 10px;
              border-radius: 5px;
              margin: 20px 0;
              word-break: break-all;
            }
            .home-link {
              color: #007bff;
              text-decoration: none;
              display: inline-block;
              margin-top: 20px;
              padding: 10px 20px;
              background: #007bff;
              color: white;
              border-radius: 5px;
            }
            .home-link:hover { background: #0056b3; }
          </style>
        </head>
        <body>
          <div class="container">
            <h1 class="success">✓ Successfully Unsubscribed</h1>
            <p>You have been successfully removed from our mailing list.</p>
            <div class="email">${email}</div>
            <p>You will no longer receive promotional emails from us.</p>
            <p>If you change your mind, you can always subscribe again by using our product description generator.</p>
            <a href="/" class="home-link">Return to Homepage</a>
          </div>
        </body>
        </html>
      `);

    } catch (error) {
      console.error('Unsubscribe error:', error);
      return res.status(500).send(`
        <!DOCTYPE html>
        <html>
        <head>
          <title>Unsubscribe Error</title>
          <style>
            body { font-family: Arial, sans-serif; text-align: center; padding: 50px; }
            .container { max-width: 600px; margin: 0 auto; }
            .error { color: #dc3545; }
          </style>
        </head>
        <body>
          <div class="container">
            <h1 class="error">Unsubscribe Error</h1>
            <p>Sorry, there was an error processing your unsubscribe request.</p>
            <p>Please try again later or contact support for assistance.</p>
            <a href="/">Return to Homepage</a>
          </div>
        </body>
        </html>
      `);
    }
  }

  // Handle POST requests for form submissions
  if (req.method === 'POST') {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ error: 'Email is required' });
    }

    try {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        return res.status(400).json({ error: 'Invalid email format' });
      }

      // Mark as unsubscribed
      const { createClient } = await import('@supabase/supabase-js');
      const supabase = createClient(
        process.env.SUPABASE_URL,
        process.env.SUPABASE_SERVICE_KEY
      );

      await supabase
        .from('leads')
        .update({
          unsubscribed: true,
          unsubscribed_at: new Date().toISOString()
        })
        .eq('email', email.toLowerCase());

      return res.status(200).json({
        success: true,
        message: 'Successfully unsubscribed'
      });

    } catch (error) {
      console.error('Unsubscribe error:', error);
      return res.status(500).json({
        error: 'Failed to unsubscribe. Please try again.'
      });
    }
  }

  // Invalid method
  return res.status(405).json({
    error: 'Method Not Allowed'
  });
}