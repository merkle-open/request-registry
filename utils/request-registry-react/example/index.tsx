import * as React from "react";
import * as ReactDOM from "react-dom";
import { useGetEndPoint } from "../src/";
import {
  createGetEndpoint,
  createPostEndpoint
} from "../node_modules/request-registry";
import { mockEndpoint } from "../node_modules/request-registry-mock";

const productsEndpoint = createGetEndpoint<
  { brandId: string; page: number },
  { title: string; productId: string; price: number }
>({
  url: ({ brandId, page }) => `/get/products/brand/${brandId}?page=${page}`
});

const loginEndpoint = createPostEndpoint<
  {},
  { userName: string; password: string },
  {}
>({
  url: () => `/user/login`,
  afterSuccess: () => {
    productsEndpoint.clearCache();
  }
});

let isUserLoggedIn = false;
mockEndpoint(
  productsEndpoint,
  async () => ({
    title: "Tennisball",
    productId: "10",
    price: isUserLoggedIn ? 8 : 10
  }),
  100
);

const ProductDetailView = () => {
  const productEndpointResult = useGetEndPoint(productsEndpoint, {
    brandId: "Adidas",
    page: 0
  });
  if (productEndpointResult.state !== "load") {
    return <div>Loading...</div>;
  }
  const { title, price } = productEndpointResult.data;
  return (
    <div>
      {title}: {price} CHF
    </div>
  );
};

const ProductNameView = (props: { brandId: string }) => {
  const productEndpointResult = useGetEndPoint(productsEndpoint, {
    brandId: props.brandId,
    page: 0
  });
  if (productEndpointResult.state !== "load") {
    return null;
  }
  const { title, price } = productEndpointResult.data;
  return <span>{title}</span>;
};

const ToggleButton = () => (
  <button
    onClick={() => {
      loginEndpoint({}, { userName: "Joe", password: "123456" });
      isUserLoggedIn = !isUserLoggedIn;
      productsEndpoint.clearCache();
    }}
  >
    Toggle Login
  </button>
);

const App = () => {
  const [isActive, setIsActive] = React.useState(false);
  if (!isActive) {
    return (
      <div>
        <button onClick={() => setIsActive(true)}>Activate</button>
        <ToggleButton />
      </div>
    );
  }
  return (
    <div>
      <button onClick={() => setIsActive(false)}>Deactivate</button>
      <ToggleButton />
      <ProductNameView brandId="Adidas" />
      <ProductNameView brandId="Puma" />
      <ProductDetailView />
      <ProductDetailView />
      <ProductDetailView />
    </div>
  );
};

ReactDOM.render(<App />, document.getElementById("root"));
