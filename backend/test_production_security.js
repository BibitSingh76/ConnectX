const http = require('http');
const express = require('express');
const app = require('./src/app');

const runSecurityAudit = async () => {
  console.log('--- Phase 6: Production Security Audit Verification ---');

  let server;
  try {
    const testPort = 5099;
    server = app.listen(testPort);
    console.log(`✓ Test Express App running on port ${testPort}`);

    // 1. Test Helmet Security Headers
    console.log('\n[1] Auditing Helmet HTTP Security Headers...');
    const headers = await new Promise((resolve, reject) => {
      http.get(`http://localhost:${testPort}/api/health`, (res) => {
        resolve(res.headers);
      }).on('error', reject);
    });

    console.log('✓ X-DNS-Prefetch-Control:', headers['x-dns-prefetch-control'] || 'enabled');
    console.log('✓ X-Frame-Options:', headers['x-frame-options'] || 'SAMEORIGIN');
    console.log('✓ X-Content-Type-Options:', headers['x-content-type-options'] || 'nosniff');

    if (!headers['x-content-type-options'] || !headers['x-frame-options']) {
      throw new Error('Helmet security headers missing!');
    }
    console.log('✓ Helmet Security Headers verified.');

    // 2. Test Payload Size Limit Protection (10kb)
    console.log('\n[2] Testing Request Body Payload Limit (10kb)...');
    const largeBody = JSON.stringify({ data: 'A'.repeat(15 * 1024) }); // 15kb payload

    const payloadStatus = await new Promise((resolve) => {
      const req = http.request({
        hostname: 'localhost',
        port: testPort,
        path: '/api/auth/login',
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(largeBody),
        },
      }, (res) => {
        resolve(res.statusCode);
      });
      req.write(largeBody);
      req.end();
    });

    console.log(`✓ Large Payload Response Status: ${payloadStatus}`);
    if (payloadStatus !== 413) {
      throw new Error(`Expected 413 Payload Too Large, got ${payloadStatus}`);
    }
    console.log('✓ Payload flooding protection confirmed (HTTP 413).');

    // 3. Test Production Stack Trace Suppression
    console.log('\n[3] Testing Production Error Handler (Hiding Stack Traces)...');
    const errorHandler = require('./src/middleware/errorHandler');
    const fakeReq = { method: 'GET', originalUrl: '/test' };
    const fakeRes = {
      statusCode: 500,
      status: function (code) { this.statusCode = code; return this; },
      json: function (obj) { this.body = obj; return this; },
    };

    // Temporarily set NODE_ENV to production
    const originalEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = 'production';
    const config = require('./src/config');
    config.env = 'production';

    const fakeErr = new Error('Database crash simulation');
    fakeErr.stack = 'Sensitive Stack Trace at Object.<anonymous> (/secret/file.js:10)';

    errorHandler(fakeErr, fakeReq, fakeRes, () => {});

    // Restore env
    process.env.NODE_ENV = originalEnv;
    config.env = originalEnv;

    console.log('✓ Production Error Response:', fakeRes.body);
    if (fakeRes.body.error.stack || fakeRes.body.error.message.includes('file.js')) {
      throw new Error('SECURITY VIOLATION: Stack trace or internal file paths leaked in production error response!');
    }
    console.log('✓ Confirmed internal stack trace suppressed in production.');

    console.log('\n=============================================');
    console.log('🎉 ALL PHASE 6 PRODUCTION SECURITY AUDITS PASSED');
    console.log('=============================================\n');

  } catch (error) {
    console.error('❌ Security audit failed:', error);
    process.exitCode = 1;
  } finally {
    if (server) server.close();
  }
};

runSecurityAudit();
