/// <reference types="vite/client" />
/// <reference types="vitest/globals" />
/// <reference types="@testing-library/jest-dom" />

export {}

declare global {
	const GITHUB_RUNTIME_PERMANENT_NAME: string
	const BASE_KV_SERVICE_URL: string
}

declare module 'react' {
	// eslint-disable-next-line @typescript-eslint/no-unused-vars
	interface Component<P, S, SS> {
		readonly componentProps: Readonly<P>
	}
}