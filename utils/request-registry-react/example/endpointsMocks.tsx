import { loginEndpoint, logoutEndpoint, productsEndpoint } from "./endpoints";
import { createEndpointMock } from "request-registry-mock";

export const productsEndpointMock = createEndpointMock(
  productsEndpoint,
  async ({ brandId }) => {
    if (brandId === "") {
      throw JSON.stringify("Invalid brandId");
    }
    return {
      title: brandId === "Puma" ? "Puma Long Sleeve T-Shirts" : "Adidas Bag",
      productId: "10",
      description: "Description",
      price: isUserLoggedIn ? 8 : 10
    };
  },
  100
);

let isUserLoggedIn = false;
export const loginEndpointMock = createEndpointMock(
  loginEndpoint,
  async () => {
    isUserLoggedIn = true;
    return {};
  },
  100
);
export const logoutEndpointMock = createEndpointMock(
  logoutEndpoint,
  async () => {
    isUserLoggedIn = false;
    return {};
  },
  100
);
