// import { Test } from '@nestjs/testing';
// import { HttpModule } from '@nestjs/axios';
// import { ConfigService } from '@nestjs/config';
// import {
//   TransactionService,
//   VerseService,
//   AllowCheckService,
//   RateLimitService,
//   TypeCheckService,
// } from 'src/services';
// import { BigNumber } from 'ethers';
// import * as transactionAllowList from 'src/config/transactionAllowList';
// import { AccessList } from 'ethers/lib/utils';
// import { JsonrpcError } from 'src/entities';
// import { DatastoreService } from 'src/repositories';

// describe('TransactionService', () => {
//   let typeCheckService: TypeCheckService;
//   let verseService: VerseService;
//   let allowCheckService: AllowCheckService;
//   let rateLimitService: RateLimitService;
//   let datastoreService: DatastoreService;
//   const transactionAllowListMock = jest.spyOn(
//     transactionAllowList,
//     'getTxAllowList',
//   );

//   const type = 2;
//   const chainId = 5;
//   const nonce = 3;
//   const maxPriorityFeePerGas = BigNumber.from('1500000000');
//   const maxFeePerGas = BigNumber.from('1500000018');
//   const gasPrice = undefined;
//   const gasLimit = BigNumber.from('21000');
//   const to = '0x8626f6940E2eb28930eFb4CeF49B2d1F2C9C1199';
//   const value = BigNumber.from('1000000000000');
//   const data =
//     '0x608060405234801561001057600080fd5b5061067c806100206000396000f3fe608060405234801561001057600080fd5b50600436106100365760003560e01c8063a41368621461003b578063cfae321714610057575b600080fd5b61005560048036038101906100509190610274565b610075565b005b61005f610088565b60405161006c919061033c565b60405180910390f35b80600090816100849190610574565b5050565b6060600080546100979061038d565b80601f01602080910402602001604051908101604052809291908181526020018280546100c39061038d565b80156101105780601f106100e557610100808354040283529160200191610110565b820191906000526020600020905b8154815290600101906020018083116100f357829003601f168201915b5050505050905090565b6000604051905090565b600080fd5b600080fd5b600080fd5b600080fd5b6000601f19601f8301169050919050565b7f4e487b7100000000000000000000000000000000000000000000000000000000600052604160045260246000fd5b61018182610138565b810181811067ffffffffffffffff821117156101a05761019f610149565b5b80604052505050565b60006101b361011a565b90506101bf8282610178565b919050565b600067ffffffffffffffff8211156101df576101de610149565b5b6101e882610138565b9050602081019050919050565b82818337600083830152505050565b6000610217610212846101c4565b6101a9565b90508281526020810184848401111561023357610232610133565b5b61023e8482856101f5565b509392505050565b600082601f83011261025b5761025a61012e565b5b813561026b848260208601610204565b91505092915050565b60006020828403121561028a57610289610124565b5b600082013567ffffffffffffffff8111156102a8576102a7610129565b5b6102b484828501610246565b91505092915050565b600081519050919050565b600082825260208201905092915050565b60005b838110156102f75780820151818401526020810190506102dc565b60008484015250505050565b600061030e826102bd565b61031881856102c8565b93506103288185602086016102d9565b61033181610138565b840191505092915050565b600060208201905081810360008301526103568184610303565b905092915050565b7f4e487b7100000000000000000000000000000000000000000000000000000000600052602260045260246000fd5b600060028204905060018216806103a557607f821691505b6020821081036103b8576103b761035e565b5b50919050565b60008190508160005260206000209050919050565b60006020601f8301049050919050565b600082821b905092915050565b6000600883026104207fffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff826103e3565b61042a86836103e3565b95508019841693508086168417925050509392505050565b6000819050919050565b6000819050919050565b600061047161046c61046784610442565b61044c565b610442565b9050919050565b6000819050919050565b61048b83610456565b61049f61049782610478565b8484546103f0565b825550505050565b600090565b6104b46104a7565b6104bf818484610482565b505050565b5b818110156104e3576104d86000826104ac565b6001810190506104c5565b5050565b601f821115610528576104f9816103be565b610502846103d3565b81016020851015610511578190505b61052561051d856103d3565b8301826104c4565b50505b505050565b600082821c905092915050565b600061054b6000198460080261052d565b1980831691505092915050565b6000610564838361053a565b9150826002028217905092915050565b61057d826102bd565b67ffffffffffffffff81111561059657610595610149565b5b6105a0825461038d565b6105ab8282856104e7565b600060209050601f8311600181146105de57600084156105cc578287015190505b6105d68582610558565b86555061063e565b601f1984166105ec866103be565b60005b82811015610614578489015182556001820191506020850194506020810190506105ef565b86831015610631578489015161062d601f89168261053a565b8355505b6001600288020188555050505b50505050505056fea26469706673582212209b9e66415178574ee07e631fb567d1c98c49b46a47562a907bfc061574b80e4864736f6c63430008110033';
//   const accessList = [] as AccessList;
//   const hash =
//     '0xc6092b487b9e86b4ea22bf5e73cc0172ca37e938971e26aa70ec66f7be9dfcfc';
//   const v = 0;
//   const r =
//     '0x79448db43a092a4bf489fe93fa8a7c09ac25f3d8e5a799d401c8d105cccdd028';
//   const s =
//     '0x743a0f064dc9cff4748b6d5e39dda262a89f0595570b41b0b576584d12348239';
//   const from = '0xaf395754eB6F542742784cE7702940C60465A46a';

