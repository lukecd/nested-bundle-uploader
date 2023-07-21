import Image from "next/image";
import BundlrUploader from "@/components/BundlrUploader";

export default function Home() {
	return (
		<main className="flex min-h-screen flex-col items-center justify-between p-24">
			<BundlrUploader />
		</main>
	);
}
