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
  WebhookService,
  RateLimitService,
  TypeCheckService,
} from 'src/services';
import { DatastoreService } from 'src/repositories';
import * as transactionAllowList from 'src/config/transactionAllowList';
import { TransactionAllow } from 'src/config/transactionAllowList';
import { INestApplication } from '@nestjs/common';

const webhookUrl = 'https://webhook.example.com';
const webhookHost = new URL(webhookUrl).host;

interface HttpServiceMockRes {
  noTxRes: AxiosResponse;
  estimateGasRes: AxiosResponse;
  txRes: AxiosResponse;
  webhookRes: AxiosResponse,
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
        if (url === webhookUrl) return of(mockRes.webhookRes);
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
        case 'verseReadNodeUrl':
          return undefined;
        case 'blockNumberCacheExpire':
          return undefined;
        case 'datastore':
          return mockRes.datastore;
        case 'allowedMethods':
          return mockRes.allowedMethods;
        case 'inheritHostHeader':
          return mockRes.inheritHostHeader;
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
  const data =
    '0x095ea7b35234801561001057600080fd5b5061067c806100206000396000f3fe608060405234801561001057600080fd5b50600436106100365760003560e01c8063a41368621461003b578063cfae321714610057575b600080fd5b61005560048036038101906100509190610274565b610075565b005b61005f610088565b60405161006c919061033c565b60405180910390f35b80600090816100849190610574565b5050565b6060600080546100979061038d565b80601f01602080910402602001604051908101604052809291908181526020018280546100c39061038d565b80156101105780601f106100e557610100808354040283529160200191610110565b820191906000526020600020905b8154815290600101906020018083116100f357829003601f168201915b5050505050905090565b6000604051905090565b600080fd5b600080fd5b600080fd5b600080fd5b6000601f19601f8301169050919050565b7f4e487b7100000000000000000000000000000000000000000000000000000000600052604160045260246000fd5b61018182610138565b810181811067ffffffffffffffff821117156101a05761019f610149565b5b80604052505050565b60006101b361011a565b90506101bf8282610178565b919050565b600067ffffffffffffffff8211156101df576101de610149565b5b6101e882610138565b9050602081019050919050565b82818337600083830152505050565b6000610217610212846101c4565b6101a9565b90508281526020810184848401111561023357610232610133565b5b61023e8482856101f5565b509392505050565b600082601f83011261025b5761025a61012e565b5b813561026b848260208601610204565b91505092915050565b60006020828403121561028a57610289610124565b5b600082013567ffffffffffffffff8111156102a8576102a7610129565b5b6102b484828501610246565b91505092915050565b600081519050919050565b600082825260208201905092915050565b60005b838110156102f75780820151818401526020810190506102dc565b60008484015250505050565b600061030e826102bd565b61031881856102c8565b93506103288185602086016102d9565b61033181610138565b840191505092915050565b600060208201905081810360008301526103568184610303565b905092915050565b7f4e487b7100000000000000000000000000000000000000000000000000000000600052602260045260246000fd5b600060028204905060018216806103a557607f821691505b6020821081036103b8576103b761035e565b5b50919050565b60008190508160005260206000209050919050565b60006020601f8301049050919050565b600082821b905092915050565b6000600883026104207fffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff826103e3565b61042a86836103e3565b95508019841693508086168417925050509392505050565b6000819050919050565b6000819050919050565b600061047161046c61046784610442565b61044c565b610442565b9050919050565b6000819050919050565b61048b83610456565b61049f61049782610478565b8484546103f0565b825550505050565b600090565b6104b46104a7565b6104bf818484610482565b505050565b5b818110156104e3576104d86000826104ac565b6001810190506104c5565b5050565b601f821115610528576104f9816103be565b610502846103d3565b81016020851015610511578190505b61052561051d856103d3565b8301826104c4565b50505b505050565b600082821c905092915050565b600061054b6000198460080261052d565b1980831691505092915050565b6000610564838361053a565b9150826002028217905092915050565b61057d826102bd565b67ffffffffffffffff81111561059657610595610149565b5b6105a0825461038d565b6105ab8282856104e7565b600060209050601f8311600181146105de57600084156105cc578287015190505b6105d68582610558565b86555061063e565b601f1984166105ec866103be565b60005b82811015610614578489015182556001820191506020850194506020810190506105ef565b86831015610631578489015161062d601f89168261053a565b8355505b6001600288020188555050505b50505050505056fea26469706673582212209b9e66415178574ee07e631fb567d1c98c49b46a47562a907bfc061574b80e4864736f6c63430008110033';
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
        WebhookService,
        RateLimitService,
        DatastoreService,
        TypeCheckService,
      ],
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

    jest.spyOn(console, 'error').mockImplementation();

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
      const webhookRes: AxiosResponse = {
        status: 200,
        data: {},
        statusText: '',
        headers: {},
        config: {},
      };

      const httpServiceMockRes = {
        noTxRes,
        estimateGasRes,
        txRes,
        webhookRes,
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
      const webhookRes: AxiosResponse = {
        status: 200,
        data: {},
        statusText: '',
        headers: {},
        config: {},
      };

      const httpServiceMockRes = {
        noTxRes,
        estimateGasRes,
        txRes,
        webhookRes,
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
        const webhookRes: AxiosResponse = {
          status: 200,
          data: {},
          statusText: '',
          headers: {},
          config: {},
        };

        const httpServiceMockRes = {
          noTxRes,
          estimateGasRes,
          txRes,
          webhookRes,
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
        const webhookRes: AxiosResponse = {
          status: 200,
          data: {},
          statusText: '',
          headers: {},
          config: {},
        };

        const httpServiceMockRes = {
          noTxRes,
          estimateGasRes,
          txRes,
          webhookRes,
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
        const webhookRes: AxiosResponse = {
          status: 200,
          data: {},
          statusText: '',
          headers: {},
          config: {},
        };
        const httpServiceMockRes = {
          noTxRes,
          estimateGasRes,
          txRes,
          webhookRes,
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
    });

    describe('txAllow rule includes contract method', () => {
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
        // tx method is approve(address,uint256)
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
            contractMethodList: ['approve(address,uint256)'],
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
        const webhookRes: AxiosResponse = {
          status: 200,
          data: {},
          statusText: '',
          headers: {},
          config: {},
        };
        const httpServiceMockRes = {
          noTxRes,
          estimateGasRes,
          txRes,
          webhookRes,
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
        // tx method is approve(address,uint256)
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
            contractMethodList: ['approve(address,uint256)'],
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
        const webhookRes: AxiosResponse = {
          status: 200,
          data: {},
          statusText: '',
          headers: {},
          config: {},
        };
        const httpServiceMockRes = {
          noTxRes,
          estimateGasRes,
          txRes,
          webhookRes,
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

      it('methodId is not allowed', async () => {
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
        // tx method is approve(address,uint256)
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
            contractMethodList: ['transfer(address,uint256)'],
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
        const webhookRes: AxiosResponse = {
          status: 200,
          data: {},
          statusText: '',
          headers: {},
          config: {},
        };
        const httpServiceMockRes = {
          noTxRes,
          estimateGasRes,
          txRes,
          webhookRes,
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
        // tx method is approve(address,uint256)
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
            contractMethodList: ['approve(address,uint256)'],
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
        const webhookRes: AxiosResponse = {
          status: 200,
          data: {},
          statusText: '',
          headers: {},
          config: {},
        };
        const httpServiceMockRes = {
          noTxRes,
          estimateGasRes,
          txRes,
          webhookRes,
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
        const webhookRes: AxiosResponse = {
          status: 200,
          data: {},
          statusText: '',
          headers: {},
          config: {},
        };

        const httpServiceMockRes = {
          noTxRes,
          estimateGasRes,
          txRes,
          webhookRes,
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
        const webhookRes: AxiosResponse = {
          status: 200,
          data: {},
          statusText: '',
          headers: {},
          config: {},
        };

        const httpServiceMockRes = {
          noTxRes,
          estimateGasRes,
          txRes,
          webhookRes,
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
        const webhookRes: AxiosResponse = {
          status: 200,
          data: {},
          statusText: '',
          headers: {},
          config: {},
        };

        const httpServiceMockRes = {
          noTxRes,
          estimateGasRes,
          txRes,
          webhookRes,
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
        const webhookRes: AxiosResponse = {
          status: 200,
          data: {},
          statusText: '',
          headers: {},
          config: {},
        };

        const httpServiceMockRes = {
          noTxRes,
          estimateGasRes,
          txRes,
          webhookRes,
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
        const webhookRes: AxiosResponse = {
          status: 200,
          data: {},
          statusText: '',
          headers: {},
          config: {},
        };

        const httpServiceMockRes = {
          noTxRes,
          estimateGasRes,
          txRes,
          webhookRes,
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
        jest
          .spyOn(datastoreService, 'setTransactionHistory')
          .mockResolvedValue();

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
        const webhookRes: AxiosResponse = {
          status: 200,
          data: {},
          statusText: '',
          headers: {},
          config: {},
        };

        const httpServiceMockRes = {
          noTxRes,
          estimateGasRes,
          txRes,
          webhookRes,
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
        jest
          .spyOn(datastoreService, 'setTransactionHistory')
          .mockResolvedValue();

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
        const webhookRes: AxiosResponse = {
          status: 200,
          data: {},
          statusText: '',
          headers: {},
          config: {},
        };

        const httpServiceMockRes = {
          noTxRes,
          estimateGasRes,
          txRes,
          webhookRes,
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
        jest
          .spyOn(datastoreService, 'setTransactionHistory')
          .mockResolvedValue();

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
        const webhookRes: AxiosResponse = {
          status: 200,
          data: {},
          statusText: '',
          headers: {},
          config: {},
        };

        const httpServiceMockRes = {
          noTxRes,
          estimateGasRes,
          txRes,
          webhookRes,
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
        jest
          .spyOn(datastoreService, 'setTransactionHistory')
          .mockResolvedValue();

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
        const webhookRes: AxiosResponse = {
          status: 200,
          data: {},
          statusText: '',
          headers: {},
          config: {},
        };

        const httpServiceMockRes = {
          noTxRes,
          estimateGasRes,
          txRes,
          webhookRes,
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
        jest
          .spyOn(datastoreService, 'setTransactionHistory')
          .mockResolvedValue();

        return await request(app.getHttpServer())
          .post('/')
          .send(body)
          .expect(200)
          .expect(responseData);
      });
    });

    describe('txAllow rule includes webhooks', () => {
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
        const webhook = {
          url: webhookUrl,
          headers: {
            host: webhookHost,
          },
          timeout: 3000,
          retry: 3,
          parse: false,
        };
        const txAllowList = [
          {
            fromList: [`!${from}`],
            toList: ['*'],
            webhooks: [webhook],
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
        const webhookRes: AxiosResponse = {
          status: 200,
          data: {},
          statusText: '',
          headers: {},
          config: {},
        };
        const httpServiceMockRes = {
          noTxRes,
          estimateGasRes,
          txRes,
          webhookRes,
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
        const webhook = {
          url: webhookUrl,
          headers: {
            host: webhookHost,
          },
          timeout: 3000,
          retry: 3,
          parse: false,
        };
        const txAllowList = [
          {
            fromList: ['*'],
            toList: [`!${to}`],
            webhooks: [webhook],
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
        const webhookRes: AxiosResponse = {
          status: 200,
          data: {},
          statusText: '',
          headers: {},
          config: {},
        };
        const httpServiceMockRes = {
          noTxRes,
          estimateGasRes,
          txRes,
          webhookRes,
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

      it('webhook is failed', async () => {
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
        const webhook = {
          url: webhookUrl,
          headers: {
            host: webhookHost,
          },
          timeout: 3000,
          retry: 3,
          parse: false,
        };
        const txAllowList = [
          {
            fromList: ['*'],
            toList: ['*'],
            webhooks: [webhook],
          },
        ];
        const deployAllowList = [''];
        const unlimitedTxRateAddresses = [''];
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
        const webhookRes: AxiosResponse = {
          status: 400,
          data: {},
          statusText: '',
          headers: {},
          config: {},
        };
        const httpServiceMockRes = {
          noTxRes,
          estimateGasRes,
          txRes,
          webhookRes,
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
        const webhook = {
          url: webhookUrl,
          headers: {
            host: webhookHost,
          },
          timeout: 3000,
          retry: 3,
          parse: false,
        };
        const txAllowList = [
          {
            fromList: ['*'],
            toList: ['*'],
            webhooks: [webhook],
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
        const webhookRes: AxiosResponse = {
          status: 200,
          data: {},
          statusText: '',
          headers: {},
          config: {},
        };
        const httpServiceMockRes = {
          noTxRes,
          estimateGasRes,
          txRes,
          webhookRes,
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
        const webhook = {
          url: webhookUrl,
          headers: {
            host: webhookHost,
          },
          timeout: 3000,
          retry: 3,
          parse: false,
        };
        const txAllowList = [
          {
            fromList: [`!${from}`],
            toList: ['*'],
            contractMethodList: ['approve(address,uint256)'],
            value: { eq: `${valueAmount}` },
            rateLimit,
            webhooks: [webhook],
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
        const webhookRes: AxiosResponse = {
          status: 200,
          data: {},
          statusText: '',
          headers: {},
          config: {},
        };

        const httpServiceMockRes = {
          noTxRes,
          estimateGasRes,
          txRes,
          webhookRes,
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
        const webhook = {
          url: webhookUrl,
          headers: {
            host: webhookHost,
          },
          timeout: 3000,
          retry: 3,
          parse: false,
        };
        const txAllowList = [
          {
            fromList: ['*'],
            toList: [`!${to}`],
            contractMethodList: ['approve(address,uint256)'],
            value: { eq: `${valueAmount}` },
            rateLimit,
            webhooks: [webhook],
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
        const webhookRes: AxiosResponse = {
          status: 200,
          data: {},
          statusText: '',
          headers: {},
          config: {},
        };
        const httpServiceMockRes = {
          noTxRes,
          estimateGasRes,
          txRes,
          webhookRes,
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
        jest
          .spyOn(datastoreService, 'getTransactionHistoryCount')
          .mockResolvedValue(0);

        return await request(app.getHttpServer())
          .post('/')
          .send(body)
          .expect(200)
          .expect(responseData);
      });

      it('methodId is not allowed', async () => {
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
        // tx method is approve(address,uint256)
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
        const webhook = {
          url: webhookUrl,
          headers: {
            host: webhookHost,
          },
          timeout: 3000,
          retry: 3,
          parse: false,
        };
        const txAllowList = [
          {
            fromList: ['*'],
            toList: ['*'],
            contractMethodList: ['transfer(address,uint256)'],
            value: { eq: `${valueAmount}` },
            rateLimit,
            webhooks: [webhook],
          },
        ];
        const deployAllowList = [''];
        const unlimitedTxRateAddresses = [''];

        jest.spyOn(txService, 'parseRawTx').mockReturnValue(tx);
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
        const webhookRes: AxiosResponse = {
          status: 200,
          data: {},
          statusText: '',
          headers: {},
          config: {},
        };

        const httpServiceMockRes = {
          noTxRes,
          estimateGasRes,
          txRes,
          webhookRes,
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
        const webhook = {
          url: webhookUrl,
          headers: {
            host: webhookHost,
          },
          timeout: 3000,
          retry: 3,
          parse: false,
        };
        const txAllowList = [
          {
            fromList: ['*'],
            toList: ['*'],
            contractMethodList: ['approve(address,uint256)'],
            value: { gt: `${valueAmount}` },
            rateLimit,
            webhooks: [webhook],
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
        const webhookRes: AxiosResponse = {
          status: 200,
          data: {},
          statusText: '',
          headers: {},
          config: {},
        };

        const httpServiceMockRes = {
          noTxRes,
          estimateGasRes,
          txRes,
          webhookRes,
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
        const webhook = {
          url: webhookUrl,
          headers: {
            host: webhookHost,
          },
          timeout: 3000,
          retry: 3,
          parse: false,
        };
        const txAllowList = [
          {
            fromList: ['*'],
            toList: ['*'],
            contractMethodList: ['approve(address,uint256)'],
            value: { eq: `${valueAmount}` },
            rateLimit,
            webhooks: [webhook],
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
        const webhookRes: AxiosResponse = {
          status: 200,
          data: {},
          statusText: '',
          headers: {},
          config: {},
        };

        const httpServiceMockRes = {
          noTxRes,
          estimateGasRes,
          txRes,
          webhookRes,
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

      it('webhook is failed', async () => {
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
        const webhook = {
          url: webhookUrl,
          headers: {
            host: webhookHost,
          },
          timeout: 3000,
          retry: 3,
          parse: false,
        };
        const txAllowList = [
          {
            fromList: ['*'],
            toList: ['*'],
            contractMethodList: ['approve(address,uint256)'],
            value: { eq: `${valueAmount}` },
            rateLimit,
            webhooks: [webhook],
          },
        ];
        const deployAllowList = [''];
        const unlimitedTxRateAddresses = [''];
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
        const webhookRes: AxiosResponse = {
          status: 400,
          data: {},
          statusText: '',
          headers: {},
          config: {},
        };
        const httpServiceMockRes = {
          noTxRes,
          estimateGasRes,
          txRes,
          webhookRes,
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
        const webhook = {
          url: webhookUrl,
          headers: {
            host: webhookHost,
          },
          timeout: 3000,
          retry: 3,
          parse: false,
        };
        const txAllowList = [
          {
            fromList: ['*'],
            toList: ['*'],
            contractMethodList: ['approve(address,uint256)'],
            value: { eq: `${valueAmount}` },
            rateLimit,
            webhooks: [webhook],
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
        const webhookRes: AxiosResponse = {
          status: 200,
          data: {},
          statusText: '',
          headers: {},
          config: {},
        };
        const httpServiceMockRes = {
          noTxRes,
          estimateGasRes,
          txRes,
          webhookRes,
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
        jest
          .spyOn(datastoreService, 'setTransactionHistory')
          .mockResolvedValue();

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
      const webhookRes: AxiosResponse = {
        status: 200,
        data: {},
        statusText: '',
        headers: {},
        config: {},
      };
      const httpServiceMockRes = {
        noTxRes,
        estimateGasRes,
        txRes,
        webhookRes,
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
      const webhookRes: AxiosResponse = {
        status: 200,
        data: {},
        statusText: '',
        headers: {},
        config: {},
      };
      const httpServiceMockRes = {
        noTxRes,
        estimateGasRes,
        txRes,
        webhookRes,
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
        WebhookService,
        RateLimitService,
        DatastoreService,
        TypeCheckService,
      ],
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

    jest.spyOn(console, 'error').mockImplementation();

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
    const webhookRes: AxiosResponse = {
      status: 200,
      data: {},
      statusText: '',
      headers: {},
      config: {},
    };

    const httpServiceMockRes = {
      noTxRes,
      estimateGasRes,
      txRes,
      webhookRes,
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
    const webhookRes: AxiosResponse = {
      status: 200,
      data: {},
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
      webhookRes,
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
    const webhookRes: AxiosResponse = {
      status: 200,
      data: {},
      statusText: '',
      headers: {},
      config: {},
    };

    const httpServiceMockRes = {
      noTxRes,
      estimateGasRes,
      txRes,
      webhookRes,
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