//   beforeAll(async () => {
//     const moduleRef = await Test.createTestingModule({
//       imports: [HttpModule],
//       providers: [
//         TypeCheckService,
//         ConfigService,
//         VerseService,
//         AllowCheckService,
//         TransactionService,
//         RateLimitService,
//         DatastoreService,
//       ],
//     }).compile();

//     typeCheckService = moduleRef.get<TypeCheckService>(TypeCheckService);
//     verseService = moduleRef.get<VerseService>(VerseService);
//     allowCheckService = moduleRef.get<AllowCheckService>(AllowCheckService);
//     rateLimitService = moduleRef.get<RateLimitService>(RateLimitService);
//     datastoreService = moduleRef.get<DatastoreService>(DatastoreService);
//   });

//   describe('checkContractDeploy', () => {
//     beforeEach(() => {
//       jest.resetAllMocks();
//     });

//     it('deploy is allowed', async () => {
//       transactionAllowListMock.mockReturnValue([
//         {
//           fromList: ['*'],
//           toList: ['*'],
//         },
//       ]);

//       jest.spyOn(allowCheckService, 'isAllowedDeploy').mockReturnValue(true);
//       const transactionService = new TransactionService(
//         typeCheckService,
//         verseService,
//         allowCheckService,
//         rateLimitService,
//         datastoreService,
//       );

//       expect(() => transactionService.checkContractDeploy(from)).not.toThrow();
//     });

//     it('deploy is not allowed', async () => {
//       transactionAllowListMock.mockReturnValue([
//         {
//           fromList: ['*'],
//           toList: ['*'],
//         },
//       ]);

//       jest.spyOn(allowCheckService, 'isAllowedDeploy').mockReturnValue(false);
//       const transactionService = new TransactionService(
//         typeCheckService,
//         verseService,
//         allowCheckService,
//         rateLimitService,
//         datastoreService,
//       );

//       expect(() => transactionService.checkContractDeploy(from)).toThrow(
//         'deploy transaction is not allowed',
//       );
//     });
//   });

//   describe('getMatchedTxAllowRule', () => {
//     beforeEach(() => {
//       jest.resetAllMocks();
//     });

//     it('from is not allowed', async () => {
//       const fromList = [`!${from}`];
//       const toList = ['*'];

//       transactionAllowListMock.mockReturnValue([
//         {
//           fromList: fromList,
//           toList: toList,
//         },
//       ]);
//       const methodId = data.substring(0, 10);

//       jest
//         .spyOn(allowCheckService, 'isIncludedAddress')
//         .mockImplementation((addressList: string[], input: string) => {
//           if (addressList === fromList && input === from) {
//             return false;
//           } else if (addressList === toList && input === to) {
//             return true;
//           }
//           return true;
//         });
//       jest.spyOn(allowCheckService, 'isAllowedValue').mockReturnValue(true);
//       const transactionService = new TransactionService(
//         typeCheckService,
//         verseService,
//         allowCheckService,
//         rateLimitService,
//         datastoreService,
//       );

//       await expect(
//         transactionService.getMatchedTxAllowRule(from, to, methodId, value),
//       ).rejects.toThrow('transaction is not allowed');
//     });

//     it('to is not allowed', async () => {
//       const fromList = ['*'];
//       const toList = [`!${to}`];

//       transactionAllowListMock.mockReturnValue([
//         {
//           fromList: fromList,
//           toList: toList,
//         },
//       ]);
//       const methodId = data.substring(0, 10);

