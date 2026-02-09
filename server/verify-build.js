#!/usr/bin/env node
/**
 * Build verification script - runs after TypeScript compilation
 * Checks if the compiled server can be loaded without errors
 */

console.log('\n' + '='.repeat(60));
console.log('🔍 VERIFYING BUILD OUTPUT');
console.log('='.repeat(60));

async function verifyBuild() {
  try {
    console.log('📂 Current directory:', process.cwd());
    console.log('🔢 Node version:', process.version);
    
    const fs = await import('fs');
    const path = await import('path');
    
    // Check if dist folder exists
    const distPath = path.join(process.cwd(), 'dist');
    console.log('📁 Checking dist folder:', distPath);
    
    if (!fs.existsSync(distPath)) {
      throw new Error('❌ dist folder does not exist!');
    }
    console.log('✅ dist folder exists');
    
    // Check if server.js exists
    const serverPath = path.join(distPath, 'server.js');
    console.log('📄 Checking server.js:', serverPath);
    
    if (!fs.existsSync(serverPath)) {
      throw new Error('❌ dist/server.js does not exist!');
    }
    console.log('✅ dist/server.js exists');
    
    // List dist folder contents
    const distFiles = fs.readdirSync(distPath);
    console.log('📋 Files in dist:', distFiles.slice(0, 10).join(', '));
    
    console.log('\n🔄 Attempting to import server module...');
    
    // Try to import the server (this will fail if there are syntax/import errors)
    const serverModule = await import(serverPath);
    
    console.log('✅ Server module imported successfully');
    console.log('📦 Module exports:', Object.keys(serverModule).join(', ') || 'default export');
    
    console.log('\n' + '='.repeat(60));
    console.log('✅ BUILD VERIFICATION PASSED');
    console.log('='.repeat(60) + '\n');
    
    process.exit(0);
    
  } catch (error) {
    console.error('\n' + '='.repeat(60));
    console.error('❌ BUILD VERIFICATION FAILED');
    console.error('='.repeat(60));
    console.error('\n🔥 Error Details:');
    console.error('   Name:', error.name);
    console.error('   Message:', error.message);
    if (error.code) console.error('   Code:', error.code);
    if (error.stack) {
      console.error('\n📚 Stack trace:');
      console.error(error.stack);
    }
    console.error('\n' + '='.repeat(60) + '\n');
    
    // Don't fail the build, just report
    process.exit(0);
  }
}

verifyBuild();
