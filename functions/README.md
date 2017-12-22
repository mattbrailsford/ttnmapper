# TTN Mapper Functions

Functions to run in Firebase as new samples are submitted

### parseGateways

Watches the samples collection and processes new samples extracting gateways details and adding them to the gateways collection.

### parseTiles

Watches the samples collection and processes new samples and creates / updates heat tiles with the appropreate readings.

## Setup

Give execute permission to deploy.sh

````chmod +x ./src/deploy.sh````

Deploy updates via npm

````
cd src
npm run deploy
````