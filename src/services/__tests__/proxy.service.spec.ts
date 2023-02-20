// import { Test, TestingModule } from '@nestjs/testing';
// import { ConfigService } from '@nestjs/config';
// import { HttpModule } from '@nestjs/axios';
// import { BigNumber } from 'ethers';
// import { AccessList } from 'ethers/lib/utils';
// import {
//   TransactionService,
//   VerseService,
//   ProxyService,
//   AllowCheckService,
//   WebhookService,
// } from 'src/services';
// import { JsonrpcError } from 'src/entities';

// const type = 2;
// const chainId = 5;
// const nonce = 3;
// const maxPriorityFeePerGas = BigNumber.from('1500000000');
// const maxFeePerGas = BigNumber.from('1500000018');
// const gasPrice = undefined;
// const gasLimit = BigNumber.from('21000');
// const to = '0x8626f6940E2eb28930eFb4CeF49B2d1F2C9C1199';
// const value = BigNumber.from('1000000000000');
// const data = '0x';
// const accessList = [] as AccessList;
// const hash =
//   '0xc6092b487b9e86b4ea22bf5e73cc0172ca37e938971e26aa70ec66f7be9dfcfc';
// const v = 0;
// const r = '0x79448db43a092a4bf489fe93fa8a7c09ac25f3d8e5a799d401c8d105cccdd028';
// const s = '0x743a0f064dc9cff4748b6d5e39dda262a89f0595570b41b0b576584d12348239';
// const from = '0xaf395754eB6F542742784cE7702940C60465A46a';

// const tx = {
//   type,
//   chainId,
//   nonce,
//   maxPriorityFeePerGas,
//   maxFeePerGas,
//   gasPrice,
//   gasLimit,
//   to,
//   value,
//   data,
//   accessList,
//   hash,
//   v,
//   r,
//   s,
//   from,
// };

// describe('ProxyService', () => {
//   let configService: ConfigService;
//   let verseService: VerseService;
//   let txService: TransactionService;
//   let moduleRef: TestingModule;

//   beforeAll(async () => {
//     moduleRef = await Test.createTestingModule({
//       imports: [HttpModule],
//       providers: [
//         ConfigService,
//         VerseService,
//         TransactionService,
//         AllowCheckService,
//         WebhookService,
//       ],
//     })
//       .useMocker((token) => {
//         switch (token) {
//           case ConfigService:
//             return {
//               get: jest.fn(),
//             };
//           case VerseService:
//             return {
//               post: jest.fn(),
//             };
//           case TransactionService:
//             return {
//               parseRawTx: jest.fn(),
//               checkAllowedTx: jest.fn(),
//               checkWebhook: jest.fn(),
//               checkAllowedGas: jest.fn(),
//             };
//         }
//       })
//       .compile();

//     configService = moduleRef.get<ConfigService>(ConfigService);
//     verseService = moduleRef.get<VerseService>(VerseService);
//     txService = moduleRef.get<TransactionService>(TransactionService);
//   });

//   describe('handleSingleRequest', () => {
//     beforeEach(() => {
//       jest.resetAllMocks();
//     });

//     it('tx method is not eth_sendRawTransaction and successful', async () => {
//       const allowedMethods: RegExp[] = [/^.*$/];
//       const method = 'eth_call';
//       const ip = '1.2.3.4';
//       const headers = { host: 'localhost' };
//       const body = {
//         jsonrpc: '2.0',
//         id: 1,
//         method: method,
//         params: [tx, 'latest'],
//       };
//       const callback = jest.fn();

//       const verseStatus = 200;
//       const verseData = {
//         jsonrpc: '2.0',
//         id: 1,
//         result: '0x',
//       };
//       const postResponse = {
//         status: verseStatus,
//         data: verseData,
//       };

//       jest.spyOn(configService, 'get').mockReturnValue(allowedMethods);
//       jest.spyOn(verseService, 'post').mockResolvedValue(postResponse);

//       const proxyService = new ProxyService(
//         configService,
//         verseService,
//         txService,
//       );

//       await proxyService.handleSingleRequest(ip, headers, body, callback);
//       expect(callback).toHaveBeenCalledWith(postResponse);
//     });

