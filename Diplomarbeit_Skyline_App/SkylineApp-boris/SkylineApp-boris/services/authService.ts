import { GoogleSignin, statusCodes } from '@react-native-google-signin/google-signin';
import * as AuthSession from 'expo-auth-session';
import Constants from 'expo-constants';
import * as Crypto from 'expo-crypto';
import * as WebBrowser from 'expo-web-browser';

// Configure WebBrowser for OAuth
WebBrowser.maybeCompleteAuthSession();

interface OAuthConfig {
  google: {
    clientId: string;
    iosClientId: string;
    webClientId: string;
    scopes: string[];
  };
  microsoft: {
    clientId: string;
    tenantId: string;
    scopes: string[];
    redirectUri: string;
  };
}

class AuthService {
  private static instance: AuthService;
  private config: OAuthConfig;

  private constructor() {
    this.config = {
      google: {
        clientId: Constants.expoConfig?.extra?.googleClientId || '',
        iosClientId: Constants.expoConfig?.extra?.googleIosClientId || '',
        webClientId: Constants.expoConfig?.extra?.googleWebClientId || '',
        scopes: [
          'https://www.googleapis.com/auth/gmail.readonly',
          'https://www.googleapis.com/auth/calendar.readonly',
          'https://www.googleapis.com/auth/calendar.events'
        ]
      },
      microsoft: {
        clientId: Constants.expoConfig?.extra?.microsoftClientId || '',
        tenantId: Constants.expoConfig?.extra?.microsoftTenantId || 'common',
        scopes: [
          'https://graph.microsoft.com/Mail.Read',
          'https://graph.microsoft.com/Calendars.ReadWrite'
        ],
        redirectUri: AuthSession.makeRedirectUri({
          scheme: 'skyline',
          path: 'auth'
        })
      }
    };

    this.initializeGoogleSignin();
  }

  static getInstance(): AuthService {
    if (!AuthService.instance) {
      AuthService.instance = new AuthService();
    }
    return AuthService.instance;
  }

  private initializeGoogleSignin(): void {
    GoogleSignin.configure({
      webClientId: this.config.google.webClientId,
      iosClientId: this.config.google.iosClientId,
      scopes: this.config.google.scopes,
      offlineAccess: true,
      hostedDomain: '',
      forceCodeForRefreshToken: true,
    });
  }

  // Google OAuth Methods
  async authenticateWithGoogle(): Promise<{
    success: boolean;
    userId?: string;
    email?: string;
    accessToken?: string;
    refreshToken?: string;
    error?: string;
  }> {
    try {
      // Check if device supports Google Play Services
      await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });

      // Sign in
      const result: any = await GoogleSignin.signIn();
      const tokens: any = await GoogleSignin.getTokens();
      const user = (result?.user ?? result?.data?.user) as any;

