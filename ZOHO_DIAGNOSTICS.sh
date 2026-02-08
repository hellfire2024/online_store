#!/bin/bash

# Zoho Mail API Connection Diagnostics Script
# Run this to test your Zoho Mail API connectivity and credentials

echo "======================================"
echo "Zoho Mail API Diagnostics"
echo "======================================"
echo ""

# Check if curl is available
if ! command -v curl &> /dev/null; then
    echo "❌ curl not found - please install curl"
    exit 1
fi

# Get credentials from user
read -p "Enter Zoho Client ID (e.g., 1000.xxxx): " CLIENT_ID
read -p "Enter Zoho Client Secret: " CLIENT_SECRET
read -p "Enter Zoho Account ID (numeric): " ACCOUNT_ID

if [ -z "$CLIENT_ID" ] || [ -z "$CLIENT_SECRET" ] || [ -z "$ACCOUNT_ID" ]; then
    echo "❌ Missing credentials"
    exit 1
fi

echo ""
echo "Testing connectivity to Zoho API..."
echo ""

# Test 1: Can we reach Zoho's servers?
echo "1️⃣  Testing DNS resolution for accounts.zoho.com..."
if ping -c 1 accounts.zoho.com > /dev/null 2>&1; then
    echo "✅ DNS resolves successfully"
else
    echo "⚠️  Cannot reach accounts.zoho.com - check your internet connection"
fi

echo ""
echo "2️⃣  Testing OAuth token endpoint..."

# Test 2: Try to get an access token
TOKEN_RESPONSE=$(curl -s -X POST "https://accounts.zoho.com/oauth/v2/token" \
  -d "client_id=$CLIENT_ID" \
  -d "client_secret=$CLIENT_SECRET" \
  -d "grant_type=client_credentials" \
  -d "scope=ZohoMail.message.ALL")

echo "Response: $TOKEN_RESPONSE"
echo ""

# Extract access token
ACCESS_TOKEN=$(echo "$TOKEN_RESPONSE" | grep -o '"access_token":"[^"]*"' | cut -d'"' -f4)

if [ -z "$ACCESS_TOKEN" ]; then
    echo "❌ Failed to get access token"
    echo "This usually means:"
    echo "  • Client ID or Secret is incorrect"
    echo "  • Extra spaces in credentials when copying"
    echo "  • Using outdated credentials"
    exit 1
fi

echo "✅ Successfully obtained access token"
echo ""
echo "3️⃣  Testing Zoho Mail API account endpoint..."

# Test 3: Verify the account
ACCOUNT_RESPONSE=$(curl -s -X GET \
  "https://mail.zoho.com/api/accounts/$ACCOUNT_ID" \
  -H "Authorization: Bearer $ACCESS_TOKEN")

echo "Response: $ACCOUNT_RESPONSE"
echo ""

if echo "$ACCOUNT_RESPONSE" | grep -q "\"accountId\""; then
    echo "✅ Account validation successful!"
    echo "✅ All tests passed - your Zoho credentials are valid"
else
    echo "❌ Account validation failed"
    echo "This usually means:"
    echo "  • Account ID is incorrect"
    echo "  • Account doesn't exist in Zoho Mail"
    exit 1
fi

echo ""
echo "======================================"
echo "✅ All diagnostics passed!"
echo "======================================"
