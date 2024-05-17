## Run e2e test

### Set up .env

- NODE_SOCKET node websocket url
- REDIS_URI redis url
- MAXRECONNECTATTEMPTS maximum number of time verse-proxy try to reconnect websocket

### Remove comment

- By uncomment every line below this line `// The test will need a connection to L1 node which can not pass review Bot` you will be able to run test

> NOTE: Remember this test need a L1 node to be running and has open a websocket server 