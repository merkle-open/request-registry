import { createGetEndpoint, createPostEndpoint } from "request-registry";

/** Load Product */
interface IProduct {
	title: string;
	productId: string;
	price: number;
	description: string;
}
export const productsEndpoint = createGetEndpoint<
	{ brandId: string },
	IProduct
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
	afterSuccess: () => productsEndpoint.refresh()
});

export const logoutEndpoint = createPostEndpoint<{}, {}, {}>({
	url: () => `/user/logout`,
	afterSuccess: () => productsEndpoint.refresh()
});
