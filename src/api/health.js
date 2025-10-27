// Health check endpoint for monitoring and load balancers
export default async function handler(req, res) {
  // Set security headers
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');

  // Only allow GET method for health checks
  if (req.method !== 'GET') {
    return res.status(405).json({
      status: 'error',
      message: 'Method Not Allowed'
    });
  }

  const healthCheck = {
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime ? process.uptime() : 'N/A',
    version: '1.0.0',
    environment: process.env.NODE_ENV || 'development',
    services: {}
  };

  try {
    // Check database connectivity
    if (process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_KEY) {
      try {
        const { createClient } = await import('@supabase/supabase-js');
        const supabase = createClient(
          process.env.SUPABASE_URL,
          process.env.SUPABASE_SERVICE_KEY
        );

        // Simple ping to database
        const { error } = await supabase.from('leads').select('id').limit(1);
        healthCheck.services.database = {
          status: error ? 'error' : 'ok',
          message: error ? 'Database connection failed' : 'Database connection successful'
        };
      } catch (error) {
        healthCheck.services.database = {
          status: 'error',
          message: 'Database service unavailable'
        };
      }
    } else {
      healthCheck.services.database = {
        status: 'not_configured',
        message: 'Database credentials not configured'
      };
    }

    // Check external services (simplified check)
    const services = [
      {
        name: 'gemini_api',
        envVar: 'GEMINI_API_KEY',
        status: process.env.GEMINI_API_KEY ? 'ok' : 'not_configured'
      },
      {
        name: 'resend_api',
        envVar: 'RESEND_API_KEY',
        status: process.env.RESEND_API_KEY ? 'ok' : 'not_configured'
      }
    ];

    services.forEach(service => {
      healthCheck.services[service.name] = {
        status: service.status,
        message: service.status === 'ok' ? 'Service configured' : 'Service not configured'
      };
    });

    // Determine overall health status
    const serviceStatuses = Object.values(healthCheck.services);
    const hasErrors = serviceStatuses.some(s => s.status === 'error');
    const hasCriticalIssues = serviceStatuses.some(s => s.status === 'not_configured' &&
      (s.service.includes('database') || s.service.includes('api')));

    if (hasErrors) {
      healthCheck.status = 'error';
      return res.status(503).json(healthCheck);
    } else if (hasCriticalIssues) {
      healthCheck.status = 'degraded';
      return res.status(200).json(healthCheck);
    }

    return res.status(200).json(healthCheck);

  } catch (error) {
    return res.status(503).json({
      status: 'error',
      timestamp: new Date().toISOString(),
      message: 'Health check failed',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
}