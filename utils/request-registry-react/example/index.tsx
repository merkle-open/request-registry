import * as React from "react";
import * as ReactDOM from "react-dom";
import { useGetEndPoint } from "request-registry-react";
import { loginEndpoint, productsEndpoint, logoutEndpoint } from "./endpoints";
import {
  loginEndpointMock,
  productsEndpointMock,
  logoutEndpointMock
} from "./endpointsMocks";

// Activate mocks as we don't have a server
productsEndpointMock.activate();
loginEndpointMock.activate();
logoutEndpointMock.activate();

const ProductDetailView = (props: { brandId: string }) => {
  const productEndpointResult = useGetEndPoint(productsEndpoint, {
    brandId: props.brandId
  });
  if (productEndpointResult.state !== "DONE") {
    return null;
  }
  const { description, price } = productEndpointResult.value;
  return (
    <React.Fragment>
      {price} CHF
      <br />
      <span>{description}</span>
    </React.Fragment>
  );
};

const ProductNameView = (props: { brandId: string }) => {
  const productEndpointResult = useGetEndPoint(productsEndpoint, {
    brandId: props.brandId
  });
  if (productEndpointResult.state !== "DONE") {
    return <span>Loading...</span>;
  }
  const { title } = productEndpointResult.value;
  return <span>{title}</span>;
};

const LoginButton = () => {
  const [isLoggedIn, setIsLoggedIn] = React.useState(false);
  return (
    <button
      onClick={() => {
        if (!isLoggedIn) {
          loginEndpoint({}, { userName: "Joe", password: "123456" });
        } else {
          logoutEndpoint({}, {});
        }
        setIsLoggedIn(!isLoggedIn);
      }}
    >
      {isLoggedIn ? "Logout" : "Login"}
    </button>
  );
};

const App = () => {
  const [isActive, setIsActive] = React.useState(false);
  if (!isActive) {
    return (
      <div>
        <button onClick={() => setIsActive(true)}>Activate</button>
        <LoginButton />
      </div>
    );
  }
  return (
    <div>
      <button onClick={() => setIsActive(false)}>Deactivate</button>
      <LoginButton />
      <details>
        <summary>
          <ProductNameView brandId="Puma" />
        </summary>
        <p>
          <ProductDetailView brandId="Puma" />
        </p>
      </details>

      <details>
        <summary>
          <ProductNameView brandId="Adidas" />
        </summary>
        <p>
          <ProductDetailView brandId="Adidas" />
        </p>
      </details>
    </div>
  );
};

ReactDOM.render(<App />, document.getElementById("root"));