//     it('tx method is not allowed', async () => {
//       const allowedMethods: RegExp[] = [/^eth_call$/];
//       const method = 'eth_getTransactionReceipt';
//       const ip = '1.2.3.4';
//       const headers = { host: 'localhost' };
//       const body = {
//         jsonrpc: '2.0',
//         id: 1,
//         method: method,
//         params: [
//           '0xc3a3a2feced276891d9658a62205ff049bab1e6e4e4d6ff500487e023fcb3d82',
//         ],
//       };
//       const callback = jest.fn();

//       const errMsg = `${method} is not allowed`;
//       const errCode = -32601;
//       const status = 200;
//       const verseData = {
//         jsonrpc: body.jsonrpc,
//         id: body.id,
//         error: {
//           code: errCode,
//           message: errMsg,
//         },
//       };
//       const postResponse = {
//         status: status,
//         data: verseData,
//       };
//       jest.spyOn(configService, 'get').mockReturnValue(allowedMethods);

//       const proxyService = new ProxyService(
//         configService,
//         verseService,
//         txService,
//       );

//       await proxyService.handleSingleRequest(ip, headers, body, callback);
//       expect(callback).toHaveBeenCalledWith(postResponse);
//     });
//   });

//   describe('handleBatchRequest', () => {
//     beforeEach(() => {
//       jest.resetAllMocks();
//     });

//     it('body has successful requests', async () => {
//       const allowedMethods: RegExp[] = [/^.*$/];
//       const ip = '1.2.3.4';
//       const headers = { host: 'localhost' };
//       const body = [
//         {
//           jsonrpc: '2.0',
//           method: 'net_version',
//           params: [],
//           id: 1,
//         },
//         {
//           jsonrpc: '2.0',
//           method: 'net_version',
//           params: [],
//           id: 1,
//         },
//       ];
//       const callback = jest.fn();

//       const verseStatus = 200;
//       const verseData = {
//         jsonrpc: '2.0',
//         id: 1,
//         result: '999999',
//       };
//       const postResponse = {
//         status: verseStatus,
//         data: verseData,
//       };
//       const results = [
//         {
//           jsonrpc: '2.0',
//           id: 1,
//           result: '999999',
//         },
//         {
//           jsonrpc: '2.0',
//           id: 1,
//           result: '999999',
//         },
//       ];
//       const callbackArg = {
//         status: verseStatus,
//         data: results,
//       };

//       jest.spyOn(configService, 'get').mockReturnValue(allowedMethods);
//       jest.spyOn(verseService, 'post').mockResolvedValue(postResponse);

//       const proxyService = new ProxyService(
//         configService,
//         verseService,
//         txService,
//       );

//       await proxyService.handleBatchRequest(ip, headers, body, callback);
//       expect(callback).toHaveBeenCalledWith(callbackArg);
//     });

//     it('body has unsuccessful requests', async () => {
//       const allowedMethods: RegExp[] = [/^eth_call$/];
//       const method = 'net_version';
//       const ip = '1.2.3.4';
//       const headers = { host: 'localhost' };
//       const body = [
//         {
//           jsonrpc: '2.0',
//           method: method,
//           params: [],
//           id: 1,
//         },
//         {
//           jsonrpc: '2.0',
//           method: method,
//           params: [],
//           id: 1,
//         },
//       ];
//       const callback = jest.fn();

//       const errMsg = `${method} is not allowed`;
//       const errCode = -32601;
//       const verseStatus = 200;
//       const verseData = {
//         jsonrpc: '2.0',
//         id: 1,
//         error: {
//           code: errCode,
//           message: errMsg,
//         },
//       };
//       const postResponse = {
//         status: verseStatus,
//         data: verseData,
//       };
//       const results = [
//         {
//           jsonrpc: '2.0',
//           id: 1,
//           error: {
//             code: errCode,
//             message: errMsg,
//           },
//         },
//         {
//           jsonrpc: '2.0',
//           id: 1,
//           error: {
//             code: errCode,
//             message: errMsg,
//           },
//         },
//       ];
//       const callbackArg = {
//         status: verseStatus,
//         data: results,
//       };

//       jest.spyOn(configService, 'get').mockReturnValue(allowedMethods);
//       jest.spyOn(configService, 'get').mockReturnValue(allowedMethods);
//       jest.spyOn(verseService, 'post').mockResolvedValue(postResponse);

