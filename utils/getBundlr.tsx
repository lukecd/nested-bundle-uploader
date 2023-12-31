import { WebBundlr } from "@bundlr-network/client";
import { ethers } from "ethers";

/**
 * Creates a new Bundlr object that will then be used by other
 * utility functions. This is where you set your node address and currency.
 *
 * @returns A reference to a Bundlr object
 */
export const getBundlr = async () => {
	const provider = new ethers.BrowserProvider(window.ethereum);
	const signer = await provider.getSigner();

	provider.getSigner = () => signer;
	signer._signTypedData = (domain, types, value) => signer.signTypedData(domain, types, value);

	const bundlr = new WebBundlr("https://devnet.bundlr.network", "matic", provider);
	await bundlr.ready();

	return bundlr;
};
