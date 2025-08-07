import { handleAuth, handleLogin } from '@auth0/nextjs-auth0';

export default handleAuth({
  login: handleLogin({
    authorizationParams: {
      // Request offline_access scope to get refresh tokens
      scope: 'openid profile email offline_access',
    },
  }),
});
