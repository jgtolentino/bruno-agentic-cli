const fs = require('fs');
const path = require('path');

function analyzeTokens() {
    const envPath = '/Users/tbwa/.bruno/clodrep/.clodrep.env';
    
    if (!fs.existsSync(envPath)) {
        console.log('❌ .clodrep.env not found at:', envPath);
        return;
    }

    const env = fs.readFileSync(envPath, 'utf8');
    const tokens = env.split('\n')
        .filter(line => line.includes('=') && !line.startsWith('#'))
        .map(line => {
            const [key, value] = line.split('=');
            const hasValue = value && value !== 'your_' + key.toLowerCase() + '_here' && 
                             !value.includes('token_here') && !value.includes('key_here') &&
                             !value.includes('secret_here') && !value.includes('localhost') &&
                             value.length > 10;
            return { key: key.trim(), hasValue, value: hasValue ? '✅ SET' : '❌ NEEDS VALUE' };
        });

    console.log('🔐 TOKEN INVENTORY - Bruno Agentic CLI');
    console.log('=====================================');
    console.log('');

    const configured = tokens.filter(t => t.hasValue);
    const missing = tokens.filter(t => !t.hasValue);

    console.log(`✅ CONFIGURED (${configured.length}): `);
    configured.forEach(t => console.log(`  ${t.key}`));

    console.log('');
    console.log(`❌ MISSING (${missing.length}): `);
    missing.forEach(t => console.log(`  ${t.key}`));

    console.log('');
    console.log('📄 FOR GOOGLE DOCS INTEGRATION:');
    console.log('  GOOGLE_APPLICATION_CREDENTIALS (service account JSON file path)');
    console.log('  GOOGLE_DOCS_API_KEY (from Google Cloud Console)');
    console.log('');
    console.log('📋 ASANA ALTERNATIVE TO SLACK:');
    console.log('  ASANA_ACCESS_TOKEN (get from https://app.asana.com/0/developer-console)');
    console.log('');
    console.log('🎯 YOU MENTIONED HAVING:');
    console.log('  GITHUB_TOKEN=ghp_xxxxxxxxxxxxxxxxxxxx ✅');
    console.log('  NOTION_TOKEN=secret_xxxxxxxxxxxxxxxxxxxx ✅'); 
    console.log('  VERCEL_TOKEN=xxxxxxxxxxxxxxxxxxxxxxxxxx ✅');
    console.log('');
    console.log('🔧 TO CREATE MISSING TOKENS:');
    console.log('');
    console.log('1. GOOGLE_APPLICATION_CREDENTIALS:');
    console.log('   - Go to https://console.cloud.google.com/');
    console.log('   - Create service account');
    console.log('   - Download JSON key file');
    console.log('   - Set path to this file');
    console.log('');
    console.log('2. GOOGLE_DOCS_API_KEY:');
    console.log('   - Enable Google Docs API in Cloud Console');
    console.log('   - Create API key');
    console.log('');
    console.log('3. ASANA_ACCESS_TOKEN (instead of Slack):');
    console.log('   - Go to https://app.asana.com/0/developer-console');
    console.log('   - Create Personal Access Token');
    console.log('');
    console.log('4. OPENAI_API_KEY:');
    console.log('   - Go to https://platform.openai.com/api-keys');
    console.log('   - Create new secret key');
}

analyzeTokens();