      return {
        success: true,
        userId: user?.id,
        email: user?.email,
        accessToken: tokens.accessToken,
        // google-signin doesn't always provide refreshToken; keep optional
        refreshToken: tokens.refreshToken ?? undefined
      };
    } catch (error: any) {
      if (error.code === statusCodes.SIGN_IN_CANCELLED) {
        return {
          success: false,
          error: 'User cancelled the login flow'
        };
      } else if (error.code === statusCodes.IN_PROGRESS) {
        return {
          success: false,
          error: 'Sign in is in progress already'
        };
      } else if (error.code === statusCodes.PLAY_SERVICES_NOT_AVAILABLE) {
        return {
          success: false,
          error: 'Play services not available or outdated'
        };
      } else {
        return {
          success: false,
          error: error.message || 'Google authentication failed'
        };
      }
    }
  }

  async refreshGoogleToken(): Promise<{
    success: boolean;
    accessToken?: string;
    error?: string;
  }> {
    try {
      const tokens = await GoogleSignin.getTokens();
      return {
        success: true,
        accessToken: tokens.accessToken
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'Failed to refresh Google token'
      };
    }
  }

  async signOutGoogle(): Promise<boolean> {
    try {
      await GoogleSignin.signOut();
      return true;
    } catch (error) {
      return false;
    }
  }

  // Microsoft OAuth Methods
  async authenticateWithMicrosoft(): Promise<{
    success: boolean;
    userId?: string;
    email?: string;
    accessToken?: string;
    refreshToken?: string;
    error?: string;
  }> {
    try {
      const discovery = AuthSession.useAutoDiscovery(
        `https://login.microsoftonline.com/${this.config.microsoft.tenantId}/v2.0`
      );
      if (!discovery) {
        return { success: false, error: 'Microsoft discovery document not available' };
      }

      const request = new AuthSession.AuthRequest({
        clientId: this.config.microsoft.clientId,
        scopes: this.config.microsoft.scopes,
        redirectUri: this.config.microsoft.redirectUri,
        responseType: AuthSession.ResponseType.Code,
        extraParams: {
          prompt: 'select_account'
        }
      });

      const result = await request.promptAsync(discovery);

      if (result.type === 'success') {
        // Exchange code for tokens
        const tokenResult = await this.exchangeCodeForTokens(result.params.code);
        
        if (tokenResult.success) {
          // Get user info
          const userInfo = await this.getMicrosoftUserInfo(tokenResult.accessToken!);
          
          return {
            success: true,
            userId: userInfo.id,
            email: userInfo.mail || userInfo.userPrincipalName,
            accessToken: tokenResult.accessToken,
            refreshToken: tokenResult.refreshToken
          };
        } else {
          return {
            success: false,
            error: tokenResult.error
          };
        }
      } else if (result.type === 'cancel') {
        return {
          success: false,
          error: 'User cancelled the login flow'
        };
      } else {
        return {
          success: false,
          error: 'Microsoft authentication failed'
        };
      }
    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'Microsoft authentication failed'
      };
    }
  }

  private async exchangeCodeForTokens(code: string): Promise<{
    success: boolean;
    accessToken?: string;
    refreshToken?: string;
    error?: string;
  }> {
    try {
      const tokenEndpoint = `https://login.microsoftonline.com/${this.config.microsoft.tenantId}/oauth2/v2.0/token`;
      
      const response = await fetch(tokenEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          client_id: this.config.microsoft.clientId,
          code: code,
          redirect_uri: this.config.microsoft.redirectUri,
          grant_type: 'authorization_code',
          scope: this.config.microsoft.scopes.join(' ')
        }).toString()
      });

      const data = await response.json();

      if (response.ok) {
        return {
          success: true,
          accessToken: data.access_token,
          refreshToken: data.refresh_token
        };
      } else {
        return {
          success: false,
          error: data.error_description || 'Failed to exchange code for tokens'
        };
      }
    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'Failed to exchange code for tokens'
      };
    }
  }

  private async getMicrosoftUserInfo(accessToken: string): Promise<{
    id: string;
    mail?: string;
    userPrincipalName?: string;
  }> {
    const response = await fetch('https://graph.microsoft.com/v1.0/me', {
      headers: {
        Authorization: `Bearer ${accessToken}`
      }
    });

    if (!response.ok) {
      throw new Error('Failed to get user info');
    }

    return await response.json();
  }

  async refreshMicrosoftToken(refreshToken: string): Promise<{
    success: boolean;
    accessToken?: string;
    refreshToken?: string;
    expiresIn?: number;
    error?: string;
  }> {
    try {
      const tokenEndpoint = `https://login.microsoftonline.com/${this.config.microsoft.tenantId}/oauth2/v2.0/token`;
      
      const response = await fetch(tokenEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          client_id: this.config.microsoft.clientId,
          refresh_token: refreshToken,
          grant_type: 'refresh_token',
          scope: this.config.microsoft.scopes.join(' ')
        }).toString()
      });

      const data = await response.json();

      if (response.ok) {
        return {
          success: true,
          accessToken: data.access_token,
          refreshToken: data.refresh_token,
          expiresIn: data.expires_in
        };
      } else {
        return {
          success: false,
          error: data.error_description || 'Failed to refresh token'
        };
      }
    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'Failed to refresh token'
      };
    }
  }

  // Utility methods
  private base64UrlFromBytes(bytes: Uint8Array): string {
    // Convert bytes -> base64 (btoa expects binary string)
    let binary = '';
    for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
    // eslint-disable-next-line no-undef
    const base64 = btoa(binary);
    return base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
  }

  generateCodeVerifier(): string {
    const bytes = Crypto.getRandomBytes(32);
    return this.base64UrlFromBytes(bytes);
  }

  async generateCodeChallenge(verifier: string): Promise<string> {
    const digestB64 = await Crypto.digestStringAsync(
      Crypto.CryptoDigestAlgorithm.SHA256,
      verifier,
      { encoding: Crypto.CryptoEncoding.BASE64 }
    );
    return digestB64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
  }

  // Token validation
  async validateToken(accessToken: string, provider: 'google' | 'microsoft'): Promise<boolean> {
    try {
      let validationUrl: string;
      
      if (provider === 'google') {
        validationUrl = 'https://www.googleapis.com/oauth2/v1/tokeninfo';
      } else {
        validationUrl = 'https://graph.microsoft.com/v1.0/me';
      }

      const response = await fetch(validationUrl, {
        headers: {
          Authorization: `Bearer ${accessToken}`
        }
      });

      return response.ok;
    } catch (error) {
      return false;
    }
  }

  // Clear all authentication data
  async clearAllAuth(): Promise<void> {
    try {
      await this.signOutGoogle();
      // Microsoft tokens are typically stored in memory, so they'll be cleared automatically
    } catch (error) {
      // Error handled silently
    }
  }
}

export default AuthService;
