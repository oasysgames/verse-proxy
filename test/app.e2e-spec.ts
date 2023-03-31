import { Test, TestingModule } from '@nestjs/testing';
import { HttpModule, HttpService } from '@nestjs/axios';
import * as request from 'supertest';
import { BigNumber } from 'ethers';
import { AccessList } from 'ethers/lib/utils';
import { of } from 'rxjs';
import { AxiosResponse, AxiosRequestConfig } from 'axios';
import { AppModule } from 'src/app.module';
import { ConfigService } from '@nestjs/config';
import {
  TransactionService,
  VerseService,
  AllowCheckService,
  RateLimitService,
  TypeCheckService,
} from 'src/services';
import { DatastoreService } from 'src/repositories';
import * as transactionAllowList from 'src/config/transactionAllowList';
import { TransactionAllow } from 'src/config/transactionAllowList';
import { INestApplication } from '@nestjs/common';

interface HttpServiceMockRes {
  noTxRes: AxiosResponse;
  estimateGasRes: AxiosResponse;
  txRes: AxiosResponse;
}

interface ConfigServiceMockRes {
  verseMasterNodeUrl: string;
  inheritHostHeader: boolean;
  allowedMethods: RegExp[];
  datastore: string;
}

const getHttpServiceMock = (mockRes: HttpServiceMockRes) => {
  const httpServiceMock = {
    post: jest.fn(
      (
        url: string,
        data?: any,
        config?: AxiosRequestConfig<any> | undefined,
      ) => {
        switch (data.method) {
          case 'eth_sendRawTransaction':
            return of(mockRes.txRes);
          case 'eth_estimateGas':
            return of(mockRes.estimateGasRes);
          default:
            return of(mockRes.noTxRes);
        }
      },
    ),
  };
  return httpServiceMock;
};

const getConfigServiceMock = (mockRes: ConfigServiceMockRes) => {
  const configServiceMock = {
    get: jest.fn((key: string) => {
      switch (key) {
        case 'verseMasterNodeUrl':
          return mockRes.verseMasterNodeUrl;
        case 'inheritHostHeader':
          return mockRes.inheritHostHeader;
        case 'allowedMethods':
          return mockRes.allowedMethods;
        case 'datastore':
          return mockRes.datastore;
      }
    }),
  };
  return configServiceMock;
};

