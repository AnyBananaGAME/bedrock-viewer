# bedrock-viewer

### 
> [!IMPORTANT]
> This is a fork of https://github.com/PrismarineJS/prismarine-viewer


> [!IMPORTANT]
> This was made to work with [BedrockRat](https://github.com/AnyBananaGAME/BedrockRat) so you may need to add more stuff than just whats in the example.



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
