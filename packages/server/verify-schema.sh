#!/bin/bash
# Verify database schema after migration

echo "Checking messages table schema..."
mysql -u cipherpay -pcipherpay -h 127.0.0.1 -P 3307 cipherpay_server -e "DESCRIBE messages;" 2>/dev/null

if [ $? -eq 0 ]; then
  echo ""
  echo "✅ Database connected"
  
  # Check if commitment_hex exists
  if mysql -u cipherpay -pcipherpay -h 127.0.0.1 -P 3307 cipherpay_server -e "DESCRIBE messages;" 2>/dev/null | grep -q "commitment_hex"; then
    echo "✅ commitment_hex field exists"
  else
    echo "❌ commitment_hex field is missing - run migration again"
  fi
else
  echo "❌ Database not accessible"
fi
