import fetchMock from "fetch-mock";
import {
  createGetEndpoint,
  createPostEndpoint,
  createPutEndpoint,
  createDeleteEndpoint
} from "../src";

jest.useFakeTimers();

afterEach(() => {
  fetchMock.restore();
});

test("should be able to use an endpoint with dynamic keys", async () => {
  fetchMock.get("http://example.com/user/4", () => ({ firstName: "Joe" }));
  const userEndpoint = createGetEndpoint<{ id: string }, { firstName: string }>(
    {
      url: keys => `http://example.com/user/${keys.id}`
    }
  );
  const user = await userEndpoint({ id: "4" });
  expect(user).toEqual({ firstName: "Joe" });
});

test("should be able to use the cache of an endpoint", async () => {
  let requestCount = 0;
  fetchMock.get("*", () => {
    requestCount++;
    return {
      firstName: "Joe"
    };
  });
  const userEndpoint = createGetEndpoint<{ id: string }, { firstName: string }>(
    {
      url: keys => `http://example.com/user/${keys.id}`
    }
  );
  await userEndpoint({ id: "4" });
  await userEndpoint({ id: "4" });
  await userEndpoint({ id: "5" });
  await userEndpoint({ id: "5" });
  expect(requestCount).toEqual(2);
});

test("should fire the success function once a request succeeds", async () => {
  let successCount = 0;
  fetchMock.get("http://example.com/user/4", () => ({ firstName: "Joe" }));
  fetchMock.get("http://example.com/user/5", () => ({ firstName: "Sue" }));
  const userEndpoint = createGetEndpoint<{ id: string }, { firstName: string }>(
    {
      url: keys => `http://example.com/user/${keys.id}`,
      afterSuccess: () => successCount++
    }
  );
  await userEndpoint({ id: "4" });
  await userEndpoint({ id: "4" });
  await userEndpoint({ id: "5" });
  await userEndpoint({ id: "5" });
  expect(successCount).toEqual(2);
});

test("should fire the error function once a request fails", async () => {
  let errorCount = 0;
  fetchMock.get("http://example.com/user/4", 404);
  fetchMock.get("http://example.com/user/5", 404);
  const userEndpoint = createGetEndpoint<{ id: string }, { firstName: string }>(
    {
      url: keys => `http://example.com/user/${keys.id}`,
      afterError: () => errorCount++
    }
  );
  await userEndpoint({ id: "4" }).catch(error => error);
  await userEndpoint({ id: "5" }).catch(error => error);
  expect(errorCount).toEqual(2);
});

test("should fire the error function once a request fails", async () => {
  fetchMock.get("http://example.com/user/4", 404);
  const userEndpoint = createGetEndpoint<{ id: string }, { firstName: string }>(
    {
      url: keys => `http://example.com/user/${keys.id}`
    }
  );
  const error = await userEndpoint({ id: "4" }).catch(error => error);
  expect(error.message).toEqual(
    'Unhandled ajax error 404 {"message":""} Resolve Attemps: none'
  );
});

test("should allow to use a custom loader", async () => {
  const userEndpoint = createGetEndpoint<
    { a: number; b: number },
    { sum: number }
  >({
    url: keys => `http://example.com/sum/${keys.a}/${keys.b}`,
    loader: async ({ a, b }) => ({ sum: a + b })
  });
  const user = await userEndpoint({ a: 1, b: 2 });
  expect(user).toEqual({ sum: 3 });
});

test("should allow memory cleanup", async () => {
  let loadCounter = 0;
  fetchMock.get("http://example.com/run/4", () => ({ run: loadCounter++ }));
  const runCountEndpoint = createGetEndpoint<{ id: string }, { run: number }>({
    url: keys => `http://example.com/run/${keys.id}`
  });
  expect(await runCountEndpoint({ id: "4" })).toEqual({ run: 0 });
  // Keep the mocked response
  const cacheDisposer = runCountEndpoint.keepInCache({ id: "4" });
  jest.runAllTimers();
  // Verify that the value did not change as it came from cache
  expect(await runCountEndpoint({ id: "4" })).toEqual({ run: 0 });
  // Clear cache
  cacheDisposer();
  // Skip the 20s timeout:
  jest.runAllTimers();
  // Verify that the value is not comming from cache
  expect(await runCountEndpoint({ id: "4" })).toEqual({ run: 1 });
});

test("should allow to call the cacheDisposer multiple times without error", async () => {
  let loadCounter = 0;
  fetchMock.get("http://example.com/run/4", () => ({ run: loadCounter++ }));
  const runCountEndpoint = createGetEndpoint<{ id: string }, { run: number }>({
    url: keys => `http://example.com/run/${keys.id}`
  });
  expect(await runCountEndpoint({ id: "4" })).toEqual({ run: 0 });
  // Keep the mocked response
  const cacheDisposer = runCountEndpoint.keepInCache({ id: "4" });
  jest.runAllTimers();
  // Verify that the value did not change as it came from cache
  expect(await runCountEndpoint({ id: "4" })).toEqual({ run: 0 });
  // Clear cache
  cacheDisposer();
  cacheDisposer();
  // Skip the 20s timeout:
  jest.runAllTimers();
  cacheDisposer();
  // Verify that the value is not comming from cache
  expect(await runCountEndpoint({ id: "4" })).toEqual({ run: 1 });
});

