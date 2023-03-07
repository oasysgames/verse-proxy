import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { HttpModule } from '@nestjs/axios';
import { BigNumber } from 'ethers';
import { AccessList } from 'ethers/lib/utils';
import {
  TransactionService,
  VerseService,
  ProxyService,
  AllowCheckService,
  RateLimitService,
  TypeCheckService,
  WebhookService,
} from 'src/services';
import { JsonrpcError } from 'src/entities';
import { DatastoreService } from 'src/repositories';

const type = 2;
const chainId = 5;
const nonce = 3;
const maxPriorityFeePerGas = BigNumber.from('1500000000');
const maxFeePerGas = BigNumber.from('1500000018');
const gasPrice = undefined;
const gasLimit = BigNumber.from('21000');
const to = '0x8626f6940E2eb28930eFb4CeF49B2d1F2C9C1199';
const value = BigNumber.from('1000000000000');
const data = '0x';
const accessList = [] as AccessList;
const hash =
  '0xc6092b487b9e86b4ea22bf5e73cc0172ca37e938971e26aa70ec66f7be9dfcfc';
const v = 0;
const r = '0x79448db43a092a4bf489fe93fa8a7c09ac25f3d8e5a799d401c8d105cccdd028';
const s = '0x743a0f064dc9cff4748b6d5e39dda262a89f0595570b41b0b576584d12348239';
const from = '0xaf395754eB6F542742784cE7702940C60465A46a';

const tx = {
  type,
  chainId,
  nonce,
  maxPriorityFeePerGas,
  maxFeePerGas,
  gasPrice,
  gasLimit,
  to,
  value,
  data,
  accessList,
  hash,
  v,
  r,
  s,
  from,
};

const contractDeployTx = {
  type,
  chainId,
  nonce,
  maxPriorityFeePerGas,
  maxFeePerGas,
  gasPrice,
  gasLimit,
  value,
  data,
  accessList,
  hash,
  v,
  r,
  s,
  from,
};

