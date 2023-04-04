# Reduce Metamask Access
By returning the cache of block number to the metamask, the number of accesses to the metamask can be reduced.

This approach is only applicable to browsers built on Chromium (chrome, brave, and Microsoft Edge based on Chromium).

## Context
When the metamask is open in the browser, the metamask checks the block number with `eth_blockNumber` once every 5~6 seconds.

And metamask does the following when block number is updated.
- Execute `eth_getBalance` for all accounts registered in the metamask.
- Check the balance of all ERC20 accounts registered by the current account(ERC20.balanceOf).

Oasys Verse updates the block number each time a transaction is executed.
Therefore, each time a transaction is executed, there is access to update the balance of the metamask as explained above.

## How to Reduce
When there is a request for block number from metamask, the following actions should be taken
- If a block number cache exists, it is returned.
- If the cache of block number does not exist, request `eth_blockNumber` from verse to get the latest block number.

It will prevent a metamask balance update request from occurring each time the transaction updates the block number.

We create block number cache for each user using IP address and user-agent.

## Update block number Cache
The block number cache will be updated in the following cases.

- When `eth_blockNumber` is requested by metamask after the block numberCache has been deleted by the expiration
- The user block number cache is updated when a user executes a transaction by `eth_sendRawTransaction`.

In other words, if there is a change in your ERC20 balance due to a transaction you executed, you can see the change in your token balance immediately after the transaction is executed.

## Concern
Returning a block number cache to the metamask raises the following concerns.

While a block numberCache is being returned, it is impossible to confirm that another account's transaction has changed your account's token balance.

In other words, if the expiration of block numberCache is too long, you can only confirm that your account's token balance has changed once the cache_expire expires.

In addition, when a view function of a contract connected to Metamask (such as ERC20) is executed, the result is cached in Metamask.
If periodic block number checks do not progress the block number, the result of the cache is returned. Therefore, you cannot check the result of the latest view function.

## Setup
It can be enabled by setting block numberCache's expiration from the environment variable.
```bash
BLOCK_NUMBER_CACHE_EXPIRE_SEC=15 # 15 seconds
```