test("should keep the cache if a new consumer hooks in", async () => {
  let loadCounter = 0;
  fetchMock.get("http://example.com/run/4", () => ({ run: loadCounter++ }));
  const runCountEndpoint = createGetEndpoint<{ id: string }, { run: number }>({
    url: keys => `http://example.com/run/${keys.id}`
  });
  expect(await runCountEndpoint({ id: "4" })).toEqual({ run: 0 });
  // Keep the mocked response
  const cacheDisposer1 = runCountEndpoint.keepInCache({ id: "4" });
  jest.runAllTimers();
  // Verify that the value did not change as it came from cache
  expect(await runCountEndpoint({ id: "4" })).toEqual({ run: 0 });
  // Clear cache
  cacheDisposer1();
  // Create a new cache disposer
  const cacheDisposer2 = runCountEndpoint.keepInCache({ id: "4" });
  jest.runAllTimers();
  // Verify that the is still comming from cache
  expect(await runCountEndpoint({ id: "4" })).toEqual({ run: 0 });
  cacheDisposer2();
  jest.runAllTimers();
  // Verify that the value is not comming from cache
  expect(await runCountEndpoint({ id: "4" })).toEqual({ run: 1 });
});

describe("POST testing", () => {
  test("should receive the POST body", async () => {
    const postBody = { firstName: "I am", lastName: "a name!" };
    fetchMock.post(
      "http://example.com/user/4",
      () => (url: string, opts: any) => {
        expect(opts.body).toEqual(postBody);
        return { foo: "bar" };
      }
    );
    const postEndpoint = createPostEndpoint<
      { id: string },
      { firstName: string; lastName: string },
      { foo: string }
    >({
      url: keys => `http://example.com/user/${keys.id}`
    });
    await postEndpoint({ id: "4" }, postBody);
  });

  test("should execute the POST request, and receive response", async () => {
    fetchMock.post("http://example.com/user/4", () => ({ foo: "bar" }));
    const postEndpoint = createPostEndpoint<
      { id: string },
      { firstName: string; lastName: string },
      { foo: string }
    >({
      url: keys => `http://example.com/user/${keys.id}`
    });
    const user = await postEndpoint(
      { id: "4" },
      { firstName: "I am", lastName: "a name!" }
    );
    expect(user).toEqual({ foo: "bar" });
  });
});

describe("PUT testing", () => {
  test("should receive the PUT body", async () => {
    const putBody = { firstName: "I am", lastName: "a name!" };
    fetchMock.put(
      "http://example.com/user/4",
      () => (url: string, opts: any) => {
        expect(opts.body).toEqual(putBody);
        return { foo: "bar" };
      }
    );
    const putEndpoint = createPutEndpoint<
      { id: string },
      { firstName: string; lastName: string },
      { foo: string }
    >({
      url: keys => `http://example.com/user/${keys.id}`
    });
    await putEndpoint({ id: "4" }, putBody);
  });

  test("should execute the PUT request, and receive response", async () => {
    fetchMock.put("http://example.com/user/4", () => ({ foo: "bar" }));
    const putEndpoint = createPutEndpoint<
      { id: string },
      { firstName: string; lastName: string },
      { foo: string }
    >({
      url: keys => `http://example.com/user/${keys.id}`
    });
    const user = await putEndpoint(
      { id: "4" },
      { firstName: "I am", lastName: "a name!" }
    );
    expect(user).toEqual({ foo: "bar" });
  });
});

describe("DELETE testing", () => {
  test("should execute the DELETE request, and receive a response", async () => {
    const response = { deleted: true };
    fetchMock.delete("http://example.com/user/4", response);
    const deleteEndpoint = createDeleteEndpoint<
      { id: string },
      { deleted: boolean }
    >({
      url: keys => `http://example.com/user/${keys.id}`
    });
    const deleteMe = await deleteEndpoint({ id: "4" });
    expect(deleteMe).toEqual(response);
  });
});

describe("Overloading the loader", () => {
  test("should call the replaced loader with the correct arguments", async () => {
    const keys = { id: "4" };
    const url = `http://example.com/user/${keys.id}`;
    const body = { foo: "fooo" };
    const defaultHeaders = {
      "Content-Type": "application/json"
    };

    const testEndpoint = createPostEndpoint<
      { id: string },
      { foo: string },
      { bar: string }
    >({
      url: keys => `http://example.com/user/${keys.id}`
    });
    const loaderPromise = Promise.resolve({ bar: "mockedResult" });
    testEndpoint.loader = jest.fn(() => loaderPromise);
    await testEndpoint(keys, body);

    expect((testEndpoint.loader as any).mock.calls[0]).toEqual([
      keys,
      url,
      defaultHeaders,
      body
    ]);
  });

  test("should return custom loader results", async () => {
    type Input = {
      id: string;
    };
    type Output = {
      name: string;
    };
    const actualData = { name: "I am a custom loader!" };

    const userEndpoint = createGetEndpoint<Input, Output>({
      url: keys => `http://example.com/user/${keys.id}`
    });
    userEndpoint.loader = () =>
      Promise.resolve({ name: "I am a custom loader!" });
    const result = await userEndpoint({ id: "4" });

    expect(result).toEqual(actualData);
  });
});

describe.skip("add form handling for post requests", () => {});