//       jest
//         .spyOn(allowCheckService, 'isIncludedAddress')
//         .mockImplementation((addressList: string[], input: string) => {
//           if (addressList === fromList && input === from) {
//             return true;
//           } else if (addressList === toList && input === to) {
//             return false;
//           }
//           return true;
//         });
//       jest.spyOn(allowCheckService, 'isAllowedValue').mockReturnValue(true);
//       const transactionService = new TransactionService(
//         typeCheckService,
//         verseService,
//         allowCheckService,
//         rateLimitService,
//         datastoreService,
//       );

//       await expect(
//         transactionService.getMatchedTxAllowRule(from, to, methodId, value),
//       ).rejects.toThrow('transaction is not allowed');
//     });

//     it('value is not allowed', async () => {
//       const fromList = ['*'];
//       const toList = ['*'];

//       transactionAllowListMock.mockReturnValue([
//         {
//           fromList: fromList,
//           toList: toList,
//         },
//       ]);
//       const methodId = data.substring(0, 10);

//       jest.spyOn(allowCheckService, 'isIncludedAddress').mockReturnValue(true);
//       jest.spyOn(allowCheckService, 'isAllowedValue').mockReturnValue(false);
//       const transactionService = new TransactionService(
//         typeCheckService,
//         verseService,
//         allowCheckService,
//         rateLimitService,
//         datastoreService,
//       );

//       await expect(
//         transactionService.getMatchedTxAllowRule(from, to, methodId, value),
//       ).rejects.toThrow('transaction is not allowed');
//     });

//     describe('from and to and value is OK', () => {
//       it('rateLimit is not set', async () => {
//         const fromList = ['*'];
//         const toList = ['*'];
//         const txAllowRule = {
//           fromList,
//           toList,
//         };

//         transactionAllowListMock.mockReturnValue([txAllowRule]);
//         const methodId = data.substring(0, 10);

//         jest
//           .spyOn(allowCheckService, 'isIncludedAddress')
//           .mockReturnValue(true);
//         jest.spyOn(allowCheckService, 'isAllowedValue').mockReturnValue(true);
//         const checkRateLimit = jest.spyOn(rateLimitService, 'checkRateLimit');
//         const transactionService = new TransactionService(
//           typeCheckService,
//           verseService,
//           allowCheckService,
//           rateLimitService,
//           datastoreService,
//         );

//         const result = await transactionService.getMatchedTxAllowRule(
//           from,
//           to,
//           methodId,
//           value,
//         );
//         expect(result).toBe(txAllowRule);
//         expect(checkRateLimit).not.toHaveBeenCalled();
//       });

//       it('rateLimit is set, rateLimit check is failed', async () => {
//         const fromList = ['*'];
//         const toList = ['*'];
//         const rateLimit = {
//           name: 'wildcard',
//           interval: 1,
//           limit: 1,
//         };
//         const txAllowRule = {
//           fromList,
//           toList,
//           rateLimit,
//         };

//         transactionAllowListMock.mockReturnValue([txAllowRule]);
//         const methodId = data.substring(0, 10);
//         const error = new JsonrpcError(
//           'The number of allowed transacting has been exceeded',
//           -32602,
//         );

//         jest
//           .spyOn(allowCheckService, 'isIncludedAddress')
//           .mockReturnValue(true);
//         jest.spyOn(allowCheckService, 'isAllowedValue').mockReturnValue(true);
//         const checkRateLimit = jest
//           .spyOn(rateLimitService, 'checkRateLimit')
//           .mockImplementation(() => {
//             throw error;
//           });
//         const transactionService = new TransactionService(
//           typeCheckService,
//           verseService,
//           allowCheckService,
//           rateLimitService,
//           datastoreService,
//         );

//         await expect(
//           transactionService.getMatchedTxAllowRule(from, to, methodId, value),
//         ).rejects.toThrow(error.message);
//         expect(checkRateLimit).toHaveBeenCalled();
//       });

//       it('rateLimit is set, rateLimit check is successfull', async () => {
//         const fromList = ['*'];
//         const toList = ['*'];
//         const rateLimit = {
//           name: 'wildcard',
//           interval: 1,
//           limit: 1,
//         };
//         const txAllowRule = {
//           fromList,
//           toList,
//           rateLimit,
//         };

//         transactionAllowListMock.mockReturnValue([txAllowRule]);
//         const methodId = data.substring(0, 10);

