# bedrock-viewer

### [!] This is a fork of https://github.com/PrismarineJS/prismarine-viewer

## Install

```bash
npm install github:AnyBananaGAME/bedrock-viewer
```


## Example

```js
const {createClient} = require('bedrock-protocol')
const bedrockViewer = require('bedrock-viewer').bedrock

const client = createClient({
  host: '0.0.0.0',
  port: 19132,
  offline: true,
  username: "Bedrock-Viewer",
  version: '1.20.61',
  skipPing: true
})

client.once("spawn", () => {
    bedrockViewer(client, {port: 3000});
})

```