describe('single request', () => {
  let txService: TransactionService;
  let datastoreService: DatastoreService;
  let moduleFixture: TestingModule;
  let app: INestApplication;

  const getTxAllowList = jest.spyOn(transactionAllowList, 'getTxAllowList');
  const getDeployAllowList = jest.spyOn(
    transactionAllowList,
    'getDeployAllowList',
  );
  const getUnlimitedTxRateAddresses = jest.spyOn(
    transactionAllowList,
    'getUnlimitedTxRateAddresses',
  );

  const verseMasterNodeUrl = 'http://localhost:8545';
  const type = 2;
  const chainId = 5;
  const nonce = 3;
  const maxPriorityFeePerGas = BigNumber.from('1500000000');
  const maxFeePerGas = BigNumber.from('1500000018');
  const gasPrice = undefined;
  const gasLimit = BigNumber.from('21000');
  const to = '0x8626f6940E2eb28930eFb4CeF49B2d1F2C9C1199';
  const valueAmount = '1000000000000';
  const value = BigNumber.from(valueAmount);
  const data = '0x';
  const accessList = [] as AccessList;
  const hash =
    '0xc6092b487b9e86b4ea22bf5e73cc0172ca37e938971e26aa70ec66f7be9dfcfc';
  const v = 0;
  const r =
    '0x79448db43a092a4bf489fe93fa8a7c09ac25f3d8e5a799d401c8d105cccdd028';
  const s =
    '0x743a0f064dc9cff4748b6d5e39dda262a89f0595570b41b0b576584d12348239';
  const from = '0xaf395754eB6F542742784cE7702940C60465A46a';

  const createTestingModule = async (
    txAllowList: Array<TransactionAllow>,
    deployAllowList: Array<string>,
    unlimitedTxRateAddresses: Array<string>,
    httpServiceMockRes: HttpServiceMockRes | undefined,
    configServiceMockRes: ConfigServiceMockRes | undefined,
  ) => {
    getTxAllowList.mockReturnValue(txAllowList);
    getDeployAllowList.mockReturnValue(deployAllowList);
    getUnlimitedTxRateAddresses.mockReturnValue(unlimitedTxRateAddresses);

    let configServiceMock;
    let httpServiceMock;
    if (configServiceMockRes)
      configServiceMock = getConfigServiceMock(configServiceMockRes);
    if (httpServiceMockRes)
      httpServiceMock = getHttpServiceMock(httpServiceMockRes);

    const testingModuleBuilder = Test.createTestingModule({
      imports: [AppModule, HttpModule],
      providers: [
        ConfigService,
        VerseService,
        TransactionService,
        AllowCheckService,
        RateLimitService,
        DatastoreService,
        TypeCheckService,
      ],
    }).useMocker((token) => {
      switch (token) {
        case TransactionService:
          return {
            parseRawTx: jest.fn(),
          };
        case DatastoreService:
          return {
            setTransactionHistory: jest.fn(),
            getTransactionHistoryCount: jest.fn(),
          };
      }
    });

    if (configServiceMock) {
      testingModuleBuilder
        .overrideProvider(ConfigService)
        .useValue(configServiceMock);
    }
    if (httpServiceMock) {
      testingModuleBuilder
        .overrideProvider(HttpService)
        .useValue(httpServiceMock);
    }
    moduleFixture = await testingModuleBuilder.compile();

    txService = moduleFixture.get<TransactionService>(TransactionService);
    datastoreService = moduleFixture.get<DatastoreService>(DatastoreService);

    jest.spyOn(console, 'error');

    app = moduleFixture.createNestApplication();
    await app.init();
  };

  beforeEach(() => {
    jest.resetAllMocks();
  });

  afterAll(async () => {
    await app.close();
  });

  describe('methods other than eth_sendRawTransaction', () => {
    it('successful', async () => {
      const inheritHostHeader = true;
      const allowedMethods = [/^.*$/];
      const datastore = '';
      const method = 'eth_call';
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
      const body = {
        jsonrpc: '2.0',
        id: 1,
        method: method,
        params: [tx, 'latest'],
      };
      const responseData = {
        jsonrpc: '2.0',
        id: 1,
        result: '0x',
      };

      const txAllowList = [
        {
          fromList: ['*'],
          toList: ['*'],
        },
      ];
      const deployAllowList = [''];
      const unlimitedTxRateAddresses = [''];

      const noTxRes: AxiosResponse = {
        status: 200,
        data: responseData,
        statusText: '',
        headers: {},
        config: {},
      };
      const estimateGasRes: AxiosResponse = {
        status: 200,
        data: responseData,
        statusText: '',
        headers: {},
        config: {},
      };
      const txRes: AxiosResponse = {
        status: 200,
        data: {
          jsonrpc: '2.0',
          id: 1,
          result:
            '0x2fc8b539232f2cbd8316106e58918842a5d38f0bd8856679bf625f53bb8657f1',
        },
        statusText: '',
        headers: {},
        config: {},
      };

      const httpServiceMockRes = {
        noTxRes,
        estimateGasRes,
        txRes,
      };
      const configServiceMockRes = {
        verseMasterNodeUrl,
        inheritHostHeader,
        allowedMethods,
        datastore,
      };
      await createTestingModule(
        txAllowList,
        deployAllowList,
        unlimitedTxRateAddresses,
        httpServiceMockRes,
        configServiceMockRes,
      );

      return await request(app.getHttpServer())
        .post('/')
        .send(body)
        .expect(200)
        .expect(responseData);
    });

    it('tx method is not allowed', async () => {
      const inheritHostHeader = true;
      const allowedMethods = [/^eth_call$/];
      const datastore = '';
      const method = 'eth_getTransactionReceipt';
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
      const responseData = {
        jsonrpc: '2.0',
        id: 1,
        error: {
          code: errCode,
          message: errMsg,
        },
      };
      const txAllowList = [
        {
          fromList: ['*'],
          toList: ['*'],
        },
      ];
      const deployAllowList = [''];
      const unlimitedTxRateAddresses = [''];

      const configServiceMockRes = {
        verseMasterNodeUrl,
        inheritHostHeader,
        allowedMethods,
        datastore,
      };
      await createTestingModule(
        txAllowList,
        deployAllowList,
        unlimitedTxRateAddresses,
        undefined,
        configServiceMockRes,
      );

      return await request(app.getHttpServer())
        .post('/')
        .send(body)
        .expect(200)
        .expect(responseData);
    });
  });

  describe('eth_sendRawTransaction(normal transaction)', () => {
    it('gas is not allowed', async () => {
      const jsonrpc = '2.0';
      const id = 1;
      const rawTx =
        '0x02f86f05038459682f008459682f12825208948626f6940e2eb28930efb4cef49b2d1f2c9c119985e8d4a5100080c080a079448db43a092a4bf489fe93fa8a7c09ac25f3d8e5a799d401c8d105cccdd029a0743a0f064dc9cff4748b6d5e39dda262a89f0595570b41b0b576584d12348239';
      const inheritHostHeader = true;
      const allowedMethods = [/^.*$/];
      const datastore = '';
      const method = 'eth_sendRawTransaction';
      const body = {
        jsonrpc: jsonrpc,
        id: id,
        method: method,
        params: [rawTx],
      };
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
      const errMsg = 'insufficient balance for transfer';
      const errCode = -32602;
      const responseData = {
        jsonrpc: '2.0',
        id: 1,
        error: {
          code: errCode,
          message: errMsg,
        },
      };
      const txAllowList = [
        {
          fromList: ['*'],
          toList: ['*'],
        },
      ];
      const deployAllowList = [''];
      const unlimitedTxRateAddresses = [''];

      const noTxRes: AxiosResponse = {
        status: 200,
        data: {
          jsonrpc: '2.0',
          id: 1,
          result: '0x',
        },
        statusText: '',
        headers: {},
        config: {},
      };
      const estimateGasRes: AxiosResponse = {
        status: 200,
        data: responseData,
        statusText: '',
        headers: {},
        config: {},
      };
      const txRes: AxiosResponse = {
        status: 200,
        data: {
          jsonrpc: '2.0',
          id: 1,
          result:
            '0x2fc8b539232f2cbd8316106e58918842a5d38f0bd8856679bf625f53bb8657f1',
        },
        statusText: '',
        headers: {},
        config: {},
      };

      const httpServiceMockRes = {
        noTxRes,
        estimateGasRes,
        txRes,
      };
      const configServiceMockRes = {
        verseMasterNodeUrl,
        inheritHostHeader,
        allowedMethods,
        datastore,
      };
      await createTestingModule(
        txAllowList,
        deployAllowList,
        unlimitedTxRateAddresses,
        httpServiceMockRes,
        configServiceMockRes,
      );
      jest.spyOn(txService, 'parseRawTx').mockReturnValue(tx);

      return await request(app.getHttpServer())
        .post('/')
        .send(body)
        .expect(200)
        .expect(responseData);
    });

    describe('txAllow rule is minimum setting', () => {
      it('from is not allowed', async () => {
        const inheritHostHeader = true;
        const allowedMethods = [/^.*$/];
        const datastore = '';
        const method = 'eth_sendRawTransaction';
        const rawTx =
          '0x02f86f05038459682f008459682f12825208948626f6940e2eb28930efb4cef49b2d1f2c9c119985e8d4a5100080c080a079448db43a092a4bf489fe93fa8a7c09ac25f3d8e5a799d401c8d105cccdd029a0743a0f064dc9cff4748b6d5e39dda262a89f0595570b41b0b576584d12348239';
        const body = {
          jsonrpc: '2.0',
          id: 1,
          method: method,
          params: [rawTx],
        };
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
        const errCode = -32602;
        const errMsg = 'transaction is not allowed';
        const responseData = {
          jsonrpc: '2.0',
          id: 1,
          error: {
            code: errCode,
            message: errMsg,
          },
        };
        const txAllowList = [
          {
            fromList: [`!${from}`],
            toList: ['*'],
          },
        ];
        const deployAllowList = [''];
        const unlimitedTxRateAddresses = [''];
        const noTxRes: AxiosResponse = {
          status: 200,
          data: {
            jsonrpc: '2.0',
            id: 1,
            result: '0x',
          },
          statusText: '',
          headers: {},
          config: {},
        };
        const estimateGasRes: AxiosResponse = {
          status: 200,
          data: {
            jsonrpc: '2.0',
            id: 1,
            result: '0x',
          },
          statusText: '',
          headers: {},
          config: {},
        };
        const txRes: AxiosResponse = {
          status: 200,
          data: {
            jsonrpc: '2.0',
            id: 1,
            result:
              '0x2fc8b539232f2cbd8316106e58918842a5d38f0bd8856679bf625f53bb8657f1',
          },
          statusText: '',
          headers: {},
          config: {},
        };
        const httpServiceMockRes = {
          noTxRes,
          estimateGasRes,
          txRes,
        };
        const configServiceMockRes = {
          verseMasterNodeUrl,
          inheritHostHeader,
          allowedMethods,
          datastore,
        };
        await createTestingModule(
          txAllowList,
          deployAllowList,
          unlimitedTxRateAddresses,
          httpServiceMockRes,
          configServiceMockRes,
        );
        jest.spyOn(txService, 'parseRawTx').mockReturnValue(tx);

        return await request(app.getHttpServer())
          .post('/')
          .send(body)
          .expect(200)
          .expect(responseData);
      });

      it('to is not allowed', async () => {
        const inheritHostHeader = true;
        const allowedMethods = [/^.*$/];
        const datastore = '';
        const method = 'eth_sendRawTransaction';
        const rawTx =
          '0x02f86f05038459682f008459682f12825208948626f6940e2eb28930efb4cef49b2d1f2c9c119985e8d4a5100080c080a079448db43a092a4bf489fe93fa8a7c09ac25f3d8e5a799d401c8d105cccdd029a0743a0f064dc9cff4748b6d5e39dda262a89f0595570b41b0b576584d12348239';
        const body = {
          jsonrpc: '2.0',
          id: 1,
          method: method,
          params: [rawTx],
        };
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
        const errCode = -32602;
        const errMsg = 'transaction is not allowed';
        const responseData = {
          jsonrpc: '2.0',
          id: 1,
          error: {
            code: errCode,
            message: errMsg,
          },
        };
        const txAllowList = [
          {
            fromList: ['*'],
            toList: [`!${to}`],
          },
        ];
        const deployAllowList = [''];
        const unlimitedTxRateAddresses = [''];
        const noTxRes: AxiosResponse = {
          status: 200,
          data: {
            jsonrpc: '2.0',
            id: 1,
            result: '0x',
          },
          statusText: '',
          headers: {},
          config: {},
        };
        const estimateGasRes: AxiosResponse = {
          status: 200,
          data: {
            jsonrpc: '2.0',
            id: 1,
            result: '0x',
          },
          statusText: '',
          headers: {},
          config: {},
        };
        const txRes: AxiosResponse = {
          status: 200,
          data: {
            jsonrpc: '2.0',
            id: 1,
            result:
              '0x2fc8b539232f2cbd8316106e58918842a5d38f0bd8856679bf625f53bb8657f1',
          },
          statusText: '',
          headers: {},
          config: {},
        };
        const httpServiceMockRes = {
          noTxRes,
          estimateGasRes,
          txRes,
        };
        const configServiceMockRes = {
          verseMasterNodeUrl,
          inheritHostHeader,
          allowedMethods,
          datastore,
        };
        await createTestingModule(
          txAllowList,
          deployAllowList,
          unlimitedTxRateAddresses,
          httpServiceMockRes,
          configServiceMockRes,
        );
        jest.spyOn(txService, 'parseRawTx').mockReturnValue(tx);

        return await request(app.getHttpServer())
          .post('/')
          .send(body)
          .expect(200)
          .expect(responseData);
      });

      it('successful', async () => {
        const inheritHostHeader = true;
        const allowedMethods = [/^.*$/];
        const datastore = '';
        const method = 'eth_sendRawTransaction';
        const rawTx =
          '0x02f86f05038459682f008459682f12825208948626f6940e2eb28930efb4cef49b2d1f2c9c119985e8d4a5100080c080a079448db43a092a4bf489fe93fa8a7c09ac25f3d8e5a799d401c8d105cccdd029a0743a0f064dc9cff4748b6d5e39dda262a89f0595570b41b0b576584d12348239';
        const body = {
          jsonrpc: '2.0',
          id: 1,
          method: method,
          params: [rawTx],
        };
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
        const txHash =
          '0x2fc8b539232f2cbd8316106e58918842a5d38f0bd8856679bf625f53bb8657f1';
        const responseData = {
          jsonrpc: '2.0',
          id: 1,
          result: txHash,
        };
        const txAllowList = [
          {
            fromList: ['*'],
            toList: ['*'],
          },
        ];
        const deployAllowList = [''];
        const unlimitedTxRateAddresses = [''];
        const noTxRes: AxiosResponse = {
          status: 200,
          data: {
            jsonrpc: '2.0',
            id: 1,
            result: '0x',
          },
          statusText: '',
          headers: {},
          config: {},
        };
        const estimateGasRes: AxiosResponse = {
          status: 200,
          data: {
            jsonrpc: '2.0',
            id: 1,
            result: '0x',
          },
          statusText: '',
          headers: {},
          config: {},
        };
        const txRes: AxiosResponse = {
          status: 200,
          data: responseData,
          statusText: '',
          headers: {},
          config: {},
        };
        const httpServiceMockRes = {
          noTxRes,
          estimateGasRes,
          txRes,
        };
        const configServiceMockRes = {
          verseMasterNodeUrl,
          inheritHostHeader,
          allowedMethods,
          datastore,
        };
        await createTestingModule(
          txAllowList,
          deployAllowList,
          unlimitedTxRateAddresses,
          httpServiceMockRes,
          configServiceMockRes,
        );
        jest.spyOn(txService, 'parseRawTx').mockReturnValue(tx);

        return await request(app.getHttpServer())
          .post('/')
          .send(body)
          .expect(200)
          .expect(responseData);
      });
    });

    describe('txAllow rule includes value', () => {
      it('from is not allowed', async () => {
        const inheritHostHeader = true;
        const allowedMethods = [/^.*$/];
        const datastore = '';
        const method = 'eth_sendRawTransaction';
        const rawTx =
          '0x02f86f05038459682f008459682f12825208948626f6940e2eb28930efb4cef49b2d1f2c9c119985e8d4a5100080c080a079448db43a092a4bf489fe93fa8a7c09ac25f3d8e5a799d401c8d105cccdd029a0743a0f064dc9cff4748b6d5e39dda262a89f0595570b41b0b576584d12348239';
        const body = {
          jsonrpc: '2.0',
          id: 1,
          method: method,
          params: [rawTx],
        };
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
        const errCode = -32602;
        const errMsg = 'transaction is not allowed';
        const responseData = {
          jsonrpc: '2.0',
          id: 1,
          error: {
            code: errCode,
            message: errMsg,
          },
        };
        const txAllowList = [
          {
            fromList: [`!${from}`],
            toList: ['*'],
            value: { eq: `${valueAmount}` },
          },
        ];
        const deployAllowList = [''];
        const unlimitedTxRateAddresses = [''];
        const noTxRes: AxiosResponse = {
          status: 200,
          data: {
            jsonrpc: '2.0',
            id: 1,
            result: '0x',
          },
          statusText: '',
          headers: {},
          config: {},
        };
        const estimateGasRes: AxiosResponse = {
          status: 200,
          data: {
            jsonrpc: '2.0',
            id: 1,
            result: '0x',
          },
          statusText: '',
          headers: {},
          config: {},
        };
        const txRes: AxiosResponse = {
          status: 200,
          data: {
            jsonrpc: '2.0',
            id: 1,
            result:
              '0x2fc8b539232f2cbd8316106e58918842a5d38f0bd8856679bf625f53bb8657f1',
          },
          statusText: '',
          headers: {},
          config: {},
        };
        const httpServiceMockRes = {
          noTxRes,
          estimateGasRes,
          txRes,
        };
        const configServiceMockRes = {
          verseMasterNodeUrl,
          inheritHostHeader,
          allowedMethods,
          datastore,
        };
        await createTestingModule(
          txAllowList,
          deployAllowList,
          unlimitedTxRateAddresses,
          httpServiceMockRes,
          configServiceMockRes,
        );
        jest.spyOn(txService, 'parseRawTx').mockReturnValue(tx);

        return await request(app.getHttpServer())
          .post('/')
          .send(body)
          .expect(200)
          .expect(responseData);
      });

      it('to is not allowed', async () => {
        const inheritHostHeader = true;
        const allowedMethods = [/^.*$/];
        const datastore = '';
        const method = 'eth_sendRawTransaction';
        const rawTx =
          '0x02f86f05038459682f008459682f12825208948626f6940e2eb28930efb4cef49b2d1f2c9c119985e8d4a5100080c080a079448db43a092a4bf489fe93fa8a7c09ac25f3d8e5a799d401c8d105cccdd029a0743a0f064dc9cff4748b6d5e39dda262a89f0595570b41b0b576584d12348239';
        const body = {
          jsonrpc: '2.0',
          id: 1,
          method: method,
          params: [rawTx],
        };
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
        const errCode = -32602;
        const errMsg = 'transaction is not allowed';
        const responseData = {
          jsonrpc: '2.0',
          id: 1,
          error: {
            code: errCode,
            message: errMsg,
          },
        };
        const txAllowList = [
          {
            fromList: ['*'],
            toList: [`!${to}`],
            value: { eq: `${valueAmount}` },
          },
        ];
        const deployAllowList = [''];
        const unlimitedTxRateAddresses = [''];
        const noTxRes: AxiosResponse = {
          status: 200,
          data: {
            jsonrpc: '2.0',
            id: 1,
            result: '0x',
          },
          statusText: '',
          headers: {},
          config: {},
        };
        const estimateGasRes: AxiosResponse = {
          status: 200,
          data: {
            jsonrpc: '2.0',
            id: 1,
            result: '0x',
          },
          statusText: '',
          headers: {},
          config: {},
        };
        const txRes: AxiosResponse = {
          status: 200,
          data: {
            jsonrpc: '2.0',
            id: 1,
            result:
              '0x2fc8b539232f2cbd8316106e58918842a5d38f0bd8856679bf625f53bb8657f1',
          },
          statusText: '',
          headers: {},
          config: {},
        };
        const httpServiceMockRes = {
          noTxRes,
          estimateGasRes,
          txRes,
        };
        const configServiceMockRes = {
          verseMasterNodeUrl,
          inheritHostHeader,
          allowedMethods,
          datastore,
        };
        await createTestingModule(
          txAllowList,
          deployAllowList,
          unlimitedTxRateAddresses,
          httpServiceMockRes,
          configServiceMockRes,
        );
        jest.spyOn(txService, 'parseRawTx').mockReturnValue(tx);

        return await request(app.getHttpServer())
          .post('/')
          .send(body)
          .expect(200)
          .expect(responseData);
      });

      it('value is not allowed', async () => {
        const inheritHostHeader = true;
        const allowedMethods = [/^.*$/];
        const datastore = '';
        const method = 'eth_sendRawTransaction';
        const rawTx =
          '0x02f86f05038459682f008459682f12825208948626f6940e2eb28930efb4cef49b2d1f2c9c119985e8d4a5100080c080a079448db43a092a4bf489fe93fa8a7c09ac25f3d8e5a799d401c8d105cccdd029a0743a0f064dc9cff4748b6d5e39dda262a89f0595570b41b0b576584d12348239';
        const body = {
          jsonrpc: '2.0',
          id: 1,
          method: method,
          params: [rawTx],
        };
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
        const errCode = -32602;
        const errMsg = 'transaction is not allowed';
        const responseData = {
          jsonrpc: '2.0',
          id: 1,
          error: {
            code: errCode,
            message: errMsg,
          },
        };
        const txAllowList = [
          {
            fromList: ['*'],
            toList: ['*'],
            value: { gt: `${valueAmount}` },
          },
        ];
        const deployAllowList = [''];
        const unlimitedTxRateAddresses = [''];
        const noTxRes: AxiosResponse = {
          status: 200,
          data: {
            jsonrpc: '2.0',
            id: 1,
            result: '0x',
          },
          statusText: '',
          headers: {},
          config: {},
        };
        const estimateGasRes: AxiosResponse = {
          status: 200,
          data: {
            jsonrpc: '2.0',
            id: 1,
            result: '0x',
          },
          statusText: '',
          headers: {},
          config: {},
        };
        const txRes: AxiosResponse = {
          status: 200,
          data: {
            jsonrpc: '2.0',
            id: 1,
            result:
              '0x2fc8b539232f2cbd8316106e58918842a5d38f0bd8856679bf625f53bb8657f1',
          },
          statusText: '',
          headers: {},
          config: {},
        };
        const httpServiceMockRes = {
          noTxRes,
          estimateGasRes,
          txRes,
        };
        const configServiceMockRes = {
          verseMasterNodeUrl,
          inheritHostHeader,
          allowedMethods,
          datastore,
        };
        await createTestingModule(
          txAllowList,
          deployAllowList,
          unlimitedTxRateAddresses,
          httpServiceMockRes,
          configServiceMockRes,
        );
        jest.spyOn(txService, 'parseRawTx').mockReturnValue(tx);

        return await request(app.getHttpServer())
          .post('/')
          .send(body)
          .expect(200)
          .expect(responseData);
      });

      it('successful', async () => {
        const inheritHostHeader = true;
        const allowedMethods = [/^.*$/];
        const datastore = '';
        const method = 'eth_sendRawTransaction';
        const rawTx =
          '0x02f86f05038459682f008459682f12825208948626f6940e2eb28930efb4cef49b2d1f2c9c119985e8d4a5100080c080a079448db43a092a4bf489fe93fa8a7c09ac25f3d8e5a799d401c8d105cccdd029a0743a0f064dc9cff4748b6d5e39dda262a89f0595570b41b0b576584d12348239';
        const body = {
          jsonrpc: '2.0',
          id: 1,
          method: method,
          params: [rawTx],
        };
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
        const txHash =
          '0x2fc8b539232f2cbd8316106e58918842a5d38f0bd8856679bf625f53bb8657f1';
        const responseData = {
          jsonrpc: '2.0',
          id: 1,
          result: txHash,
        };
        const txAllowList = [
          {
            fromList: ['*'],
            toList: ['*'],
            value: { eq: `${valueAmount}` },
          },
        ];
        const deployAllowList = [''];
        const unlimitedTxRateAddresses = [''];
        const noTxRes: AxiosResponse = {
          status: 200,
          data: {
            jsonrpc: '2.0',
            id: 1,
            result: '0x',
          },
          statusText: '',
          headers: {},
          config: {},
        };
        const estimateGasRes: AxiosResponse = {
          status: 200,
          data: {
            jsonrpc: '2.0',
            id: 1,
            result: '0x',
          },
          statusText: '',
          headers: {},
          config: {},
        };
        const txRes: AxiosResponse = {
          status: 200,
          data: responseData,
          statusText: '',
          headers: {},
          config: {},
        };
        const httpServiceMockRes = {
          noTxRes,
          estimateGasRes,
          txRes,
        };
        const configServiceMockRes = {
          verseMasterNodeUrl,
          inheritHostHeader,
          allowedMethods,
          datastore,
        };
        await createTestingModule(
          txAllowList,
          deployAllowList,
          unlimitedTxRateAddresses,
          httpServiceMockRes,
          configServiceMockRes,
        );
        jest.spyOn(txService, 'parseRawTx').mockReturnValue(tx);

        return await request(app.getHttpServer())
          .post('/')
          .send(body)
          .expect(200)
          .expect(responseData);
      });
    });

    describe('txAllow rule includes rateLimit', () => {
      it('from is not allowed', async () => {
        const inheritHostHeader = true;
        const allowedMethods = [/^.*$/];
        const datastore = 'redis';
        const method = 'eth_sendRawTransaction';
        const rawTx =
          '0x02f86f05038459682f008459682f12825208948626f6940e2eb28930efb4cef49b2d1f2c9c119985e8d4a5100080c080a079448db43a092a4bf489fe93fa8a7c09ac25f3d8e5a799d401c8d105cccdd029a0743a0f064dc9cff4748b6d5e39dda262a89f0595570b41b0b576584d12348239';
        const body = {
          jsonrpc: '2.0',
          id: 1,
          method: method,
          params: [rawTx],
        };
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
        const errCode = -32602;
        const errMsg = 'transaction is not allowed';
        const responseData = {
          jsonrpc: '2.0',
          id: 1,
          error: {
            code: errCode,
            message: errMsg,
          },
        };
        const rateLimit = {
          name: 'wildcard',
          interval: 1,
          limit: 1,
        };
        const txAllowList = [
          {
            fromList: [`!${from}`],
            toList: ['*'],
            rateLimit,
          },
        ];
        const deployAllowList = [''];
        const unlimitedTxRateAddresses = [''];
        const noTxRes: AxiosResponse = {
          status: 200,
          data: {
            jsonrpc: '2.0',
            id: 1,
            result: '0x',
          },
          statusText: '',
          headers: {},
          config: {},
        };
        const estimateGasRes: AxiosResponse = {
          status: 200,
          data: {
            jsonrpc: '2.0',
            id: 1,
            result: '0x',
          },
          statusText: '',
          headers: {},
          config: {},
        };
        const txRes: AxiosResponse = {
          status: 200,
          data: {
            jsonrpc: '2.0',
            id: 1,
            result:
              '0x2fc8b539232f2cbd8316106e58918842a5d38f0bd8856679bf625f53bb8657f1',
          },
          statusText: '',
          headers: {},
          config: {},
        };
        const httpServiceMockRes = {
          noTxRes,
          estimateGasRes,
          txRes,
        };
        const configServiceMockRes = {
          verseMasterNodeUrl,
          inheritHostHeader,
          allowedMethods,
          datastore,
        };
        await createTestingModule(
          txAllowList,
          deployAllowList,
          unlimitedTxRateAddresses,
          httpServiceMockRes,
          configServiceMockRes,
        );
        jest.spyOn(txService, 'parseRawTx').mockReturnValue(tx);
        jest
          .spyOn(datastoreService, 'getTransactionHistoryCount')
          .mockResolvedValue(0);

        return await request(app.getHttpServer())
          .post('/')
          .send(body)
          .expect(200)
          .expect(responseData);
      });

      it('to is not allowed', async () => {
        const inheritHostHeader = true;
        const allowedMethods = [/^.*$/];
        const datastore = 'redis';
        const method = 'eth_sendRawTransaction';
        const rawTx =
          '0x02f86f05038459682f008459682f12825208948626f6940e2eb28930efb4cef49b2d1f2c9c119985e8d4a5100080c080a079448db43a092a4bf489fe93fa8a7c09ac25f3d8e5a799d401c8d105cccdd029a0743a0f064dc9cff4748b6d5e39dda262a89f0595570b41b0b576584d12348239';
        const body = {
          jsonrpc: '2.0',
          id: 1,
          method: method,
          params: [rawTx],
        };
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
        const errCode = -32602;
        const errMsg = 'transaction is not allowed';
        const responseData = {
          jsonrpc: '2.0',
          id: 1,
          error: {
            code: errCode,
            message: errMsg,
          },
        };
        const rateLimit = {
          name: 'wildcard',
          interval: 1,
          limit: 1,
        };
        const txAllowList = [
          {
            fromList: ['*'],
            toList: [`!${to}`],
            rateLimit,
          },
        ];
        const deployAllowList = [''];
        const unlimitedTxRateAddresses = [''];
        const noTxRes: AxiosResponse = {
          status: 200,
          data: {
            jsonrpc: '2.0',
            id: 1,
            result: '0x',
          },
          statusText: '',
          headers: {},
          config: {},
        };
        const estimateGasRes: AxiosResponse = {
          status: 200,
          data: {
            jsonrpc: '2.0',
            id: 1,
            result: '0x',
          },
          statusText: '',
          headers: {},
          config: {},
        };
        const txRes: AxiosResponse = {
          status: 200,
          data: {
            jsonrpc: '2.0',
            id: 1,
            result:
              '0x2fc8b539232f2cbd8316106e58918842a5d38f0bd8856679bf625f53bb8657f1',
          },
          statusText: '',
          headers: {},
          config: {},
        };
        const httpServiceMockRes = {
          noTxRes,
          estimateGasRes,
          txRes,
        };
        const configServiceMockRes = {
          verseMasterNodeUrl,
          inheritHostHeader,
          allowedMethods,
          datastore,
        };
        await createTestingModule(
          txAllowList,
          deployAllowList,
          unlimitedTxRateAddresses,
          httpServiceMockRes,
          configServiceMockRes,
        );
        jest.spyOn(txService, 'parseRawTx').mockReturnValue(tx);
        jest
          .spyOn(datastoreService, 'getTransactionHistoryCount')
          .mockResolvedValue(0);

        return await request(app.getHttpServer())
          .post('/')
          .send(body)
          .expect(200)
          .expect(responseData);
      });

      it('tx count is over limit', async () => {
        const inheritHostHeader = true;
        const allowedMethods = [/^.*$/];
        const datastore = 'redis';
        const method = 'eth_sendRawTransaction';
        const rawTx =
          '0x02f86f05038459682f008459682f12825208948626f6940e2eb28930efb4cef49b2d1f2c9c119985e8d4a5100080c080a079448db43a092a4bf489fe93fa8a7c09ac25f3d8e5a799d401c8d105cccdd029a0743a0f064dc9cff4748b6d5e39dda262a89f0595570b41b0b576584d12348239';
        const body = {
          jsonrpc: '2.0',
          id: 1,
          method: method,
          params: [rawTx],
        };
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
        const rateLimit = {
          name: 'wildcard',
          interval: 1,
          limit: 1,
        };
        const txAllowList = [
          {
            fromList: ['*'],
            toList: ['*'],
            rateLimit,
          },
        ];
        const deployAllowList = [''];
        const unlimitedTxRateAddresses = [''];
        const errCode = -32602;
        const errMsg = `The number of allowed transacting has been exceeded. Wait ${rateLimit.interval} seconds before transacting.`;
        const responseData = {
          jsonrpc: '2.0',
          id: 1,
          error: {
            code: errCode,
            message: errMsg,
          },
        };
        const noTxRes: AxiosResponse = {
          status: 200,
          data: {
            jsonrpc: '2.0',
            id: 1,
            result: '0x',
          },
          statusText: '',
          headers: {},
          config: {},
        };
        const estimateGasRes: AxiosResponse = {
          status: 200,
          data: {
            jsonrpc: '2.0',
            id: 1,
            result: '0x',
          },
          statusText: '',
          headers: {},
          config: {},
        };
        const txRes: AxiosResponse = {
          status: 200,
          data: {
            jsonrpc: '2.0',
            id: 1,
            result:
              '0x2fc8b539232f2cbd8316106e58918842a5d38f0bd8856679bf625f53bb8657f1',
          },
          statusText: '',
          headers: {},
          config: {},
        };
        const httpServiceMockRes = {
          noTxRes,
          estimateGasRes,
          txRes,
        };
        const configServiceMockRes = {
          verseMasterNodeUrl,
          inheritHostHeader,
          allowedMethods,
          datastore,
        };
        await createTestingModule(
          txAllowList,
          deployAllowList,
          unlimitedTxRateAddresses,
          httpServiceMockRes,
          configServiceMockRes,
        );
        jest.spyOn(txService, 'parseRawTx').mockReturnValue(tx);
        jest
          .spyOn(datastoreService, 'getTransactionHistoryCount')
          .mockResolvedValue(10);

        return await request(app.getHttpServer())
          .post('/')
          .send(body)
          .expect(200)
          .expect(responseData);
      });

      it('successful', async () => {
        const inheritHostHeader = true;
        const allowedMethods = [/^.*$/];
        const datastore = 'redis';
        const method = 'eth_sendRawTransaction';
        const rawTx =
          '0x02f86f05038459682f008459682f12825208948626f6940e2eb28930efb4cef49b2d1f2c9c119985e8d4a5100080c080a079448db43a092a4bf489fe93fa8a7c09ac25f3d8e5a799d401c8d105cccdd029a0743a0f064dc9cff4748b6d5e39dda262a89f0595570b41b0b576584d12348239';
        const body = {
          jsonrpc: '2.0',
          id: 1,
          method: method,
          params: [rawTx],
        };
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
        const txHash =
          '0x2fc8b539232f2cbd8316106e58918842a5d38f0bd8856679bf625f53bb8657f1';
        const responseData = {
          jsonrpc: '2.0',
          id: 1,
          result: txHash,
        };
        const rateLimit = {
          name: 'wildcard',
          interval: 1,
          limit: 1,
        };
        const txAllowList = [
          {
            fromList: ['*'],
            toList: ['*'],
            rateLimit,
          },
        ];
        const deployAllowList = [''];
        const unlimitedTxRateAddresses = [''];
        const noTxRes: AxiosResponse = {
          status: 200,
          data: {
            jsonrpc: '2.0',
            id: 1,
            result: '0x',
          },
          statusText: '',
          headers: {},
          config: {},
        };
        const estimateGasRes: AxiosResponse = {
          status: 200,
          data: {
            jsonrpc: '2.0',
            id: 1,
            result: '0x',
          },
          statusText: '',
          headers: {},
          config: {},
        };
        const txRes: AxiosResponse = {
          status: 200,
          data: responseData,
          statusText: '',
          headers: {},
          config: {},
        };
        const httpServiceMockRes = {
          noTxRes,
          estimateGasRes,
          txRes,
        };
        const configServiceMockRes = {
          verseMasterNodeUrl,
          inheritHostHeader,
          allowedMethods,
          datastore,
        };
        await createTestingModule(
          txAllowList,
          deployAllowList,
          unlimitedTxRateAddresses,
          httpServiceMockRes,
          configServiceMockRes,
        );
        jest.spyOn(txService, 'parseRawTx').mockReturnValue(tx);
        jest
          .spyOn(datastoreService, 'getTransactionHistoryCount')
          .mockResolvedValue(0);

        return await request(app.getHttpServer())
          .post('/')
          .send(body)
          .expect(200)
          .expect(responseData);
      });

      it('successful(unlimitedRateLimitAddress transaction)', async () => {
        const inheritHostHeader = true;
        const allowedMethods = [/^.*$/];
        const datastore = 'redis';
        const method = 'eth_sendRawTransaction';
        const rawTx =
          '0x02f86f05038459682f008459682f12825208948626f6940e2eb28930efb4cef49b2d1f2c9c119985e8d4a5100080c080a079448db43a092a4bf489fe93fa8a7c09ac25f3d8e5a799d401c8d105cccdd029a0743a0f064dc9cff4748b6d5e39dda262a89f0595570b41b0b576584d12348239';
        const body = {
          jsonrpc: '2.0',
          id: 1,
          method: method,
          params: [rawTx],
        };
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
        const txHash =
          '0x2fc8b539232f2cbd8316106e58918842a5d38f0bd8856679bf625f53bb8657f1';
        const responseData = {
          jsonrpc: '2.0',
          id: 1,
          result: txHash,
        };
        const rateLimit = {
          name: 'wildcard',
          interval: 1,
          limit: 1,
        };
        const txAllowList = [
          {
            fromList: ['*'],
            toList: ['*'],
            rateLimit,
          },
        ];
        const deployAllowList = [''];
        const unlimitedTxRateAddresses = [`${from}`];
        const noTxRes: AxiosResponse = {
          status: 200,
          data: {
            jsonrpc: '2.0',
            id: 1,
            result: '0x',
          },
          statusText: '',
          headers: {},
          config: {},
        };
        const estimateGasRes: AxiosResponse = {
          status: 200,
          data: {
            jsonrpc: '2.0',
            id: 1,
            result: '0x',
          },
          statusText: '',
          headers: {},
          config: {},
        };
        const txRes: AxiosResponse = {
          status: 200,
          data: responseData,
          statusText: '',
          headers: {},
          config: {},
        };
        const httpServiceMockRes = {
          noTxRes,
          estimateGasRes,
          txRes,
        };
        const configServiceMockRes = {
          verseMasterNodeUrl,
          inheritHostHeader,
          allowedMethods,
          datastore,
        };
        await createTestingModule(
          txAllowList,
          deployAllowList,
          unlimitedTxRateAddresses,
          httpServiceMockRes,
          configServiceMockRes,
        );
        jest.spyOn(txService, 'parseRawTx').mockReturnValue(tx);
        jest
          .spyOn(datastoreService, 'getTransactionHistoryCount')
          .mockResolvedValue(10);

        return await request(app.getHttpServer())
          .post('/')
          .send(body)
          .expect(200)
          .expect(responseData);
      });
    });

    describe('txAllow rule is maximum setting', () => {
      it('from is not allowed', async () => {
        const inheritHostHeader = true;
        const allowedMethods = [/^.*$/];
        const datastore = 'redis';
        const method = 'eth_sendRawTransaction';
        const rawTx =
          '0x02f86f05038459682f008459682f12825208948626f6940e2eb28930efb4cef49b2d1f2c9c119985e8d4a5100080c080a079448db43a092a4bf489fe93fa8a7c09ac25f3d8e5a799d401c8d105cccdd029a0743a0f064dc9cff4748b6d5e39dda262a89f0595570b41b0b576584d12348239';
        const body = {
          jsonrpc: '2.0',
          id: 1,
          method: method,
          params: [rawTx],
        };
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
        const errCode = -32602;
        const errMsg = 'transaction is not allowed';
        const responseData = {
          jsonrpc: '2.0',
          id: 1,
          error: {
            code: errCode,
            message: errMsg,
          },
        };
        const rateLimit = {
          name: 'wildcard',
          interval: 1,
          limit: 1,
        };
        const txAllowList = [
          {
            fromList: [`!${from}`],
            toList: ['*'],
            value: { eq: `${valueAmount}` },
            rateLimit,
          },
        ];
        const deployAllowList = [''];
        const unlimitedTxRateAddresses = [''];
        const noTxRes: AxiosResponse = {
          status: 200,
          data: {
            jsonrpc: '2.0',
            id: 1,
            result: '0x',
          },
          statusText: '',
          headers: {},
          config: {},
        };
        const estimateGasRes: AxiosResponse = {
          status: 200,
          data: {
            jsonrpc: '2.0',
            id: 1,
            result: '0x',
          },
          statusText: '',
          headers: {},
          config: {},
        };
        const txRes: AxiosResponse = {
          status: 200,
          data: {
            jsonrpc: '2.0',
            id: 1,
            result:
              '0x2fc8b539232f2cbd8316106e58918842a5d38f0bd8856679bf625f53bb8657f1',
          },
          statusText: '',
          headers: {},
          config: {},
        };
        const httpServiceMockRes = {
          noTxRes,
          estimateGasRes,
          txRes,
        };
        const configServiceMockRes = {
          verseMasterNodeUrl,
          inheritHostHeader,
          allowedMethods,
          datastore,
        };
        await createTestingModule(
          txAllowList,
          deployAllowList,
          unlimitedTxRateAddresses,
          httpServiceMockRes,
          configServiceMockRes,
        );
        jest.spyOn(txService, 'parseRawTx').mockReturnValue(tx);
        jest
          .spyOn(datastoreService, 'getTransactionHistoryCount')
          .mockResolvedValue(0);

        return await request(app.getHttpServer())
          .post('/')
          .send(body)
          .expect(200)
          .expect(responseData);
      });

      it('to is not allowed', async () => {
        const inheritHostHeader = true;
        const allowedMethods = [/^.*$/];
        const datastore = 'redis';
        const method = 'eth_sendRawTransaction';
        const rawTx =
          '0x02f86f05038459682f008459682f12825208948626f6940e2eb28930efb4cef49b2d1f2c9c119985e8d4a5100080c080a079448db43a092a4bf489fe93fa8a7c09ac25f3d8e5a799d401c8d105cccdd029a0743a0f064dc9cff4748b6d5e39dda262a89f0595570b41b0b576584d12348239';
        const body = {
          jsonrpc: '2.0',
          id: 1,
          method: method,
          params: [rawTx],
        };
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
        const errCode = -32602;
        const errMsg = 'transaction is not allowed';
        const responseData = {
          jsonrpc: '2.0',
          id: 1,
          error: {
            code: errCode,
            message: errMsg,
          },
        };
        const rateLimit = {
          name: 'wildcard',
          interval: 1,
          limit: 1,
        };
        const txAllowList = [
          {
            fromList: ['*'],
            toList: [`!${to}`],
            value: { eq: `${valueAmount}` },
            rateLimit,
          },
        ];
        const deployAllowList = [''];
        const unlimitedTxRateAddresses = [''];
        const noTxRes: AxiosResponse = {
          status: 200,
          data: {
            jsonrpc: '2.0',
            id: 1,
            result: '0x',
          },
          statusText: '',
          headers: {},
          config: {},
        };
        const estimateGasRes: AxiosResponse = {
          status: 200,
          data: {
            jsonrpc: '2.0',
            id: 1,
            result: '0x',
          },
          statusText: '',
          headers: {},
          config: {},
        };
        const txRes: AxiosResponse = {
          status: 200,
          data: {
            jsonrpc: '2.0',
            id: 1,
            result:
              '0x2fc8b539232f2cbd8316106e58918842a5d38f0bd8856679bf625f53bb8657f1',
          },
          statusText: '',
          headers: {},
          config: {},
        };
        const httpServiceMockRes = {
          noTxRes,
          estimateGasRes,
          txRes,
        };
        const configServiceMockRes = {
          verseMasterNodeUrl,
          inheritHostHeader,
          allowedMethods,
          datastore,
        };
        await createTestingModule(
          txAllowList,
          deployAllowList,
          unlimitedTxRateAddresses,
          httpServiceMockRes,
          configServiceMockRes,
        );
        jest.spyOn(txService, 'parseRawTx').mockReturnValue(tx);
        jest
          .spyOn(datastoreService, 'getTransactionHistoryCount')
          .mockResolvedValue(0);

        return await request(app.getHttpServer())
          .post('/')
          .send(body)
          .expect(200)
          .expect(responseData);
      });

      it('value is not allowed', async () => {
        const inheritHostHeader = true;
        const allowedMethods = [/^.*$/];
        const datastore = 'redis';
        const method = 'eth_sendRawTransaction';
        const rawTx =
          '0x02f86f05038459682f008459682f12825208948626f6940e2eb28930efb4cef49b2d1f2c9c119985e8d4a5100080c080a079448db43a092a4bf489fe93fa8a7c09ac25f3d8e5a799d401c8d105cccdd029a0743a0f064dc9cff4748b6d5e39dda262a89f0595570b41b0b576584d12348239';
        const body = {
          jsonrpc: '2.0',
          id: 1,
          method: method,
          params: [rawTx],
        };
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
        const errCode = -32602;
        const errMsg = 'transaction is not allowed';
        const responseData = {
          jsonrpc: '2.0',
          id: 1,
          error: {
            code: errCode,
            message: errMsg,
          },
        };
        const rateLimit = {
          name: 'wildcard',
          interval: 1,
          limit: 1,
        };
        const txAllowList = [
          {
            fromList: ['*'],
            toList: ['*'],
            value: { gt: `${valueAmount}` },
            rateLimit,
          },
        ];
        const deployAllowList = [''];
        const unlimitedTxRateAddresses = [''];
        const noTxRes: AxiosResponse = {
          status: 200,
          data: {
            jsonrpc: '2.0',
            id: 1,
            result: '0x',
          },
          statusText: '',
          headers: {},
          config: {},
        };
        const estimateGasRes: AxiosResponse = {
          status: 200,
          data: {
            jsonrpc: '2.0',
            id: 1,
            result: '0x',
          },
          statusText: '',
          headers: {},
          config: {},
        };
        const txRes: AxiosResponse = {
          status: 200,
          data: {
            jsonrpc: '2.0',
            id: 1,
            result:
              '0x2fc8b539232f2cbd8316106e58918842a5d38f0bd8856679bf625f53bb8657f1',
          },
          statusText: '',
          headers: {},
          config: {},
        };
        const httpServiceMockRes = {
          noTxRes,
          estimateGasRes,
          txRes,
        };
        const configServiceMockRes = {
          verseMasterNodeUrl,
          inheritHostHeader,
          allowedMethods,
          datastore,
        };
        await createTestingModule(
          txAllowList,
          deployAllowList,
          unlimitedTxRateAddresses,
          httpServiceMockRes,
          configServiceMockRes,
        );
        jest.spyOn(txService, 'parseRawTx').mockReturnValue(tx);
        jest
          .spyOn(datastoreService, 'getTransactionHistoryCount')
          .mockResolvedValue(0);

        return await request(app.getHttpServer())
          .post('/')
          .send(body)
          .expect(200)
          .expect(responseData);
      });

      it('tx count is over limit', async () => {
        const inheritHostHeader = true;
        const allowedMethods = [/^.*$/];
        const datastore = 'redis';
        const method = 'eth_sendRawTransaction';
        const rawTx =
          '0x02f86f05038459682f008459682f12825208948626f6940e2eb28930efb4cef49b2d1f2c9c119985e8d4a5100080c080a079448db43a092a4bf489fe93fa8a7c09ac25f3d8e5a799d401c8d105cccdd029a0743a0f064dc9cff4748b6d5e39dda262a89f0595570b41b0b576584d12348239';
        const body = {
          jsonrpc: '2.0',
          id: 1,
          method: method,
          params: [rawTx],
        };
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
        const rateLimit = {
          name: 'wildcard',
          interval: 1,
          limit: 1,
        };
        const txAllowList = [
          {
            fromList: ['*'],
            toList: ['*'],
            value: { eq: `${valueAmount}` },
            rateLimit,
          },
        ];
        const deployAllowList = [''];
        const unlimitedTxRateAddresses = [''];
        const errCode = -32602;
        const errMsg = `The number of allowed transacting has been exceeded. Wait ${rateLimit.interval} seconds before transacting.`;
        const responseData = {
          jsonrpc: '2.0',
          id: 1,
          error: {
            code: errCode,
            message: errMsg,
          },
        };
        const noTxRes: AxiosResponse = {
          status: 200,
          data: {
            jsonrpc: '2.0',
            id: 1,
            result: '0x',
          },
          statusText: '',
          headers: {},
          config: {},
        };
        const estimateGasRes: AxiosResponse = {
          status: 200,
          data: {
            jsonrpc: '2.0',
            id: 1,
            result: '0x',
          },
          statusText: '',
          headers: {},
          config: {},
        };
        const txRes: AxiosResponse = {
          status: 200,
          data: {
            jsonrpc: '2.0',
            id: 1,
            result:
              '0x2fc8b539232f2cbd8316106e58918842a5d38f0bd8856679bf625f53bb8657f1',
          },
          statusText: '',
          headers: {},
          config: {},
        };
        const httpServiceMockRes = {
          noTxRes,
          estimateGasRes,
          txRes,
        };
        const configServiceMockRes = {
          verseMasterNodeUrl,
          inheritHostHeader,
          allowedMethods,
          datastore,
        };
        await createTestingModule(
          txAllowList,
          deployAllowList,
          unlimitedTxRateAddresses,
          httpServiceMockRes,
          configServiceMockRes,
        );
        jest.spyOn(txService, 'parseRawTx').mockReturnValue(tx);
        jest
          .spyOn(datastoreService, 'getTransactionHistoryCount')
          .mockResolvedValue(10);

        return await request(app.getHttpServer())
          .post('/')
          .send(body)
          .expect(200)
          .expect(responseData);
      });

      it('successful', async () => {
        const inheritHostHeader = true;
        const allowedMethods = [/^.*$/];
        const datastore = 'redis';
        const method = 'eth_sendRawTransaction';
        const rawTx =
          '0x02f86f05038459682f008459682f12825208948626f6940e2eb28930efb4cef49b2d1f2c9c119985e8d4a5100080c080a079448db43a092a4bf489fe93fa8a7c09ac25f3d8e5a799d401c8d105cccdd029a0743a0f064dc9cff4748b6d5e39dda262a89f0595570b41b0b576584d12348239';
        const body = {
          jsonrpc: '2.0',
          id: 1,
          method: method,
          params: [rawTx],
        };
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
        const txHash =
          '0x2fc8b539232f2cbd8316106e58918842a5d38f0bd8856679bf625f53bb8657f1';
        const responseData = {
          jsonrpc: '2.0',
          id: 1,
          result: txHash,
        };
        const rateLimit = {
          name: 'wildcard',
          interval: 1,
          limit: 1,
        };
        const txAllowList = [
          {
            fromList: ['*'],
            toList: ['*'],
            value: { eq: `${valueAmount}` },
            rateLimit,
          },
        ];
        const deployAllowList = [''];
        const unlimitedTxRateAddresses = [''];
        const noTxRes: AxiosResponse = {
          status: 200,
          data: {
            jsonrpc: '2.0',
            id: 1,
            result: '0x',
          },
          statusText: '',
          headers: {},
          config: {},
        };
        const estimateGasRes: AxiosResponse = {
          status: 200,
          data: {
            jsonrpc: '2.0',
            id: 1,
            result: '0x',
          },
          statusText: '',
          headers: {},
          config: {},
        };
        const txRes: AxiosResponse = {
          status: 200,
          data: responseData,
          statusText: '',
          headers: {},
          config: {},
        };
        const httpServiceMockRes = {
          noTxRes,
          estimateGasRes,
          txRes,
        };
        const configServiceMockRes = {
          verseMasterNodeUrl,
          inheritHostHeader,
          allowedMethods,
          datastore,
        };
        await createTestingModule(
          txAllowList,
          deployAllowList,
          unlimitedTxRateAddresses,
          httpServiceMockRes,
          configServiceMockRes,
        );
        jest.spyOn(txService, 'parseRawTx').mockReturnValue(tx);
        jest
          .spyOn(datastoreService, 'getTransactionHistoryCount')
          .mockResolvedValue(0);

        return await request(app.getHttpServer())
          .post('/')
          .send(body)
          .expect(200)
          .expect(responseData);
      });
    });
  });

  describe('eth_sendRawTransaction(contract deploy transaction)', () => {
    it('deployer is not register', async () => {
      const inheritHostHeader = true;
      const allowedMethods = [/^.*$/];
      const datastore = 'redis';
      const method = 'eth_sendRawTransaction';
      const rawTx =
        '0x02f86f05038459682f008459682f12825208948626f6940e2eb28930efb4cef49b2d1f2c9c119985e8d4a5100080c080a079448db43a092a4bf489fe93fa8a7c09ac25f3d8e5a799d401c8d105cccdd029a0743a0f064dc9cff4748b6d5e39dda262a89f0595570b41b0b576584d12348239';
      const body = {
        jsonrpc: '2.0',
        id: 1,
        method: method,
        params: [rawTx],
      };
      const tx = {
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
      const rateLimit = {
        name: 'wildcard',
        interval: 1,
        limit: 1,
      };
      const txAllowList = [
        {
          fromList: ['*'],
          toList: ['*'],
          value: { eq: `${valueAmount}` },
          rateLimit,
        },
      ];
      const deployAllowList = [''];
      const unlimitedTxRateAddresses = [''];
      const errCode = -32602;
      const errMsg = 'deploy transaction is not allowed';
      const responseData = {
        jsonrpc: '2.0',
        id: 1,
        error: {
          code: errCode,
          message: errMsg,
        },
      };
      const noTxRes: AxiosResponse = {
        status: 200,
        data: {
          jsonrpc: '2.0',
          id: 1,
          result: '0x',
        },
        statusText: '',
        headers: {},
        config: {},
      };
      const estimateGasRes: AxiosResponse = {
        status: 200,
        data: {
          jsonrpc: '2.0',
          id: 1,
          result: '0x',
        },
        statusText: '',
        headers: {},
        config: {},
      };
      const txRes: AxiosResponse = {
        status: 200,
        data: {
          jsonrpc: '2.0',
          id: 1,
          result:
            '0x2fc8b539232f2cbd8316106e58918842a5d38f0bd8856679bf625f53bb8657f1',
        },
        statusText: '',
        headers: {},
        config: {},
      };
      const httpServiceMockRes = {
        noTxRes,
        estimateGasRes,
        txRes,
      };
      const configServiceMockRes = {
        verseMasterNodeUrl,
        inheritHostHeader,
        allowedMethods,
        datastore,
      };
      await createTestingModule(
        txAllowList,
        deployAllowList,
        unlimitedTxRateAddresses,
        httpServiceMockRes,
        configServiceMockRes,
      );
      jest.spyOn(txService, 'parseRawTx').mockReturnValue(tx);
      jest
        .spyOn(datastoreService, 'getTransactionHistoryCount')
        .mockResolvedValue(0);

      return await request(app.getHttpServer())
        .post('/')
        .send(body)
        .expect(200)
        .expect(responseData);
    });

    it('deployer is register', async () => {
      const inheritHostHeader = true;
      const allowedMethods = [/^.*$/];
      const datastore = 'redis';
      const method = 'eth_sendRawTransaction';
      const rawTx =
        '0x02f86f05038459682f008459682f12825208948626f6940e2eb28930efb4cef49b2d1f2c9c119985e8d4a5100080c080a079448db43a092a4bf489fe93fa8a7c09ac25f3d8e5a799d401c8d105cccdd029a0743a0f064dc9cff4748b6d5e39dda262a89f0595570b41b0b576584d12348239';
      const body = {
        jsonrpc: '2.0',
        id: 1,
        method: method,
        params: [rawTx],
      };
      const tx = {
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
      const txHash =
        '0x2fc8b539232f2cbd8316106e58918842a5d38f0bd8856679bf625f53bb8657f1';
      const responseData = {
        jsonrpc: '2.0',
        id: 1,
        result: txHash,
      };
      const rateLimit = {
        name: 'wildcard',
        interval: 1,
        limit: 1,
      };
      // Set by condition to fail in txAllowList
      const txAllowList = [
        {
          fromList: ['*'],
          toList: ['*'],
          value: { gt: `${valueAmount}` },
          rateLimit,
        },
      ];
      const deployAllowList = [from];
      const unlimitedTxRateAddresses = [''];
      const noTxRes: AxiosResponse = {
        status: 200,
        data: {
          jsonrpc: '2.0',
          id: 1,
          result: '0x',
        },
        statusText: '',
        headers: {},
        config: {},
      };
      const estimateGasRes: AxiosResponse = {
        status: 200,
        data: {
          jsonrpc: '2.0',
          id: 1,
          result: '0x',
        },
        statusText: '',
        headers: {},
        config: {},
      };
      const txRes: AxiosResponse = {
        status: 200,
        data: responseData,
        statusText: '',
        headers: {},
        config: {},
      };
      const httpServiceMockRes = {
        noTxRes,
        estimateGasRes,
        txRes,
      };
      const configServiceMockRes = {
        verseMasterNodeUrl,
        inheritHostHeader,
        allowedMethods,
        datastore,
      };
      await createTestingModule(
        txAllowList,
        deployAllowList,
        unlimitedTxRateAddresses,
        httpServiceMockRes,
        configServiceMockRes,
      );
      jest.spyOn(txService, 'parseRawTx').mockReturnValue(tx);
      jest
        .spyOn(datastoreService, 'getTransactionHistoryCount')
        .mockResolvedValue(10);

      return await request(app.getHttpServer())
        .post('/')
        .send(body)
        .expect(200)
        .expect(responseData);
    });
  });
});

describe('batch request', () => {
  let txService: TransactionService;
  let moduleFixture: TestingModule;
  let app: INestApplication;

  const getTxAllowList = jest.spyOn(transactionAllowList, 'getTxAllowList');
  const getDeployAllowList = jest.spyOn(
    transactionAllowList,
    'getDeployAllowList',
  );
  const getUnlimitedTxRateAddresses = jest.spyOn(
    transactionAllowList,
    'getUnlimitedTxRateAddresses',
  );

  const verseMasterNodeUrl = 'http://localhost:8545';
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
  const r =
    '0x79448db43a092a4bf489fe93fa8a7c09ac25f3d8e5a799d401c8d105cccdd028';
  const s =
    '0x743a0f064dc9cff4748b6d5e39dda262a89f0595570b41b0b576584d12348239';
  const from = '0xaf395754eB6F542742784cE7702940C60465A46a';

  const createTestingModule = async (
    txAllowList: Array<TransactionAllow>,
    deployAllowList: Array<string>,
    unlimitedTxRateAddresses: Array<string>,
    httpServiceMockRes: HttpServiceMockRes | undefined,
    configServiceMockRes: ConfigServiceMockRes | undefined,
  ) => {
    getTxAllowList.mockReturnValue(txAllowList);
    getDeployAllowList.mockReturnValue(deployAllowList);
    getUnlimitedTxRateAddresses.mockReturnValue(unlimitedTxRateAddresses);

    let configServiceMock;
    let httpServiceMock;
    if (configServiceMockRes)
      configServiceMock = getConfigServiceMock(configServiceMockRes);
    if (httpServiceMockRes)
      httpServiceMock = getHttpServiceMock(httpServiceMockRes);

    const testingModuleBuilder = Test.createTestingModule({
      imports: [AppModule, HttpModule],
      providers: [
        ConfigService,
        VerseService,
        TransactionService,
        AllowCheckService,
        RateLimitService,
        DatastoreService,
        TypeCheckService,
      ],
    }).useMocker((token) => {
      switch (token) {
        case TransactionService:
          return {
            parseRawTx: jest.fn(),
          };
        case DatastoreService:
          return {
            setTransactionHistory: jest.fn(),
            getTransactionHistoryCount: jest.fn(),
          };
      }
    });

    if (configServiceMock) {
      testingModuleBuilder
        .overrideProvider(ConfigService)
        .useValue(configServiceMock);
    }
    if (httpServiceMock) {
      testingModuleBuilder
        .overrideProvider(HttpService)
        .useValue(httpServiceMock);
    }
    moduleFixture = await testingModuleBuilder.compile();

    txService = moduleFixture.get<TransactionService>(TransactionService);

    jest.spyOn(console, 'error');

    app = moduleFixture.createNestApplication();
    await app.init();
  };

  beforeEach(() => {
    jest.resetAllMocks();
  });

  afterAll(async () => {
    await app.close();
  });

  it('tx method is not eth_sendRawTransaction and successful', async () => {
    const inheritHostHeader = true;
    const allowedMethods = [/^.*$/];
    const datastore = '';
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
    const responseData = {
      jsonrpc: '2.0',
      id: 1,
      result: '999999',
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
    const txAllowList = [
      {
        fromList: ['*'],
        toList: ['*'],
      },
    ];
    const deployAllowList = [''];
    const unlimitedTxRateAddresses = [''];

    const noTxRes: AxiosResponse = {
      status: 200,
      data: responseData,
      statusText: '',
      headers: {},
      config: {},
    };
    const estimateGasRes: AxiosResponse = {
      status: 200,
      data: {
        jsonrpc: '2.0',
        id: 1,
        result: '0x',
      },
      statusText: '',
      headers: {},
      config: {},
    };
    const txRes: AxiosResponse = {
      status: 200,
      data: {
        jsonrpc: '2.0',
        id: 1,
        result:
          '0x2fc8b539232f2cbd8316106e58918842a5d38f0bd8856679bf625f53bb8657f1',
      },
      statusText: '',
      headers: {},
      config: {},
    };
    const httpServiceMockRes = {
      noTxRes,
      estimateGasRes,
      txRes,
    };
    const configServiceMockRes = {
      verseMasterNodeUrl,
      inheritHostHeader,
      allowedMethods,
      datastore,
    };
    await createTestingModule(
      txAllowList,
      deployAllowList,
      unlimitedTxRateAddresses,
      httpServiceMockRes,
      configServiceMockRes,
    );

    return await request(app.getHttpServer())
      .post('/')
      .send(body)
      .expect(200)
      .expect(results);
  });

  it('tx method is not allowed', async () => {
    const inheritHostHeader = true;
    const allowedMethods = [/^eth_call$/];
    const datastore = '';
    const method = 'eth_getTransactionReceipt';
    const body = [
      {
        jsonrpc: '2.0',
        id: 1,
        method: method,
        params: [
          '0xc3a3a2feced276891d9658a62205ff049bab1e6e4e4d6ff500487e023fcb3d82',
        ],
      },
      {
        jsonrpc: '2.0',
        id: 1,
        method: method,
        params: [
          '0xc3a3a2feced276891d9658a62205ff049bab1e6e4e4d6ff500487e023fcb3d82',
        ],
      },
    ];
    const errMsg = `${method} is not allowed`;
    const errCode = -32601;
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
    const txAllowList = [
      {
        fromList: ['*'],
        toList: ['*'],
      },
    ];
    const deployAllowList = [''];
    const unlimitedTxRateAddresses = [''];
    const httpServiceMockRes = undefined;
    const configServiceMockRes = {
      verseMasterNodeUrl,
      inheritHostHeader,
      allowedMethods,
      datastore,
    };
    await createTestingModule(
      txAllowList,
      deployAllowList,
      unlimitedTxRateAddresses,
      httpServiceMockRes,
      configServiceMockRes,
    );

    return await request(app.getHttpServer())
      .post('/')
      .send(body)
      .expect(200)
      .expect(results);
  });

  it('tx method is eth_sendRawTransaction and but is not allowed tx', async () => {
    const rawTx =
      '0x02f86f05038459682f008459682f12825208948626f6940e2eb28930efb4cef49b2d1f2c9c119985e8d4a5100080c080a079448db43a092a4bf489fe93fa8a7c09ac25f3d8e5a799d401c8d105cccdd029a0743a0f064dc9cff4748b6d5e39dda262a89f0595570b41b0b576584d12348239';
    const inheritHostHeader = true;
    const allowedMethods = [/^.*$/];
    const datastore = '';
    const method = 'eth_sendRawTransaction';
    const body = [
      {
        jsonrpc: '2.0',
        id: 1,
        method: method,
        params: [rawTx],
      },
      {
        jsonrpc: '2.0',
        id: 1,
        method: method,
        params: [rawTx],
      },
    ];
    // this tx doesn't have from.
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
    };
    const errMsg = 'transaction is invalid';
    const errCode = -32602;
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
    const txAllowList = [
      {
        fromList: ['*'],
        toList: ['*'],
      },
    ];
    const deployAllowList = [''];
    const unlimitedTxRateAddresses = [''];
    const httpServiceMockRes = undefined;
    const configServiceMockRes = {
      verseMasterNodeUrl,
      inheritHostHeader,
      allowedMethods,
      datastore,
    };
    await createTestingModule(
      txAllowList,
      deployAllowList,
      unlimitedTxRateAddresses,
      httpServiceMockRes,
      configServiceMockRes,
    );
    jest.spyOn(txService, 'parseRawTx').mockReturnValue(tx);

    return await request(app.getHttpServer())
      .post('/')
      .send(body)
      .expect(200)
      .expect(results);
  });

  it('tx method is eth_sendRawTransaction and but is not allowed gas', async () => {
    const jsonrpc = '2.0';
    const id = 1;
    const rawTx =
      '0x02f86f05038459682f008459682f12825208948626f6940e2eb28930efb4cef49b2d1f2c9c119985e8d4a5100080c080a079448db43a092a4bf489fe93fa8a7c09ac25f3d8e5a799d401c8d105cccdd029a0743a0f064dc9cff4748b6d5e39dda262a89f0595570b41b0b576584d12348239';
    const inheritHostHeader = true;
    const allowedMethods = [/^.*$/];
    const datastore = '';
    const method = 'eth_sendRawTransaction';
    const body = [
      {
        jsonrpc: jsonrpc,
        id: id,
        method: method,
        params: [rawTx],
      },
      {
        jsonrpc: jsonrpc,
        id: id,
        method: method,
        params: [rawTx],
      },
    ];
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
    const errMsg = 'insufficient balance for transfer';
    const errCode = -32602;
    const responseData = {
      jsonrpc: '2.0',
      id: 1,
      error: {
        code: errCode,
        message: errMsg,
      },
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

    const noTxRes: AxiosResponse = {
      status: 200,
      data: {
        jsonrpc: '2.0',
        id: 1,
        result: '0x',
      },
      statusText: '',
      headers: {},
      config: {},
    };
    const estimateGasRes: AxiosResponse = {
      status: 200,
      data: responseData,
      statusText: '',
      headers: {},
      config: {},
    };
    const txRes: AxiosResponse = {
      status: 200,
      data: {
        jsonrpc: '2.0',
        id: 1,
        result:
          '0x2fc8b539232f2cbd8316106e58918842a5d38f0bd8856679bf625f53bb8657f1',
      },
      statusText: '',
      headers: {},
      config: {},
    };
    const txAllowList = [
      {
        fromList: ['*'],
        toList: ['*'],
      },
    ];
    const deployAllowList = [''];
    const unlimitedTxRateAddresses = [''];
    const httpServiceMockRes = {
      noTxRes,
      estimateGasRes,
      txRes,
    };
    const configServiceMockRes = {
      verseMasterNodeUrl,
      inheritHostHeader,
      allowedMethods,
      datastore,
    };
    await createTestingModule(
      txAllowList,
      deployAllowList,
      unlimitedTxRateAddresses,
      httpServiceMockRes,
      configServiceMockRes,
    );
    jest.spyOn(txService, 'parseRawTx').mockReturnValue(tx);

    return await request(app.getHttpServer())
      .post('/')
      .send(body)
      .expect(200)
      .expect(results);
  });

  it('tx method is eth_sendRawTransaction and successful', async () => {
    const inheritHostHeader = true;
    const allowedMethods = [/^.*$/];
    const datastore = '';
    const method = 'eth_sendRawTransaction';
    const rawTx =
      '0x02f86f05038459682f008459682f12825208948626f6940e2eb28930efb4cef49b2d1f2c9c119985e8d4a5100080c080a079448db43a092a4bf489fe93fa8a7c09ac25f3d8e5a799d401c8d105cccdd029a0743a0f064dc9cff4748b6d5e39dda262a89f0595570b41b0b576584d12348239';
    const body = [
      {
        jsonrpc: '2.0',
        id: 1,
        method: method,
        params: [rawTx],
      },
      {
        jsonrpc: '2.0',
        id: 1,
        method: method,
        params: [rawTx],
      },
    ];
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
    const txHash =
      '0x2fc8b539232f2cbd8316106e58918842a5d38f0bd8856679bf625f53bb8657f1';
    const responseData = {
      jsonrpc: '2.0',
      id: 1,
      result: txHash,
    };
    const results = [
      {
        jsonrpc: '2.0',
        id: 1,
        result: txHash,
      },
      {
        jsonrpc: '2.0',
        id: 1,
        result: txHash,
      },
    ];
    const txAllowList = [
      {
        fromList: ['*'],
        toList: ['*'],
      },
    ];
    const deployAllowList = [''];
    const unlimitedTxRateAddresses = [''];
    const noTxRes: AxiosResponse = {
      status: 200,
      data: {
        jsonrpc: '2.0',
        id: 1,
        result: '0x',
      },
      statusText: '',
      headers: {},
      config: {},
    };
    const estimateGasRes: AxiosResponse = {
      status: 200,
      data: {
        jsonrpc: '2.0',
        id: 1,
        result: '0x',
      },
      statusText: '',
      headers: {},
      config: {},
    };
    const txRes: AxiosResponse = {
      status: 200,
      data: responseData,
      statusText: '',
      headers: {},
      config: {},
    };
    const httpServiceMockRes = {
      noTxRes,
      estimateGasRes,
      txRes,
    };
    const configServiceMockRes = {
      verseMasterNodeUrl,
      inheritHostHeader,
      allowedMethods,
      datastore,
    };
    await createTestingModule(
      txAllowList,
      deployAllowList,
      unlimitedTxRateAddresses,
      httpServiceMockRes,
      configServiceMockRes,
    );
    jest.spyOn(txService, 'parseRawTx').mockReturnValue(tx);

    return await request(app.getHttpServer())
      .post('/')
      .send(body)
      .expect(200)
      .expect(results);
  });
});
