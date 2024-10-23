// src/index.js
export default {
  async fetch(request, env) {
    const { DATABASE } = env;
    const url = new URL(request.url);
    
    try {
      // Route handling
      switch (url.pathname) {
        case '/subscribe':
          if (request.method !== 'POST') {
            return new Response('Method not allowed', { status: 405 });
          }
          return handleSubscribe(request, DATABASE);
        
        case '/newsletters':
          if (request.method !== 'GET') {
            return new Response('Method not allowed', { status: 405 });
          }
          return handleGetNewsletters(DATABASE);
        
        default:
          return new Response('Not found', { status: 404 });
      }
    } catch (error) {
      return new Response(
        JSON.stringify({ 
          error: 'Internal server error',
          message: error.message 
        }),
        { 
          status: 500,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }
  }
};

async function handleSubscribe(request, db) {
  try {
    // Get email from query parameters
    const url = new URL(request.url);
    const email = url.searchParams.get('email');
    
    // Validate email
    if (!email || !isValidEmail(email)) {
      return new Response(
        JSON.stringify({ error: 'Invalid email address' }), 
        { 
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }

    // Using prepared statement with parameter binding for checking existing email
    const checkStmt = db.prepare(
      'SELECT email FROM newsletters WHERE email = ?1'
    ).bind(email);
    
    const existing = await checkStmt.first();
    
    if (existing) {
      return new Response(
        JSON.stringify({ message: 'Email already subscribed' }),
        { 
          status: 200,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }

    // Using prepared statement with parameter binding for insertion
    const insertStmt = db.prepare(
      'INSERT INTO newsletters (email, created_at) VALUES (?1, datetime("now"))'
    ).bind(email);
    
    const result = await insertStmt.run();

    if (!result.success) {
      throw new Error('Failed to insert subscription');
    }

    return new Response(
      JSON.stringify({ 
        status: 'success',
        message: 'Successfully subscribed to newsletter',
        meta: result.meta // Include operation metadata
      }),
      { 
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({ 
        error: 'Internal server error',
        message: error.message 
      }),
      { 
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  }
}

async function handleGetNewsletters(db) {
  try {
    // Using a prepared statement for selecting all newsletters
    const stmt = db.prepare(`
      SELECT 
        email,
        created_at,
        datetime(created_at) as formatted_date
      FROM newsletters 
      ORDER BY created_at DESC
    `);
    
    const { results, meta } = await stmt.all();

    return new Response(
      JSON.stringify({ 
        status: 'success',
        data: results,
        meta: meta // Include operation metadata
      }),
      { 
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({ 
        error: 'Internal server error',
        message: error.message 
      }),
      { 
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  }
}

function isValidEmail(email) {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}
