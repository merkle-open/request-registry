import {
  createGetEndpoint,
  createPostEndpoint
} from "../node_modules/request-registry";

export const productsEndpoint = createGetEndpoint<
  { brandId: string },
  { title: string; productId: string; price: number; description: string }
>({
  url: ({ brandId }) => `/get/products/brand/${brandId}`,
  afterError: () => console.error("Product could not be load")
});

export const loginEndpoint = createPostEndpoint<
  {},
  { userName: string; password: string },
  {}
>({
  url: () => `/user/login`,
  afterSuccess: () => productsEndpoint.clearCache()
});

export const logoutEndpoint = createPostEndpoint<{}, {}, {}>({
  url: () => `/user/logout`,
  afterSuccess: () => productsEndpoint.clearCache()
});
