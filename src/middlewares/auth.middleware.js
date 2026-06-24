import { supabaseAuth } from '../config/supabase.js';
import { env } from '../config/env.js';
import { ApiError } from './error.middleware.js';
import { ensureProfile } from '../services/profile.service.js';

function getBearerToken(req) {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) return null;

  return header.slice('Bearer '.length).trim();
}

export async function optionalAuth(req, _res, next) {
  try {
    const token = getBearerToken(req);

    if (!token) {
      await ensureProfile({ id: env.DEV_USER_ID, displayName: 'MindShift Dev' });
      req.user = {
        id: env.DEV_USER_ID,
        authProvider: 'dev',
      };
      return next();
    }

    if (!supabaseAuth) {
      throw new ApiError(503, 'SUPABASE_NOT_CONFIGURED', 'Supabase auth client is not configured');
    }

    const { data, error } = await supabaseAuth.auth.getUser(token);

    if (error || !data.user) {
      throw new ApiError(401, 'INVALID_TOKEN', error?.message ?? 'Invalid authentication token');
    }

    const profile = await ensureProfile({
      id: data.user.id,
      email: data.user.email,
      username: data.user.user_metadata?.username,
      displayName: data.user.user_metadata?.display_name,
    });

    req.user = {
      id: profile.id,
      email: profile.email,
      username: profile.username,
      authProvider: 'supabase',
    };

    return next();
  } catch (error) {
    return next(error);
  }
}

export async function requireAuth(req, res, next) {
  await optionalAuth(req, res, (error) => {
    if (error) return next(error);

    if (req.user?.authProvider !== 'supabase') {
      return next(new ApiError(401, 'AUTH_REQUIRED', 'Authentication is required'));
    }

    return next();
  });
}
