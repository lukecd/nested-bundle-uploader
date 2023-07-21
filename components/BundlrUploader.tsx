"use client";

import { useState } from "react";

import Spinner from "./Spinner";
import { getBundlr } from "@/utils/getBundlr";
import fileReaderStream from "filereader-stream";

import type { DataItem, Bundle } from "arbundles";
import { createData, ArweaveSigner, bundleAndSignData } from "arbundles";

import Arweave from "arweave";

export const BundlrUploader: React.FC = () => {
	const [files, setFiles] = useState<File[]>([]);
	const [txProcessing, setTxProcessing] = useState(false);
	const [message, setMessage] = useState<string>("");

	const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
		if (event.target.files) {
			const files = Array.from(event.target.files);
			setFiles(files);
		}
	};

	async function prepFiles(files: File[], ephemeralSigner: ArweaveSigner): Promise<Map<string, DataItem>> {
		const items: [string, DataItem][] = await Promise.all(
			files.map(async (file) => {
				return [file.name, await prepFile(file, ephemeralSigner)];
			}),
		);
		return new Map(items);
	}

	async function prepFile(file: File, ephemeralSigner: ArweaveSigner): Promise<DataItem> {
		const item = createData(new Uint8Array(await file.arrayBuffer()), ephemeralSigner, {
			tags: [{ name: "Content-Type", value: file.type }],
		});
		await item.sign(ephemeralSigner);
		return item;
	}

	async function bundleItems(itemMap: Map<string, DataItem>, ephemeralSigner: ArweaveSigner): Promise<Bundle> {
		const bundlr = await getBundlr();

		const pathMap = new Map<string, string>([...itemMap].map(([path, item]) => [path, item.id]));
		const manifest = await bundlr.uploader.generateManifest({ items: pathMap });
		const manifestItem = await createData(JSON.stringify(manifest), ephemeralSigner, {
			tags: [
				{ name: "Type", value: "manifest" },
				{ name: "Content-Type", value: "application/x.arweave-manifest+json" },
			],
		});
		const bundle = await bundleAndSignData([...itemMap.values(), manifestItem], ephemeralSigner);
		return bundle;
	}

	async function uploadBundle(bundle: Bundle): Promise<string> {
		const bundlr = await getBundlr();

		const tx = bundlr.createTransaction(bundle.getRaw(), {
			tags: [
				{ name: "Bundle-Format", value: "binary" },
				{ name: "Bundle-Version", value: "2.0.0" },
			],
		});
		await tx.sign();
		const res = await tx.upload();
		console.log(res);
		const manifestId = bundle.items[bundle.items.length - 1].id;
		//   console.log(`Manifest ID: ${manifestId}`);
		return manifestId;
	}

	const handleUpload = async () => {
		setMessage("");
		if (!files || files.length === 0) {
			setMessage("Please select a file first");
			return;
		}
		setTxProcessing(true);

		try {
			console.log("about to generate ephemeralSigner");

			const ephemeralSigner = new ArweaveSigner(await Arweave.crypto.generateJWK());
			console.log("ephemeralSigner=", ephemeralSigner);

			const preppedFiles = await prepFiles(files, ephemeralSigner);
			console.log("preppedFiles=", preppedFiles);
			const bundle = await bundleItems(preppedFiles, ephemeralSigner);
			console.log("bundle=", bundle);
			const manifestId = await uploadBundle(bundle);
			console.log("Files uploaded");
			for (let i = 0; i < files.length; i++) {
				console.log(`File ${i} URL is https://arweave.net/${manifestId}/${files[i].name}`);
			}
		} catch (e) {
			console.log("Error on upload, ", e);
		}
		setTxProcessing(false);
	};

	return (
		<div className="px-10 py-5 mt-10 bg-background rounded-lg shadow-2xl max-w-7xl mx-auto w-full sm:w-4/5">
			<h2 className="text-3xl text-center mt-3 font-bold mb-4 text-black">Bundlr Multi-File Uploader</h2>

			<div
				className="border-2 border-dashed bg-primary border-background-contrast rounded-lg p-4 text-center"
				onDragOver={(event) => event.preventDefault()}
				onDrop={(event) => {
					event.preventDefault();
					const droppedFiles = Array.from(event.dataTransfer.files);
					const files = Array.from(droppedFiles);
					setFiles(files);
				}}
			>
				<p className="text-gray-400 mb-2">Drag and drop files here</p>
				<input type="file" multiple onChange={handleFileUpload} className="hidden" />
				<button
					onClick={() => {
						setFiles([]);
						const input = document.querySelector('input[type="file"]');
						if (input) {
							input.click();
						}
					}}
					className={`w-full min-w-full py-2 px-4 bg-primary text-text font-bold  rounded-md flex items-center justify-center transition-colors duration-500 ease-in-out  ${
						txProcessing
							? "bg-background-contrast text-white cursor-not-allowed"
							: "hover:bg-background-contrast hover:text-white"
					}`}
					disabled={txProcessing}
				>
					{txProcessing ? <Spinner color="text-background" /> : "Browse Files"}
				</button>
			</div>
			{files.map((file, index) => (
				<div key={index} className="flex items-center justify-start mb-2">
					<span className="mr-2 text-text">{file.name}</span>
				</div>
			))}

			<button
				className={`mt-3 w-full py-2 px-4 bg-background text-text rounded-md flex items-center justify-center transition-colors duration-500 ease-in-out border-2 border-background-contrast ${
					txProcessing
						? "bg-background-contrast text-white cursor-not-allowed"
						: "hover:bg-background-contrast hover:text-white"
				}`}
				onClick={handleUpload}
				disabled={txProcessing}
			>
				{txProcessing ? <Spinner color="text-background" /> : "Upload"}
			</button>
		</div>
	);
};

export default BundlrUploader;
