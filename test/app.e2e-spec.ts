import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { HttpModule, HttpService } from '@nestjs/axios';
import * as request from 'supertest';
import { BigNumber } from 'ethers';
import { AccessList } from 'ethers/lib/utils';
import { of } from 'rxjs';
import { AxiosResponse } from 'axios';
import { AppModule } from './../src/app.module';
import { ConfigService } from '@nestjs/config';
import { TransactionService, VerseService } from 'src/services';
import { AllowCheckService } from 'src/shared/services/src';

describe('AppController (e2e)', () => {
  let httpService: HttpService;
  let configService: ConfigService;
  let txService: TransactionService;
  let app: INestApplication;

  const verseUrl = 'http://localhost:8545';
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

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule, HttpModule],
      providers: [
        ConfigService,
        VerseService,
        TransactionService,
        AllowCheckService,
      ],
    })
      .useMocker((token) => {
        switch (token) {
          case HttpService:
            return {
              post: jest.fn(),
            };
          case ConfigService:
            return {
              get: jest.fn(),
            };
          case TransactionService:
            return {
              parseRawTx: jest.fn(),
            };
        }
      })
      .compile();

    httpService = moduleFixture.get<HttpService>(HttpService);
    configService = moduleFixture.get<ConfigService>(ConfigService);
    txService = moduleFixture.get<TransactionService>(TransactionService);

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  describe('/ (Post)', () => {
    it('tx method is not eth_sendRawTransaction and successful', async () => {
      const inheritHostHeader = true;
      const allowedMethods = [/^.*$/];
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
      const res: AxiosResponse = {
        status: 201,
        data: responseData,
        statusText: '',
        headers: {},
        config: {},
      };
      jest.spyOn(configService, 'get').mockImplementation((key: string) => {
        switch (key) {
          case 'verseUrl':
            return verseUrl;
          case 'inheritHostHeader':
            return inheritHostHeader;
          case 'allowedMethods':
            return allowedMethods;
        }
      });
      jest.spyOn(httpService, 'post').mockImplementation(() => of(res));

      return await request(app.getHttpServer())
        .post('/')
        .send(body)
        .expect(201)
        .expect(responseData);
    });

    it('tx method is not allowed', async () => {
      const inheritHostHeader = true;
      const allowedMethods = [/^eth_call$/];
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
      jest.spyOn(configService, 'get').mockImplementation((key: string) => {
        switch (key) {
          case 'verseUrl':
            return verseUrl;
          case 'inheritHostHeader':
            return inheritHostHeader;
          case 'allowedMethods':
            return allowedMethods;
        }
      });

      const result = await request(app.getHttpServer()).post('/').send(body);
      expect(result.status).toEqual(403);
      expect(JSON.parse(result.text).message).toEqual(errMsg);
    });

    it('tx method is eth_sendRawTransaction and but is not allowed tx', async () => {
      const rawTx =
        '0x02f86f05038459682f008459682f12825208948626f6940e2eb28930efb4cef49b2d1f2c9c119985e8d4a5100080c080a079448db43a092a4bf489fe93fa8a7c09ac25f3d8e5a799d401c8d105cccdd029a0743a0f064dc9cff4748b6d5e39dda262a89f0595570b41b0b576584d12348239';
      const inheritHostHeader = true;
      const allowedMethods = [/^.*$/];
      const method = 'eth_sendRawTransaction';
      const body = {
        jsonrpc: '2.0',
        id: 1,
        method: method,
        params: [rawTx],
      };
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
      jest.spyOn(configService, 'get').mockImplementation((key: string) => {
        switch (key) {
          case 'verseUrl':
            return verseUrl;
          case 'inheritHostHeader':
            return inheritHostHeader;
          case 'allowedMethods':
            return allowedMethods;
        }
      });
      jest.spyOn(txService, 'parseRawTx').mockReturnValue(tx);

      const result = await request(app.getHttpServer()).post('/').send(body);
      expect(result.status).toEqual(403);
      expect(JSON.parse(result.text).message).toEqual(errMsg);
    });

    it('tx method is eth_sendRawTransaction and but is not allowed gas', async () => {
      const jsonrpc = '2.0';
      const id = 1;
      const rawTx =
        '0x02f86f05038459682f008459682f12825208948626f6940e2eb28930efb4cef49b2d1f2c9c119985e8d4a5100080c080a079448db43a092a4bf489fe93fa8a7c09ac25f3d8e5a799d401c8d105cccdd029a0743a0f064dc9cff4748b6d5e39dda262a89f0595570b41b0b576584d12348239';
      const inheritHostHeader = true;
      const allowedMethods = [/^.*$/];
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
      const responseData = {
        jsonrpc: '2.0',
        id: 1,
        error: {
          code: -32000,
          message: errMsg,
        },
      };
      const res: AxiosResponse = {
        status: 201,
        data: responseData,
        statusText: '',
        headers: {},
        config: {},
      };
      jest.spyOn(configService, 'get').mockImplementation((key: string) => {
        switch (key) {
          case 'verseUrl':
            return verseUrl;
          case 'inheritHostHeader':
            return inheritHostHeader;
          case 'allowedMethods':
            return allowedMethods;
        }
      });
      jest.spyOn(txService, 'parseRawTx').mockReturnValue(tx);
      jest.spyOn(httpService, 'post').mockImplementation(() => of(res));

      const result = await request(app.getHttpServer()).post('/').send(body);
      expect(result.status).toEqual(403);
      expect(JSON.parse(result.text).message).toEqual(errMsg);
    });

    it('tx method is not eth_sendRawTransaction and successful', async () => {
      const inheritHostHeader = true;
      const allowedMethods = [/^.*$/];
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
      const responseData = {
        jsonrpc: '2.0',
        id: 1,
        result: '0x',
      };
      const res: AxiosResponse = {
        status: 201,
        data: responseData,
        statusText: '',
        headers: {},
        config: {},
      };
      jest.spyOn(configService, 'get').mockImplementation((key: string) => {
        switch (key) {
          case 'verseUrl':
            return verseUrl;
          case 'inheritHostHeader':
            return inheritHostHeader;
          case 'allowedMethods':
            return allowedMethods;
        }
      });
      jest.spyOn(txService, 'parseRawTx').mockReturnValue(tx);
      jest.spyOn(httpService, 'post').mockImplementation(() => of(res));

      return await request(app.getHttpServer())
        .post('/')
        .send(body)
        .expect(201)
        .expect(responseData);
    });
  });
});