//         jest
//           .spyOn(allowCheckService, 'isIncludedAddress')
//           .mockReturnValue(true);
//         jest.spyOn(allowCheckService, 'isAllowedValue').mockReturnValue(true);
//         const checkRateLimit = jest.spyOn(rateLimitService, 'checkRateLimit');
//         const transactionService = new TransactionService(
//           typeCheckService,
//           verseService,
//           allowCheckService,
//           rateLimitService,
//           datastoreService,
//         );

//         const result = await transactionService.getMatchedTxAllowRule(
//           from,
//           to,
//           methodId,
//           value,
//         );
//         expect(result).toBe(txAllowRule);
//         expect(checkRateLimit).toHaveBeenCalled();
//       });
//     });
//   });

//   describe('checkAllowedGas', () => {
//     beforeEach(() => {
//       jest.resetAllMocks();
//     });

//     it('eth_estimateGas is successful', async () => {
//       const verseStatus = 200;
//       const verseData = {
//         jsonrpc: '2.0',
//         id: 1,
//         result: '0x5208',
//       };
//       const verseResponse = {
//         status: verseStatus,
//         data: verseData,
//       };

//       jest.spyOn(verseService, 'post').mockResolvedValue(verseResponse);
//       jest
//         .spyOn(typeCheckService, 'isJsonrpcErrorResponse')
//         .mockReturnValue(false);

//       transactionAllowListMock.mockReturnValue([
//         {
//           fromList: ['*'],
//           toList: ['*'],
//         },
//       ]);

//       const transactionService = new TransactionService(
//         typeCheckService,
//         verseService,
//         allowCheckService,
//         rateLimitService,
//         datastoreService,
//       );

//       const jsonrpc = '2.0';
//       const id = 1;
//       const tx = {
//         type,
//         chainId,
//         nonce,
//         maxPriorityFeePerGas,
//         maxFeePerGas,
//         gasPrice,
//         gasLimit,
//         to,
//         value,
//         data,
//         accessList,
//         hash,
//         v,
//         r,
//         s,
//         from,
//       };

//       expect(
//         async () => await transactionService.checkAllowedGas(tx, jsonrpc, id),
//       ).not.toThrow();
//     });

//     it('eth_estimateGas is not successful', async () => {
//       const errMsg = 'insufficient balance for transfer';
//       const verseStatus = 200;
//       const verseData = {
//         jsonrpc: '2.0',
//         id: 1,
//         error: {
//           code: -32000,
//           message: errMsg,
//         },
//       };
//       const verseResponse = {
//         status: verseStatus,
//         data: verseData,
//       };

//       jest.spyOn(verseService, 'post').mockResolvedValue(verseResponse);
//       jest
//         .spyOn(typeCheckService, 'isJsonrpcErrorResponse')
//         .mockReturnValue(true);

//       transactionAllowListMock.mockReturnValue([
//         {
//           fromList: ['*'],
//           toList: ['*'],
//         },
//       ]);

//       const transactionService = new TransactionService(
//         typeCheckService,
//         verseService,
//         allowCheckService,
//         rateLimitService,
//         datastoreService,
//       );

//       const jsonrpc = '2.0';
//       const id = 1;
//       const tx = {
//         type,
//         chainId,
//         nonce,
//         maxPriorityFeePerGas,
//         maxFeePerGas,
//         gasPrice,
//         gasLimit,
//         to,
//         value,
//         data,
//         accessList,
//         hash,
//         v,
//         r,
//         s,
//         from,
//       };

//       await expect(
//         transactionService.checkAllowedGas(tx, jsonrpc, id),
//       ).rejects.toThrow(errMsg);
//     });
//   });

//   describe('getBlockNumberCacheRes', () => {
//     beforeEach(() => {
//       jest.resetAllMocks();
//     });

//     it('blockNumberCache already exists', async () => {
//       const jsonrpc = '2.0';
//       const id = 1;
//       const ip = '127.0.0.1';
//       const headers = {};
//       const requestContext = {
//         ip,
//         headers,
//       };
//       const blockNumber = '0x1c24';

//       jest
//         .spyOn(datastoreService, 'getBlockNumberCache')
//         .mockResolvedValue(blockNumber);

//       transactionAllowListMock.mockReturnValue([
//         {
//           fromList: ['*'],
//           toList: ['*'],
//         },
//       ]);

//       const transactionService = new TransactionService(
//         typeCheckService,
//         verseService,
//         allowCheckService,
//         rateLimitService,
//         datastoreService,
//       );

//       const data = {
//         id,
//         jsonrpc,
//         result: blockNumber,
//       };
//       const res = {
//         status: 200,
//         data,
//       };

