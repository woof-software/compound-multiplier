#!/bin/sh
set -e

if [ -z "$1" ]; then
  echo "Error: Network name is required."
  echo "Usage: $0 <network>"
  exit 1
fi

NETWORK=$1
NETWORK_UPPER=$(echo "$NETWORK" | tr '[:lower:]' '[:upper:]')
RPC_ENV_VAR="${NETWORK_UPPER}_URL"
RPC_URL=$(grep "^${RPC_ENV_VAR}=" .env | cut -d '=' -f2-)

if [ -z "$RPC_URL" ]; then
  echo "No RPC URL found for $NETWORK."
  echo "Please set ${RPC_ENV_VAR}=<your_rpc_url> in .env"
  exit 1
fi

echo "Deploying to $NETWORK: $RPC_URL"

npx hardhat run scripts/deploy/deploy.plugins.ts --network $NETWORK
npx hardhat run scripts/deploy/deploy.main.ts --network $NETWORK

echo "All steps completed successfully on forked $NETWORK!"