//       const proxyService = new ProxyService(
//         configService,
//         verseService,
//         txService,
//       );

//       await proxyService.handleBatchRequest(ip, headers, body, callback);
//       expect(callback).toHaveBeenCalledWith(callbackArg);
//     });
//   });

//   describe('requestVerse', () => {
//     beforeEach(() => {
//       jest.resetAllMocks();
//     });

//     it('tx method is not eth_sendRawTransaction and successful', async () => {
//       const allowedMethods: RegExp[] = [/^.*$/];
//       const method = 'eth_call';
//       const ip = '1.2.3.4';
//       const headers = { host: 'localhost' };
//       const body = {
//         jsonrpc: '2.0',
//         id: 1,
//         method: method,
//         params: [tx, 'latest'],
//       };

//       const verseStatus = 200;
//       const verseData = {
//         jsonrpc: '2.0',
//         id: 1,
//         result: '0x',
//       };
//       const postResponse = {
//         status: verseStatus,
//         data: verseData,
//       };

//       jest.spyOn(configService, 'get').mockReturnValue(allowedMethods);
//       jest.spyOn(verseService, 'post').mockResolvedValue(postResponse);

//       const proxyService = new ProxyService(
//         configService,
//         verseService,
//         txService,
//       );

//       const result = await proxyService.requestVerse(ip, headers, body);
//       expect(result).toEqual(postResponse);
//       expect(jest.spyOn(txService, 'parseRawTx')).not.toHaveBeenCalled();
//       expect(jest.spyOn(txService, 'checkAllowedTx')).not.toHaveBeenCalled();
//       expect(jest.spyOn(txService, 'checkAllowedGas')).not.toHaveBeenCalled();
//     });

//     it('tx method is not allowed', async () => {
//       const allowedMethods: RegExp[] = [/^eth_call$/];
//       const method = 'eth_getTransactionReceipt';
//       const ip = '1.2.3.4';
//       const headers = { host: 'localhost' };
//       const body = {
//         jsonrpc: '2.0',
//         id: 1,
//         method: method,
//         params: [
//           '0xc3a3a2feced276891d9658a62205ff049bab1e6e4e4d6ff500487e023fcb3d82',
//         ],
//       };

//       const errMsg = `${method} is not allowed`;
//       const errCode = -32601;
//       const status = 200;
//       const verseData = {
//         jsonrpc: body.jsonrpc,
//         id: body.id,
//         error: {
//           code: errCode,
//           message: errMsg,
//         },
//       };
//       const postResponse = {
//         status: status,
//         data: verseData,
//       };
//       jest.spyOn(configService, 'get').mockReturnValue(allowedMethods);

//       const proxyService = new ProxyService(
//         configService,
//         verseService,
//         txService,
//       );

//       const result = await proxyService.requestVerse(ip, headers, body);
//       expect(result).toEqual(postResponse);
//       expect(jest.spyOn(txService, 'parseRawTx')).not.toHaveBeenCalled();
//       expect(jest.spyOn(txService, 'checkAllowedTx')).not.toHaveBeenCalled();
//       expect(jest.spyOn(txService, 'checkAllowedGas')).not.toHaveBeenCalled();
//     });

//     it('tx method is eth_sendRawTransaction and body.params is null', async () => {
//       const allowedMethods: RegExp[] = [/^.*$/];
//       const method = 'eth_sendRawTransaction';
//       const ip = '1.2.3.4';
//       const headers = { host: 'localhost' };
//       const body = {
//         jsonrpc: '2.0',
//         id: 1,
//         method: method,
//         params: null,
//       };
//       const errMsg = 'rawTransaction is not found';
//       const errCode = -32602;
//       const status = 200;
//       const verseData = {
//         jsonrpc: body.jsonrpc,
//         id: body.id,
//         error: {
//           code: errCode,
//           message: errMsg,
//         },
//       };
//       const postResponse = {
//         status: status,
//         data: verseData,
//       };

//       jest.spyOn(configService, 'get').mockReturnValue(allowedMethods);

//       const proxyService = new ProxyService(
//         configService,
//         verseService,
//         txService,
//       );