//       const resetBlockNumberCache = jest.spyOn(
//         transactionService,
//         'resetBlockNumberCache',
//       );

//       const result = await transactionService.getBlockNumberCacheRes(
//         requestContext,
//         jsonrpc,
//         id,
//       );
//       expect(result).toStrictEqual(res);
//       expect(resetBlockNumberCache).not.toHaveBeenCalled();
//     });

//     it('blockNumberCache does not exist', async () => {
//       const jsonrpc = '2.0';
//       const id = 1;
//       const ip = '127.0.0.1';
//       const headers = {};
//       const requestContext = {
//         ip,
//         headers,
//       };
//       const blockNumber = '0x1c24';

//       jest.spyOn(datastoreService, 'getBlockNumberCache').mockResolvedValue('');

//       transactionAllowListMock.mockReturnValue([
//         {
//           fromList: ['*'],
//           toList: ['*'],
//         },
//       ]);

//       const transactionService = new TransactionService(
//         typeCheckService,
//         verseService,
//         allowCheckService,
//         rateLimitService,
//         datastoreService,
//       );

//       const data = {
//         id,
//         jsonrpc,
//         result: blockNumber,
//       };
//       const res = {
//         status: 200,
//         data,
//       };

//       const resetBlockNumberCache = jest
//         .spyOn(transactionService, 'resetBlockNumberCache')
//         .mockResolvedValue(res);

//       const result = await transactionService.getBlockNumberCacheRes(
//         requestContext,
//         jsonrpc,
//         id,
//       );
//       expect(result).toStrictEqual(res);
//       expect(resetBlockNumberCache).toHaveBeenCalled();
//     });
//   });

//   describe('resetBlockNumberCache', () => {
//     beforeEach(() => {
//       jest.resetAllMocks();
//     });

//     it('blockNumberRes is correct', async () => {
//       const jsonrpc = '2.0';
//       const id = 1;
//       const ip = '127.0.0.1';
//       const headers = {};
//       const requestContext = {
//         ip,
//         headers,
//       };
//       const blockNumber = '0x1c24';

//       const setBlockNumberCache = jest.spyOn(
//         datastoreService,
//         'setBlockNumberCache',
//       );

//       transactionAllowListMock.mockReturnValue([
//         {
//           fromList: ['*'],
//           toList: ['*'],
//         },
//       ]);

//       const transactionService = new TransactionService(
//         typeCheckService,
//         verseService,
//         allowCheckService,
//         rateLimitService,
//         datastoreService,
//       );

//       const data = {
//         id,
//         jsonrpc,
//         result: blockNumber,
//       };
//       const res = {
//         status: 200,
//         data,
//       };

//       const getLatestBlockNumber = jest
//         .spyOn(transactionService, 'getLatestBlockNumber')
//         .mockResolvedValue(res);

//       const result = await transactionService.resetBlockNumberCache(
//         requestContext,
//         jsonrpc,
//         id,
//       );
//       expect(result).toStrictEqual(res);
//       expect(getLatestBlockNumber).toHaveBeenCalled();
//       expect(setBlockNumberCache).toHaveBeenCalled();
//     });

//     it('blockNumberRes is not correct', async () => {
//       const jsonrpc = '2.0';
//       const id = 1;
//       const ip = '127.0.0.1';
//       const headers = {};
//       const requestContext = {
//         ip,
//         headers,
//       };
//       const blockNumber = '';

//       const setBlockNumberCache = jest.spyOn(
//         datastoreService,
//         'setBlockNumberCache',
//       );

//       transactionAllowListMock.mockReturnValue([
//         {
//           fromList: ['*'],
//           toList: ['*'],
//         },
//       ]);

//       const transactionService = new TransactionService(
//         typeCheckService,
//         verseService,
//         allowCheckService,
//         rateLimitService,
//         datastoreService,
//       );

//       const data = {
//         id,
//         jsonrpc,
//         result: blockNumber,
//       };
//       const res = {
//         status: 200,
//         data,
//       };
//       const errMsg = 'can not get blockNumber';

//       const getLatestBlockNumber = jest
//         .spyOn(transactionService, 'getLatestBlockNumber')
//         .mockResolvedValue(res);

//       await expect(
//         transactionService.resetBlockNumberCache(requestContext, jsonrpc, id),
//       ).rejects.toThrow(errMsg);
//       expect(getLatestBlockNumber).toHaveBeenCalled();
//       expect(setBlockNumberCache).not.toHaveBeenCalled();
//     });
//   });
// });