describe('ProxyService', () => {
  let configService: ConfigService;
  let typeCheckService: TypeCheckService;
  let verseService: VerseService;
  let txService: TransactionService;
  let datastoreService: DatastoreService;
  let moduleRef: TestingModule;

  beforeAll(async () => {
    moduleRef = await Test.createTestingModule({
      imports: [HttpModule],
      providers: [
        ConfigService,
        VerseService,
        TransactionService,
        AllowCheckService,
        TypeCheckService,
        RateLimitService,
        WebhookService,
        DatastoreService,
      ],
    })
      .useMocker((token) => {
        switch (token) {
          case ConfigService:
            return {
              get: jest.fn(),
            };
          case VerseService:
            return {
              post: jest.fn(),
            };
          case TransactionService:
            return {
              parseRawTx: jest.fn(),
              checkAllowedTx: jest.fn(),
              checkAllowedGas: jest.fn(),
            };
          case RateLimitService:
            return {
              store: jest.fn(),
            };
          case DatastoreService:
            return {};
        }
      })
      .compile();

    configService = moduleRef.get<ConfigService>(ConfigService);
    typeCheckService = moduleRef.get<TypeCheckService>(TypeCheckService);
    verseService = moduleRef.get<VerseService>(VerseService);
    txService = moduleRef.get<TransactionService>(TransactionService);
    datastoreService = moduleRef.get<DatastoreService>(DatastoreService);
  });

  describe('handleSingleRequest', () => {
    beforeEach(() => {
      jest.resetAllMocks();
    });

    it('tx method is not eth_sendRawTransaction and successful', async () => {
      const allowedMethods: RegExp[] = [/^.*$/];
      const method = 'eth_call';
      const ip = '1.2.3.4';
      const headers = { host: 'localhost' };
      const requestContext = {
        ip,
        headers,
      };
      const body = {
        jsonrpc: '2.0',
        id: 1,
        method: method,
        params: [tx, 'latest'],
      };
      const callback = jest.fn();

      const verseStatus = 200;
      const verseData = {
        jsonrpc: '2.0',
        id: 1,
        result: '0x',
      };
      const postResponse = {
        status: verseStatus,
        data: verseData,
      };

      jest.spyOn(configService, 'get').mockImplementation((arg: string) => {
        if (arg === 'allowedMethods') {
          return allowedMethods;
        } else if (arg === 'datastore') {
          return '';
        }
        return;
      });
      jest.spyOn(verseService, 'post').mockResolvedValue(postResponse);

      const proxyService = new ProxyService(
        configService,
        typeCheckService,
        verseService,
        txService,
        datastoreService,
      );

      await proxyService.handleSingleRequest(requestContext, body, callback);
      expect(callback).toHaveBeenCalledWith(postResponse);
    });

    it('tx method is not allowed', async () => {
      const allowedMethods: RegExp[] = [/^eth_call$/];
      const method = 'eth_getTransactionReceipt';
      const ip = '1.2.3.4';
      const headers = { host: 'localhost' };
      const requestContext = {
        ip,
        headers,
      };
      const body = {
        jsonrpc: '2.0',
        id: 1,
        method: method,
        params: [
          '0xc3a3a2feced276891d9658a62205ff049bab1e6e4e4d6ff500487e023fcb3d82',
        ],
      };
      const callback = jest.fn();

      const errMsg = `${method} is not allowed`;
      const errCode = -32601;
      const status = 200;
      const verseData = {
        jsonrpc: body.jsonrpc,
        id: body.id,
        error: {
          code: errCode,
          message: errMsg,
        },
      };
      const postResponse = {
        status: status,
        data: verseData,
      };
      jest.spyOn(configService, 'get').mockImplementation((arg: string) => {
        if (arg === 'allowedMethods') {
          return allowedMethods;
        } else if (arg === 'datastore') {
          return '';
        }
        return;
      });

      const proxyService = new ProxyService(
        configService,
        typeCheckService,
        verseService,
        txService,
        datastoreService,
      );

      await proxyService.handleSingleRequest(requestContext, body, callback);
      expect(callback).toHaveBeenCalledWith(postResponse);
    });
  });

  describe('handleBatchRequest', () => {
    beforeEach(() => {
      jest.resetAllMocks();
    });

    it('body has successful requests', async () => {
      const allowedMethods: RegExp[] = [/^.*$/];
      const ip = '1.2.3.4';
      const headers = { host: 'localhost' };
      const requestContext = {
        ip,
        headers,
      };
      const body = [
        {
          jsonrpc: '2.0',
          method: 'net_version',
          params: [],
          id: 1,
        },
        {
          jsonrpc: '2.0',
          method: 'net_version',
          params: [],
          id: 1,
        },
      ];
      const callback = jest.fn();

      const verseStatus = 200;
      const verseData = {
        jsonrpc: '2.0',
        id: 1,
        result: '999999',
      };
      const postResponse = {
        status: verseStatus,
        data: verseData,
      };
      const results = [
        {
          jsonrpc: '2.0',
          id: 1,
          result: '999999',
        },
        {
          jsonrpc: '2.0',
          id: 1,
          result: '999999',
        },
      ];
      const callbackArg = {
        status: verseStatus,
        data: results,
      };

      jest.spyOn(configService, 'get').mockImplementation((arg: string) => {
        if (arg === 'allowedMethods') {
          return allowedMethods;
        } else if (arg === 'datastore') {
          return '';
        }
        return;
      });
      jest.spyOn(verseService, 'post').mockResolvedValue(postResponse);

      const proxyService = new ProxyService(
        configService,
        typeCheckService,
        verseService,
        txService,
        datastoreService,
      );

      await proxyService.handleBatchRequest(requestContext, body, callback);
      expect(callback).toHaveBeenCalledWith(callbackArg);
    });

    it('body has unsuccessful requests', async () => {
      const allowedMethods: RegExp[] = [/^eth_call$/];
      const method = 'net_version';
      const ip = '1.2.3.4';
      const headers = { host: 'localhost' };
      const requestContext = {
        ip,
        headers,
      };
      const body = [
        {
          jsonrpc: '2.0',
          method: method,
          params: [],
          id: 1,
        },
        {
          jsonrpc: '2.0',
          method: method,
          params: [],
          id: 1,
        },
      ];
      const callback = jest.fn();

      const errMsg = `${method} is not allowed`;
      const errCode = -32601;
      const verseStatus = 200;
      const verseData = {
        jsonrpc: '2.0',
        id: 1,
        error: {
          code: errCode,
          message: errMsg,
        },
      };
      const postResponse = {
        status: verseStatus,
        data: verseData,
      };
      const results = [
        {
          jsonrpc: '2.0',
          id: 1,
          error: {
            code: errCode,
            message: errMsg,
          },
        },
        {
          jsonrpc: '2.0',
          id: 1,
          error: {
            code: errCode,
            message: errMsg,
          },
        },
      ];
      const callbackArg = {
        status: verseStatus,
        data: results,
      };

      jest.spyOn(configService, 'get').mockImplementation((arg: string) => {
        if (arg === 'allowedMethods') {
          return allowedMethods;
        } else if (arg === 'datastore') {
          return '';
        }
        return;
      });
      jest.spyOn(configService, 'get').mockImplementation((arg: string) => {
        if (arg === 'allowedMethods') {
          return allowedMethods;
        } else if (arg === 'datastore') {
          return '';
        }
        return;
      });
      jest.spyOn(verseService, 'post').mockResolvedValue(postResponse);

      const proxyService = new ProxyService(
        configService,
        typeCheckService,
        verseService,
        txService,
        datastoreService,
      );

      await proxyService.handleBatchRequest(requestContext, body, callback);
      expect(callback).toHaveBeenCalledWith(callbackArg);
    });
  });

  describe('send', () => {
    beforeEach(() => {
      jest.resetAllMocks();
    });

    it('tx method is not allowed', async () => {
      const allowedMethods: RegExp[] = [/^eth_call$/];
      const datastore = 'redis';
      const method = 'eth_getTransactionReceipt';
      const ip = '1.2.3.4';
      const headers = { host: 'localhost' };
      const requestContext = {
        ip,
        headers,
      };
      const body = {
        jsonrpc: '2.0',
        id: 1,
        method: method,
        params: [
          '0xc3a3a2feced276891d9658a62205ff049bab1e6e4e4d6ff500487e023fcb3d82',
        ],
      };

      const errMsg = `${method} is not allowed`;
      const errCode = -32601;
      const status = 200;
      const verseData = {
        jsonrpc: body.jsonrpc,
        id: body.id,
        error: {
          code: errCode,
          message: errMsg,
        },
      };
      const postResponse = {
        status: status,
        data: verseData,
      };
      jest.spyOn(configService, 'get').mockImplementation((arg: string) => {
        if (arg === 'allowedMethods') {
          return allowedMethods;
        } else if (arg === 'datastore') {
          return datastore;
        }
        return;
      });

      const proxyService = new ProxyService(
        configService,
        typeCheckService,
        verseService,
        txService,
        datastoreService,
      );
      const checkMethodMock = jest
        .spyOn(proxyService, 'checkMethod')
        .mockImplementation(() => {
          throw new JsonrpcError(errMsg, errCode);
        });
      const sendTransactionMock = jest.spyOn(proxyService, 'sendTransaction');

      const result = await proxyService.send(requestContext, body);
      expect(result).toEqual(postResponse);
      expect(checkMethodMock).toHaveBeenCalled();
      expect(sendTransactionMock).not.toHaveBeenCalled();
    });

    it('tx method is not eth_sendRawTransaction and successful', async () => {
      const allowedMethods: RegExp[] = [/^.*$/];
      const datastore = 'redis';
      const method = 'eth_call';
      const ip = '1.2.3.4';
      const headers = { host: 'localhost' };
      const requestContext = {
        ip,
        headers,
      };
      const body = {
        jsonrpc: '2.0',
        id: 1,
        method: method,
        params: [tx, 'latest'],
      };

      const verseStatus = 200;
      const verseData = {
        jsonrpc: '2.0',
        id: 1,
        result: '0x',
      };
      const postResponse = {
        status: verseStatus,
        data: verseData,
      };

      jest.spyOn(configService, 'get').mockImplementation((arg: string) => {
        if (arg === 'allowedMethods') {
          return allowedMethods;
        } else if (arg === 'datastore') {
          return datastore;
        }
        return;
      });
      jest.spyOn(verseService, 'post').mockResolvedValue(postResponse);

      const proxyService = new ProxyService(
        configService,
        typeCheckService,
        verseService,
        txService,
        datastoreService,
      );
      const checkMethodMock = jest.spyOn(proxyService, 'checkMethod');
      const sendTransactionMock = jest.spyOn(proxyService, 'sendTransaction');

      const result = await proxyService.send(requestContext, body);
      expect(result).toEqual(postResponse);
      expect(checkMethodMock).toHaveBeenCalled();
      expect(sendTransactionMock).not.toHaveBeenCalled();
    });

    it('tx method is not eth_sendRawTransaction and verse post is failed', async () => {
      const allowedMethods: RegExp[] = [/^.*$/];
      const datastore = 'redis';
      const method = 'eth_call';
      const ip = '1.2.3.4';
      const headers = { host: 'localhost' };
      const requestContext = {
        ip,
        headers,
      };
      const body = {
        jsonrpc: '2.0',
        id: 1,
        method: method,
        params: [tx, 'latest'],
      };

      const error = new Error('Can not post verse');
      const verseStatus = 200;
      const verseData = error;
      const postResponse = {
        status: verseStatus,
        data: verseData,
      };

      jest.spyOn(configService, 'get').mockImplementation((arg: string) => {
        if (arg === 'allowedMethods') {
          return allowedMethods;
        } else if (arg === 'datastore') {
          return datastore;
        }
        return;
      });
      jest.spyOn(verseService, 'post').mockResolvedValue(postResponse);

      const proxyService = new ProxyService(
        configService,
        typeCheckService,
        verseService,
        txService,
        datastoreService,
      );
      const checkMethodMock = jest.spyOn(proxyService, 'checkMethod');
      const sendTransactionMock = jest
        .spyOn(proxyService, 'sendTransaction')
        .mockImplementation(() => {
          throw error;
        });

      const result = await proxyService.send(requestContext, body);
      expect(result).toEqual(postResponse);
      expect(checkMethodMock).toHaveBeenCalled();
      expect(sendTransactionMock).not.toHaveBeenCalled();
    });

    it('tx method is eth_sendRawTransaction and successful', async () => {
      const rawTx =
        '0x02f86f05038459682f008459682f12825208948626f6940e2eb28930efb4cef49b2d1f2c9c119985e8d4a5100080c080a079448db43a092a4bf489fe93fa8a7c09ac25f3d8e5a799d401c8d105cccdd029a0743a0f064dc9cff4748b6d5e39dda262a89f0595570b41b0b576584d12348239';
      const allowedMethods: RegExp[] = [/^.*$/];
      const datastore = 'redis';
      const method = 'eth_sendRawTransaction';
      const ip = '1.2.3.4';
      const headers = { host: 'localhost' };
      const requestContext = {
        ip,
        headers,
      };
      const body = {
        jsonrpc: '2.0',
        id: 1,
        method: method,
        params: [rawTx],
      };

      const verseStatus = 200;
      const verseData = {
        jsonrpc: '2.0',
        id: 1,
        result:
          '0x0f4b031898f55b85adf3056e08ba5d375a012219f57dcbd782d730b22784cd3b',
      };
      const postResponse = {
        status: verseStatus,
        data: verseData,
      };

      jest.spyOn(configService, 'get').mockImplementation((arg: string) => {
        if (arg === 'allowedMethods') {
          return allowedMethods;
        } else if (arg === 'datastore') {
          return datastore;
        }
        return;
      });
      jest.spyOn(verseService, 'post').mockResolvedValue(postResponse);

      const proxyService = new ProxyService(
        configService,
        typeCheckService,
        verseService,
        txService,
        datastoreService,
      );
      const checkMethodMock = jest.spyOn(proxyService, 'checkMethod');
      const sendTransactionMock = jest.spyOn(proxyService, 'sendTransaction');

      const result = await proxyService.send(requestContext, body);
      expect(result).toEqual(postResponse);
      expect(checkMethodMock).toHaveBeenCalled();
      expect(sendTransactionMock).toHaveBeenCalled();
    });

    it('tx method is eth_sendRawTransaction and verse post is failed', async () => {
      const rawTx =
        '0x02f86f05038459682f008459682f12825208948626f6940e2eb28930efb4cef49b2d1f2c9c119985e8d4a5100080c080a079448db43a092a4bf489fe93fa8a7c09ac25f3d8e5a799d401c8d105cccdd029a0743a0f064dc9cff4748b6d5e39dda262a89f0595570b41b0b576584d12348239';
      const allowedMethods: RegExp[] = [/^.*$/];
      const datastore = 'redis';
      const method = 'eth_sendRawTransaction';
      const ip = '1.2.3.4';
      const headers = { host: 'localhost' };
      const requestContext = {
        ip,
        headers,
      };
      const body = {
        jsonrpc: '2.0',
        id: 1,
        method: method,
        params: [rawTx],
      };

      const error = new Error('Can not post verse');
      const verseStatus = 200;
      const verseData = error;
      const postResponse = {
        status: verseStatus,
        data: verseData,
      };

      jest.spyOn(configService, 'get').mockImplementation((arg: string) => {
        if (arg === 'allowedMethods') {
          return allowedMethods;
        } else if (arg === 'datastore') {
          return datastore;
        }
        return;
      });
      jest.spyOn(verseService, 'post').mockResolvedValue(postResponse);

      const proxyService = new ProxyService(
        configService,
        typeCheckService,
        verseService,
        txService,
        datastoreService,
      );
      const checkMethodMock = jest.spyOn(proxyService, 'checkMethod');
      const sendTransactionMock = jest
        .spyOn(proxyService, 'sendTransaction')
        .mockImplementation(() => {
          throw error;
        });

      const result = await proxyService.send(requestContext, body);
      expect(result).toEqual(postResponse);
      expect(checkMethodMock).toHaveBeenCalled();
      expect(sendTransactionMock).toHaveBeenCalled();
    });
  });

  describe('sendTransaction', () => {
    beforeEach(() => {
      jest.resetAllMocks();
    });

    it('body is invalid', async () => {
      const allowedMethods: RegExp[] = [/^.*$/];
      const datastore = 'redis';
      const method = 'eth_sendRawTransaction';
      const ip = '1.2.3.4';
      const headers = { host: 'localhost' };
      const requestContext = {
        ip,
        headers,
      };
      const body = {
        jsonrpc: '2.0',
        id: 1,
        method: method,
      };
      const rateLimit = {
        name: 'wildcard',
        interval: 1,
        limit: 1,
      };
      const matchedTxAllowRule = {
        fromList: ['*'],
        toList: ['*'],
        rateLimit,
      };
      const verseStatus = 200;
      const verseData = {
        jsonrpc: '2.0',
        id: 1,
        result:
          '0x0f4b031898f55b85adf3056e08ba5d375a012219f57dcbd782d730b22784cd3b',
      };
      const postResponse = {
        status: verseStatus,
        data: verseData,
      };
      const error = new JsonrpcError('rawTransaction is not found', -32602);

      jest.spyOn(configService, 'get').mockImplementation((arg: string) => {
        if (arg === 'allowedMethods') {
          return allowedMethods;
        } else if (arg === 'datastore') {
          return datastore;
        }
        return;
      });
      const parseRawTx = jest
        .spyOn(txService, 'parseRawTx')
        .mockReturnValue(tx);
      const checkContractDeploy = jest.spyOn(txService, 'checkContractDeploy');
      const versePost = jest
        .spyOn(verseService, 'post')
        .mockResolvedValue(postResponse);
      const checkAllowedGas = jest.spyOn(txService, 'checkAllowedGas');
      const getMatchedTxAllowRule = jest
        .spyOn(txService, 'getMatchedTxAllowRule')
        .mockResolvedValue(matchedTxAllowRule);
      const setTransactionHistory = jest.spyOn(
        datastoreService,
        'setTransactionHistory',
      );

      const proxyService = new ProxyService(
        configService,
        typeCheckService,
        verseService,
        txService,
        datastoreService,
      );

      try {
        await proxyService.sendTransaction(requestContext, body);
      } catch (e) {
        expect(e).toEqual(error);
        expect(parseRawTx).not.toHaveBeenCalled();
        expect(checkContractDeploy).not.toHaveBeenCalled();
        expect(checkAllowedGas).not.toHaveBeenCalled();
        expect(versePost).not.toHaveBeenCalled();
        expect(getMatchedTxAllowRule).not.toHaveBeenCalled();
        expect(setTransactionHistory).not.toHaveBeenCalled();
      }
    });

    it('transaction from is not set', async () => {
      const allowedMethods: RegExp[] = [/^.*$/];
      const datastore = 'redis';
      const method = 'eth_sendRawTransaction';
      const ip = '1.2.3.4';
      const headers = { host: 'localhost' };
      const requestContext = {
        ip,
        headers,
      };
      const body = {
        jsonrpc: '2.0',
        id: 1,
        method: method,
        params: [
          '0x02f86f05038459682f008459682f12825208948626f6940e2eb28930efb4cef49b2d1f2c9c119985e8d4a5100080c080a079448db43a092a4bf489fe93fa8a7c09ac25f3d8e5a799d401c8d105cccdd029a0743a0f064dc9cff4748b6d5e39dda262a89f0595570b41b0b576584d12348239',
        ],
      };
      const rateLimit = {
        name: 'wildcard',
        interval: 1,
        limit: 1,
      };
      const matchedTxAllowRule = {
        fromList: ['*'],
        toList: ['*'],
        rateLimit,
      };
      const verseStatus = 200;
      const verseData = {
        jsonrpc: '2.0',
        id: 1,
        result:
          '0x0f4b031898f55b85adf3056e08ba5d375a012219f57dcbd782d730b22784cd3b',
      };
      const postResponse = {
        status: verseStatus,
        data: verseData,
      };
      const error = new JsonrpcError('transaction is invalid', -32602);

      const invalidTx = {
        type,
        chainId,
        nonce,
        maxPriorityFeePerGas,
        maxFeePerGas,
        gasPrice,
        gasLimit,
        to,
        value,
        data,
        accessList,
        hash,
        v,
        r,
        s,
      };

      jest.spyOn(configService, 'get').mockImplementation((arg: string) => {
        if (arg === 'allowedMethods') {
          return allowedMethods;
        } else if (arg === 'datastore') {
          return datastore;
        }
        return;
      });
      const parseRawTx = jest
        .spyOn(txService, 'parseRawTx')
        .mockReturnValue(invalidTx);
      const checkContractDeploy = jest.spyOn(txService, 'checkContractDeploy');
      const versePost = jest
        .spyOn(verseService, 'post')
        .mockResolvedValue(postResponse);
      const checkAllowedGas = jest.spyOn(txService, 'checkAllowedGas');
      const getMatchedTxAllowRule = jest
        .spyOn(txService, 'getMatchedTxAllowRule')
        .mockResolvedValue(matchedTxAllowRule);
      const setTransactionHistory = jest.spyOn(
        datastoreService,
        'setTransactionHistory',
      );

      const proxyService = new ProxyService(
        configService,
        typeCheckService,
        verseService,
        txService,
        datastoreService,
      );

      try {
        await proxyService.sendTransaction(requestContext, body);
      } catch (e) {
        expect(e).toEqual(error);
        expect(parseRawTx).toHaveBeenCalled();
        expect(checkContractDeploy).not.toHaveBeenCalled();
        expect(checkAllowedGas).not.toHaveBeenCalled();
        expect(versePost).not.toHaveBeenCalled();
        expect(getMatchedTxAllowRule).not.toHaveBeenCalled();
        expect(setTransactionHistory).not.toHaveBeenCalled();
      }
    });

    describe('contract deploy transaction', () => {
      it('checkContractDeploy is failed', async () => {
        const allowedMethods: RegExp[] = [/^.*$/];
        const datastore = 'redis';
        const method = 'eth_sendRawTransaction';
        const ip = '1.2.3.4';
        const headers = { host: 'localhost' };
        const requestContext = {
          ip,
          headers,
        };
        const body = {
          jsonrpc: '2.0',
          id: 1,
          method: method,
          params: [
            '0x02f86f05038459682f008459682f12825208948626f6940e2eb28930efb4cef49b2d1f2c9c119985e8d4a5100080c080a079448db43a092a4bf489fe93fa8a7c09ac25f3d8e5a799d401c8d105cccdd029a0743a0f064dc9cff4748b6d5e39dda262a89f0595570b41b0b576584d12348239',
          ],
        };
        const rateLimit = {
          name: 'wildcard',
          interval: 1,
          limit: 1,
        };
        const matchedTxAllowRule = {
          fromList: ['*'],
          toList: ['*'],
          rateLimit,
        };
        const verseStatus = 200;
        const verseData = {
          jsonrpc: '2.0',
          id: 1,
          result:
            '0x0f4b031898f55b85adf3056e08ba5d375a012219f57dcbd782d730b22784cd3b',
        };
        const postResponse = {
          status: verseStatus,
          data: verseData,
        };
        const error = new JsonrpcError(
          'deploy transaction is not allowed',
          -32602,
        );

        jest.spyOn(configService, 'get').mockImplementation((arg: string) => {
          if (arg === 'allowedMethods') {
            return allowedMethods;
          } else if (arg === 'datastore') {
            return datastore;
          }
          return;
        });
        const parseRawTx = jest
          .spyOn(txService, 'parseRawTx')
          .mockReturnValue(contractDeployTx);
        const checkContractDeploy = jest
          .spyOn(txService, 'checkContractDeploy')
          .mockImplementation(() => {
            throw error;
          });
        const versePost = jest
          .spyOn(verseService, 'post')
          .mockResolvedValue(postResponse);
        const checkAllowedGas = jest.spyOn(txService, 'checkAllowedGas');
        const getMatchedTxAllowRule = jest
          .spyOn(txService, 'getMatchedTxAllowRule')
          .mockResolvedValue(matchedTxAllowRule);
        const setTransactionHistory = jest.spyOn(
          datastoreService,
          'setTransactionHistory',
        );

        const proxyService = new ProxyService(
          configService,
          typeCheckService,
          verseService,
          txService,
          datastoreService,
        );

        try {
          await proxyService.sendTransaction(requestContext, body);
        } catch (e) {
          expect(e).toEqual(error);
          expect(parseRawTx).toHaveBeenCalled();
          expect(checkContractDeploy).toHaveBeenCalled();
          expect(checkAllowedGas).not.toHaveBeenCalled();
          expect(versePost).not.toHaveBeenCalled();
          expect(getMatchedTxAllowRule).not.toHaveBeenCalled();
          expect(setTransactionHistory).not.toHaveBeenCalled();
        }
      });

      it('checkAllowedGas is failed', async () => {
        const allowedMethods: RegExp[] = [/^.*$/];
        const datastore = 'redis';
        const method = 'eth_sendRawTransaction';
        const ip = '1.2.3.4';
        const headers = { host: 'localhost' };
        const requestContext = {
          ip,
          headers,
        };
        const body = {
          jsonrpc: '2.0',
          id: 1,
          method: method,
          params: [
            '0x02f86f05038459682f008459682f12825208948626f6940e2eb28930efb4cef49b2d1f2c9c119985e8d4a5100080c080a079448db43a092a4bf489fe93fa8a7c09ac25f3d8e5a799d401c8d105cccdd029a0743a0f064dc9cff4748b6d5e39dda262a89f0595570b41b0b576584d12348239',
          ],
        };
        const rateLimit = {
          name: 'wildcard',
          interval: 1,
          limit: 1,
        };
        const matchedTxAllowRule = {
          fromList: ['*'],
          toList: ['*'],
          rateLimit,
        };
        const verseStatus = 200;
        const verseData = {
          jsonrpc: '2.0',
          id: 1,
          result:
            '0x0f4b031898f55b85adf3056e08ba5d375a012219f57dcbd782d730b22784cd3b',
        };
        const postResponse = {
          status: verseStatus,
          data: verseData,
        };
        const error = new JsonrpcError(
          'insufficient balance for transfer',
          -32602,
        );

        jest.spyOn(configService, 'get').mockImplementation((arg: string) => {
          if (arg === 'allowedMethods') {
            return allowedMethods;
          } else if (arg === 'datastore') {
            return datastore;
          }
          return;
        });
        const parseRawTx = jest
          .spyOn(txService, 'parseRawTx')
          .mockReturnValue(contractDeployTx);
        const checkContractDeploy = jest.spyOn(
          txService,
          'checkContractDeploy',
        );
        const versePost = jest
          .spyOn(verseService, 'post')
          .mockResolvedValue(postResponse);
        const checkAllowedGas = jest
          .spyOn(txService, 'checkAllowedGas')
          .mockImplementation(() => {
            throw error;
          });
        const getMatchedTxAllowRule = jest
          .spyOn(txService, 'getMatchedTxAllowRule')
          .mockResolvedValue(matchedTxAllowRule);
        const setTransactionHistory = jest.spyOn(
          datastoreService,
          'setTransactionHistory',
        );

        const proxyService = new ProxyService(
          configService,
          typeCheckService,
          verseService,
          txService,
          datastoreService,
        );

        try {
          await proxyService.sendTransaction(requestContext, body);
        } catch (e) {
          expect(e).toEqual(error);
          expect(parseRawTx).toHaveBeenCalled();
          expect(checkContractDeploy).toHaveBeenCalled();
          expect(checkAllowedGas).toHaveBeenCalled();
          expect(versePost).not.toHaveBeenCalled();
          expect(getMatchedTxAllowRule).not.toHaveBeenCalled();
          expect(setTransactionHistory).not.toHaveBeenCalled();
        }
      });

      it('tx is successful', async () => {
        const allowedMethods: RegExp[] = [/^.*$/];
        const datastore = 'redis';
        const method = 'eth_sendRawTransaction';
        const ip = '1.2.3.4';
        const headers = { host: 'localhost' };
        const requestContext = {
          ip,
          headers,
        };
        const body = {
          jsonrpc: '2.0',
          id: 1,
          method: method,
          params: [
            '0x02f86f05038459682f008459682f12825208948626f6940e2eb28930efb4cef49b2d1f2c9c119985e8d4a5100080c080a079448db43a092a4bf489fe93fa8a7c09ac25f3d8e5a799d401c8d105cccdd029a0743a0f064dc9cff4748b6d5e39dda262a89f0595570b41b0b576584d12348239',
          ],
        };
        const rateLimit = {
          name: 'wildcard',
          interval: 1,
          limit: 1,
        };
        const matchedTxAllowRule = {
          fromList: ['*'],
          toList: ['*'],
          rateLimit,
        };
        const verseStatus = 200;
        const verseData = {
          jsonrpc: '2.0',
          id: 1,
          result:
            '0x0f4b031898f55b85adf3056e08ba5d375a012219f57dcbd782d730b22784cd3b',
        };
        const postResponse = {
          status: verseStatus,
          data: verseData,
        };

        jest.spyOn(configService, 'get').mockImplementation((arg: string) => {
          if (arg === 'allowedMethods') {
            return allowedMethods;
          } else if (arg === 'datastore') {
            return datastore;
          }
          return;
        });
        const parseRawTx = jest
          .spyOn(txService, 'parseRawTx')
          .mockReturnValue(contractDeployTx);
        const checkContractDeploy = jest.spyOn(
          txService,
          'checkContractDeploy',
        );
        const versePost = jest
          .spyOn(verseService, 'post')
          .mockResolvedValue(postResponse);
        const checkAllowedGas = jest.spyOn(txService, 'checkAllowedGas');
        const getMatchedTxAllowRule = jest
          .spyOn(txService, 'getMatchedTxAllowRule')
          .mockResolvedValue(matchedTxAllowRule);
        const setTransactionHistory = jest.spyOn(
          datastoreService,
          'setTransactionHistory',
        );

        const proxyService = new ProxyService(
          configService,
          typeCheckService,
          verseService,
          txService,
          datastoreService,
        );

        const result = await proxyService.sendTransaction(requestContext, body);
        expect(result).toEqual(postResponse);
        expect(parseRawTx).toHaveBeenCalled();
        expect(checkContractDeploy).toHaveBeenCalled();
        expect(checkAllowedGas).toHaveBeenCalled();
        expect(versePost).toHaveBeenCalled();
        expect(getMatchedTxAllowRule).not.toHaveBeenCalled();
        expect(setTransactionHistory).not.toHaveBeenCalled();
      });

      it('verse post is failed', async () => {
        const allowedMethods: RegExp[] = [/^.*$/];
        const datastore = 'redis';
        const method = 'eth_sendRawTransaction';
        const ip = '1.2.3.4';
        const headers = { host: 'localhost' };
        const requestContext = {
          ip,
          headers,
        };
        const body = {
          jsonrpc: '2.0',
          id: 1,
          method: method,
          params: [
            '0x02f86f05038459682f008459682f12825208948626f6940e2eb28930efb4cef49b2d1f2c9c119985e8d4a5100080c080a079448db43a092a4bf489fe93fa8a7c09ac25f3d8e5a799d401c8d105cccdd029a0743a0f064dc9cff4748b6d5e39dda262a89f0595570b41b0b576584d12348239',
          ],
        };
        const rateLimit = {
          name: 'wildcard',
          interval: 1,
          limit: 1,
        };
        const matchedTxAllowRule = {
          fromList: ['*'],
          toList: ['*'],
          rateLimit,
        };
        const error = new Error('Can not post verse');

        jest.spyOn(configService, 'get').mockImplementation((arg: string) => {
          if (arg === 'allowedMethods') {
            return allowedMethods;
          } else if (arg === 'datastore') {
            return datastore;
          }
          return;
        });
        const parseRawTx = jest
          .spyOn(txService, 'parseRawTx')
          .mockReturnValue(contractDeployTx);
        const checkContractDeploy = jest.spyOn(
          txService,
          'checkContractDeploy',
        );
        const versePost = jest
          .spyOn(verseService, 'post')
          .mockImplementation(() => {
            throw error;
          });
        const checkAllowedGas = jest.spyOn(txService, 'checkAllowedGas');
        const getMatchedTxAllowRule = jest
          .spyOn(txService, 'getMatchedTxAllowRule')
          .mockResolvedValue(matchedTxAllowRule);
        const setTransactionHistory = jest.spyOn(
          datastoreService,
          'setTransactionHistory',
        );

        const proxyService = new ProxyService(
          configService,
          typeCheckService,
          verseService,
          txService,
          datastoreService,
        );

        try {
          await proxyService.sendTransaction(requestContext, body);
        } catch (e) {
          expect(e).toEqual(error);
          expect(parseRawTx).toHaveBeenCalled();
          expect(checkContractDeploy).toHaveBeenCalled();
          expect(checkAllowedGas).toHaveBeenCalled();
          expect(versePost).toHaveBeenCalled();
          expect(getMatchedTxAllowRule).not.toHaveBeenCalled();
          expect(setTransactionHistory).not.toHaveBeenCalled();
        }
      });
    });

    describe('normal transaction', () => {
      it('getMatchedTxAllowRule is failed', async () => {
        const allowedMethods: RegExp[] = [/^.*$/];
        const datastore = 'redis';
        const method = 'eth_sendRawTransaction';
        const ip = '1.2.3.4';
        const headers = { host: 'localhost' };
        const requestContext = {
          ip,
          headers,
        };
        const body = {
          jsonrpc: '2.0',
          id: 1,
          method: method,
          params: [
            '0x02f86f05038459682f008459682f12825208948626f6940e2eb28930efb4cef49b2d1f2c9c119985e8d4a5100080c080a079448db43a092a4bf489fe93fa8a7c09ac25f3d8e5a799d401c8d105cccdd029a0743a0f064dc9cff4748b6d5e39dda262a89f0595570b41b0b576584d12348239',
          ],
        };
        const verseStatus = 200;
        const verseData = {
          jsonrpc: '2.0',
          id: 1,
          result:
            '0x0f4b031898f55b85adf3056e08ba5d375a012219f57dcbd782d730b22784cd3b',
        };
        const postResponse = {
          status: verseStatus,
          data: verseData,
        };
        const error = new JsonrpcError('transaction is not allowed', -32602);

        jest.spyOn(configService, 'get').mockImplementation((arg: string) => {
          if (arg === 'allowedMethods') {
            return allowedMethods;
          } else if (arg === 'datastore') {
            return datastore;
          }
          return;
        });
        const parseRawTx = jest
          .spyOn(txService, 'parseRawTx')
          .mockReturnValue(tx);
        const checkContractDeploy = jest.spyOn(
          txService,
          'checkContractDeploy',
        );
        const versePost = jest
          .spyOn(verseService, 'post')
          .mockResolvedValue(postResponse);
        const checkAllowedGas = jest.spyOn(txService, 'checkAllowedGas');
        const getMatchedTxAllowRule = jest
          .spyOn(txService, 'getMatchedTxAllowRule')
          .mockImplementation(() => {
            throw error;
          });
        const setTransactionHistory = jest.spyOn(
          datastoreService,
          'setTransactionHistory',
        );

        const proxyService = new ProxyService(
          configService,
          typeCheckService,
          verseService,
          txService,
          datastoreService,
        );

        try {
          await proxyService.sendTransaction(requestContext, body);
        } catch (e) {
          expect(e).toEqual(error);
          expect(parseRawTx).toHaveBeenCalled();
          expect(checkContractDeploy).not.toHaveBeenCalled();
          expect(getMatchedTxAllowRule).toHaveBeenCalled();
          expect(checkAllowedGas).not.toHaveBeenCalled();
          expect(versePost).not.toHaveBeenCalled();
          expect(setTransactionHistory).not.toHaveBeenCalled();
        }
      });

      it('checkAllowedGas is failed', async () => {
        const allowedMethods: RegExp[] = [/^.*$/];
        const datastore = 'redis';
        const method = 'eth_sendRawTransaction';
        const ip = '1.2.3.4';
        const headers = { host: 'localhost' };
        const requestContext = {
          ip,
          headers,
        };
        const body = {
          jsonrpc: '2.0',
          id: 1,
          method: method,
          params: [
            '0x02f86f05038459682f008459682f12825208948626f6940e2eb28930efb4cef49b2d1f2c9c119985e8d4a5100080c080a079448db43a092a4bf489fe93fa8a7c09ac25f3d8e5a799d401c8d105cccdd029a0743a0f064dc9cff4748b6d5e39dda262a89f0595570b41b0b576584d12348239',
          ],
        };
        const rateLimit = {
          name: 'wildcard',
          interval: 1,
          limit: 1,
        };
        const matchedTxAllowRule = {
          fromList: ['*'],
          toList: ['*'],
          rateLimit,
        };
        const verseStatus = 200;
        const verseData = {
          jsonrpc: '2.0',
          id: 1,
          result:
            '0x0f4b031898f55b85adf3056e08ba5d375a012219f57dcbd782d730b22784cd3b',
        };
        const postResponse = {
          status: verseStatus,
          data: verseData,
        };
        const error = new JsonrpcError(
          'insufficient balance for transfer',
          -32602,
        );

        jest.spyOn(configService, 'get').mockImplementation((arg: string) => {
          if (arg === 'allowedMethods') {
            return allowedMethods;
          } else if (arg === 'datastore') {
            return datastore;
          }
          return;
        });
        const parseRawTx = jest
          .spyOn(txService, 'parseRawTx')
          .mockReturnValue(tx);
        const checkContractDeploy = jest.spyOn(
          txService,
          'checkContractDeploy',
        );
        const versePost = jest
          .spyOn(verseService, 'post')
          .mockResolvedValue(postResponse);
        const checkAllowedGas = jest
          .spyOn(txService, 'checkAllowedGas')
          .mockImplementation(() => {
            throw error;
          });
        const getMatchedTxAllowRule = jest
          .spyOn(txService, 'getMatchedTxAllowRule')
          .mockResolvedValue(matchedTxAllowRule);
        const setTransactionHistory = jest.spyOn(
          datastoreService,
          'setTransactionHistory',
        );

        const proxyService = new ProxyService(
          configService,
          typeCheckService,
          verseService,
          txService,
          datastoreService,
        );

        try {
          await proxyService.sendTransaction(requestContext, body);
        } catch (e) {
          expect(e).toEqual(error);
          expect(parseRawTx).toHaveBeenCalled();
          expect(checkContractDeploy).not.toHaveBeenCalled();
          expect(getMatchedTxAllowRule).toHaveBeenCalled();
          expect(checkAllowedGas).toHaveBeenCalled();
          expect(versePost).not.toHaveBeenCalled();
          expect(setTransactionHistory).not.toHaveBeenCalled();
        }
      });

      it('verse post is failed', async () => {
        const allowedMethods: RegExp[] = [/^.*$/];
        const datastore = 'redis';
        const method = 'eth_sendRawTransaction';
        const ip = '1.2.3.4';
        const headers = { host: 'localhost' };
        const requestContext = {
          ip,
          headers,
        };
        const body = {
          jsonrpc: '2.0',
          id: 1,
          method: method,
          params: [
            '0x02f86f05038459682f008459682f12825208948626f6940e2eb28930efb4cef49b2d1f2c9c119985e8d4a5100080c080a079448db43a092a4bf489fe93fa8a7c09ac25f3d8e5a799d401c8d105cccdd029a0743a0f064dc9cff4748b6d5e39dda262a89f0595570b41b0b576584d12348239',
          ],
        };
        const rateLimit = {
          name: 'wildcard',
          interval: 1,
          limit: 1,
        };
        const matchedTxAllowRule = {
          fromList: ['*'],
          toList: ['*'],
          rateLimit,
        };
        const error = new Error('Can not post verse');

        jest.spyOn(configService, 'get').mockImplementation((arg: string) => {
          if (arg === 'allowedMethods') {
            return allowedMethods;
          } else if (arg === 'datastore') {
            return datastore;
          }
          return;
        });
        const parseRawTx = jest
          .spyOn(txService, 'parseRawTx')
          .mockReturnValue(tx);
        const checkContractDeploy = jest.spyOn(
          txService,
          'checkContractDeploy',
        );
        const versePost = jest
          .spyOn(verseService, 'post')
          .mockImplementation(() => {
            throw error;
          });
        const checkAllowedGas = jest.spyOn(txService, 'checkAllowedGas');
        const getMatchedTxAllowRule = jest
          .spyOn(txService, 'getMatchedTxAllowRule')
          .mockResolvedValue(matchedTxAllowRule);
        const setTransactionHistory = jest.spyOn(
          datastoreService,
          'setTransactionHistory',
        );

        const proxyService = new ProxyService(
          configService,
          typeCheckService,
          verseService,
          txService,
          datastoreService,
        );

        try {
          await proxyService.sendTransaction(requestContext, body);
        } catch (e) {
          expect(e).toEqual(error);
          expect(parseRawTx).toHaveBeenCalled();
          expect(checkContractDeploy).not.toHaveBeenCalled();
          expect(getMatchedTxAllowRule).toHaveBeenCalled();
          expect(checkAllowedGas).toHaveBeenCalled();
          expect(versePost).toHaveBeenCalled();
          expect(setTransactionHistory).not.toHaveBeenCalled();
        }
      });

      it('verse response is invalid', async () => {
        const allowedMethods: RegExp[] = [/^.*$/];
        const datastore = 'redis';
        const method = 'eth_sendRawTransaction';
        const ip = '1.2.3.4';
        const headers = { host: 'localhost' };
        const requestContext = {
          ip,
          headers,
        };
        const body = {
          jsonrpc: '2.0',
          id: 1,
          method: method,
          params: [
            '0x02f86f05038459682f008459682f12825208948626f6940e2eb28930efb4cef49b2d1f2c9c119985e8d4a5100080c080a079448db43a092a4bf489fe93fa8a7c09ac25f3d8e5a799d401c8d105cccdd029a0743a0f064dc9cff4748b6d5e39dda262a89f0595570b41b0b576584d12348239',
          ],
        };
        const rateLimit = {
          name: 'wildcard',
          interval: 1,
          limit: 1,
        };
        const matchedTxAllowRule = {
          fromList: ['*'],
          toList: ['*'],
          rateLimit,
        };
        const verseStatus = 200;
        const verseData = {
          jsonrpc: '2.0',
          id: 1,
          result: 'aaa',
        };
        const postResponse = {
          status: verseStatus,
          data: verseData,
        };
        const error = new JsonrpcError('Can not get verse response', -32603);

        jest.spyOn(configService, 'get').mockImplementation((arg: string) => {
          if (arg === 'allowedMethods') {
            return allowedMethods;
          } else if (arg === 'datastore') {
            return datastore;
          }
          return;
        });
        const parseRawTx = jest
          .spyOn(txService, 'parseRawTx')
          .mockReturnValue(tx);
        const checkContractDeploy = jest.spyOn(
          txService,
          'checkContractDeploy',
        );
        const versePost = jest
          .spyOn(verseService, 'post')
          .mockResolvedValue(postResponse);
        const checkAllowedGas = jest.spyOn(txService, 'checkAllowedGas');
        const getMatchedTxAllowRule = jest
          .spyOn(txService, 'getMatchedTxAllowRule')
          .mockResolvedValue(matchedTxAllowRule);
        const setTransactionHistory = jest.spyOn(
          datastoreService,
          'setTransactionHistory',
        );

        const proxyService = new ProxyService(
          configService,
          typeCheckService,
          verseService,
          txService,
          datastoreService,
        );

        try {
          await proxyService.sendTransaction(requestContext, body);
        } catch (e) {
          expect(e).toEqual(error);
          expect(parseRawTx).toHaveBeenCalled();
          expect(checkContractDeploy).not.toHaveBeenCalled();
          expect(getMatchedTxAllowRule).toHaveBeenCalled();
          expect(checkAllowedGas).toHaveBeenCalled();
          expect(versePost).toHaveBeenCalled();
          expect(setTransactionHistory).not.toHaveBeenCalled();
        }
      });

      it('tx is successful and rateLimit is set', async () => {
        const allowedMethods: RegExp[] = [/^.*$/];
        const datastore = 'redis';
        const method = 'eth_sendRawTransaction';
        const ip = '1.2.3.4';
        const headers = { host: 'localhost' };
        const requestContext = {
          ip,
          headers,
        };
        const body = {
          jsonrpc: '2.0',
          id: 1,
          method: method,
          params: [
            '0x02f86f05038459682f008459682f12825208948626f6940e2eb28930efb4cef49b2d1f2c9c119985e8d4a5100080c080a079448db43a092a4bf489fe93fa8a7c09ac25f3d8e5a799d401c8d105cccdd029a0743a0f064dc9cff4748b6d5e39dda262a89f0595570b41b0b576584d12348239',
          ],
        };
        const rateLimit = {
          name: 'wildcard',
          interval: 1,
          limit: 1,
        };
        const matchedTxAllowRule = {
          fromList: ['*'],
          toList: ['*'],
          rateLimit,
        };
        const verseStatus = 200;
        const verseData = {
          jsonrpc: '2.0',
          id: 1,
          result:
            '0x0f4b031898f55b85adf3056e08ba5d375a012219f57dcbd782d730b22784cd3b',
        };
        const postResponse = {
          status: verseStatus,
          data: verseData,
        };

        jest.spyOn(configService, 'get').mockImplementation((arg: string) => {
          if (arg === 'allowedMethods') {
            return allowedMethods;
          } else if (arg === 'datastore') {
            return datastore;
          }
          return;
        });
        const parseRawTx = jest
          .spyOn(txService, 'parseRawTx')
          .mockReturnValue(tx);
        const checkContractDeploy = jest.spyOn(
          txService,
          'checkContractDeploy',
        );
        const versePost = jest
          .spyOn(verseService, 'post')
          .mockResolvedValue(postResponse);
        const checkAllowedGas = jest.spyOn(txService, 'checkAllowedGas');
        const getMatchedTxAllowRule = jest
          .spyOn(txService, 'getMatchedTxAllowRule')
          .mockResolvedValue(matchedTxAllowRule);
        const setTransactionHistory = jest.spyOn(
          datastoreService,
          'setTransactionHistory',
        );

        const proxyService = new ProxyService(
          configService,
          typeCheckService,
          verseService,
          txService,
          datastoreService,
        );

        const result = await proxyService.sendTransaction(requestContext, body);
        expect(result).toEqual(postResponse);
        expect(parseRawTx).toHaveBeenCalled();
        expect(checkContractDeploy).not.toHaveBeenCalled();
        expect(checkAllowedGas).toHaveBeenCalled();
        expect(versePost).toHaveBeenCalled();
        expect(getMatchedTxAllowRule).toHaveBeenCalled();
        expect(setTransactionHistory).toHaveBeenCalled();
      });

      it('tx is successful and rateLimit is not set', async () => {
        const allowedMethods: RegExp[] = [/^.*$/];
        const method = 'eth_sendRawTransaction';
        const ip = '1.2.3.4';
        const headers = { host: 'localhost' };
        const requestContext = {
          ip,
          headers,
        };
        const body = {
          jsonrpc: '2.0',
          id: 1,
          method: method,
          params: [
            '0x02f86f05038459682f008459682f12825208948626f6940e2eb28930efb4cef49b2d1f2c9c119985e8d4a5100080c080a079448db43a092a4bf489fe93fa8a7c09ac25f3d8e5a799d401c8d105cccdd029a0743a0f064dc9cff4748b6d5e39dda262a89f0595570b41b0b576584d12348239',
          ],
        };
        const matchedTxAllowRule = {
          fromList: ['*'],
          toList: ['*'],
        };
        const verseStatus = 200;
        const verseData = {
          jsonrpc: '2.0',
          id: 1,
          result:
            '0x0f4b031898f55b85adf3056e08ba5d375a012219f57dcbd782d730b22784cd3b',
        };
        const postResponse = {
          status: verseStatus,
          data: verseData,
        };

        jest.spyOn(configService, 'get').mockImplementation((arg: string) => {
          if (arg === 'allowedMethods') {
            return allowedMethods;
          } else if (arg === 'datastore') {
            return '';
          }
          return;
        });
        const parseRawTx = jest
          .spyOn(txService, 'parseRawTx')
          .mockReturnValue(tx);
        const checkContractDeploy = jest.spyOn(
          txService,
          'checkContractDeploy',
        );
        const versePost = jest
          .spyOn(verseService, 'post')
          .mockResolvedValue(postResponse);
        const checkAllowedGas = jest.spyOn(txService, 'checkAllowedGas');
        const getMatchedTxAllowRule = jest
          .spyOn(txService, 'getMatchedTxAllowRule')
          .mockResolvedValue(matchedTxAllowRule);
        const setTransactionHistory = jest.spyOn(
          datastoreService,
          'setTransactionHistory',
        );

        const proxyService = new ProxyService(
          configService,
          typeCheckService,
          verseService,
          txService,
          datastoreService,
        );

        const result = await proxyService.sendTransaction(requestContext, body);
        expect(result).toEqual(postResponse);
        expect(parseRawTx).toHaveBeenCalled();
        expect(checkContractDeploy).not.toHaveBeenCalled();
        expect(checkAllowedGas).toHaveBeenCalled();
        expect(versePost).toHaveBeenCalled();
        expect(getMatchedTxAllowRule).toHaveBeenCalled();
        expect(setTransactionHistory).not.toHaveBeenCalled();
      });
    });
  });

  describe('checkMethod', () => {
    beforeEach(() => {
      jest.resetAllMocks();
    });

    it('All methods are allowed', () => {
      const allowedMethods: RegExp[] = [/^.*$/];
      const method = 'eth_getTransactionReceipt';
      jest.spyOn(configService, 'get').mockImplementation((arg: string) => {
        if (arg === 'allowedMethods') {
          return allowedMethods;
        } else if (arg === 'datastore') {
          return '';
        }
        return;
      });

      const proxyService = new ProxyService(
        configService,
        typeCheckService,
        verseService,
        txService,
        datastoreService,
      );

      expect(() => proxyService.checkMethod(method)).not.toThrow();
    });

    it('Tx method is not allowed', () => {
      const allowedMethods: RegExp[] = [/^eth_call$/];
      const method = 'eth_getTransactionReceipt';
      jest.spyOn(configService, 'get').mockImplementation((arg: string) => {
        if (arg === 'allowedMethods') {
          return allowedMethods;
        } else if (arg === 'datastore') {
          return '';
        }
        return;
      });

      const proxyService = new ProxyService(
        configService,
        typeCheckService,
        verseService,
        txService,
        datastoreService,
      );

      expect(() => proxyService.checkMethod(method)).toThrow(
        `${method} is not allowed`,
      );
    });
  });
});