//       const result = await proxyService.requestVerse(ip, headers, body);
//       expect(result).toEqual(postResponse);
//       expect(jest.spyOn(txService, 'parseRawTx')).not.toHaveBeenCalled();
//       expect(jest.spyOn(txService, 'checkAllowedTx')).not.toHaveBeenCalled();
//       expect(jest.spyOn(txService, 'checkAllowedGas')).not.toHaveBeenCalled();
//     });

//     it('tx method is eth_sendRawTransaction and body.params is []', async () => {
//       const allowedMethods: RegExp[] = [/^.*$/];
//       const method = 'eth_sendRawTransaction';
//       const ip = '1.2.3.4';
//       const headers = { host: 'localhost' };
//       const body = {
//         jsonrpc: '2.0',
//         id: 1,
//         method: method,
//         params: [],
//       };
//       const errMsg = 'rawTransaction is not found';
//       const errCode = -32602;
//       const status = 200;
//       const verseData = {
//         jsonrpc: body.jsonrpc,
//         id: body.id,
//         error: {
//           code: errCode,
//           message: errMsg,
//         },
//       };
//       const postResponse = {
//         status: status,
//         data: verseData,
//       };

//       jest.spyOn(configService, 'get').mockReturnValue(allowedMethods);

//       const proxyService = new ProxyService(
//         configService,
//         verseService,
//         txService,
//       );

//       const result = await proxyService.requestVerse(ip, headers, body);
//       expect(result).toEqual(postResponse);
//       expect(jest.spyOn(txService, 'parseRawTx')).not.toHaveBeenCalled();
//       expect(jest.spyOn(txService, 'checkAllowedTx')).not.toHaveBeenCalled();
//       expect(jest.spyOn(txService, 'checkAllowedGas')).not.toHaveBeenCalled();
//     });

//     it('tx method is eth_sendRawTransaction and checkAllowedTx is failed', async () => {
//       const rawTx =
//         '0x02f86f05038459682f008459682f12825208948626f6940e2eb28930efb4cef49b2d1f2c9c119985e8d4a5100080c080a079448db43a092a4bf489fe93fa8a7c09ac25f3d8e5a799d401c8d105cccdd029a0743a0f064dc9cff4748b6d5e39dda262a89f0595570b41b0b576584d12348239';
//       const allowedMethods: RegExp[] = [/^.*$/];
//       const method = 'eth_sendRawTransaction';
//       const ip = '1.2.3.4';
//       const headers = { host: 'localhost' };
//       const body = {
//         jsonrpc: '2.0',
//         id: 1,
//         method: method,
//         params: [rawTx],
//       };
//       const errMsg = 'transaction is invalid';
//       const errCode = -32602;
//       const status = 200;
//       const verseData = {
//         jsonrpc: body.jsonrpc,
//         id: body.id,
//         error: {
//           code: errCode,
//           message: errMsg,
//         },
//       };
//       const postResponse = {
//         status: status,
//         data: verseData,
//       };

//       jest.spyOn(configService, 'get').mockReturnValue(allowedMethods);
//       jest.spyOn(txService, 'parseRawTx').mockReturnValue(tx);
//       jest.spyOn(txService, 'checkAllowedTx').mockImplementation(() => {
//         throw new JsonrpcError(errMsg, errCode);
//       });

//       const proxyService = new ProxyService(
//         configService,
//         verseService,
//         txService,
//       );

//       const result = await proxyService.requestVerse(ip, headers, body);
//       expect(result).toEqual(postResponse);
//       expect(jest.spyOn(txService, 'parseRawTx')).toHaveBeenCalledWith(rawTx);
//       expect(jest.spyOn(txService, 'checkAllowedTx')).toHaveBeenCalledWith(tx);
//       expect(jest.spyOn(txService, 'checkAllowedGas')).not.toHaveBeenCalled();
//     });

