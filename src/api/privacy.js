// Privacy Policy endpoint
export default async function handler(req, res) {
  // Set security headers
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  const privacyPolicy = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <title>Privacy Policy - AI Product Description Generator</title>
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <style>
        body {
          font-family: Arial, sans-serif;
          line-height: 1.6;
          color: #333;
          max-width: 800px;
          margin: 0 auto;
          padding: 20px;
          background: linear-gradient(-45deg, #f8fafc, #e2e8f0, #f1f5f9, #e0e7ff, #faf5ff, #f0f9ff);
          background-size: 400% 400%;
          animation: gradient-shift 15s ease infinite;
          min-height: 100vh;
        }
        @keyframes gradient-shift {
          0% { background-position: 0% 0%; }
          50% { background-position: 100% 100%; }
          100% { background-position: 0% 0%; }
        }
        .container {
          background: white;
          padding: 40px;
          border-radius: 10px;
          box-shadow: 0 4px 6px rgba(0,0,0,0.1);
          margin: 20px 0;
        }
        h1 { color: #2c3e50; border-bottom: 2px solid #3498db; padding-bottom: 10px; }
        h2 { color: #34495e; margin-top: 30px; }
        ul { margin: 15px 0; }
        li { margin: 10px 0; }
        .highlight { background: #e8f4fd; padding: 2px 6px; border-radius: 3px; }
        .date { color: #7f8c8d; font-style: italic; }
      </style>
    </head>
    <body>
      <div class="container">
        <h1>Privacy Policy</h1>
        <p class="date">Last updated: ${new Date().toLocaleDateString()}</p>

        <h2>1. Information We Collect</h2>
        <p>We collect the following information when you use our service:</p>
        <ul>
          <li><strong>Email address:</strong> To send you your generated product description and follow-up communications</li>
          <li><strong>Product name and features:</strong> Temporary data used only for generating your description</li>
          <li><strong>Usage data:</strong> How you interact with our service (improves user experience)</li>
        </ul>

        <h2>2. How We Use Your Information</h2>
        <ul>
          <li><span class="highlight">Generate AI product descriptions</span> as requested</li>
          <li>Send you the generated description via email</li>
          <li>Follow up with information about our premium services</li>
          <li>Improve our services through usage analysis</li>
          <li>Ensure platform security and prevent abuse</li>
        </ul>

        <h2>3. Data Storage and Security</h2>
        <p>Your information is stored securely using:</p>
        <ul>
          <li><strong>Supabase:</strong> For database storage with encryption at rest</li>
          <li><strong>Secure transmission:</strong> HTTPS encryption for all data transfers</li>
          <li><strong>Access controls:</strong> Limited access to authorized personnel only</li>
        </ul>

        <h2>4. Data Retention</h2>
        <ul>
          <li><strong>Generated content:</strong> Stored temporarily and sent via email</li>
          <li><strong>Contact information:</strong> Retained until you unsubscribe</li>
          <li><strong>Automatic deletion:</strong> Data older than 2 years is automatically deleted</li>
        </ul>

        <h2>5. Third-Party Services</h2>
        <p>We use the following services to operate our platform:</p>
        <ul>
          <li><strong>Google Gemini:</strong> AI content generation</li>
          <li><strong>Resend:</strong> Email delivery service</li>
          <li><strong>Supabase:</strong> Database hosting</li>
          <li><strong>Vercel:</strong> Web hosting platform</li>
        </ul>

        <h2>6. Your Rights</h2>
        <p>You have the right to:</p>
        <ul>
          <li><strong>Access:</strong> Request a copy of your data</li>
          <li><strong>Correction:</strong> Request correction of inaccurate data</li>
          <li><strong>Deletion:</strong> Request removal of your data (unsubscribe or contact us)</li>
          <li><strong>Portability:</strong> Request your data in a machine-readable format</li>
          <li><strong>Restriction:</strong> Limit how we process your data</li>
        </ul>

        <h2>7. Cookies and Tracking</h2>
        <p>We use minimal tracking:</p>
        <ul>
          <li><strong>Essential cookies:</strong> Required for basic functionality</li>
          <li><strong>No marketing cookies:</strong> We don't use tracking for advertising</li>
          <li><strong>Analytics:</strong> Basic usage statistics to improve service</li>
        </ul>

        <h2>8. Contact Us</h2>
        <p>To exercise your data rights or ask questions:</p>
        <ul>
          <li><strong>Email:</strong> privacy@your-domain.com</li>
          <li><strong>Response time:</strong> We'll respond within 30 days</li>
          <li><strong>Verification:</strong> We may request identity verification for data requests</li>
        </ul>

        <h2>9. Changes to This Policy</h2>
        <p>We may update this privacy policy. Changes will be:</p>
        <ul>
          <li>Posted on this page with an updated date</li>
          <li>Effective immediately for new users</li>
          <li>Communicated to existing users for significant changes</li>
        </ul>

        <p style="margin-top: 30px; text-align: center; color: #7f8c8d;">
          <a href="/" style="color: #3498db; text-decoration: none;">← Back to Homepage</a>
        </p>
      </div>
    </body>
    </html>
  `;

  return res.status(200).setHeader('Content-Type', 'text/html').send(privacyPolicy.trim());
}