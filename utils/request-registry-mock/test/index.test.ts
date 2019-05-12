import {
  createEndpointMock,
  unmockAllEndpoints,
  mockEndpointOnce,
  activateMocks,
} from '../src/';
import { createGetEndpoint } from 'request-registry';

afterAll(() => unmockAllEndpoints());

describe('request-registry-mock', () => {
  describe('createEndpointMock', () => {
    it('should create a mock without errors', () => {
      const userEndpoint = createGetEndpoint<{}, { name: string }>({
        url: () => '/user',
      });
      createEndpointMock(userEndpoint, async () => ({ name: 'Alex' }));
    });

    it('should allow to activate a mock without errors', () => {
      const userEndpoint = createGetEndpoint<{}, { name: string }>({
        url: () => '/user',
      });
      const userEndpointMock = createEndpointMock(userEndpoint, async () => ({
        name: 'Alex',
      }));
      userEndpointMock.activate();
    });

    it('should allow to clear a mock without errors', () => {
      const userEndpoint = createGetEndpoint<{}, { name: string }>({
        url: () => '/user',
      });
      const userEndpointMock = createEndpointMock(userEndpoint, async () => ({
        name: 'Alex',
      }));
      userEndpointMock.activate();
      userEndpointMock.clear();
    });

    it('should allow to clear a mock twice without errors', () => {
      const userEndpoint = createGetEndpoint<{}, { name: string }>({
        url: () => '/user',
      });
      const userEndpointMock = createEndpointMock(userEndpoint, async () => ({
        name: 'Alex',
      }));
      userEndpointMock.activate();
      userEndpointMock.clear();
      userEndpointMock.clear();
    });

    it('should response with the mocked value', async () => {
      const userEndpoint = createGetEndpoint<{}, { name: string }>({
        url: () => '/user',
      });
      const userEndpointMock = createEndpointMock(userEndpoint, async () => ({
        name: 'Alex',
      }));
      userEndpointMock.activate();
      expect(await userEndpoint({})).toEqual({ name: 'Alex' });
    });

    it('should allow to remove the mock', async () => {
      const userEndpoint = createGetEndpoint<{}, { name: string }>({
        url: () => '/user',
      });
      const unmockedLoader = userEndpoint.loader;
      const userEndpointMock = createEndpointMock(userEndpoint, async () => ({
        name: 'Alex',
      }));
      userEndpointMock.activate();
      userEndpointMock.clear();
      expect(userEndpoint.loader).toEqual(unmockedLoader);
    });

    it('should allow to remove all mocks', async () => {
      const userEndpoint = createGetEndpoint<{}, { name: string }>({
        url: () => '/user',
      });
      const unmockedLoader = userEndpoint.loader;
      const userEndpointMock = createEndpointMock(userEndpoint, async () => ({
        name: 'Alex',
      }));
      userEndpointMock.activate();
      unmockAllEndpoints();
      expect(userEndpoint.loader).toBe(unmockedLoader);
    });

    it('should allow to remove a second mock', async () => {
      const userEndpoint = createGetEndpoint<{}, { name: string }>({
        url: () => '/user',
      });
      const userEndpointMock1 = createEndpointMock(userEndpoint, async () => ({
        name: 'Alex',
      }));
      const userEndpointMock2 = createEndpointMock(userEndpoint, async () => ({
        name: 'Chris',
      }));
      userEndpointMock1.activate();
      userEndpointMock2.activate();
      expect(await userEndpoint({})).toEqual({ name: 'Chris' });
      userEndpoint.clearCache();
      userEndpointMock2.clear();
      expect(await userEndpoint({})).toEqual({ name: 'Alex' });
    });

    it('should allow to remove a unused mock from the queue', async () => {
      const userEndpoint = createGetEndpoint<{}, { name: string }>({
        url: () => '/user',
      });
      const unmockedLoader = userEndpoint.loader;
      const userEndpointMock1 = createEndpointMock(userEndpoint, async () => ({
        name: 'Alex',
      }));
      const userEndpointMock2 = createEndpointMock(userEndpoint, async () => ({
        name: 'Chris',
      }));
      userEndpointMock1.activate();
      userEndpointMock2.activate();
      expect(await userEndpoint({})).toEqual({ name: 'Chris' });
      userEndpoint.clearCache();
      userEndpointMock1.clear();
      expect(await userEndpoint({})).toEqual({ name: 'Chris' });
      userEndpointMock2.clear();
      expect(userEndpoint.loader).toBe(unmockedLoader);
    });
  });

  describe('mockEndpointOnce', () => {
    it('should create a mock without errors', async () => {
      const userEndpoint = createGetEndpoint<{}, { name: string }>({
        url: () => '/user',
      });
      mockEndpointOnce(userEndpoint, async () => ({ name: 'Alex' }));
      mockEndpointOnce(userEndpoint, async () => ({ name: 'Chris' }));
      expect(await userEndpoint({})).toEqual({ name: 'Chris' });
      userEndpoint.clearCache();
      expect(await userEndpoint({})).toEqual({ name: 'Alex' });
    });
  });

  describe('activateMocks', () => {
    it('should activate two mocks for the same endpoint', async () => {
      const userEndpoint = createGetEndpoint<{}, { name: string }>({
        url: () => '/user',
      });
      const userEndpointMock1 = createEndpointMock(userEndpoint, async () => ({
        name: 'Alex',
      }));
      const userEndpointMock2 = createEndpointMock(userEndpoint, async () => ({
        name: 'Chris',
      }));
      activateMocks(userEndpointMock1, userEndpointMock2);
      expect(await userEndpoint({})).toEqual({ name: 'Chris' });
      userEndpointMock2.clear();
      userEndpoint.clearCache();
      expect(await userEndpoint({})).toEqual({ name: 'Alex' });
    });
  });
});