//     it('tx method is eth_sendRawTransaction and checkAllowedGas is failed', async () => {
//       const jsonrpc = '2.0';
//       const id = 1;
//       const rawTx =
//         '0x02f86f05038459682f008459682f12825208948626f6940e2eb28930efb4cef49b2d1f2c9c119985e8d4a5100080c080a079448db43a092a4bf489fe93fa8a7c09ac25f3d8e5a799d401c8d105cccdd029a0743a0f064dc9cff4748b6d5e39dda262a89f0595570b41b0b576584d12348239';
//       const allowedMethods: RegExp[] = [/^.*$/];
//       const method = 'eth_sendRawTransaction';
//       const ip = '1.2.3.4';
//       const headers = { host: 'localhost' };
//       const body = {
//         jsonrpc: jsonrpc,
//         id: id,
//         method: method,
//         params: [rawTx],
//       };
//       const errMsg = 'insufficient balance for transfer';
//       const errCode = -32602;
//       const status = 200;
//       const verseData = {
//         jsonrpc: body.jsonrpc,
//         id: body.id,
//         error: {
//           code: errCode,
//           message: errMsg,
//         },
//       };
//       const postResponse = {
//         status: status,
//         data: verseData,
//       };
//       jest.spyOn(configService, 'get').mockReturnValue(allowedMethods);
//       jest.spyOn(txService, 'parseRawTx').mockReturnValue(tx);
//       jest.spyOn(txService, 'checkWebhook').mockImplementation();
//       jest
//         .spyOn(txService, 'checkAllowedGas')
//         .mockRejectedValue(new JsonrpcError(errMsg, errCode));

//       const proxyService = new ProxyService(
//         configService,
//         verseService,
//         txService,
//       );

//       const result = await proxyService.requestVerse(ip, headers, body);
//       expect(result).toEqual(postResponse);
//       expect(jest.spyOn(txService, 'parseRawTx')).toHaveBeenCalledWith(rawTx);
//       expect(jest.spyOn(txService, 'checkAllowedTx')).toHaveBeenCalledWith(tx);
//       expect(jest.spyOn(txService, 'checkAllowedGas')).toHaveBeenCalledWith(
//         tx,
//         jsonrpc,
//         id,
//       );
//     });

//     it('tx method is not eth_sendRawTransaction and successful', async () => {
//       const allowedMethods: RegExp[] = [/^.*$/];
//       const method = 'eth_sendRawTransaction';
//       const ip = '1.2.3.4';
//       const headers = { host: 'localhost' };
//       const body = {
//         jsonrpc: '2.0',
//         id: 1,
//         method: method,
//         params: [
//           '0x02f86f05038459682f008459682f12825208948626f6940e2eb28930efb4cef49b2d1f2c9c119985e8d4a5100080c080a079448db43a092a4bf489fe93fa8a7c09ac25f3d8e5a799d401c8d105cccdd029a0743a0f064dc9cff4748b6d5e39dda262a89f0595570b41b0b576584d12348239',
//         ],
//       };
//       const verseStatus = 200;
//       const verseData = {
//         jsonrpc: '2.0',
//         id: 1,
//         result: '0x',
//       };
//       const postResponse = {
//         status: verseStatus,
//         data: verseData,
//       };

//       jest.spyOn(configService, 'get').mockReturnValue(allowedMethods);
//       jest.spyOn(txService, 'parseRawTx').mockReturnValue(tx);
//       jest.spyOn(verseService, 'post').mockResolvedValue(postResponse);

//       const proxyService = new ProxyService(
//         configService,
//         verseService,
//         txService,
//       );

//       const result = await proxyService.requestVerse(ip, headers, body);
//       expect(result).toEqual(postResponse);
//     });
//   });

//   describe('checkMethod', () => {
//     beforeEach(() => {
//       jest.resetAllMocks();
//     });

//     it('All methods are allowed', () => {
//       const allowedMethods: RegExp[] = [/^.*$/];
//       const method = 'eth_getTransactionReceipt';
//       jest.spyOn(configService, 'get').mockReturnValue(allowedMethods);

//       const proxyService = new ProxyService(
//         configService,
//         verseService,
//         txService,
//       );

//       expect(() => proxyService.checkMethod(method)).not.toThrow();
//     });

//     it('Tx method is not allowed', () => {
//       const allowedMethods: RegExp[] = [/^eth_call$/];
//       const method = 'eth_getTransactionReceipt';
//       jest.spyOn(configService, 'get').mockReturnValue(allowedMethods);

//       const proxyService = new ProxyService(
//         configService,
//         verseService,
//         txService,
//       );

//       expect(() => proxyService.checkMethod(method)).toThrow(
//         `${method} is not allowed`,
//       );
//     });
//   });
// });
