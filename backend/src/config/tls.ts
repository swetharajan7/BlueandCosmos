import https from 'https';
import fs from 'fs';
import path from 'path';

export interface TLSConfig {
  key?: string;
  cert?: string;
  ca?: string;
  secureProtocol?: string;
  ciphers?: string;
  honorCipherOrder?: boolean;
  minVersion?: string;
  maxVersion?: string;
}

/**
 * TLS 1.3 configuration for production
 */
export const getTLSConfig = (): TLSConfig | null => {
  if (process.env.NODE_ENV !== 'production') {
    return null;
  }

  const tlsConfig: TLSConfig = {
    // TLS 1.3 configuration
    minVersion: 'TLSv1.3',
    maxVersion: 'TLSv1.3',
    
    // Secure cipher suites for TLS 1.3
    ciphers: [
      'TLS_AES_256_GCM_SHA384',
      'TLS_CHACHA20_POLY1305_SHA256',
      'TLS_AES_128_GCM_SHA256',
      'TLS_AES_128_CCM_SHA256',
      'TLS_AES_128_CCM_8_SHA256'
    ].join(':'),
    
    honorCipherOrder: true,
    secureProtocol: 'TLSv1_3_method'
  };

  // Load SSL certificates if available
  try {
    const certPath = process.env.SSL_CERT_PATH || '/etc/ssl/certs/stellarrec.crt';
    const keyPath = process.env.SSL_KEY_PATH || '/etc/ssl/private/stellarrec.key';
    const caPath = process.env.SSL_CA_PATH;

    if (fs.existsSync(certPath) && fs.existsSync(keyPath)) {
      tlsConfig.cert = fs.readFileSync(certPath, 'utf8');
      tlsConfig.key = fs.readFileSync(keyPath, 'utf8');
      
      if (caPath && fs.existsSync(caPath)) {
        tlsConfig.ca = fs.readFileSync(caPath, 'utf8');
      }
      
      console.log('✅ TLS certificates loaded successfully');
    } else {
      console.warn('⚠️  TLS certificates not found, using HTTP in production');
      return null;
    }
  } catch (error) {
    console.error('❌ Error loading TLS certificates:', error);
    return null;
  }

  return tlsConfig;
};

/**
 * Create HTTPS server with TLS 1.3 configuration
 */
export const createSecureServer = (app: any): https.Server | null => {
  const tlsConfig = getTLSConfig();
  
  if (!tlsConfig || !tlsConfig.cert || !tlsConfig.key) {
    return null;
  }

  return https.createServer(tlsConfig, app);
};

/**
 * Security headers for HTTPS
 */
export const getSecurityHeaders = () => {
  return {
    'Strict-Transport-Security': 'max-age=31536000; includeSubDomains; preload',
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'DENY',
    'X-XSS-Protection': '1; mode=block',
    'Referrer-Policy': 'strict-origin-when-cross-origin',
    'Content-Security-Policy': [
      "default-src 'self'",
      "script-src 'self'",
      "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
      "font-src 'self' https://fonts.gstatic.com",
      "img-src 'self' data: https:",
      "connect-src 'self' https://api.openai.com https://docs.googleapis.com",
      "frame-src 'none'",
      "object-src 'none'",
      "upgrade-insecure-requests"
    ].join('; ')
  };
};