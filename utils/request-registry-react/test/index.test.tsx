import * as React from "react";
import { useGetEndPoint, useGetEndPointSuspendable } from "../src";
import { createGetEndpoint } from "request-registry";
import {
	mockEndpoint,
	unmockAllEndpoints,
	mockEndpointOnce
} from "request-registry-mock";
import { render, wait } from "@testing-library/react";

afterAll(() => {
	unmockAllEndpoints();
});

describe("request-registry-react", () => {
	describe("useGetEndPoint", () => {
		it("renders loading state", () => {
			const userEndpoint = createGetEndpoint<
				{ id: string },
				{ name: string }
			>({
				url: ({ id }) => `/user/${id}`
			});
			mockEndpoint(userEndpoint, async () => ({ name: "Alex" }));
			const UserDetails = (props: { id: string }) => {
				const endpointState = useGetEndPoint(userEndpoint, {
					id: props.id
				});
				if (endpointState.state !== "DONE") {
					return <div>loading</div>;
				}
				return <div>{endpointState.value.name}</div>;
			};
			const { container } = render(<UserDetails id="4" />);
			expect(container.innerHTML).toEqual("<div>loading</div>");
		});

		it("renders load data", async () => {
			const userEndpoint = createGetEndpoint<
				{ id: string },
				{ name: string }
			>({
				url: ({ id }) => `/user/${id}`
			});
			mockEndpoint(userEndpoint, async () => ({ name: "Alex" }));
			const UserDetails = (props: { id: string }) => {
				const endpointState = useGetEndPoint(userEndpoint, {
					id: props.id
				});
				if (endpointState.state !== "DONE") {
					return <div>loading</div>;
				}
				return <div>{endpointState.value.name}</div>;
			};
			const { container } = render(<UserDetails id="4" />);
			await userEndpoint({ id: "4" });

			expect(container.innerHTML).toEqual("<div>Alex</div>");
		});

		it("rerenders data if cache is invalidated", async () => {
			const runsEndpoint = createGetEndpoint<{}, { run: number }>({
				url: () => `/runs`
			});
			let runs = 0;
			mockEndpoint(runsEndpoint, async () => ({ run: runs++ }));
			const Runs = () => {
				const endpointState = useGetEndPoint(runsEndpoint, {});
				if (endpointState.state !== "DONE") {
					return <div>loading</div>;
				}
				return <div>{endpointState.value.run}</div>;
			};
			const { container } = render(<Runs />);
			await wait();
			expect(container.innerHTML).toEqual("<div>0</div>");
			runsEndpoint.refresh();
			await wait();
			expect(container.innerHTML).toEqual("<div>1</div>");
		});

		it("will take care of a slow outdated request", async () => {
			const userEndpoint = createGetEndpoint<
				{ id: string },
				{ name: string; age: number }
			>({
				url: keys => `/user/${keys.id}`
			});
			mockEndpointOnce(
				userEndpoint,
				async () => ({ name: "Slow", age: 20 }),
				20
			);
			const UserDetails = (props: { id: string }) => {
				const endpointState = useGetEndPoint(userEndpoint, {
					id: props.id
				});
				if (endpointState.state !== "DONE") {
					return <div>loading</div>;
				}
				return <div>{endpointState.value.name}</div>;
			};
			const { container } = render(<UserDetails id="4" />);
			// Execute slow reqeust
			const slowRequest = userEndpoint({ id: "4" });
			mockEndpointOnce(
				userEndpoint,
				async () => ({ name: "Fast", age: 1 }),
				1
			);
			userEndpoint.refresh();
			// Execute fast request
			await userEndpoint({ id: "4" });
			await slowRequest;
			// Make sure that the slow request which ended later is not shown in the result:
			expect(container.innerHTML).toEqual("<div>Fast</div>");
		});
	});
	describe("useGetEndPointSuspendable", () => {
		it("renders loading state", () => {
			const userEndpoint = createGetEndpoint<
				{ id: string },
				{ name: string }
			>({
				url: ({ id }) => `/user/${id}`
			});
			mockEndpoint(userEndpoint, async () => ({ name: "Alex" }));
			const UserDetails = (props: { id: string }) => {
				const { name } = useGetEndPointSuspendable(userEndpoint, {
					id: props.id
				});
				return <div>{name}</div>;
			};
			const { container } = render(
				<React.Suspense fallback={<div>loading</div>}>
					<UserDetails id="4" />
				</React.Suspense>
			);
			expect(container.innerHTML).toEqual("<div>loading</div>");
		});

		it("renders values", async () => {
			const userEndpoint = createGetEndpoint<
				{ id: string },
				{ name: string }
			>({
				url: ({ id }) => `/user/${id}`
			});
			mockEndpoint(userEndpoint, async () => ({ name: "Alex" }));
			const UserDetails = (props: { id: string }) => {
				const { name } = useGetEndPointSuspendable(userEndpoint, {
					id: props.id
				});
				return <div>{name}</div>;
			};
			const { container } = render(
				<React.Suspense fallback={<div>loading</div>}>
					<UserDetails id="4" />
				</React.Suspense>
			);
			await wait();
			expect(container.innerHTML).toEqual("<div>Alex</div>");
		});
	});
});
