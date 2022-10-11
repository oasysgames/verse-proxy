import { Test } from '@nestjs/testing';
import { HttpModule, HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { of } from 'rxjs';
import { AxiosResponse } from 'axios';
import { BigNumber } from 'ethers';
import { AccessList } from 'ethers/lib/utils';
import { VerseService } from '../verse.service';

const verseUrl = 'http://localhost:8545';

describe('VerseService', () => {
  let httpService: HttpService;
  let configService: ConfigService;
  let verseService: VerseService;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [HttpModule],
      providers: [ConfigService],
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
        }
      })
      .compile();

    httpService = moduleRef.get<HttpService>(HttpService);
    configService = moduleRef.get<ConfigService>(ConfigService);

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
    const inheritHostHeader = true;

    jest.spyOn(httpService, 'post').mockImplementation(() => of(res));
    jest.spyOn(configService, 'get').mockImplementation((key: string) => {
      switch (key) {
        case 'verseUrl':
          return verseUrl;
        case 'inheritHostHeader':
          return inheritHostHeader;
      }
    });
  });

  describe('post', () => {
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
      method: 'eth_call',
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

    beforeEach(async () => {
      jest.resetAllMocks();
    });

    it('inheritHostHeader is true', async () => {
      const inheritHostHeader = true;

      const postMock = jest.spyOn(httpService, 'post');
      postMock.mockImplementation(() => of(res));
      jest.spyOn(configService, 'get').mockImplementation((key: string) => {
        switch (key) {
          case 'verseUrl':
            return verseUrl;
          case 'inheritHostHeader':
            return inheritHostHeader;
        }
      });

      verseService = new VerseService(httpService, configService);

      const host = 'localhost';
      const xContentTypeOptions = 'nosniff';
      const proxyRequestHeaders = {
        host: host,
        'x-content-type-options': xContentTypeOptions,
        'user-agent': 'PostmanRuntime/7.29.0',
      };
      const verseRequestHeaders = {
        host: host,
        'x-content-type-options': xContentTypeOptions,
      };
      const axiosConfig = {
        headers: verseRequestHeaders,
      };

      const result = await verseService.post(proxyRequestHeaders, body);
      expect(postMock).toHaveBeenCalledWith(verseUrl, body, axiosConfig);
      expect(result).toBe(responseData);
    });

    it('inheritHostHeader is false', async () => {
      const inheritHostHeader = false;

      const postMock = jest.spyOn(httpService, 'post');
      postMock.mockImplementation(() => of(res));
      jest.spyOn(configService, 'get').mockImplementation((key: string) => {
        switch (key) {
          case 'verseUrl':
            return verseUrl;
          case 'inheritHostHeader':
            return inheritHostHeader;
        }
      });
      verseService = new VerseService(httpService, configService);

      const host = 'localhost';
      const xContentTypeOptions = 'nosniff';
      const proxyRequestHeaders = {
        host: host,
        'x-content-type-options': xContentTypeOptions,
        'user-agent': 'PostmanRuntime/7.29.0',
      };
      const verseRequestHeaders = {
        'x-content-type-options': xContentTypeOptions,
      };
      const axiosConfig = {
        headers: verseRequestHeaders,
      };

      const result = await verseService.post(proxyRequestHeaders, body);
      expect(postMock).toHaveBeenCalledWith(verseUrl, body, axiosConfig);
      expect(result).toBe(responseData);
    });
  });
});
